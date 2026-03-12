import { mssql, misaPool } from "./db/misa";

async function run() {
    try {
        const pool = await misaPool;
        console.log("Searching MISA for 'Kiisin' and 'BSGD00963'...");
        const res = await pool.request().query(`
            SELECT InventoryItemCode, InventoryItemName, UnitName 
            FROM InventoryItem 
            WHERE InventoryItemCode LIKE '%BSGD00963%' 
               OR InventoryItemName LIKE '%Kiisin%'
        `);
        console.table(res.recordset);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
