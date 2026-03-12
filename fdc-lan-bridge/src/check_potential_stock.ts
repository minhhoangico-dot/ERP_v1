import { hisPool } from "./db/his";

async function run() {
    try {
        const tables = [
            'tb_medicinestore_capnhattonkho',
            'tb_medicinebill_kiemke',
            'tb_medicinethau_data',
            'tb_medicinegiaban'
        ];

        for (const table of tables) {
            const res = await hisPool.query(`
                SELECT * FROM ${table} LIMIT 1
            `);
            console.log(`Columns for ${table}:`);
            if (res.rows.length > 0) {
                console.log(Object.keys(res.rows[0]));
            } else {
                console.log("(No data)");
                // Try getting columns from information_schema
                const colRes = await hisPool.query(`
                    SELECT column_name FROM information_schema.columns WHERE table_name = $1
                `, [table]);
                console.log(colRes.rows.map(r => r.column_name));
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
