-- Weekly aggregate view for 1-year chart (fast: ~52 rows per module)
CREATE OR REPLACE VIEW public.fdc_inventory_weekly_value AS
WITH last_in_week AS (
  SELECT
    (date_trunc('week', snapshot_date) + INTERVAL '6 days')::date AS week_end,
    module_type,
    total_stock,
    total_value,
    ROW_NUMBER() OVER (
      PARTITION BY date_trunc('week', snapshot_date), module_type
      ORDER BY snapshot_date DESC
    ) AS rn
  FROM public.fdc_inventory_daily_value
  WHERE snapshot_date >= CURRENT_DATE - INTERVAL '1 year'
)
SELECT week_end AS snapshot_date, module_type, total_stock, total_value
FROM last_in_week
WHERE rn = 1
ORDER BY week_end, module_type;
