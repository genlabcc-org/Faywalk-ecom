-- Set default 1 for per_user_limit on coupons table
ALTER TABLE public.coupons
  ALTER COLUMN per_user_limit SET DEFAULT 1;

-- Backfill any existing coupons without per_user_limit to 1
UPDATE public.coupons
SET per_user_limit = 1
WHERE per_user_limit IS NULL;
