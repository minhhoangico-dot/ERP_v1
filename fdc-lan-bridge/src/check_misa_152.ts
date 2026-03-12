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

        console.log("=== THỐNG KÊ MẶT HÀNG THEO TÀI KHOẢN (1521, 1522, 1523) ===\n");

        for (const account of ['1521', '1522', '1523']) {
            console.log(`\n--- TÀI KHOẢN ${account} ---`);
            const res = await sql.query(`
                SELECT TOP 15
                    l.InventoryItemCode,
                    MAX(l.InventoryItemName) as Name,
                    MAX(l.StockCode) as Stock,
                    SUM(ISNULL(l.InwardQuantity, 0)) - SUM(ISNULL(l.OutwardQuantity, 0)) as Qty,
                    SUM(ISNULL(l.InwardAmount, 0)) - SUM(ISNULL(l.OutwardAmount, 0)) as Value
                FROM InventoryLedger l
                WHERE l.AccountNumber LIKE '${account}%'
                GROUP BY l.InventoryItemCode, l.StockCode
                HAVING SUM(ISNULL(l.InwardQuantity, 0)) - SUM(ISNULL(l.OutwardQuantity, 0)) > 0
                ORDER BY Value DESC
            `);
            console.table(res.recordset);
        }

        console.log("\n=== TỔNG HỢP GIÁ TRỊ THEO TÀI KHOẢN ===");
        const summary = await sql.query(`
            SELECT 
                SUBSTRING(l.AccountNumber, 1, 4) as Account,
                COUNT(DISTINCT l.InventoryItemCode) as TotalItems,
                SUM(SUM(ISNULL(l.InwardQuantity, 0)) - SUM(ISNULL(l.OutwardQuantity, 0))) OVER(PARTITION BY SUBSTRING(l.AccountNumber, 1, 4)) as TotalQty,
                SUM(SUM(ISNULL(l.InwardAmount, 0)) - SUM(ISNULL(l.OutwardAmount, 0))) OVER(PARTITION BY SUBSTRING(l.AccountNumber, 1, 4)) as TotalValue
            FROM InventoryLedger l
            WHERE l.AccountNumber LIKE '152%'
            GROUP BY SUBSTRING(l.AccountNumber, 1, 4)
        `);
        // Remove duplicates from window function
        const uniqueSummary = Array.from(new Map(summary.recordset.map(item => [item.Account, item])).values());
        console.table(uniqueSummary);

    } catch (err) {
        console.error("MISA Error:", err);
    } finally {
        process.exit(0);
    }
}
run();
