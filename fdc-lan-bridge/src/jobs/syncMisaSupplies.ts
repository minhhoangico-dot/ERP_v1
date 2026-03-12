import { supabase } from "../db/supabase";
import { misaPool } from "../db/misa";
import { logger } from "../lib/logger";
import { logSync } from "../lib/syncLog";
import sql from 'mssql';

export async function syncMisaSuppliesJob() {
    const startTime = Date.now();
    let recordsSynced = 0;

    try {
        logger.info("Starting syncMisaSuppliesJob...");

        // Ensure MISA connection pool is ready
        if (!misaPool.connected) {
            await misaPool.connect();
        }

        const request = new sql.Request(misaPool);

        // Fetch current stock balance (Opening Balance + Inward - Outward)
        const result = await request.query(`
            SELECT 
                i.InventoryItemCode,
                MAX(i.InventoryItemName) as InventoryItemName,
                MAX(i.InventoryAccount) as InventoryAccount,
                MAX(CAST(i.UnitID AS VARCHAR(36))) as UnitID,
                SUM(ISNULL(t.InQuantity, 0)) - SUM(ISNULL(t.OutQuantity, 0)) as balance,
                SUM(ISNULL(t.InAmount, 0)) - SUM(ISNULL(t.OutAmount, 0)) as total_value
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
            ) t ON i.InventoryItemID = t.InventoryItemID
            WHERE i.InventoryAccount LIKE '152%'
            GROUP BY i.InventoryItemCode
            HAVING SUM(ISNULL(t.InQuantity, 0)) - SUM(ISNULL(t.OutQuantity, 0)) > 0
        `);

        const supplies = result.recordset;
        logger.info(`Found ${supplies.length} supply items in MISA with positive stock`);

        // Get Unit Names mapping (UnitID -> UnitName) from MISA
        const unitResult = await request.query(`
             SELECT CAST(UnitID AS VARCHAR(36)) as UnitID, UnitName FROM Unit
        `);
        const unitMap: Record<string, string> = {};
        unitResult.recordset.forEach(u => {
            unitMap[u.UnitID] = u.UnitName;
        });

        const snapshotDate = new Date().toISOString().split('T')[0];

        // Process data
        const payload = supplies.map(item => {
            const stock = Number(item.balance) || 0;
            const totalValue = Number(item.total_value) || 0;
            const price = stock > 0 ? totalValue / stock : 0;

            const unitName = item.UnitID ? unitMap[item.UnitID] : "Cái";

            // Map MISA accounts to our categories
            let category = "Vật tư";
            if (item.InventoryAccount?.startsWith('1521')) category = "Nguyên vật liệu";
            if (item.InventoryAccount?.startsWith('1522')) category = "Vật tư y tế";
            if (item.InventoryAccount?.startsWith('1523')) category = "Văn phòng phẩm";

            return {
                misa_inventory_id: item.InventoryItemCode, // Using MISA code
                his_medicineid: `misa_${item.InventoryItemCode}`, // Keep backward compatibility format if needed
                name: item.InventoryItemName || `Vật tư ${item.InventoryItemCode}`,
                category: category,
                warehouse: "Khối Vật Tư", // Simplified warehouse mapping
                current_stock: stock,
                approved_export: 0,
                unit_price: price,
                unit: unitName || "Cái",
                status: stock > 0 ? "in_stock" : "out_of_stock",
                snapshot_date: snapshotDate
            };
        });

        // Split into batches to avoid hitting Supabase payload limits
        const batchSize = 500;
        for (let i = 0; i < payload.length; i += batchSize) {
            const batch = payload.slice(i, i + batchSize);
            const { error } = await supabase
                .from('fdc_inventory_snapshots')
                .upsert(batch, { onConflict: 'his_medicineid,snapshot_date' });

            if (error) {
                logger.error(`Error inserting Supabase inventory batch ${i / batchSize}:`, error);
                throw error;
            }
        }

        recordsSynced = payload.length;
        await logSync('syncMisaSupplies', 'completed', 'MISA', recordsSynced, null, Date.now() - startTime);
        logger.info(`syncMisaSuppliesJob completed for ${recordsSynced} records.`);

    } catch (error: any) {
        logger.error("syncMisaSuppliesJob failed:", error);
        await logSync('syncMisaSupplies', 'failed', 'MISA', recordsSynced, error.message, Date.now() - startTime);
    }
}
