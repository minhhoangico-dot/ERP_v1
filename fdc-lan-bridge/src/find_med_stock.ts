import { hisPool } from "./db/his";

async function run() {
    try {
        // 1. Find medicineid for BSGD00007
        const idRes = await hisPool.query(`
            SELECT DISTINCT medicineid, medicinename FROM tb_medicinedata 
            WHERE medicinecode = 'BSGD00007' OR medicinecode = 'Bsgd01457'
        `);
        console.log("Medicine IDs found:");
        console.table(idRes.rows);

        if (idRes.rows.length > 0) {
            const medId = idRes.rows[0].medicineid;

            // 2. Search for stock in tb_medicinestore
            const storeRes = await hisPool.query(`
                SELECT s.*, dep.departmentname 
                FROM tb_medicinestore s
                JOIN tb_department dep ON s.departmentid = dep.departmentid
                WHERE s.medicineid = $1
            `, [medId]);
            console.log(`Presence in tb_medicinestore for medicineid ${medId}:`);
            console.table(storeRes.rows);

            // 3. Search for stock in tb_medicinedata (aggregating)
            const dataRes = await hisPool.query(`
                SELECT medicine_solo, SUM(soluong) as total_soluong
                FROM tb_medicinedata
                WHERE medicineid = $1
                GROUP BY medicine_solo
            `, [medId]);
            console.log(`Presence in tb_medicinedata for medicineid ${medId}:`);
            console.table(dataRes.rows);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
