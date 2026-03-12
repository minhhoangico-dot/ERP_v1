import { hisPool } from "./db/his";

async function run() {
    try {
        console.log("Searching for A-Kiisin in tb_medicinedata...");
        const res = await hisPool.query(`
            SELECT DISTINCT medicineid, medicinename, medicinecode, donvisudung 
            FROM tb_medicinedata 
            WHERE medicinename ILIKE '%Kiisin%'
        `);
        console.table(res.rows);

        for (const row of res.rows) {
            const medId = row.medicineid;
            console.log(`Checking stock for ${row.medicinename} (ID: ${medId}) in ALL departments...`);
            const storeRes = await hisPool.query(`
                SELECT s.soluongtonkho, dep.departmentname, dep.departmentid
                FROM tb_medicinestore s
                JOIN tb_department dep ON s.departmentid = dep.departmentid
                WHERE s.medicineid = $1
            `, [medId]);
            console.table(storeRes.rows);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
