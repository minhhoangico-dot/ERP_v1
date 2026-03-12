import { hisPool } from "../db/his";
import { supabase } from "../db/supabase";
import { logger } from "../lib/logger";

export async function syncMedicineImportsJob() {
    const startTime = Date.now();
    let recordsSynced = 0;

    try {
        logger.info("Starting syncMedicineImportsJob...");

        // Query HIS for import history (last 6 months to avoid massive payload, or let's do 1 year)
        const query = `
            SELECT 
                d.medicinecode as medicine_code,
                d.medicinename as medicine_name,
                d.medicine_solo as batch_number,
                d.medicine_import_date as import_date,
                d.soluong as quantity,
                COALESCE(d.medicine_gia, 0) + (COALESCE(d.medicine_gia, 0) * COALESCE(d.medicine_gia_vat, 0) / 100) as unit_price,
                b.medicine_nhacungcapname as supplier_name,
                b.medicineinvoicecode as invoice_code
            FROM tb_medicinedata d
            LEFT JOIN tb_medicinebill b ON d.medicinebillid = b.medicinebillid
            WHERE d.medicine_import_status = 1
              AND d.medicine_import_date IS NOT NULL
              AND d.medicine_import_date >= CURRENT_DATE - INTERVAL '1 year'
            ORDER BY d.medicine_import_date DESC
        `;

        const res = await hisPool.query(query);
        const items = res.rows;
        logger.info(`Found ${items.length} import records in HIS (last 1 year)`);

        // Prepare batches for upsert
        const batchSize = 100;
        for (let i = 0; i < items.length; i += batchSize) {
            const batchRaw = items.slice(i, i + batchSize).map(item => ({
                medicine_code: item.medicine_code,
                medicine_name: item.medicine_name,
                batch_number: item.batch_number || '',
                import_date: item.import_date,
                quantity: item.quantity ? Number(item.quantity) : 0,
                unit_price: item.unit_price ? Number(item.unit_price) : 0,
                supplier_name: item.supplier_name,
                invoice_code: item.invoice_code
            }));

            // Deduplicate within batch by unique constraint key to avoid "row a second time" error
            const seen = new Map<string, typeof batchRaw[0]>();
            for (const r of batchRaw) {
                if (!r.medicine_code || !r.import_date) continue;
                const key = `${r.medicine_code}|${r.import_date}|${r.batch_number}`;
                seen.set(key, r);
            }
            const validBatch = Array.from(seen.values());

            if (validBatch.length > 0) {
                const { error } = await supabase
                    .from('fdc_medicine_imports')
                    .upsert(validBatch, { onConflict: 'medicine_code,import_date,batch_number', ignoreDuplicates: false });

                if (error) {
                    logger.error(`Error upserting import batch ${i / batchSize}:`, error);
                } else {
                    recordsSynced += validBatch.length;
                }
            }
        }

        // Records Sync Log
        const { error: logError } = await supabase
            .from('fdc_sync_logs')
            .insert({
                sync_type: 'syncMedicineImports',
                status: 'completed',
                records_synced: recordsSynced,
                completed_at: new Date().toISOString()
            });

        if (logError) logger.error("Failed to record sync log", logError);

        logger.info(`syncMedicineImportsJob completed. Synced ${recordsSynced} records in ${Date.now() - startTime}ms`);
    } catch (err) {
        logger.error('Error in syncMedicineImportsJob:', err);
        // Record failure in log
        await supabase.from('fdc_sync_logs').insert({
            sync_type: 'syncMedicineImports',
            status: 'error',
            error_message: (err as Error).message,
            completed_at: new Date().toISOString()
        });
    }
}
