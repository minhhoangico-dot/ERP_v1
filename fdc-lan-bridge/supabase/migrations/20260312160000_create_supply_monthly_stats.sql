-- Aggregate monthly supply consumption and patient volume
CREATE TABLE IF NOT EXISTS public.fdc_supply_monthly_stats (
  report_month text NOT NULL, -- e.g. '2026-03'
  account text NOT NULL,      -- 'all', '1521', '1522', '1523'
  consumption_amount numeric NOT NULL DEFAULT 0,
  consumption_qty numeric NOT NULL DEFAULT 0,
  consumption_amount_ly numeric NOT NULL DEFAULT 0,
  consumption_qty_ly numeric NOT NULL DEFAULT 0,
  patient_volume integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (report_month, account)
);

CREATE INDEX IF NOT EXISTS idx_supply_monthly_stats_month
  ON public.fdc_supply_monthly_stats (report_month, account);

