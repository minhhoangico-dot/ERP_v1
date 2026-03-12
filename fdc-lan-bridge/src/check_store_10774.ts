import { hisPool } from "./db/his";

async function run() {
    try {
        const res = await hisPool.query(`
            SELECT s.*, dep.departmentname 
            FROM tb_medicinestore s
            JOIN tb_department dep ON s.departmentid = dep.departmentid
            WHERE s.medicineid = 10774
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
