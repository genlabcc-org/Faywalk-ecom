-- Migration: 20261023000003_allow_admin_read_addresses.sql
-- Description: Allow admins to view and manage customer addresses and strengthen is_admin()

-- 1. Ensure is_admin() function checks role case-insensitively across auth metadata and users table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    coalesce(
      (auth.jwt() ->> 'role') = 'service_role'
      OR LOWER(coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '')) IN ('admin', 'super admin')
      OR LOWER(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')) IN ('admin', 'super admin')
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND LOWER(coalesce(role, '')) IN ('admin', 'super admin')
      ),
      false
    )
  );
END;
$$;

-- 2. Allow admins full access (SELECT, INSERT, UPDATE, DELETE) to addresses
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all addresses" ON public.addresses;
CREATE POLICY "Admins can view all addresses"
  ON public.addresses FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all addresses" ON public.addresses;
CREATE POLICY "Admins can manage all addresses"
  ON public.addresses FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
