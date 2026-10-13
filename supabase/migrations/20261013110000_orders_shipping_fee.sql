-- Add shipping_fee column to public.orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_fee numeric(10,2) DEFAULT 0;
