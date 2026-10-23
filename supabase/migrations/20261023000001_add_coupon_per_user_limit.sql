-- 1. Add per_user_limit column to coupons table
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS per_user_limit integer;

-- 2. Add coupon_code column to orders table if not present
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_code text;

-- 3. Create coupon_usages table to track how many times each user has used a coupon
CREATE TABLE IF NOT EXISTS public.coupon_usages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  coupon_id bigint REFERENCES public.coupons(id) ON DELETE CASCADE,
  coupon_code text NOT NULL,
  user_id text,
  order_id text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS coupon_usages_coupon_user_idx ON public.coupon_usages(coupon_id, user_id);
CREATE INDEX IF NOT EXISTS coupon_usages_code_user_idx ON public.coupon_usages(UPPER(coupon_code), user_id);

ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to coupon_usages" ON public.coupon_usages;
CREATE POLICY "Allow public read access to coupon_usages"
  ON public.coupon_usages FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert to coupon_usages" ON public.coupon_usages;
CREATE POLICY "Allow insert to coupon_usages"
  ON public.coupon_usages FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage coupon_usages" ON public.coupon_usages;
CREATE POLICY "Admins can manage coupon_usages"
  ON public.coupon_usages FOR ALL
  USING (public.is_admin());
