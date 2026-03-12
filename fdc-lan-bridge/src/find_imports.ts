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

        console.log("=== Import History for BSGD00171 ===");
        const q1 = `
            SELECT 
                d.medicinecode, 
                d.medicinename,
                d.medicine_solo as batch_number,
                d.medicine_import_date as import_date,
                d.medicine_gia as price,
                d.medicine_gia_vat as vat,
                COALESCE(d.medicine_gia, 0) + (COALESCE(d.medicine_gia, 0) * COALESCE(d.medicine_gia_vat, 0) / 100) as unit_price,
                d.soluongnhap,
                b.medicineinvoicecode as invoice_code,
                b.medicine_nhacungcapname as supplier_name,
                b.medicinebilldate as bill_date
            FROM tb_medicinedata d
            LEFT JOIN tb_medicinebill b ON d.medicinebillid = b.medicinebillid
            WHERE d.medicinecode = 'BSGD00171' 
              AND d.medicine_import_status = 1
            ORDER BY d.medicine_import_date DESC NULLS LAST, d.medicinedataid DESC
            LIMIT 10;
        `;
        const r1 = await client.query(q1);
        console.table(r1.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

explore();
