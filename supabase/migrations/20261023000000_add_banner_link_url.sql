-- Add link_url column to banners table
ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS link_url text;
