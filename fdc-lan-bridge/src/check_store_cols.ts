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

        // Check InventoryItem for accounts 152, 1521, 1522, 1523
        const accRes = await sql.query(`
            SELECT TOP 10 InventoryItemCode, InventoryItemName, InventoryAccount
            FROM InventoryItem
            WHERE InventoryAccount LIKE '152%'
        `);
        console.log("=== Items with Account 152* ===");
        console.table(accRes.recordset);

        // Check InventoryLedger for AccountNumber 152*
        const ledRes = await sql.query(`
            SELECT TOP 10 InventoryItemCode, InventoryItemName, AccountNumber
            FROM InventoryLedger
            WHERE AccountNumber LIKE '152%'
        `);
        console.log("\n=== Ledger Entries with Account 152* ===");
        console.table(ledRes.recordset);

    } catch (err) {
        console.error("MISA Error:", err);
    } finally {
        process.exit(0);
    }
}
run();
