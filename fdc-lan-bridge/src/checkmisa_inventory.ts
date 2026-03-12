const sql = require('mssql');

const config = {
    user: process.env.MISA_DB_USER || "",
    password: process.env.MISA_DB_PASSWORD || "",
    server: process.env.MISA_DB_SERVER || "",
    port: process.env.MISA_DB_PORT ? parseInt(process.env.MISA_DB_PORT, 10) : 0,
    database: process.env.MISA_DB_NAME || "",
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function run() {
    try {
        await sql.connect(config);

        // Get current stock balance (SUM inward - SUM outward) from InventoryLedger
        const result = await sql.query(`
            SELECT TOP 20
                l.InventoryItemCode,
                l.InventoryItemName,
                l.StockCode,
                l.StockName,
                SUM(ISNULL(l.InwardQuantity, 0)) - SUM(ISNULL(l.OutwardQuantity, 0)) as balance
            FROM InventoryLedger l
            GROUP BY l.InventoryItemCode, l.InventoryItemName, l.StockCode, l.StockName
            HAVING SUM(ISNULL(l.InwardQuantity, 0)) - SUM(ISNULL(l.OutwardQuantity, 0)) > 0
            ORDER BY balance DESC
        `);
        console.log("=== Top 20 Items by Stock Balance ===");
        console.table(result.recordset);

        // Count total unique items with positive stock
        const count = await sql.query(`
            SELECT COUNT(*) as total FROM (
                SELECT l.InventoryItemID
                FROM InventoryLedger l
                GROUP BY l.InventoryItemID, l.StockID
                HAVING SUM(ISNULL(l.InwardQuantity, 0)) - SUM(ISNULL(l.OutwardQuantity, 0)) > 0
            ) sub
        `);
        console.log("\nTotal items with positive stock:", count.recordset[0].total);

    } catch (err) {
        console.error("MISA Error:", err);
    } finally {
        await sql.close();
    }
}
run();
