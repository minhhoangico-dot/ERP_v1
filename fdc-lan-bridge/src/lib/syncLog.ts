import { supabase } from "../db/supabase";
import { logger } from "./logger";

export type SyncType =
    | "syncStaff"
    | "syncInventory"
    | "syncPatientVolume"
    | "syncMisaPayments"
    | "scanMisaPhieuchi"
    | "syncMisaSupplies"
    | "syncSupplyConsumption"
    | "syncAttendance";

export type SyncStatus = "completed" | "failed";

export async function logSync(
    syncType: SyncType,
    status: SyncStatus,
    source: "HIS" | "MISA" | "BOTH" | "SYSTEM",
    recordsSynced: number,
    errorMessage: string | null = null,
    durationMs: number = 0
) {
    const now = new Date();
    const startedAt = new Date(now.getTime() - durationMs);

    try {
        const { error } = await supabase.from("fdc_sync_logs").insert({
            sync_type: syncType,
            status: status,
            source: source,
            records_synced: recordsSynced,
            error_message: errorMessage,
            started_at: startedAt.toISOString(),
            completed_at: now.toISOString(),
        });

        if (error) {
            logger.error(`Failed to insert sync log. Error: ${error.message}`);
        } else {
            logger.info(`Sync log recorded: ${syncType} (${status}) - Records: ${recordsSynced}`);
        }
    } catch (err) {
        logger.error("Error writing to fdc_sync_logs", err);
    }
}
