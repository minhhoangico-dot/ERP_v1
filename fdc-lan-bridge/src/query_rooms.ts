import { hisPool } from "./db/his";

async function run() {
    try {
        console.log("Checking tb_room...");
        const roomRes = await hisPool.query(`
            SELECT roomid, roomname 
            FROM tb_room 
            WHERE roomname ILIKE '%thuốc%' OR roomname ILIKE '%kho%' 
               OR roomname ILIKE '%pharmacy%'
        `);
        console.table(roomRes.rows);

        console.log("Checking tb_chamber...");
        const chamberRes = await hisPool.query(`
            SELECT chamberid, chambername 
            FROM tb_chamber 
            WHERE chambername ILIKE '%thuốc%' OR chambername ILIKE '%kho%'
        `);
        console.table(chamberRes.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
