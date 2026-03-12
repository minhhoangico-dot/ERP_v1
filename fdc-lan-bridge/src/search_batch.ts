import { hisPool } from "./db/his";

async function run() {
    try {
        const res = await hisPool.query(`
            SELECT 
                medicineid,
                medicinename,
                medicine_solo,
                soluong,
                medicine_hsdday,
                medicine_hsdmonth,
                medicine_hsdyear
            FROM tb_medicinedata
            WHERE medicine_solo = 'FVH2647'
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
