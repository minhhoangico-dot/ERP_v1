import { Client } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const hisDbConfig = {
    user: process.env.HIS_DB_USER,
    password: process.env.HIS_DB_PASSWORD,
    host: process.env.HIS_DB_HOST,
    port: parseInt(process.env.HIS_DB_PORT || '5432'),
    database: process.env.HIS_DB_NAME,
};

async function explore() {
    const client = new Client(hisDbConfig);
    try {
        await client.connect();

        console.log("=== tb_nhanvien khoachucnangid ===");
        const q1 = `SELECT khoachucnangid, COUNT(*) FROM tb_nhanvien GROUP BY khoachucnangid ORDER BY khoachucnangid`;
        const r1 = await client.query(q1);
        console.table(r1.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

explore();
