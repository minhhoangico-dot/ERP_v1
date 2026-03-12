import { hisPool } from "./db/his";

async function run() {
    try {
        const res = await hisPool.query(`
            SELECT SUM(soluong) as total_today 
            FROM tb_medicinedata 
            WHERE medicine_export_date::date = CURRENT_DATE 
              AND medicine_export_status = 1
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
