import sql from 'mssql';

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

        console.log("=== CALCULATING TRUE STOCK BALANCE ===");
        const res = await sql.query(`
            SELECT TOP 20
                i.InventoryItemCode,
                MAX(i.InventoryItemName) as Name,
                MAX(i.InventoryAccount) as Account,
                SUM(ISNULL(t.InQuantity, 0)) - SUM(ISNULL(t.OutQuantity, 0)) as Qty,
                SUM(ISNULL(t.InAmount, 0)) - SUM(ISNULL(t.OutAmount, 0)) as Value
            FROM InventoryItem i
            JOIN (
                -- Opening Balance
                SELECT 
                    InventoryItemID,
                    Quantity as InQuantity,
                    0 as OutQuantity,
                    Amount as InAmount,
                    0 as OutAmount
                FROM OpeningInventoryEntry
                
                UNION ALL
                
                -- Ledger Transactions
                SELECT 
                    InventoryItemID,
                    InwardQuantity as InQuantity,
                    OutwardQuantity as OutQuantity,
                    InwardAmount as InAmount,
                    OutwardAmount as OutAmount
                FROM InventoryLedger
            ) t ON i.InventoryItemID = t.InventoryItemID
            WHERE i.InventoryAccount LIKE '152%'
            GROUP BY i.InventoryItemCode
            HAVING SUM(ISNULL(t.InQuantity, 0)) - SUM(ISNULL(t.OutQuantity, 0)) > 0
            ORDER BY Value DESC
        `);
        console.table(res.recordset);

        console.log("\n=== TỔNG HỢP GIÁ TRỊ THEO TÀI KHOẢN ===");
        const summary = await sql.query(`
            SELECT 
                SUBSTRING(i.InventoryAccount, 1, 4) as Account,
                COUNT(DISTINCT i.InventoryItemCode) as TotalItems,
                SUM(ISNULL(t.InQuantity, 0)) - SUM(ISNULL(t.OutQuantity, 0)) as TotalQty,
                SUM(ISNULL(t.InAmount, 0)) - SUM(ISNULL(t.OutAmount, 0)) as TotalValue
            FROM InventoryItem i
            JOIN (
                SELECT InventoryItemID, Quantity as InQuantity, 0 as OutQuantity, Amount as InAmount, 0 as OutAmount
                FROM OpeningInventoryEntry
                UNION ALL
                SELECT InventoryItemID, InwardQuantity as InQuantity, OutwardQuantity as OutQuantity, InwardAmount as InAmount, OutwardAmount as OutAmount
                FROM InventoryLedger
            ) t ON i.InventoryItemID = t.InventoryItemID
            WHERE i.InventoryAccount LIKE '152%'
            GROUP BY SUBSTRING(i.InventoryAccount, 1, 4)
            ORDER BY Account
        `);
        console.table(summary.recordset);

    } catch (err) {
        console.error("MISA Error:", err);
    } finally {
        process.exit(0);
    }
}
run();
