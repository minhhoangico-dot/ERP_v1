import { hisPool } from "./db/his";

async function run() {
    try {
        const res = await hisPool.query(`
            SELECT roomid, roomname 
            FROM tb_room 
            WHERE roomname ILIKE '%Viện dưỡng lão%' 
               OR roomname ILIKE '%VDL%'
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
