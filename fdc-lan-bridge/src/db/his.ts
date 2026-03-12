import { Pool } from "pg";
import { config } from "../config";
import { logger } from "../lib/logger";

export const hisPool = new Pool({
    host: config.his.host,
    port: config.his.port,
    database: config.his.database,
    user: config.his.user,
    password: config.his.password,
    max: 3, // Max 3 connections as specified
    idleTimeoutMillis: 30000,
});

hisPool.on("error", (err) => {
    logger.error("HIS PostgreSQL pool error", err);
});

export const checkHisConnection = async () => {
    try {
        const client = await hisPool.connect();
        client.release();
        return true;
    } catch (err) {
        logger.error("Failed to connect to HIS PostgreSQL", err);
        return false;
    }
};
