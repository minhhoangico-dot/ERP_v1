import { hisPool } from "./db/his";

async function run() {
    try {
        // 1. Find department
        const depRes = await hisPool.query(`
            SELECT departmentid, departmentname FROM tb_department
            WHERE departmentname ILIKE '%Nhà thuốc%'
        `);
        console.log("Departments found:");
        console.table(depRes.rows);

        if (depRes.rows.length > 0) {
            const depId = depRes.rows[0].departmentid;
            // 2. Check stock in this department for Acemuc
            const stockRes = await hisPool.query(`
                SELECT 
                    d.medicineid,
                    d.medicinename,
                    s.soluongtonkho,
                    s.medicinestoreid
                FROM tb_medicinedata d
                JOIN tb_medicinestore s ON d.medicineid = s.medicineid
                WHERE s.departmentid = $1 AND d.medicinename LIKE '%Acemuc%'
            `, [depId]);
            console.log(`Stock in department ${depId}:`);
            console.table(stockRes.rows);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
