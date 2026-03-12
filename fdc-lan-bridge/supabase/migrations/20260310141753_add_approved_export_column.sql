ALTER TABLE public.fdc_inventory_snapshots 
ADD COLUMN IF NOT EXISTS approved_export numeric DEFAULT 0;