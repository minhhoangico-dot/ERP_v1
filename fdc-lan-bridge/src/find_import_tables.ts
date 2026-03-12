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

        console.log("=== Latest tb_medicinedata ===");
        const q3 = `
            SELECT 
                medicinedataid, medicinecode, medicinename, medicine_solo, 
                medicine_gia, medicine_gia_vat, medicine_gia_chietkhau, medicine_gia_ban
            FROM tb_medicinedata 
            WHERE medicinecode IN ('BSGD00171', 'BSGD00225')
            ORDER BY medicinedataid DESC
            LIMIT 10;
        `;
        const r3 = await client.query(q3);
        console.table(r3.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

explore();
