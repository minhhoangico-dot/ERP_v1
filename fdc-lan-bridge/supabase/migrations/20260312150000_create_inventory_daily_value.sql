-- Create daily aggregate table for inventory value
CREATE TABLE IF NOT EXISTS public.fdc_inventory_daily_value (
  snapshot_date date NOT NULL,
  module_type text NOT NULL,
  total_stock numeric NOT NULL DEFAULT 0,
  total_value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (snapshot_date, module_type)
);

CREATE INDEX IF NOT EXISTS idx_inventory_daily_value_date
  ON public.fdc_inventory_daily_value (snapshot_date, module_type);

