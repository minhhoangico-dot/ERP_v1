import { hisPool } from "./db/his";

async function run() {
    try {
        const res = await hisPool.query(`
            SELECT 
                medicinecode,
                medicinename,
                medicine_solo,
                medicine_hsdday,
                medicine_hsdmonth,
                medicine_hsdyear,
                soluong,
                donvisudung
            FROM tb_medicinedata
            WHERE medicinecode = 'BSGD00007' OR medicinename LIKE '%Acemuc%'
            LIMIT 20
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
