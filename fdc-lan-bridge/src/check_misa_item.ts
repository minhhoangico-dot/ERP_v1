import { misaPool } from "./db/misa";

async function run() {
    try {
        if (!misaPool.connected) {
            await misaPool.connect();
        }
        const res = await misaPool.request().query(`
            SELECT 
                InventoryItemCode, 
                InventoryItemName, 
                StockId, 
                ISNULL(InwardQuantity, 0) as InwardQuantity,
                ISNULL(OutwardQuantity, 0) as OutwardQuantity
            FROM InventoryLedger
            WHERE InventoryItemName LIKE N'%A-Kiisin%'
        `);
        console.table(res.recordset);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
