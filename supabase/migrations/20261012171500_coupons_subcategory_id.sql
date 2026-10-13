-- Add subcategory_id to coupons table
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS subcategory_id bigint REFERENCES public.subcategories(subcategory_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS coupons_subcategory_id_idx ON public.coupons(subcategory_id);
