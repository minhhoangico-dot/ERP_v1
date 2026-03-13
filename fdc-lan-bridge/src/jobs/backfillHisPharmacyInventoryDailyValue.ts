import { hisPool } from "../db/his";
import { supabase } from "../db/supabase";
import { logger } from "../lib/logger";
import { logSync } from "../lib/syncLog";

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Backfill daily tổng tồn kho & giá trị cho Kho Thuốc (module_type = 'pharmacy')
 * hoàn toàn từ HIS, không dùng MISA.
 *
 * Cách tính:
 * - Lấy tồn đầu kỳ từ `tb_medicinestore` bằng cách chạy lùi ngược theo lịch sử
 *   xuất/nhập trong `tb_medicinedata` (giống mô hình backfill từ MISA).
 * - Chỉ dùng các phát sinh có liên quan đến thuốc (medicine_import_* / medicine_export_*).
 *
 * Lưu ý: Hàm này dùng cho backfill 1 lần (ví dụ 365 ngày trở lại), sau đó
 * sync hằng ngày sẽ dùng job realtime khác.
 */
export async function backfillHisPharmacyInventoryDailyValueJob(days = 365) {
  const startTime = Date.now();
  let rowsUpserted = 0;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - Math.max(1, days));

  const startDateStr = toIsoDate(startDate);
  const endDateStr = toIsoDate(endDate);

  try {
    logger.info(
      `Starting backfillHisPharmacyInventoryDailyValueJob (${startDateStr} -> ${endDateStr})...`,
    );

    // 1. Tính tồn đầu kỳ trước startDate hoàn toàn từ HIS
    //    Quy ước:
    //    - Tồn cuối = tồn đầu + nhập - xuất
    //    => Tồn đầu kỳ = tồn cuối tại endDate - SUM(ngày>startDate)(nhập - xuất)
    //
    //    Vì HIS không lưu bảng tồn kho lịch sử chuẩn, ta tính forward từ
    //    một mốc base gần hiện tại (CURRENT_DATE) rồi suy ra lùi về startDate.
    const baseQuery = `
      WITH base_stock AS (
        -- Tồn kho hiện tại theo HIS
        SELECT
          SUM(COALESCE(s.soluongtonkho, 0)) AS qty,
          SUM(
            COALESCE(s.soluongtonkho, 0) *
            (
              COALESCE(d.medicine_gia, 0) +
              (COALESCE(d.medicine_gia, 0) * COALESCE(d.medicine_gia_vat, 0) / 100)
            )
          ) AS amt
        FROM tb_medicinestore s
        JOIN (
          SELECT DISTINCT ON (medicineid)
            medicineid,
            medicine_gia,
            medicine_gia_vat
          FROM tb_medicinedata
          ORDER BY medicineid,
                   CASE WHEN medicine_solo IS NOT NULL AND medicine_solo <> '' THEN 0 ELSE 1 END,
                   medicinedataid DESC
        ) d ON s.medicineid = d.medicineid
        WHERE s.soluongtonkho >= 0
      ),
      flows AS (
        -- Phát sinh xuất/nhập từ startDate đến CURRENT_DATE
        SELECT
          COALESCE(SUM(
            CASE
              WHEN md.medicine_export_status = 1
                   AND md.medicine_export_date IS NOT NULL
              THEN md.soluong
              ELSE 0
            END
          ), 0) AS qty_export,
          COALESCE(SUM(
            CASE
              WHEN md.medicine_export_status = 1
                   AND md.medicine_export_date IS NOT NULL
              THEN md.soluong * (
                COALESCE(md.medicine_gia, 0) +
                (COALESCE(md.medicine_gia, 0) * COALESCE(md.medicine_gia_vat, 0) / 100)
              )
              ELSE 0
            END
          ), 0) AS amt_export,
          COALESCE(SUM(
            CASE
              WHEN md.medicine_import_status = 1
                   AND md.medicine_import_date IS NOT NULL
              THEN md.soluong
              ELSE 0
            END
          ), 0) AS qty_import,
          COALESCE(SUM(
            CASE
              WHEN md.medicine_import_status = 1
                   AND md.medicine_import_date IS NOT NULL
              THEN md.soluong * (
                COALESCE(md.medicine_gia, 0) +
                (COALESCE(md.medicine_gia, 0) * COALESCE(md.medicine_gia_vat, 0) / 100)
              )
              ELSE 0
            END
          ), 0) AS amt_import
        FROM tb_medicinedata md
        WHERE (
          (md.medicine_export_status = 1 AND md.medicine_export_date::date >= $1)
          OR
          (md.medicine_import_status = 1 AND md.medicine_import_date::date >= $1)
        )
      )
      SELECT
        (b.qty - f.qty_import + f.qty_export) AS base_qty_at_start,
        (b.amt - f.amt_import + f.amt_export) AS base_amt_at_start
      FROM base_stock b
      CROSS JOIN flows f;
    `;

    const baseRes = await hisPool.query(baseQuery, [startDateStr]);
    if (!baseRes.rows || baseRes.rows.length === 0) {
      logger.warn("No base row returned from HIS for pharmacy inventory backfill.");
      await logSync(
        "backfillHisPharmacyInventoryDailyValue",
        "completed",
        "HIS",
        0,
        null,
        Date.now() - startTime,
      );
      return;
    }

    const baseRow = baseRes.rows[0] as {
      base_qty_at_start: string | number | null;
      base_amt_at_start: string | number | null;
    };

    const baseQty = Number(baseRow.base_qty_at_start || 0);
    const baseAmt = Number(baseRow.base_amt_at_start || 0);

    logger.info(
      `Computed base stock at ${startDateStr} from HIS: qty=${baseQty}, amount=${baseAmt}`,
    );

    // 2. Lấy delta (nhập - xuất) theo từng ngày trong khoảng backfill
    const dailyQuery = `
      WITH daily_flows AS (
        SELECT
          d::date AS d,
          COALESCE(SUM(
            CASE
              WHEN md.medicine_import_status = 1
                   AND md.medicine_import_date::date = d::date
              THEN md.soluong
              ELSE 0
            END
          ), 0) AS qty_import,
          COALESCE(SUM(
            CASE
              WHEN md.medicine_import_status = 1
                   AND md.medicine_import_date::date = d::date
              THEN md.soluong * (
                COALESCE(md.medicine_gia, 0) +
                (COALESCE(md.medicine_gia, 0) * COALESCE(md.medicine_gia_vat, 0) / 100)
              )
              ELSE 0
            END
          ), 0) AS amt_import,
          COALESCE(SUM(
            CASE
              WHEN md.medicine_export_status = 1
                   AND md.medicine_export_date::date = d::date
              THEN md.soluong
              ELSE 0
            END
          ), 0) AS qty_export,
          COALESCE(SUM(
            CASE
              WHEN md.medicine_export_status = 1
                   AND md.medicine_export_date::date = d::date
              THEN md.soluong * (
                COALESCE(md.medicine_gia, 0) +
                (COALESCE(md.medicine_gia, 0) * COALESCE(md.medicine_gia_vat, 0) / 100)
              )
              ELSE 0
            END
          ), 0) AS amt_export
        FROM generate_series($1::date, $2::date, '1 day') AS d
        LEFT JOIN tb_medicinedata md
          ON (
            (md.medicine_import_status = 1 AND md.medicine_import_date::date = d::date)
            OR
            (md.medicine_export_status = 1 AND md.medicine_export_date::date = d::date)
          )
        GROUP BY d
        ORDER BY d
      )
      SELECT
        d,
        qty_import,
        amt_import,
        qty_export,
        amt_export
      FROM daily_flows
      ORDER BY d;
    `;

    const dailyRes = await hisPool.query(dailyQuery, [startDateStr, endDateStr]);
    const rows = dailyRes.rows as Array<{
      d: Date | string;
      qty_import: string | number | null;
      amt_import: string | number | null;
      qty_export: string | number | null;
      amt_export: string | number | null;
    }>;

    if (!rows || rows.length === 0) {
      logger.warn("No daily rows returned from HIS for pharmacy inventory backfill.");
      await logSync(
        "backfillHisPharmacyInventoryDailyValue",
        "completed",
        "HIS",
        0,
        null,
        Date.now() - startTime,
      );
      return;
    }

    logger.info(`Computed ${rows.length} daily rows from HIS; building cumulative series...`);

    // 3. Xây chuỗi tích lũy tồn kho theo ngày
    const payload: Array<{
      snapshot_date: string;
      module_type: string;
      total_stock: number;
      total_value: number;
    }> = [];

    let runningQty = baseQty;
    let runningAmt = baseAmt;

    for (const r of rows) {
      const dateStr =
        typeof r.d === "string" ? r.d : toIsoDate(new Date(r.d));

      const qtyImport = Number(r.qty_import || 0);
      const amtImport = Number(r.amt_import || 0);
      const qtyExport = Number(r.qty_export || 0);
      const amtExport = Number(r.amt_export || 0);

      runningQty = runningQty + qtyImport - qtyExport;
      runningAmt = runningAmt + amtImport - amtExport;

      payload.push({
        snapshot_date: dateStr,
        module_type: "pharmacy",
        total_stock: Number(runningQty.toFixed(2)),
        total_value: Number(runningAmt.toFixed(2)),
      });
    }

    logger.info(
      `Prepared ${payload.length} daily aggregates for module_type='pharmacy'; upserting into Supabase...`,
    );

    // 4. Upsert vào Supabase (fdc_inventory_daily_value) để phục vụ view weekly + dashboard
    const batchSize = 250;
    for (let i = 0; i < payload.length; i += batchSize) {
      const batch = payload.slice(i, i + batchSize);
      const { error } = await supabase
        .from("fdc_inventory_daily_value")
        .upsert(batch, { onConflict: "snapshot_date,module_type" });

      if (error) {
        logger.error(
          "Supabase upsert error (fdc_inventory_daily_value, pharmacy)",
          error,
        );
        throw error;
      }
      rowsUpserted += batch.length;
    }

    await logSync(
      "backfillHisPharmacyInventoryDailyValue",
      "completed",
      "HIS",
      rowsUpserted,
      null,
      Date.now() - startTime,
    );
    logger.info(
      `backfillHisPharmacyInventoryDailyValueJob completed. Upserted ${rowsUpserted} rows.`,
    );
  } catch (err: any) {
    logger.error("backfillHisPharmacyInventoryDailyValueJob failed:", err);
    await logSync(
      "backfillHisPharmacyInventoryDailyValue",
      "failed",
      "HIS",
      rowsUpserted,
      err?.message || String(err),
      Date.now() - startTime,
    );
  }
}

