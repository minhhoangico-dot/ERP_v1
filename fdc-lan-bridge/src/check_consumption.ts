import sql from 'mssql';

const config = {
    user: process.env.MISA_DB_USER || "",
    password: process.env.MISA_DB_PASSWORD || "",
    server: process.env.MISA_DB_SERVER || "",
    port: process.env.MISA_DB_PORT ? parseInt(process.env.MISA_DB_PORT, 10) : 0,
    database: process.env.MISA_DB_NAME || "",
    options: { encrypt: false, trustServerCertificate: true }
};

async function run() {
    try {
        await sql.connect(config);

        // 1. Daily outward by account (last 30 days)
        console.log("=== TIÊU THỤ VẬT TƯ THEO NGÀY (30 NGÀY GẦN NHẤT) ===");
        const daily = await sql.query(`
            SELECT 
                CONVERT(VARCHAR(10), l.PostedDate, 23) as [Date],
                SUBSTRING(l.AccountNumber, 1, 4) as Account,
                COUNT(DISTINCT l.InventoryItemID) as Items,
                SUM(ISNULL(l.OutwardQuantity, 0)) as TotalOut,
                SUM(ISNULL(l.OutwardAmount, 0)) as TotalOutAmt
            FROM InventoryLedger l
            WHERE l.AccountNumber LIKE '152%'
              AND l.PostedDate >= DATEADD(DAY, -30, GETDATE())
              AND l.OutwardQuantity > 0
            GROUP BY CONVERT(VARCHAR(10), l.PostedDate, 23), SUBSTRING(l.AccountNumber, 1, 4)
            ORDER BY [Date] DESC, Account
        `);
        console.table(daily.recordset.slice(0, 20));

        // 2. Top consumers last 30 days
        console.log("\n=== TOP 10 VẬT TƯ TIÊU THỤ NHIỀU NHẤT (30 NGÀY) ===");
        const top = await sql.query(`
            SELECT TOP 10
                l.InventoryItemCode,
                MAX(l.InventoryItemName) as Name,
                SUM(l.OutwardQuantity) as TotalOut,
                SUM(l.OutwardAmount) as TotalOutAmt
            FROM InventoryLedger l
            WHERE l.AccountNumber LIKE '152%'
              AND l.PostedDate >= DATEADD(DAY, -30, GETDATE())
              AND l.OutwardQuantity > 0
            GROUP BY l.InventoryItemCode
            ORDER BY TotalOut DESC
        `);
        console.table(top.recordset);

        // 3. RefType breakdown for outward
        console.log("\n=== LOẠI XUẤT KHO (30 NGÀY) ===");
        const refTypes = await sql.query(`
            SELECT 
                l.RefTypeName,
                COUNT(*) as Count,
                SUM(l.OutwardQuantity) as TotalOut,
                SUM(l.OutwardAmount) as TotalOutAmt
            FROM InventoryLedger l
            WHERE l.AccountNumber LIKE '152%'
              AND l.PostedDate >= DATEADD(DAY, -30, GETDATE())
              AND l.OutwardQuantity > 0
            GROUP BY l.RefTypeName
            ORDER BY TotalOut DESC
        `);
        console.table(refTypes.recordset);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit(0);
    }
}
run();
