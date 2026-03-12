import { hisPool } from "./db/his";

async function run() {
    try {
        const res = await hisPool.query(`
            SELECT * FROM tb_medicinedata 
            WHERE soluong = 1331
        `);
        console.table(res.rows);
    } catch (e) {
        // Retry with different column name if fails
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
