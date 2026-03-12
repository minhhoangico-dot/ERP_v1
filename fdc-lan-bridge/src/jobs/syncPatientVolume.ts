import { hisPool } from "../db/his";
import { supabase } from "../db/supabase";
import { logger } from "./../lib/logger";
import { logSync } from "../lib/syncLog";

export async function syncPatientVolumeJob() {
    const startTime = Date.now();
    let recordsSynced = 0;

    try {
        logger.info("Starting syncPatientVolumeJob...");

        // Query HIS tb_treatment for today's volume
        // Assuming treatmentdate is a timestamp in tb_treatment
        const result = await hisPool.query(`
      SELECT 
        DATE(treatmentdate) as report_date,
        COUNT(treatmentid) as total_treatments
      FROM tb_treatment
      WHERE DATE(treatmentdate) = CURRENT_DATE
        AND departmentid <> 6
      GROUP BY DATE(treatmentdate)
    `);

        const rows = result.rows;
        if (rows.length > 0) {
            const reportDate = rows[0].report_date;
            const totalTreatments = parseInt(rows[0].total_treatments, 10);

            // Create upsert payload for Supabase
            const payload = {
                report_date: new Date(reportDate).toISOString().split('T')[0],
                total_treatments: totalTreatments,
                // Since we don't know new vs returning easily without complex queries, we'll estimate or leave at 0 for now
                new_patients: Math.floor(totalTreatments * 0.2), // Mocked estimation
                returning_patients: Math.floor(totalTreatments * 0.8), // Mocked estimation
            };

            const { error } = await supabase.from("fdc_patient_volume_daily").upsert(
                payload,
                { onConflict: "report_date" }
            );

            if (error) throw error;
            recordsSynced = 1;
        }

        await logSync("syncPatientVolume", "completed", "HIS", recordsSynced, null, Date.now() - startTime);
    } catch (error: any) {
        logger.error("syncPatientVolumeJob failed", error);
        await logSync("syncPatientVolume", "failed", "HIS", recordsSynced, error.message, Date.now() - startTime);
    }
}
