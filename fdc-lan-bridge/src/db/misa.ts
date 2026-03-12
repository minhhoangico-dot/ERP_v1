import sql from "mssql";
import { config } from "../config";
import { logger } from "../lib/logger";

const sqlConfig: sql.config = {
    user: config.misa.user,
    password: config.misa.password,
    database: config.misa.database,
    server: config.misa.server,
    port: config.misa.port,
    pool: {
        max: 3, // Max 3 connections as specified
        min: 0,
        idleTimeoutMillis: 30000,
    },
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
};

export const misaPool = new sql.ConnectionPool(sqlConfig);

misaPool.on("error", (err: any) => {
    logger.error("MISA SQL Server pool error", err);
});

export const checkMisaConnection = async () => {
    try {
        if (!misaPool.connected) {
            await misaPool.connect();
        }
        // simple query to check connection
        await misaPool.request().query("SELECT 1 as test");
        return true;
    } catch (err) {
        logger.error("Failed to connect to MISA SQL Server", err);
        return false;
    }
};
