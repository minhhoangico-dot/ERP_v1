import { hisPool } from './db/his';

async function run() {
    // Check if HIS has historical export data we can use to backfill
    const result = await hisPool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name='tb_medicinedata' 
      AND (column_name LIKE '%date%' OR column_name LIKE '%ngay%' OR column_name LIKE '%time%' OR column_name LIKE '%export%')
    ORDER BY column_name
  `);
    console.log('tb_medicinedata date/export columns:', result.rows.map(r => r.column_name));

    // Check how far back export data goes
    const exportRange = await hisPool.query(`
    SELECT 
      MIN(medicine_export_date::date) as earliest_export,
      MAX(medicine_export_date::date) as latest_export,
      COUNT(*) as total_exports
    FROM tb_medicinedata 
    WHERE medicine_export_date IS NOT NULL AND medicine_export_status = 1
  `);
    console.log('Export data range:', exportRange.rows[0]);

    // Check if there's any daily aggregate we can use
    const dailyExports = await hisPool.query(`
    SELECT 
      medicine_export_date::date as export_date, 
      COUNT(*) as num_exports,
      SUM(soluong) as total_qty_exported
    FROM tb_medicinedata 
    WHERE medicine_export_date IS NOT NULL 
      AND medicine_export_status = 1
      AND medicine_export_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY medicine_export_date::date
    ORDER BY export_date DESC
    LIMIT 35
  `);
    console.log('\nDaily exports last 30 days:');
    dailyExports.rows.forEach(r => console.log(`  ${r.export_date}: ${r.num_exports} exports, qty: ${r.total_qty_exported}`));

    // Check import data
    const importRange = await hisPool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name='tb_medicinedata' 
      AND (column_name LIKE '%import%' OR column_name LIKE '%nhap%' OR column_name LIKE '%create%')
    ORDER BY column_name
  `);
    console.log('\ntb_medicinedata import/create columns:', importRange.rows.map(r => r.column_name));

    // Check tb_medicinestore for any history/timestamp columns
    const storeColumns = await hisPool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name='tb_medicinestore'
    ORDER BY column_name
  `);
    console.log('\ntb_medicinestore all columns:', storeColumns.rows.map(r => r.column_name));

    process.exit(0);
}

run();
