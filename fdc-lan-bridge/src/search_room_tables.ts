import { hisPool } from "./db/his";

async function run() {
    try {
        const res = await hisPool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name LIKE 'tb_room%' 
               OR table_name LIKE 'tb_chamber%' 
               OR table_name LIKE '%room%' 
               OR table_name LIKE '%chamber%'
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
