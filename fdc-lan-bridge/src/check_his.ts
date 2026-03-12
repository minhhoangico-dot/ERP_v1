import { hisPool } from "./db/his";

async function run() {
    try {
        const res = await hisPool.query(`
            SELECT 
                s.medicineid || '_' || s.departmentid as his_medicineid,
                d.medicinename,
                dep.departmentname,
                s.soluongtonkho
            FROM tb_medicinestore s
            LEFT JOIN tb_medicinedata d ON s.medicineid = d.medicineid
            LEFT JOIN tb_department dep ON s.departmentid = dep.departmentid
            WHERE d.medicinename ILIKE '%A-Kiisin%'
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
