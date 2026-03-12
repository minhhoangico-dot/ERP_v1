import { hisPool } from "./db/his";

async function run() {
    try {
        console.log("Checking tb_medicinedata for A-Kiisin details...");
        const res = await hisPool.query(`
            SELECT * 
            FROM tb_medicinedata 
            WHERE medicinename ILIKE '%Kiisin%'
        `);
        console.log(`Found ${res.rows.length} records.`);
        for (const row of res.rows) {
            console.log("--- Record ---");
            Object.entries(row).forEach(([key, val]) => {
                if (val !== null && val !== 0 && val !== "") {
                    console.log(`${key}: ${val}`);
                }
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
