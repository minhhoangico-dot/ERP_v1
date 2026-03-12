import { config } from 'dotenv';
import { resolve } from 'path';

// Fix env path
config({ path: resolve(__dirname, '../.env') });

import * as sql from 'mssql';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const sqlConfig = {
    user: process.env.MISA_DB_USER,
    password: process.env.MISA_DB_PASSWORD,
    database: process.env.MISA_DB_NAME,
    server: process.env.MISA_DB_SERVER || '192.168.1.2',
    port: parseInt(process.env.MISA_DB_PORT || '50114'),
    options: {
        encrypt: false,
        trustServerCertificate: true,
        instanceName: process.env.MISA_DB_INSTANCE || 'MISASME2017'
    }
};

async function backfill() {
    try {
        await sql.connect(sqlConfig);
        console.log("Connected to MISA");

        // We want to calculate end-of-day balances for the last 30 days
        for (let daysAgo = 30; daysAgo >= 1; daysAgo--) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() - daysAgo);
            const dateStr = targetDate.toISOString().split('T')[0];
            const dateEndOfDay = `${dateStr} 23:59:59.999`;

            console.log(`Processing date: ${dateStr}`);

            // Calculate stock AS OF targetDate
            const query = `
                SELECT 
                    i.InventoryItemID,
                    i.InventoryItemCode,
                    MAX(i.InventoryItemName) as InventoryItemName,
                    MAX(i.InventoryAccount) as InventoryAccount,
                    SUM(ISNULL(t.InQuantity, 0)) - SUM(ISNULL(t.OutQuantity, 0)) as StockQty,
                    SUM(ISNULL(t.InAmount, 0)) - SUM(ISNULL(t.OutAmount, 0)) as StockValue
                FROM InventoryItem i
                JOIN (
                    -- Opening Balance
                    SELECT 
                        InventoryItemID,
                        Quantity as InQuantity,
                        0 as OutQuantity,
                        Amount as InAmount,
                        0 as OutAmount
                    FROM OpeningInventoryEntry
                    
                    UNION ALL
                    
                    -- Ledger Transactions
                    SELECT 
                        InventoryItemID,
                        InwardQuantity as InQuantity,
                        OutwardQuantity as OutQuantity,
                        InwardAmount as InAmount,
                        OutwardAmount as OutAmount
                    FROM InventoryLedger 
                    WHERE RefDate <= '${dateEndOfDay}'
                ) t ON i.InventoryItemID = t.InventoryItemID
                WHERE i.InventoryAccount LIKE '152%'
                GROUP BY i.InventoryItemCode, i.InventoryItemID
                HAVING SUM(ISNULL(t.InQuantity, 0)) - SUM(ISNULL(t.OutQuantity, 0)) > 0
            `;

            const result = await sql.query(query);
            const supplies = result.recordset;

            const unitMapResult = await sql.query(`SELECT UnitID, UnitName FROM Unit`);
            const unitMap: Record<string, string> = {};
            unitMapResult.recordset.forEach(u => unitMap[u.UnitID] = u.UnitName);

            const inventoryMappingsResult = await sql.query(`SELECT InventoryItemID, UnitID FROM InventoryItem`);
            const itemUnitMap: Record<string, string> = {};
            inventoryMappingsResult.recordset.forEach(m => itemUnitMap[m.InventoryItemID] = m.UnitID);

            const payload = supplies.map(item => {
                const stock = item.StockQty;
                const value = item.StockValue;
                const price = stock > 0 ? Math.round(value / stock) : 0;

                const unitId = itemUnitMap[item.InventoryItemID];
                const unitName = unitId ? unitMap[unitId] : null;

                let category = "Vật tư";
                if (item.InventoryAccount?.startsWith('1521')) category = "Nguyên vật liệu";
                if (item.InventoryAccount?.startsWith('1522')) category = "Vật tư y tế";
                if (item.InventoryAccount?.startsWith('1523')) category = "Văn phòng phẩm";

                return {
                    misa_inventory_id: item.InventoryItemCode,
                    his_medicineid: `misa_${item.InventoryItemCode}`,
                    name: item.InventoryItemName || `Vật tư ${item.InventoryItemCode}`,
                    category: category,
                    warehouse: "Khối Vật Tư",
                    current_stock: stock,
                    approved_export: 0,
                    unit_price: price,
                    unit: unitName || "Cái",
                    status: stock > 0 ? "in_stock" : "out_of_stock",
                    snapshot_date: dateStr
                };
            });

            if (payload.length > 0) {
                // Split to avoid limit
                for (let i = 0; i < payload.length; i += 500) {
                    const batch = payload.slice(i, i + 500);
                    const { error } = await supabase
                        .from('fdc_inventory_snapshots')
                        .upsert(batch, { onConflict: 'his_medicineid,snapshot_date' });

                    if (error) {
                        console.error('Supabase error:', error);
                    }
                }
                console.log(`Inserted ${payload.length} rows for ${dateStr}`);
            }
        }

        console.log("Backfill complete");
    } catch (e) {
        console.error(e);
    } finally {
        // Connection will be closed when process exits; explicit close is not available on the imported namespace
    }
}

backfill();
