-- Add sku and category columns to public.order_items table
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS category text;
