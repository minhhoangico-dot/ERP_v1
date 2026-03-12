import { supabase } from "../db/supabase";
import { logger } from "../lib/logger";

export async function detectAnomaliesJob() {
    const startTime = Date.now();
    let anomaliesCreated = 0;
    let anomaliesResolved = 0;

    try {
        logger.info("Starting detectAnomaliesJob (Dynamic Thresholds)...");

        // 1. Get today's date
        const todayDate = new Date().toISOString().split('T')[0];

        // 2. Fetch all snapshot data from the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

        const { data: rawSnapshots, error: snapError } = await supabase
            .from('fdc_inventory_snapshots')
            .select('*')
            .gte('snapshot_date', cutoffDate)
            .order('snapshot_date', { ascending: true });

        if (snapError) {
            throw new Error(`Failed to fetch snapshots: ${snapError.message}`);
        }

        if (!rawSnapshots || rawSnapshots.length === 0) {
            logger.warn("No snapshots found to analyze.");
            return;
        }

        // 3. Group snapshots by item
        const historyMap: Record<string, any[]> = {};
        for (const snap of rawSnapshots) {
            const key = `${snap.his_medicineid}_${snap.warehouse}`;
            if (!historyMap[key]) {
                historyMap[key] = [];
            }
            historyMap[key].push(snap);
        }

        // 4. Fetch currently active anomalies to see if we need to resolve any or prevent duplicates
        const { data: activeAnomalies, error: anomalyError } = await supabase
            .from('fdc_analytics_anomalies')
            .select('*')
            .eq('is_acknowledged', false);

        if (anomalyError) {
            throw new Error(`Failed to fetch active anomalies: ${anomalyError.message}`);
        }

        const currentActiveAnomalies = activeAnomalies || [];
        const newAnomaliesToInsert: any[] = [];
        const anomaliesToAcknowledge: string[] = [];

        // 5. Analyze each item
        for (const [key, history] of Object.entries(historyMap)) {
            // Find today's snapshot
            const todaySnap = history.find(s => s.snapshot_date === todayDate);
            if (!todaySnap) continue; // Item might not be in today's snapshot

            // Calculate historical metrics based on the previous 30 days
            // Usage approx = max(0, previous_stock - current_stock) for each day
            let totalUsage = 0;
            let daysWithData = 0;

            for (let i = 1; i < history.length; i++) {
                // If it's today's snapshot, we can still use it to calculate yesterday's usage
                const prev = history[i - 1];
                const curr = history[i];

                // If stock drops, it's usage. If it goes up, it was an import.
                if (curr.current_stock < prev.current_stock) {
                    totalUsage += (prev.current_stock - curr.current_stock);
                }
                daysWithData++;
            }

            const avgDailyUsage = daysWithData > 0 ? (totalUsage / daysWithData) : 0;

            // Check Rules
            const detectedRules: { rule: string, severity: string, description: string }[] = [];
            let daysToExpiry = Infinity;

            if (todaySnap.expiry_date) {
                const expiry = new Date(todaySnap.expiry_date).getTime();
                daysToExpiry = (expiry - Date.now()) / (1000 * 3600 * 24);
            }

            // Rule 1: Expired
            if (daysToExpiry < 0) {
                detectedRules.push({
                    rule: 'expired',
                    severity: 'critical',
                    description: `Thuốc đã hết hạn từ ${Math.abs(Math.floor(daysToExpiry))} ngày trước.`
                });
            }
            // Rule 2: Near Expiry
            else if (daysToExpiry <= 90) {
                detectedRules.push({
                    rule: 'near_expiry',
                    severity: daysToExpiry <= 30 ? 'high' : 'medium',
                    description: `Thuốc sắp hết hạn trong ${Math.ceil(daysToExpiry)} ngày.`
                });
            }

            // Rule 3: Zero Stock
            if (todaySnap.current_stock === 0) {
                // Check if it was > 0 yesterday
                const yesterdaySnap = history.find(s => {
                    const d = new Date(todayDate);
                    d.setDate(d.getDate() - 1);
                    return s.snapshot_date === d.toISOString().split('T')[0];
                });

                if (yesterdaySnap && yesterdaySnap.current_stock > 0) {
                    detectedRules.push({
                        rule: 'zero_stock',
                        severity: 'high',
                        description: `Kho vừa hết hàng hôm nay (hôm qua còn ${yesterdaySnap.current_stock}).`
                    });
                } else if (!yesterdaySnap || history.length === 1) { // Wait, maybe it's just zero always
                    // Ignore if always zero to prevent noise, unless it's a critical item? Let's skip.
                }
            }
            // Rule 4: Low Stock (Dynamic)
            else if (avgDailyUsage > 0 && todaySnap.current_stock <= (avgDailyUsage * 7)) {
                // Only alert if stock is enough for less than 7 days
                const daysLeft = Math.floor(todaySnap.current_stock / avgDailyUsage);
                // But avoid noise for very slow moving items (e.g., avg usage = 0.1, stock = 1)
                // Let's require it to be at least below some minimum absolute threshold, or just dynamic is fine
                // The user asked to replace <= 10 with a dynamic one, so:
                detectedRules.push({
                    rule: 'low_stock',
                    severity: daysLeft <= 3 ? 'high' : 'medium',
                    description: `Tồn kho thấp, dự kiến chỉ đủ dùng trong ${daysLeft} ngày (Tiêu thụ trung bình ${avgDailyUsage.toFixed(1)}/ngày).`
                });
            }

            // Rule 5: Stock Spike
            if (history.length >= 2) {
                const yesterdaySnap = history[history.length - 2];
                if (todaySnap.snapshot_date === todayDate && yesterdaySnap.snapshot_date !== todayDate) {
                    const todayUsage = yesterdaySnap.current_stock - todaySnap.current_stock;
                    if (avgDailyUsage >= 2 && todayUsage > 0) { // Only check if usage > 0 and average >= 2 to avoid noise on slow items
                        if (todayUsage > avgDailyUsage * 1.5 && todayUsage >= 10) {
                            detectedRules.push({
                                rule: 'stock_spike',
                                severity: 'medium',
                                description: `Lượng xuất đột biến: ${todayUsage} ${todaySnap.unit} (Trung bình: ${avgDailyUsage.toFixed(1)}/ngày).`
                            });
                        }
                    }
                }
            }

            // Process detected rules against active anomalies
            const existingAnomaliesForItem = currentActiveAnomalies.filter(a => a.material_name === todaySnap.name);

            // 1. Resolve existing anomalies that are no longer detected (e.g. low stock -> restocked)
            for (const existing of existingAnomaliesForItem) {
                if (!detectedRules.some(r => r.rule === existing.rule_id)) {
                    anomaliesToAcknowledge.push(existing.id);
                }
            }

            // 2. Insert new anomalies that are not already active
            for (const detected of detectedRules) {
                if (!existingAnomaliesForItem.some(e => e.rule_id === detected.rule)) {
                    newAnomaliesToInsert.push({
                        material_name: todaySnap.name,
                        rule_id: detected.rule,
                        severity: detected.severity,
                        description: detected.description,
                        detected_at: new Date().toISOString(),
                        is_acknowledged: false
                    });
                }
            }
        }

        // Apply changes to database
        if (anomaliesToAcknowledge.length > 0) {
            const { error: ackError } = await supabase
                .from('fdc_analytics_anomalies')
                .update({ is_acknowledged: true })
                .in('id', anomaliesToAcknowledge);

            if (ackError) {
                logger.error("Failed to auto-resolve anomalies", ackError);
            } else {
                anomaliesResolved = anomaliesToAcknowledge.length;
            }
        }

        if (newAnomaliesToInsert.length > 0) {
            const { error: insError } = await supabase
                .from('fdc_analytics_anomalies')
                .insert(newAnomaliesToInsert);

            if (insError) {
                logger.error("Failed to insert new anomalies", insError);
            } else {
                anomaliesCreated = newAnomaliesToInsert.length;
            }
        }

        logger.info(`detectAnomaliesJob completed. Found ${anomaliesCreated} new, resolved ${anomaliesResolved} in ${Date.now() - startTime}ms`);

    } catch (err) {
        logger.error('Error in detectAnomaliesJob:', err);
    }
}
