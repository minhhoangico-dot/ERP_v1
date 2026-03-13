import sql from "mssql";
import { misaPool } from "../db/misa";
import { supabase } from "../db/supabase";
import { logger } from "../lib/logger";
import { logSync } from "../lib/syncLog";

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function backfillMisaInventoryDailyValueJob(days = 365) {
  const startTime = Date.now();
  let rowsUpserted = 0;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - Math.max(1, days));

  const startDateStr = toIsoDate(startDate);
  const endDateStr = toIsoDate(endDate);

  try {
    logger.info(
      `Starting backfillMisaInventoryDailyValueJob (${startDateStr} -> ${endDateStr})...`,
    );

    if (!misaPool.connected) {
      await misaPool.connect();
    }

    const request = new sql.Request(misaPool);
    request.input("startDate", sql.Date, startDateStr);
    request.input("endDate", sql.Date, endDateStr);

    // Compute daily end-of-day totals for all inventory accounts 152%
    // Uses OpeningInventoryEntry as base + running sum of daily ledger deltas.
    const result = await request.query(`
      WITH base AS (
        SELECT
          SUM(ISNULL(oe.Quantity, 0)) AS base_qty,
          SUM(ISNULL(oe.Amount, 0)) AS base_amt
        FROM OpeningInventoryEntry oe
        JOIN InventoryItem i ON i.InventoryItemID = oe.InventoryItemID
        WHERE i.InventoryAccount LIKE '152%'
      ),
      daily AS (
        SELECT
          CAST(l.RefDate AS date) AS d,
          SUM(ISNULL(l.InwardQuantity, 0) - ISNULL(l.OutwardQuantity, 0)) AS delta_qty,
          SUM(ISNULL(l.InwardAmount, 0) - ISNULL(l.OutwardAmount, 0)) AS delta_amt
        FROM InventoryLedger l
        JOIN InventoryItem i ON i.InventoryItemID = l.InventoryItemID
        WHERE i.InventoryAccount LIKE '152%'
          AND l.RefDate >= @startDate
          AND l.RefDate < DATEADD(DAY, 1, @endDate)
        GROUP BY CAST(l.RefDate AS date)
      ),
      dates AS (
        SELECT CAST(@startDate AS date) AS d
        UNION ALL
        SELECT DATEADD(DAY, 1, d) FROM dates WHERE d < CAST(@endDate AS date)
      ),
      filled AS (
        SELECT
          dt.d,
          ISNULL(daily.delta_qty, 0) AS delta_qty,
          ISNULL(daily.delta_amt, 0) AS delta_amt
        FROM dates dt
        LEFT JOIN daily ON daily.d = dt.d
      )
      SELECT
        f.d AS snapshot_date,
        CAST((SELECT ISNULL(base_qty, 0) FROM base) +
          SUM(f.delta_qty) OVER (ORDER BY f.d ROWS UNBOUNDED PRECEDING) AS decimal(18, 2)) AS total_stock,
        CAST((SELECT ISNULL(base_amt, 0) FROM base) +
          SUM(f.delta_amt) OVER (ORDER BY f.d ROWS UNBOUNDED PRECEDING) AS decimal(18, 2)) AS total_value
      FROM filled f
      ORDER BY f.d
      OPTION (MAXRECURSION 400);
    `);

    const rows = result.recordset as Array<{
      snapshot_date: Date | string;
      total_stock: number;
      total_value: number;
    }>;

    if (!rows || rows.length === 0) {
      logger.warn("No rows returned from MISA daily totals query.");
      await logSync(
        "backfillMisaInventoryDailyValue",
        "completed",
        "MISA",
        0,
        null,
        Date.now() - startTime,
      );
      return;
    }

    logger.info(`Computed ${rows.length} daily totals; upserting into Supabase...`);

    const payload = rows.map((r) => ({
      snapshot_date: typeof r.snapshot_date === "string" ? r.snapshot_date : toIsoDate(new Date(r.snapshot_date)),
      module_type: "inventory",
      total_stock: Number(r.total_stock) || 0,
      total_value: Number(r.total_value) || 0,
    }));

    const batchSize = 250;
    for (let i = 0; i < payload.length; i += batchSize) {
      const batch = payload.slice(i, i + batchSize);
      const { error } = await supabase
        .from("fdc_inventory_daily_value")
        .upsert(batch, { onConflict: "snapshot_date,module_type" });

      if (error) {
        logger.error("Supabase upsert error (fdc_inventory_daily_value)", error);
        throw error;
      }
      rowsUpserted += batch.length;
    }

    await logSync(
      "backfillMisaInventoryDailyValue",
      "completed",
      "MISA",
      rowsUpserted,
      null,
      Date.now() - startTime,
    );
    logger.info(`backfillMisaInventoryDailyValueJob completed. Upserted ${rowsUpserted} rows.`);
  } catch (err: any) {
    logger.error("backfillMisaInventoryDailyValueJob failed:", err);
    await logSync(
      "backfillMisaInventoryDailyValue",
      "failed",
      "MISA",
      rowsUpserted,
      err?.message || String(err),
      Date.now() - startTime,
    );
  }
}

