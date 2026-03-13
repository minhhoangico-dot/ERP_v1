-- Daily supply consumption summary per account, joined with patient volume
CREATE VIEW IF NOT EXISTS public.fdc_supply_daily_summary AS
SELECT
  d.report_date,
  d.account,
  SUM(d.outward_amount) AS consumption_amount,
  SUM(d.outward_qty) AS consumption_qty,
  COALESCE(p.total_treatments, 0) AS patient_volume
FROM public.fdc_supply_consumption_daily d
LEFT JOIN public.fdc_patient_volume_daily p
  ON p.report_date = d.report_date
GROUP BY
  d.report_date,
  d.account,
  COALESCE(p.total_treatments, 0);

