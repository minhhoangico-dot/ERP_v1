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

        console.log("=== CHECKING INVENTORY ITEM PRICES ===");
        const res = await sql.query(`
            SELECT TOP 20
                i.InventoryItemCode,
                i.InventoryItemName,
                i.InventoryAccount,
                i.UnitPrice,
                i.FixedUnitPrice,
                SUM(ISNULL(l.InwardQuantity, 0)) - SUM(ISNULL(l.OutwardQuantity, 0)) as Qty
            FROM InventoryItem i
            JOIN InventoryLedger l ON i.InventoryItemID = l.InventoryItemID
            WHERE i.InventoryAccount LIKE '152%'
            GROUP BY i.InventoryItemCode, i.InventoryItemName, i.InventoryAccount, i.UnitPrice, i.FixedUnitPrice
            HAVING SUM(ISNULL(l.InwardQuantity, 0)) - SUM(ISNULL(l.OutwardQuantity, 0)) > 0
            ORDER BY Qty DESC
        `);
        console.table(res.recordset);

    } catch (err) {
        console.error("MISA Error:", err);
    } finally {
        process.exit(0);
    }
}
run();
