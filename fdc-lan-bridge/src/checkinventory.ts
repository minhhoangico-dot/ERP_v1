import { hisPool } from "./db/his";

async function run() {
    try {
        const res = await hisPool.query(`
            SELECT departmentid, departmentname 
            FROM tb_department 
            WHERE departmentid IN (1, 2, 4, 6)
        `);
        console.log("Department Mappings:");
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        hisPool.end();
    }
}
run();
