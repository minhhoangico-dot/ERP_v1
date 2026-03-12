import { logger } from "./lib/logger";
import { startServer } from "./server";
import { startScheduler } from "./scheduler";
import { hisPool, checkHisConnection } from "./db/his";
import { misaPool, checkMisaConnection } from "./db/misa";

async function main() {
    logger.info("Starting FDC LAN Bridge Service...");

    // 1. Check Initial Connections
    logger.info("Testing DB Connections...");
    const hisOk = await checkHisConnection();
    const misaOk = await checkMisaConnection();

    if (!hisOk) logger.warn("Initial HIS PostgreSQL connection failed");
    if (!misaOk) logger.warn("Initial MISA SQL Server connection failed");

    // 2. Start Health Endpoint
    startServer();

    // 3. Start Scheduler
    startScheduler();

    logger.info("FDC LAN Bridge Service is running successfully.");
}

// Handle unexpected shutdown gracefully
const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    try {
        await hisPool.end();
        await misaPool.close();
        logger.info("Database pools closed.");
        process.exit(0);
    } catch (err) {
        logger.error("Error during shutdown", err);
        process.exit(1);
    }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("uncaughtException", (err) => {
    logger.error("Uncaught Exception", err);
});
process.on("unhandledRejection", (err) => {
    logger.error("Unhandled Rejection", err);
});

main().catch(err => {
    logger.error("Fatal startup error", err);
    process.exit(1);
});
