import { hisPool } from "./db/his";

async function run() {
    try {
        const idRes = await hisPool.query(`
            SELECT DISTINCT medicineid, medicinename, medicinecode FROM tb_medicinedata 
            WHERE medicinename LIKE '%A-Kiisin%'
        `);
        console.log("Medicine IDs found for A-Kiisin:");
        console.table(idRes.rows);

        for (const row of idRes.rows) {
            const medId = row.medicineid;
            const storeRes = await hisPool.query(`
                SELECT s.departmentid, dep.departmentname, s.soluongtonkho 
                FROM tb_medicinestore s
                JOIN tb_department dep ON s.departmentid = dep.departmentid
                WHERE s.medicineid = $1
            `, [medId]);
            console.log(`Stock for medicineid ${medId} (${row.medicinename}):`);
            console.table(storeRes.rows);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
