-- =============================================================================
-- FAYWALK E-COM — COMPLETE CONSOLIDATED DATABASE SCHEMA
-- =============================================================================
-- Single source of truth for the entire Supabase PostgreSQL database schema.
-- Includes all core tables, role-based profiles, product variants, subcategories,
-- banners, shipping rates, social videos, order item details, and iCarry delivery.

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop deprecated admin_users table if it exists
DROP TABLE IF EXISTS public.admin_users CASCADE;


-- =============================================================================
-- 1. USERS TABLE (With single 'role' column: 'admin' | 'user')
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id         uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name       text,
  phone      text,
  email      text,
  role       text NOT NULL DEFAULT 'user',
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';
ALTER TABLE public.users DROP COLUMN IF EXISTS roles CASCADE;

-- Helper function to check if current user is admin (SECURITY DEFINER bypasses RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view profile" ON public.users;
DROP POLICY IF EXISTS "Users can view users" ON public.users;
CREATE POLICY "Users can view users"
  ON public.users FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert users" ON public.users;
CREATE POLICY "Users can insert users"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update profile" ON public.users;
DROP POLICY IF EXISTS "Users can update users" ON public.users;
CREATE POLICY "Users can update users"
  ON public.users FOR UPDATE
  USING (auth.uid() = id OR public.is_admin());


-- =============================================================================
-- 2. PRODUCT CATEGORIES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  category_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text NOT NULL UNIQUE,
  description text,
  slug        text NOT NULL UNIQUE,
  image_url   text,
  parent_id   bigint REFERENCES public.categories(category_id) ON DELETE SET NULL,
  sort_order  integer DEFAULT 0,
  is_active   boolean DEFAULT true,
  created_at  timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS parent_id bigint REFERENCES public.categories(category_id) ON DELETE SET NULL;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to categories" ON public.categories;
CREATE POLICY "Allow public read access to categories"
  ON public.categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.is_admin());


-- =============================================================================
-- 3. PRODUCT SUBCATEGORIES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.subcategories (
  subcategory_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id    bigint REFERENCES public.categories(category_id) ON DELETE CASCADE NOT NULL,
  name           text NOT NULL,
  slug           text NOT NULL,
  description    text,
  image_url      text,
  sort_order     integer DEFAULT 0,
  is_active      boolean DEFAULT true,
  created_at     timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (category_id, slug)
);

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to subcategories" ON public.subcategories;
CREATE POLICY "Allow public read access to subcategories"
  ON public.subcategories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage subcategories" ON public.subcategories;
CREATE POLICY "Admins can manage subcategories"
  ON public.subcategories FOR ALL
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS subcategories_category_id_idx ON public.subcategories (category_id);


-- =============================================================================
-- 4. PRODUCTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  product_id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name                text NOT NULL,
  description         text,
  category_id         bigint REFERENCES public.categories(category_id) ON DELETE SET NULL,
  subcategory_id      bigint REFERENCES public.subcategories(subcategory_id) ON DELETE SET NULL,
  price               numeric(10,2) NOT NULL,
  compare_at_price    numeric(10,2),
  images              jsonb DEFAULT '[]'::jsonb,
  slug                text NOT NULL UNIQUE,
  is_featured         boolean DEFAULT false,
  is_active           boolean DEFAULT true,
  is_new_arrival      boolean DEFAULT false,
  is_best_seller      boolean DEFAULT false,
  is_trending         boolean DEFAULT false,
  is_festive_edit     boolean DEFAULT false,
  rating              numeric(3,2) DEFAULT 0,
  review_count        integer DEFAULT 0,
  material            text,
  fit                 text,
  care_instructions   text,
  color               text,
  colors              jsonb DEFAULT '[]'::jsonb,
  available_sizes     jsonb DEFAULT '[]'::jsonb,
  stock_quantity      integer DEFAULT 0,
  tags                jsonb DEFAULT '[]'::jsonb,
  badge               text,
  created_at          timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at          timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_festive_edit boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS badge text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory_id bigint REFERENCES public.subcategories(subcategory_id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS colors jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS available_sizes jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;
CREATE POLICY "Allow public read access to products"
  ON public.products FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products (category_id);
CREATE INDEX IF NOT EXISTS products_subcategory_id_idx ON public.products (subcategory_id);
CREATE INDEX IF NOT EXISTS products_slug_idx ON public.products (slug);


-- =============================================================================
-- 5. PRODUCT VARIANTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.product_variants (
  variant_id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id       bigint REFERENCES public.products(product_id) ON DELETE CASCADE NOT NULL,
  size             text NOT NULL,
  color            text,
  color_code       text,
  sku              text UNIQUE,
  stock_quantity   integer NOT NULL DEFAULT 0,
  price_override   numeric(10,2),
  is_active        boolean DEFAULT true,
  created_at       timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (product_id, size, color)
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to product variants" ON public.product_variants;
CREATE POLICY "Allow public read access to product variants"
  ON public.product_variants FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage variants" ON public.product_variants;
CREATE POLICY "Admins can manage variants"
  ON public.product_variants FOR ALL
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON public.product_variants (product_id);


-- =============================================================================
-- 6. USER ADDRESSES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.addresses (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  full_name    text NOT NULL,
  phone        text NOT NULL,
  pincode      text NOT NULL,
  address_line text NOT NULL,
  city         text NOT NULL,
  state        text NOT NULL,
  is_default   boolean DEFAULT false,
  created_at   timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own addresses" ON public.addresses;
CREATE POLICY "Users can manage their own addresses"
  ON public.addresses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS addresses_user_id_idx ON public.addresses (user_id);


-- =============================================================================
-- 7. ORDERS TABLE (With iCarry Logistics Integration)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id                    text PRIMARY KEY,
  user_id               uuid REFERENCES auth.users ON DELETE SET NULL,
  items                 jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount          numeric(10,2) NOT NULL,
  subtotal              numeric(10,2),
  discount_amount       numeric(10,2) DEFAULT 0,
  shipping_fee          numeric(10,2) DEFAULT 0,
  status                text NOT NULL DEFAULT 'pending',
  shipping_address      jsonb NOT NULL,
  payment_method        text NOT NULL DEFAULT 'COD',
  payment_status        text NOT NULL DEFAULT 'pending',
  razorpay_order_id     text,
  razorpay_payment_id   text,
  notes                 text,
  tracking_number       text,
  icarry_shipment_id    text,
  icarry_tracking_id    text,
  icarry_awb            text,
  icarry_courier_code   text,
  icarry_courier_name   text,
  icarry_status         text,
  icarry_routing_code   text,
  icarry_label_url      text,
  icarry_events         jsonb DEFAULT '[]'::jsonb,
  dispatched_at         timestamp with time zone,
  delivered_at          timestamp with time zone,
  created_at            timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at            timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal numeric(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_fee numeric(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS icarry_shipment_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS icarry_tracking_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS icarry_awb text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS icarry_courier_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS icarry_courier_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS icarry_status text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS icarry_routing_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS icarry_label_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS icarry_events jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispatched_at timestamp with time zone;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
CREATE POLICY "Users can insert their own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);


-- =============================================================================
-- 8. ORDER ITEMS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id     text REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id   bigint REFERENCES public.products(product_id) ON DELETE SET NULL,
  variant_id   bigint REFERENCES public.product_variants(variant_id) ON DELETE SET NULL,
  product_name text NOT NULL,
  price        numeric(10,2) NOT NULL,
  quantity     integer NOT NULL,
  size         text,
  color        text,
  image_url    text,
  created_at   timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_id bigint REFERENCES public.product_variants(variant_id) ON DELETE SET NULL;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
CREATE POLICY "Users can view their own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert order items" ON public.order_items;
CREATE POLICY "Users can insert order items"
  ON public.order_items FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Admins can view all order items"
  ON public.order_items FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update order items" ON public.order_items;
CREATE POLICY "Admins can update order items"
  ON public.order_items FOR UPDATE
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items (order_id);


-- =============================================================================
-- 9. CART ITEMS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.cart_items (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  product_id bigint REFERENCES public.products(product_id) ON DELETE CASCADE NOT NULL,
  variant_id bigint REFERENCES public.product_variants(variant_id) ON DELETE SET NULL,
  size       text NOT NULL,
  color      text,
  quantity   integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (user_id, product_id, size, color)
);

ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS variant_id bigint REFERENCES public.product_variants(variant_id) ON DELETE SET NULL;

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own cart items" ON public.cart_items;
CREATE POLICY "Users can manage their own cart items"
  ON public.cart_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS cart_items_user_id_idx ON public.cart_items (user_id);


-- =============================================================================
-- 10. WISHLIST ITEMS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  product_id bigint REFERENCES public.products(product_id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (user_id, product_id)
);

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own wishlist items" ON public.wishlist_items;
CREATE POLICY "Users can manage their own wishlist items"
  ON public.wishlist_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS wishlist_items_user_id_idx ON public.wishlist_items (user_id);


-- =============================================================================
-- 11. BANNERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.banners (
  banner_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id          bigint GENERATED ALWAYS AS (banner_id) STORED,
  image_url   text,
  mobile_url  text,
  is_active   boolean DEFAULT true,
  created_at  timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at  timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to banners" ON public.banners;
CREATE POLICY "Allow public read access to banners"
  ON public.banners FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage banners" ON public.banners;
CREATE POLICY "Admins can manage banners"
  ON public.banners FOR ALL
  USING (public.is_admin());


-- =============================================================================
-- 12. SHIPPING RATES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.shipping_rates (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  state       text NOT NULL UNIQUE,
  fee         numeric NOT NULL DEFAULT 0,
  free_above  numeric,
  is_active   boolean DEFAULT true,
  created_at  timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to shipping rates" ON public.shipping_rates;
CREATE POLICY "Allow public read access to shipping rates"
  ON public.shipping_rates FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage shipping rates" ON public.shipping_rates;
CREATE POLICY "Admins can manage shipping rates"
  ON public.shipping_rates FOR ALL
  USING (public.is_admin());


-- =============================================================================
-- 13. SOCIAL MEDIA VIDEOS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.social_videos (
  video_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title       text,
  video_url   text NOT NULL,
  caption     text,
  sort_order  integer DEFAULT 0,
  is_active   boolean DEFAULT true,
  created_at  timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.social_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to social videos" ON public.social_videos;
CREATE POLICY "Allow public read access to social videos"
  ON public.social_videos FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage social videos" ON public.social_videos;
CREATE POLICY "Admins can manage social videos"
  ON public.social_videos FOR ALL
  USING (public.is_admin());


-- =============================================================================
-- 14. ORDER ID SEQUENCE TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.order_id_seq (
  seq_date date PRIMARY KEY,
  last_seq integer NOT NULL DEFAULT 0
);

ALTER TABLE public.order_id_seq ENABLE ROW LEVEL SECURITY;

REVOKE SELECT, INSERT, UPDATE ON public.order_id_seq FROM authenticated;
REVOKE SELECT, INSERT, UPDATE ON public.order_id_seq FROM service_role;


-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_user_exists(email_to_check text)
RETURNS boolean
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE email = email_to_check
  );
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, phone, email, role, created_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name',  'No name set'),
    COALESCE(new.raw_user_meta_data->>'phone', 'No phone set'),
    new.email,
    'user',
    new.created_at
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


CREATE OR REPLACE FUNCTION public.delete_own_user()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.generate_order_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARATION
  today    date    := current_date;
  date_str text    := to_char(today, 'YYYYMMDD');
  next_seq integer;
BEGIN
  INSERT INTO public.order_id_seq (seq_date, last_seq)
  VALUES (today, 1)
  ON CONFLICT (seq_date) DO UPDATE
    SET last_seq = order_id_seq.last_seq + 1
  RETURNING last_seq INTO next_seq;

  RETURN 'ORD' || date_str || lpad(next_seq::text, 4, '0');
END;
$$;


CREATE OR REPLACE FUNCTION public.set_order_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF new.id IS NULL OR new.id = '' THEN
    new.id := public.generate_order_id();
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_id ON public.orders;
CREATE TRIGGER trg_set_order_id
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_id();


-- =============================================================================
-- STORAGE BUCKETS & RLS POLICIES
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('product_img',    'product_img',    true),
  ('categories_img', 'categories_img', true),
  ('banners',        'banners',        true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow public read access to product images" ON storage.objects;
CREATE POLICY "Allow public read access to product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product_img');

DROP POLICY IF EXISTS "Allow public read access to category images" ON storage.objects;
CREATE POLICY "Allow public read access to category images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'categories_img');

DROP POLICY IF EXISTS "Allow public read access to banner images" ON storage.objects;
CREATE POLICY "Allow public read access to banner images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'banners');

DROP POLICY IF EXISTS "Admins can manage product images" ON storage.objects;
CREATE POLICY "Admins can manage product images"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'product_img' AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'product_img' AND public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can manage category images" ON storage.objects;
CREATE POLICY "Admins can manage category images"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'categories_img' AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'categories_img' AND public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can manage banner images" ON storage.objects;
CREATE POLICY "Admins can manage banner images"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'banners' AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'banners' AND public.is_admin()
  );
