-- ═══════════════════════════════════════════════════════════════
--  Faywalk E-Commerce — Consolidated Schema Migration
--  Replaces all previous migration files into a single source of truth.
-- ═══════════════════════════════════════════════════════════════


-- ── 1. ADMIN REGISTRY TABLE ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_users (
  id         uuid  REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email      text  NOT NULL UNIQUE,
  role       text  NOT NULL DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can check if they are admin"
  ON public.admin_users FOR SELECT
  USING (auth.uid() = id);


-- ── 2. USER PROFILES TABLE ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid  REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name       text,
  phone      text,
  email      text,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE public.admin_users.id = auth.uid() AND public.admin_users.role = 'admin'
    )
  );


-- ── 3. PRODUCT CATEGORIES TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  category_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         text   NOT NULL UNIQUE,
  description  text,
  slug         text   NOT NULL UNIQUE,
  image_url    text,
  parent_id    bigint REFERENCES public.categories(category_id) ON DELETE SET NULL,
  sort_order   integer DEFAULT 0,
  is_active    boolean DEFAULT true,
  created_at   timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE public.admin_users.id = auth.uid() AND public.admin_users.role = 'admin'
    )
  );


-- ── 4. PRODUCTS CATALOG TABLE ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  product_id     bigint  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id    bigint  REFERENCES public.categories(category_id) ON DELETE SET NULL,
  name           text    NOT NULL,
  description    text,
  sku            text    UNIQUE,
  image_url      text,
  images         text[],
  price          numeric NOT NULL,
  compare_price  numeric,
  discount_price numeric,
  stock          integer DEFAULT 0,
  stock_alert    integer DEFAULT 5,
  material       text,
  weight         numeric,
  sizes          text[],
  colors         text[],
  care           text,
  is_active      boolean DEFAULT true,
  is_featured    boolean DEFAULT false,
  created_at     timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at     timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to products"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE public.admin_users.id = auth.uid() AND public.admin_users.role = 'admin'
    )
  );


-- ── 5. CUSTOMER ADDRESSES TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.addresses (
  address_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id        uuid   REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  full_name      text   NOT NULL,
  phone_number   text   NOT NULL,
  address_line1  text   NOT NULL,
  address_line2  text,
  city           text   NOT NULL,
  state          text   NOT NULL,
  postal_code    text   NOT NULL,
  country        text   DEFAULT 'India',
  address_type   text   DEFAULT 'home',
  is_default     boolean DEFAULT false,
  created_at     timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own addresses"
  ON public.addresses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all customer addresses"
  ON public.addresses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE public.admin_users.id = auth.uid() AND public.admin_users.role = 'admin'
    )
  );


-- ── 6. ORDERS TABLE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id                       text    PRIMARY KEY,
  user_id                  uuid    REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  address_id               bigint  REFERENCES public.addresses(address_id) ON DELETE SET NULL,
  order_date               timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- Summary fields (denormalised for quick access)
  item_name                text    NOT NULL,
  quantity                 integer NOT NULL,
  total_price              numeric NOT NULL,
  -- Payment
  payment                  text    NOT NULL DEFAULT 'COD',
  razorpay_order_id        text,
  razorpay_payment_id      text,
  razorpay_signature       text,
  -- Order lifecycle
  type                     text    NOT NULL DEFAULT 'Regular',
  status                   text    NOT NULL DEFAULT 'Pending',
  admin_notes              text,
  invoice_printed          boolean DEFAULT false,
  -- Shipping / delivery
  delivery_provider        text    DEFAULT 'iCarry',
  waybill                  text,
  shipment_id              text,
  delivery_status          text    DEFAULT 'Pending',
  estimated_delivery_date  timestamptz,
  courier_name             text,
  tracking_url             text,
  shipment_error           text,
  shipped_at               timestamptz,
  delivered_at             timestamptz
);

COMMENT ON COLUMN public.orders.invoice_printed IS
  'Whether the invoice for this order has been printed by admin. Once true, cannot be reprinted.';

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can place their own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view and update all customer orders"
  ON public.orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE public.admin_users.id = auth.uid() AND public.admin_users.role = 'admin'
    )
  );


-- ── 7. ORDER ITEMS TABLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
  id           bigint  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id     text    REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id   bigint  REFERENCES public.products(product_id) ON DELETE SET NULL,
  product_name text    NOT NULL,
  quantity     integer NOT NULL,
  price        numeric NOT NULL,
  size         text,
  color        text,
  image_url    text
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE public.orders.id = order_items.order_id
        AND public.orders.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE public.admin_users.id = auth.uid() AND public.admin_users.role = 'admin'
    )
  );

CREATE POLICY "Users can insert order items for their own orders"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE public.orders.id = order_items.order_id
        AND public.orders.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE public.admin_users.id = auth.uid() AND public.admin_users.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage order items"
  ON public.order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE public.admin_users.id = auth.uid() AND public.admin_users.role = 'admin'
    )
  );


-- ── 8. CART ITEMS TABLE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cart_items (
  id         uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid    REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  product_id bigint  REFERENCES public.products(product_id) ON DELETE CASCADE NOT NULL,
  qty        integer NOT NULL DEFAULT 1 CHECK (qty > 0),
  size       text,
  color      text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT cart_items_user_id_product_id_size_color_key UNIQUE (user_id, product_id, size, color)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cart items"
  ON public.cart_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 9. WISHLIST ITEMS TABLE ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id         uuid   DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid   REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  product_id bigint REFERENCES public.products(product_id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (user_id, product_id)
);

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own wishlist items"
  ON public.wishlist_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 10. ORDER ID SEQUENCE TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_id_seq (
  seq_date date    PRIMARY KEY,
  last_seq integer NOT NULL DEFAULT 0
);

ALTER TABLE public.order_id_seq ENABLE ROW LEVEL SECURITY;

-- Access is only via the security definer function; revoke direct grants
REVOKE SELECT, INSERT, UPDATE ON public.order_id_seq FROM authenticated;
REVOKE SELECT, INSERT, UPDATE ON public.order_id_seq FROM service_role;


-- ── 11. INDEXES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS orders_address_id_idx  ON public.orders (address_id);
CREATE INDEX IF NOT EXISTS orders_waybill_idx     ON public.orders (waybill);
CREATE INDEX IF NOT EXISTS orders_shipment_id_idx ON public.orders (shipment_id);


-- ── 12. STORAGE BUCKETS & RLS POLICIES ───────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('product_img',    'product_img',    true),
  ('categories_img', 'categories_img', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read access to product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product_img');

CREATE POLICY "Allow public read access to category images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'categories_img');

CREATE POLICY "Admins can manage product images"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'product_img' AND
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE public.admin_users.id = auth.uid() AND public.admin_users.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'product_img' AND
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE public.admin_users.id = auth.uid() AND public.admin_users.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage category images"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'categories_img' AND
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE public.admin_users.id = auth.uid() AND public.admin_users.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'categories_img' AND
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE public.admin_users.id = auth.uid() AND public.admin_users.role = 'admin'
    )
  );


-- ── 13. POSTGRES FUNCTIONS ────────────────────────────────────────

-- Helper: check if a user exists by email
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

-- Auto-generate order IDs in ORD{YYYYMMDD}{NNNN} format
CREATE OR REPLACE FUNCTION public.generate_order_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
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

-- Trigger function: auto-set order ID before insert if not provided
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

-- Allow users to delete their own auth account
CREATE OR REPLACE FUNCTION public.delete_own_user()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create profile row on new user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, email, created_at)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'name',  'No name set'),
    coalesce(new.raw_user_meta_data->>'phone', 'No phone set'),
    new.email,
    new.created_at
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 14. TRIGGERS ─────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_set_order_id ON public.orders;
CREATE TRIGGER trg_set_order_id
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_id();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
