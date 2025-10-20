-- Add is_featured column to products table
ALTER TABLE public.products 
ADD COLUMN is_featured BOOLEAN DEFAULT false;

-- Create index for better performance when querying featured products
CREATE INDEX idx_products_is_featured ON public.products(is_featured) WHERE is_featured = true;