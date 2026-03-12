import { hisPool } from "./db/his";

async function run() {
    try {
        const res = await hisPool.query(`
            SELECT * FROM tb_medicinedata LIMIT 1
        `);
        console.log(Object.keys(res.rows[0]));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
