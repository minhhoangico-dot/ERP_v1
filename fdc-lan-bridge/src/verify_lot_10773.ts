import { hisPool } from "./db/his";

async function run() {
    try {
        const res = await hisPool.query(`
            SELECT DISTINCT
                medicineid,
                medicinename,
                medicine_solo,
                medicine_hsdday,
                medicine_hsdmonth,
                medicine_hsdyear
            FROM tb_medicinedata
            WHERE medicineid = 10773
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
