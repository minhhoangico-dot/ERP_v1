import { supabase } from "../db/supabase";
import { misaPool } from "../db/misa";
import { logger } from "../lib/logger";
import { logSync } from "../lib/syncLog";
import sql from 'mssql';

export async function syncSupplyConsumptionJob() {
    const startTime = Date.now();
    let recordsSynced = 0;

    try {
        logger.info("Starting syncSupplyConsumptionJob...");

        if (!misaPool.connected) {
            await misaPool.connect();
        }

        // 1. Get Outward transactions from MISA for the last 30 days (for initial backfill) or daily
        const request = new sql.Request(misaPool);
        const result = await request.query(`
            SELECT 
                CONVERT(VARCHAR(10), l.PostedDate, 23) as report_date,
                SUBSTRING(MAX(l.AccountNumber), 1, 4) as account,
                l.InventoryItemCode as item_code,
                MAX(l.InventoryItemName) as item_name,
                SUM(ISNULL(l.OutwardQuantity, 0)) as outward_qty,
                SUM(ISNULL(l.OutwardAmount, 0)) as outward_amount
            FROM InventoryLedger l
            WHERE l.AccountNumber LIKE '152%'
              AND l.PostedDate >= DATEADD(DAY, -30, GETDATE())
              AND l.OutwardQuantity > 0
            GROUP BY CONVERT(VARCHAR(10), l.PostedDate, 23), l.InventoryItemCode
        `);

        const consumptions = result.recordset;
        logger.info(`Found ${consumptions.length} consumption records in MISA for recent days.`);

        if (consumptions.length === 0) {
            await logSync('syncSupplyConsumption', 'completed', 'MISA', 0, null, Date.now() - startTime);
            return;
        }

        // 2. Extract unique report_dates to fetch patient visits
        const reportDates = [...new Set(consumptions.map(c => c.report_date))];

        // 3. Get patient volumes from Supabase for these dates
        const { data: volumeData, error: volumeError } = await supabase
            .from('fdc_patient_volume_daily')
            .select('report_date, total_treatments')
            .in('report_date', reportDates);

        if (volumeError) throw volumeError;

        const volumeMap: Record<string, number> = {};
        volumeData?.forEach(v => {
            volumeMap[v.report_date] = v.total_treatments;
        });

        // 4. Map and calculate qty_per_visit
        const payload = consumptions.map(c => {
            const visits = volumeMap[c.report_date] || 0;
            const outwardQty = Number(c.outward_qty) || 0;
            const qtyPerVisit = visits > 0 ? outwardQty / visits : null;

            return {
                report_date: c.report_date,
                account: c.account,
                item_code: c.item_code,
                item_name: c.item_name,
                outward_qty: outwardQty,
                outward_amount: Number(c.outward_amount) || 0,
                patient_visits: visits,
                qty_per_visit: qtyPerVisit ? Number(qtyPerVisit.toFixed(4)) : null
            };
        });

        // 5. Upsert to Supabase
        const { error } = await supabase
            .from('fdc_supply_consumption_daily')
            .upsert(payload, { onConflict: 'report_date,account,item_code' });

        if (error) {
            logger.error(`Error inserting Supabase consumption records:`, error);
            throw error;
        }

        recordsSynced = payload.length;
        await logSync('syncSupplyConsumption', 'completed', 'MISA', recordsSynced, null, Date.now() - startTime);
        logger.info(`syncSupplyConsumptionJob completed for ${recordsSynced} records.`);

    } catch (error: any) {
        logger.error("syncSupplyConsumptionJob failed:", error);
        await logSync('syncSupplyConsumption', 'failed', 'MISA', recordsSynced, error.message, Date.now() - startTime);
    }
}
