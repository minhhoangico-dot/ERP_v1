import { hisPool } from "./db/his";

async function run() {
    try {
        const res = await hisPool.query(`
            SELECT 
                d.medicineid,
                d.medicinename,
                s.departmentid,
                dep.departmentname,
                s.soluongtonkho
            FROM tb_medicinedata d
            JOIN tb_medicinestore s ON d.medicineid = s.medicineid
            JOIN tb_department dep ON s.departmentid = dep.departmentid
            WHERE d.medicineid LIKE 'BSGD%' OR d.medicinename LIKE '%Acemuc%'
            LIMIT 50
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
