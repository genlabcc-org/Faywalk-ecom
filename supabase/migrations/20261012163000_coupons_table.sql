-- =============================================================================
-- COUPONS MANAGEMENT TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.coupons (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code                text NOT NULL,
  description         text,
  discount_type       text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value      numeric(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_amount    numeric(10,2) DEFAULT 0,
  max_discount_amount numeric(10,2),
  usage_limit         integer,
  used_count          integer NOT NULL DEFAULT 0,
  start_date          timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  expiry_date         timestamp with time zone,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at          timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Case-insensitive unique index on coupon code
CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_upper_idx ON public.coupons (UPPER(code));

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Allow public read access to coupons (needed for checkout code validation)
DROP POLICY IF EXISTS "Allow public read access to coupons" ON public.coupons;
CREATE POLICY "Allow public read access to coupons"
  ON public.coupons FOR SELECT
  USING (true);

-- Admins can create, update, delete coupons
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons"
  ON public.coupons FOR ALL
  USING (public.is_admin());

-- Seed default coupons (WELCOME10 & FESTIVE20)
INSERT INTO public.coupons (code, description, discount_type, discount_value, min_order_amount, is_active)
SELECT 'WELCOME10', 'Welcome discount for all customers', 'percentage', 10, 0, true
WHERE NOT EXISTS (SELECT 1 FROM public.coupons WHERE UPPER(code) = 'WELCOME10');

INSERT INTO public.coupons (code, description, discount_type, discount_value, min_order_amount, is_active)
SELECT 'FESTIVE20', 'Festive season special discount', 'percentage', 20, 499, true
WHERE NOT EXISTS (SELECT 1 FROM public.coupons WHERE UPPER(code) = 'FESTIVE20');
