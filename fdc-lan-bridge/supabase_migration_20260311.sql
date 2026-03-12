-- Run this in Supabase SQL Editor

ALTER TABLE public.fdc_inventory_snapshots ADD COLUMN IF NOT EXISTS snapshot_date DATE DEFAULT CURRENT_DATE;

UPDATE public.fdc_inventory_snapshots SET snapshot_date = CURRENT_DATE WHERE snapshot_date IS NULL;

ALTER TABLE public.fdc_inventory_snapshots ALTER COLUMN snapshot_date SET NOT NULL;

ALTER TABLE public.fdc_inventory_snapshots DROP CONSTRAINT IF EXISTS fdc_inventory_snapshots_his_medicineid_warehouse_key;

ALTER TABLE public.fdc_inventory_snapshots ADD CONSTRAINT fdc_inventory_snapshots_his_medicineid_warehouse_date_key UNIQUE (his_medicineid, warehouse, snapshot_date);

CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_date ON public.fdc_inventory_snapshots(snapshot_date, his_medicineid);
