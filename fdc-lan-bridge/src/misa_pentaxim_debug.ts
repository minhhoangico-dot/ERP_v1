import { misaPool } from "./db/misa";

async function run() {
  try {
    if (!misaPool.connected) {
      await misaPool.connect();
    }

    const request = misaPool.request();

    // 1) Inventory-related tables
    const tablesRes = await request.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
        AND (
          TABLE_NAME LIKE 'INInward%' OR
          TABLE_NAME LIKE 'INOutward%' OR
          TABLE_NAME LIKE '%Inventory%' OR
          TABLE_NAME LIKE '%Ledger%'
        )
      ORDER BY TABLE_NAME
    `);

    console.log("=== Candidate inventory-related tables ===");
    console.table(tablesRes.recordset);

    // 2) Pentaxim item in InventoryItem
    const itemRes = await request.query(`
      SELECT TOP 1 InventoryItemID, InventoryItemCode, InventoryItemName
      FROM InventoryItem
      WHERE InventoryItemName LIKE N'%PENTAXIM%'
      ORDER BY InventoryItemName
    `);

    console.log("\n=== Pentaxim item in InventoryItem ===");
    console.table(itemRes.recordset);

    if (!itemRes.recordset.length) {
      console.log("No Pentaxim InventoryItem found.");
      return;
    }

    const itemId = itemRes.recordset[0].InventoryItemID;

    // 3) Row counts in key movement tables and net stock from InventoryLedger
    const countsRes = await request.query(`
      SELECT 'OpeningInventoryEntry' AS Source, COUNT(*) AS Cnt, NULL AS NetQty
      FROM OpeningInventoryEntry WHERE InventoryItemID = '${itemId}'
      UNION ALL
      SELECT 'InventoryLedger' AS Source, COUNT(*) AS Cnt,
             SUM(ISNULL(InwardQuantity,0) - ISNULL(OutwardQuantity,0)) AS NetQty
      FROM InventoryLedger WHERE InventoryItemID = '${itemId}'
      UNION ALL
      SELECT 'INInwardDetail' AS Source, COUNT(*) AS Cnt, NULL AS NetQty
      FROM INInwardDetail WHERE InventoryItemID = '${itemId}'
      UNION ALL
      SELECT 'INOutwardDetail' AS Source, COUNT(*) AS Cnt, NULL AS NetQty
      FROM INOutwardDetail WHERE InventoryItemID = '${itemId}';
    `);

    console.log("\n=== Row counts for Pentaxim in main movement tables ===");
    console.table(countsRes.recordset);

    // 4) We attempted to sample INOutwardDetail / INInwardDetail earlier,
    // but those tables do not expose RefNo directly in this schema.
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();

