import express from "express";
import { config } from "./config";
import { logger } from "./lib/logger";
import { checkHisConnection } from "./db/his";
import { checkMisaConnection } from "./db/misa";
import { supabase } from "./db/supabase";

const app = express();

app.get("/health", async (req, res) => {
    const hisStatus = await checkHisConnection();
    const misaStatus = await checkMisaConnection();

    // Get latest sync health from Supabase
    let queueDepth = 0;
    let lastHeartbeat = new Date().toISOString();

    try {
        const { data } = await supabase.from("fdc_sync_health").select("*").limit(1).single();
        if (data) {
            queueDepth = data.queue_depth || 0;
            lastHeartbeat = data.last_heartbeat;
        }
    } catch (err) {
        logger.error("Failed to fetch fdc_sync_health", err);
    }

    res.json({
        status: hisStatus && misaStatus ? "healthy" : "degraded",
        uptimeSeconds: process.uptime(),
        hisConnected: hisStatus,
        misaConnected: misaStatus,
        queueDepth,
        lastHeartbeat,
        timestamp: new Date().toISOString()
    });
});

export function startServer() {
    app.listen(config.port, () => {
        logger.info(`FDC LAN Bridge Health Server listening on port ${config.port}`);
    });
}
