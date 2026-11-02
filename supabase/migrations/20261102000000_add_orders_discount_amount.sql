-- Orders written by the razorpay webhook, payment verify, and COD checkout
-- include discount_amount, but the live table was missing it (PGRST204).
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0;

NOTIFY pgrst, 'reload schema';
