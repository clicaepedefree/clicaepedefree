-- Add delivery and pickup options to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS delivery_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS pickup_enabled boolean DEFAULT true;