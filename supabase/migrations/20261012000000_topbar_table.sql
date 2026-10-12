-- =============================================================================
-- TOPBAR / ANNOUNCEMENT BAR TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.topbar (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  text        text NOT NULL,
  link_url    text,
  is_active   boolean DEFAULT true,
  created_at  timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at  timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.topbar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to topbar" ON public.topbar;
CREATE POLICY "Allow public read access to topbar"
  ON public.topbar FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage topbar" ON public.topbar;
CREATE POLICY "Admins can manage topbar"
  ON public.topbar FOR ALL
  USING (public.is_admin());

-- Insert default record if table is empty
INSERT INTO public.topbar (text, is_active)
SELECT 'Diwali Sale - Everything Is Off By 50%', true
WHERE NOT EXISTS (SELECT 1 FROM public.topbar LIMIT 1);
