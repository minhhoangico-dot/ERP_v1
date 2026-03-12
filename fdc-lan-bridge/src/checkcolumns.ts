import { hisPool } from "./db/his";

async function run() {
    try {
        const res2 = await hisPool.query(`
            SELECT dm_nhanvientypeid, COUNT(*) as count, string_agg(nhanvienname, ', ') as sample_names
            FROM tb_nhanvien
            WHERE nhanviendisable = 0 OR nhanviendisable IS NULL
            GROUP BY dm_nhanvientypeid
            ORDER BY count DESC
        `);
        console.log("Groups by dm_nhanvientypeid:");
        res2.rows.forEach(r => {
            console.log(`ID: ${r.dm_nhanvientypeid} | Count: ${r.count} | Examples: ${r.sample_names.substring(0, 100)}...`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        hisPool.end();
    }
}
run();
