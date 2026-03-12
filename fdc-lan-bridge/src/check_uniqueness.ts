import { hisPool } from "./db/his";

async function run() {
    try {
        const res = await hisPool.query(`
            SELECT medicineid, departmentid, COUNT(*)
            FROM tb_medicinestore
            GROUP BY medicineid, departmentid
            HAVING COUNT(*) > 1
            LIMIT 10
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
