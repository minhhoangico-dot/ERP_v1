import { supabase } from "../db/supabase";
import { logger } from "../lib/logger";
import { logSync } from "../lib/syncLog";
import { getAllEvents } from "../lib/hikvision";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export async function syncAttendanceJob() {
    const startTime = Date.now();
    let recordsSynced = 0;

    try {
        logger.info("Starting syncAttendanceJob...");

        // 1. Determine sync window
        // Find the latest check_time in Supabase to avoid syncing from the beginning of time
        const { data: latestRecord, error: latestErr } = await supabase
            .from("fdc_attendance_records")
            .select("check_time")
            .eq("source", "HIKVISION")
            .order("check_time", { ascending: false })
            .limit(1)
            .single();

        let syncStart: Date;
        const syncEnd = new Date();

        if (!latestErr && latestRecord && latestRecord.check_time) {
            // Buffer: go back 1 hour from the last known record to catch any late-arriving offline events
            syncStart = dayjs(latestRecord.check_time).subtract(1, 'hour').toDate();
        } else {
            // Default: start of today
            syncStart = dayjs().tz("Asia/Ho_Chi_Minh").startOf('day').toDate();
        }

        // 2. Fetch events from Hikvision machine
        const events = await getAllEvents(syncStart, syncEnd);
        logger.info(`Fetched ${events.length} events from Hikvision device.`);

        if (events.length === 0) {
            await logSync("syncAttendance", "completed", "SYSTEM", 0, null, Date.now() - startTime);
            return;
        }

        // 3. Format and Upsert into Supabase
        const payloads = events.map(evt => ({
            event_id: evt.eventId,
            employee_id: evt.employeeNo,
            check_time: evt.eventTime,
            source: "HIKVISION",
            // The machine doesn't directly tell us check-in vs check-out. It just gives a timestamp.
            // The FDC app calculates that based on first/last event of the day.
            // "attendance_status" property might have context if defined by the terminal UI
        }));

        // Deduplicate the payloads by event_id locally before sending to Supabase
        const uniquePayloadsMap = new Map();
        for (const p of payloads) {
            uniquePayloadsMap.set(p.event_id, p);
        }
        const uniquePayloads = Array.from(uniquePayloadsMap.values());

        // Batch upserts to avoid hitting Supabase payload limits
        const batchSize = 1000;
        for (let i = 0; i < uniquePayloads.length; i += batchSize) {
            const batch = uniquePayloads.slice(i, i + batchSize);
            const { error: upsertErr } = await supabase
                .from("fdc_attendance_records")
                .upsert(batch, { onConflict: "event_id" });

            if (upsertErr) {
                throw new Error(`Failed to upsert attendance batch ${i}: ${upsertErr.message}`);
            }
        }

        recordsSynced = uniquePayloads.length;
        logger.info(`syncAttendanceJob completed for ${recordsSynced} records.`);
        await logSync("syncAttendance", "completed", "SYSTEM", recordsSynced, null, Date.now() - startTime);

    } catch (error: any) {
        logger.error("syncAttendanceJob failed:", error);
        await logSync("syncAttendance", "failed", "SYSTEM", recordsSynced, error.message, Date.now() - startTime);
    }
}
