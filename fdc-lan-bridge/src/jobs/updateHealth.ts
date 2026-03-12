import { checkHisConnection } from "../db/his";
import { checkMisaConnection } from "../db/misa";
import { supabase } from "../db/supabase";
import { logger } from "../lib/logger";

export async function updateHealthJob() {
    try {
        const hisHealthy = await checkHisConnection();
        const misaHealthy = await checkMisaConnection();

        const overallStatus = hisHealthy && misaHealthy ? "online" : "degraded";

        const { error } = await supabase.from("fdc_sync_health").upsert({
            id: "b45a9096-7c91-4cf5-9cd8-89c0966a3371", // Single singleton row
            bridge_status: overallStatus,
            last_heartbeat: new Date().toISOString(),
            his_connected: hisHealthy,
            misa_connected: misaHealthy,
            // Default false for STUB
            face_connected: false,
            updated_at: new Date().toISOString()
        });

        if (error) {
            logger.error("Failed to update fdc_sync_health heartbeat", error);
        }
    } catch (err: any) {
        logger.error("Failed health heartbeat job", err);
    }
}
