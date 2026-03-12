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

        console.log("=== CHECKING REF TYPES IN LEDGER ===");
        const res = await sql.query(`
            SELECT TOP 20
                RefType,
                RefTypeName,
                COUNT(*) as Count,
                SUM(ISNULL(InwardQuantity, 0)) as TotalIn,
                SUM(ISNULL(OutwardQuantity, 0)) as TotalOut,
                SUM(ISNULL(InwardAmount, 0)) as TotalInAmt,
                SUM(ISNULL(OutwardAmount, 0)) as TotalOutAmt
            FROM InventoryLedger
            WHERE AccountNumber LIKE '152%'
            GROUP BY RefType, RefTypeName
            ORDER BY Count DESC
        `);
        console.table(res.recordset);

    } catch (err) {
        console.error("MISA Error:", err);
    } finally {
        process.exit(0);
    }
}
run();
