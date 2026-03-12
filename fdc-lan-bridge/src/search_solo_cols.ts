import { hisPool } from "./db/his";

async function run() {
    try {
        const res = await hisPool.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE column_name LIKE '%solo%' OR column_name LIKE '%batch%'
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
