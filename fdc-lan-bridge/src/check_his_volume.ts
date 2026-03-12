import { Client } from 'pg';

const hisConfig = {
    host: '192.168.1.3',
    port: 5432,
    database: 'ABORIS',
    user: 'postgres',
    password: 'admin',
};

async function run() {
    const client = new Client(hisConfig);
    await client.connect();

    console.log("=== LƯỢT KHÁM THEO NGÀY (30 NGÀY) ===");
    const daily = await client.query(`
        SELECT 
            DATE(treatmentdate) as report_date,
            COUNT(treatmentid) as total_visits
        FROM tb_treatment
        WHERE treatmentdate >= CURRENT_DATE - INTERVAL '30 days'
          AND departmentid <> 6
        GROUP BY DATE(treatmentdate)
        ORDER BY report_date DESC
        LIMIT 20
    `);
    console.table(daily.rows);

    console.log("\n=== LƯỢT KHÁM THEO KHOA (30 NGÀY) ===");
    const byDept = await client.query(`
        SELECT 
            d.departmentname,
            COUNT(t.treatmentid) as total_visits
        FROM tb_treatment t
        JOIN tb_department d ON t.departmentid = d.departmentid
        WHERE t.treatmentdate >= CURRENT_DATE - INTERVAL '30 days'
          AND t.departmentid <> 6
        GROUP BY d.departmentname
        ORDER BY total_visits DESC
    `);
    console.table(byDept.rows);

    await client.end();
    process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });
