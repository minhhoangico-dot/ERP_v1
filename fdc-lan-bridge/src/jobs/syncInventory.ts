import { hisPool } from "../db/his";
import { supabase } from "../db/supabase";
import { logger } from "../lib/logger";

/**
 * Syncs inventory data from HIS to Supabase.
 * Uses medicinestoreid as the unique key to capture lot-level details.
 */
export async function syncInventoryJob() {
    const startTime = Date.now();
    let recordsSynced = 0;

    try {
        logger.info("Starting syncInventoryJob (Lot-level)...");

        const query = `
      SELECT 
        'S' || s.medicinestoreid as his_medicineid,
        d.medicinecode as medicine_code,
        d.medicinename as name, 
        d.donvisudung as unit,
        s.departmentid,
        dep.departmentname as warehouse_name,
        s.soluongtonkho as current_stock,
        COALESCE(e.today_export, 0) as approved_export,
        d.medicine_solo as batch_number,
        CASE 
          WHEN d.medicine_hsdyear > 0 
          THEN TO_DATE(d.medicine_hsdyear || '-' || LPAD(d.medicine_hsdmonth::text, 2, '0') || '-' || LPAD(d.medicine_hsdday::text, 2, '0'), 'YYYY-MM-DD')
          ELSE NULL 
        END as expiry_date,
        COALESCE(d.medicine_gia, 0) + (COALESCE(d.medicine_gia, 0) * COALESCE(d.medicine_gia_vat, 0) / 100) as unit_price
      FROM tb_medicinestore s
      JOIN (
        SELECT DISTINCT ON (medicineid) 
            medicineid, medicinecode, medicinename, donvisudung, medicine_solo, medicine_hsdday, medicine_hsdmonth, medicine_hsdyear, medicine_gia, medicine_gia_vat
        FROM tb_medicinedata
        ORDER BY medicineid, CASE WHEN medicine_solo IS NOT NULL AND medicine_solo <> '' THEN 0 ELSE 1 END, medicinedataid DESC
      ) d ON s.medicineid = d.medicineid
      LEFT JOIN tb_department dep ON s.departmentid = dep.departmentid
      LEFT JOIN (
        SELECT medicineid_org as medicineid, SUM(soluong) as today_export
        FROM tb_medicinedata
        WHERE medicine_export_date::date = CURRENT_DATE 
          AND medicine_export_status = 1
        GROUP BY medicineid_org
      ) e ON s.medicineid = e.medicineid
      WHERE s.soluongtonkho > 0
        AND s.departmentid <> 6
        AND (s.roomid IS NULL OR s.roomid NOT IN (69, 108))
    `;

        const res = await hisPool.query(query);
        const items = res.rows;
        logger.info(`Found ${items.length} active inventory lots in HIS`);

        const snapshotDate = new Date().toISOString().split('T')[0];

        // Prepare batches for upsert
        const batchSize = 100;
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize).map(item => ({
                his_medicineid: item.his_medicineid,
                medicine_code: item.medicine_code,
                name: item.name,
                category: item.category || 'Khác', // Example static category
                warehouse: item.warehouse_name || 'Kho Tổng',
                current_stock: Number(item.current_stock),
                approved_export: Number(item.approved_export),
                unit: item.unit,
                status: Number(item.current_stock) > 0 ? 'in_stock' : 'out_of_stock',
                snapshot_date: snapshotDate,
                batch_number: item.batch_number,
                expiry_date: item.expiry_date,
                unit_price: item.unit_price ? Number(item.unit_price) : 0
            }));

            const { error } = await supabase
                .from('fdc_inventory_snapshots')
                .upsert(batch, { onConflict: 'his_medicineid,warehouse,snapshot_date' });

            if (error) {
                logger.error(`Error upserting inventory batch ${i / batchSize}:`, error);
            } else {
                recordsSynced += batch.length;
            }
        }

        // Clean up snapshots older than 90 days
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const cutoffDate = ninetyDaysAgo.toISOString().split('T')[0];

        const { error: cleanupError } = await supabase
            .from('fdc_inventory_snapshots')
            .delete()
            .lt('snapshot_date', cutoffDate);

        if (cleanupError) {
            logger.warn("Failed to clean up old snapshots:", cleanupError);
        }

        // Records Sync Log
        const { error: logError } = await supabase
            .from('fdc_sync_logs')
            .insert({
                sync_type: 'syncInventory',
                status: 'completed',
                records_synced: recordsSynced,
                completed_at: new Date().toISOString()
            });

        if (logError) logger.error("Failed to record sync log", logError);

        logger.info(`syncInventoryJob completed. Synced ${recordsSynced} records in ${Date.now() - startTime}ms`);
    } catch (err) {
        logger.error('Error in syncInventoryJob:', err);
        // Record failure in log
        await supabase.from('fdc_sync_logs').insert({
            sync_type: 'syncInventory',
            status: 'error',
            error_message: (err as Error).message,
            completed_at: new Date().toISOString()
        });
    }
}
