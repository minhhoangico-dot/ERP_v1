import * as mssql from "mssql";
import * as dotenv from "dotenv";

dotenv.config();

const config = {
    user: process.env.MISA_DB_USER,
    password: process.env.MISA_DB_PASSWORD,
    server: process.env.MISA_DB_SERVER,
    port: parseInt(process.env.MISA_DB_PORT || "1433"),
    database: process.env.MISA_DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function run() {
    try {
        console.log(`Connecting to MISA (${config.server}:${config.port})...`);
        const pool = await mssql.connect(config);
        console.log("Searching MISA for 'Kiisin' and 'BSGD00963'...");
        // Select all columns to find the unit column name
        const res = await pool.request().query(`
            SELECT TOP 5 * 
            FROM InventoryItem 
            WHERE InventoryItemCode LIKE '%BSGD00963%' 
               OR InventoryItemName LIKE '%Kiisin%'
        `);
        console.table(res.recordset);

        if (res.recordset.length > 0) {
            for (const item of res.recordset) {
                console.log(`Checking balance for ${item.InventoryItemName}...`);
                const balRes = await pool.request().query(`
                    SELECT SUM(InwardQuantity - OutwardQuantity) as stock
                    FROM InventoryLedger
                    WHERE InventoryItemCode = '${item.InventoryItemCode}'
                `);
                console.table(balRes.recordset);
            }
        } else {
            console.log("No items found in MISA. Checking for ANY Kiisin...");
            const broadRes = await pool.request().query(`
                SELECT TOP 10 InventoryItemCode, InventoryItemName 
                FROM InventoryItem 
                WHERE InventoryItemName LIKE '%Kiisin%'
            `);
            console.table(broadRes.recordset);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
