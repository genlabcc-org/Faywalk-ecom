-- Add category_id column to coupons table
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS category_id bigint REFERENCES public.categories(category_id) ON DELETE SET NULL;

-- Optional index for faster filtering by category
CREATE INDEX IF NOT EXISTS coupons_category_id_idx ON public.coupons(category_id);
