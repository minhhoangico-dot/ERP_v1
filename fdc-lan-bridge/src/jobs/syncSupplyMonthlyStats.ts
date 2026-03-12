import { supabase } from "../db/supabase";
import { misaPool } from "../db/misa";
import { hisPool } from "../db/his";
import { logger } from "../lib/logger";
import { logSync } from "../lib/syncLog";
import sql from "mssql";

type MisaMonthlyRow = {
  acct: string;
  month: string;
  total_out_qty: number;
  total_out_amt: number;
};

type HisMonthlyRow = {
  month: string;
  total: string | number;
};

export async function syncSupplyMonthlyStatsJob() {
  const startTime = Date.now();
  let recordsSynced = 0;

  try {
    logger.info("Starting syncSupplyMonthlyStatsJob...");

    if (!misaPool.connected) {
      await misaPool.connect();
    }

    const request = new sql.Request(misaPool);

    // 1. Get monthly outward consumption from MISA for last 24 months
    const misaResult = await request.query<MisaMonthlyRow>(`
      SELECT 
        SUBSTRING(AccountNumber, 1, 4) AS acct,
        CONVERT(VARCHAR(7), PostedDate, 23) AS month,
        SUM(ISNULL(OutwardQuantity, 0)) AS total_out_qty,
        SUM(ISNULL(OutwardAmount, 0)) AS total_out_amt
      FROM InventoryLedger
      WHERE AccountNumber LIKE '152%'
        AND PostedDate >= DATEADD(MONTH, -24, GETDATE())
        AND OutwardQuantity > 0
      GROUP BY SUBSTRING(AccountNumber, 1, 4), CONVERT(VARCHAR(7), PostedDate, 23)
    `);

    const misaRows = misaResult.recordset || [];
    logger.info(
      `syncSupplyMonthlyStatsJob: fetched ${misaRows.length} monthly rows from MISA.`
    );

    // Build map month -> account -> { qty, amt } and an "all" account
    const monthAccountMap = new Map<
      string,
      Map<string, { qty: number; amt: number }>
    >();

    misaRows.forEach((row) => {
      const month = row.month;
      const acct = row.acct;
      const qty = Number(row.total_out_qty) || 0;
      const amt = Number(row.total_out_amt) || 0;

      if (!monthAccountMap.has(month)) {
        monthAccountMap.set(month, new Map());
      }
      const accountMap = monthAccountMap.get(month)!;

      const current = accountMap.get(acct) || { qty: 0, amt: 0 };
      accountMap.set(acct, {
        qty: current.qty + qty,
        amt: current.amt + amt,
      });

      const allCurrent = accountMap.get("all") || { qty: 0, amt: 0 };
      accountMap.set("all", {
        qty: allCurrent.qty + qty,
        amt: allCurrent.amt + amt,
      });
    });

    // 2. Get monthly patient volume from HIS for last 24 months
    const hisResult = await hisPool.query<HisMonthlyRow>(`
      SELECT 
        TO_CHAR(treatmentdate, 'YYYY-MM') as month,
        COUNT(treatmentid) as total
      FROM tb_treatment
      WHERE treatmentdate >= NOW() - INTERVAL '24 months'
        AND departmentid <> 6
      GROUP BY TO_CHAR(treatmentdate, 'YYYY-MM')
      ORDER BY month
    `);

    const hisRows = hisResult.rows || [];
    const patientVolumeMap = new Map<string, number>();
    hisRows.forEach((row) => {
      const month = row.month;
      const total = typeof row.total === "string" ? parseInt(row.total, 10) : Number(row.total);
      patientVolumeMap.set(month, Number.isFinite(total) ? total : 0);
    });

    // 3. Prepare upsert payload with same-period-last-year values
    const payload: {
      report_month: string;
      account: string;
      consumption_amount: number;
      consumption_qty: number;
      consumption_amount_ly: number;
      consumption_qty_ly: number;
      patient_volume: number;
    }[] = [];

    const allMonths = Array.from(monthAccountMap.keys()).sort();

    for (const month of allMonths) {
      const accountMap = monthAccountMap.get(month);
      if (!accountMap) continue;

      const thisYear = parseInt(month.slice(0, 4), 10);
      const mm = month.slice(5, 7);
      const lastYearMonth = `${thisYear - 1}-${mm}`;

      const lastYearAccountMap = monthAccountMap.get(lastYearMonth);

      for (const [account, values] of accountMap.entries()) {
        const lyValues = lastYearAccountMap?.get(account);
        const patientVolume = patientVolumeMap.get(month) || 0;

        payload.push({
          report_month: month,
          account,
          consumption_amount: values.amt,
          consumption_qty: values.qty,
          consumption_amount_ly: lyValues ? lyValues.amt : 0,
          consumption_qty_ly: lyValues ? lyValues.qty : 0,
          patient_volume: patientVolume,
        });
      }
    }

    if (payload.length === 0) {
      logger.warn(
        "syncSupplyMonthlyStatsJob: no monthly data to upsert; skipping Supabase write."
      );
      await logSync("syncSupplyMonthlyStats", "completed", "BOTH", 0, null, Date.now() - startTime);
      return;
    }

    const { error } = await supabase
      .from("fdc_supply_monthly_stats")
      .upsert(payload, { onConflict: "report_month,account" });

    if (error) {
      logger.error(
        "syncSupplyMonthlyStatsJob: error upserting monthly stats to Supabase",
        error
      );
      throw error;
    }

    recordsSynced = payload.length;

    await logSync("syncSupplyMonthlyStats", "completed", "BOTH", recordsSynced, null, Date.now() - startTime);
    logger.info(
      `syncSupplyMonthlyStatsJob completed successfully for ${recordsSynced} rows.`
    );
  } catch (error: any) {
    logger.error("syncSupplyMonthlyStatsJob failed:", error);
    await logSync(
      "syncSupplyMonthlyStats",
      "failed",
      "BOTH",
      recordsSynced,
      error?.message || "Unknown error",
      Date.now() - startTime
    );
  }
}

