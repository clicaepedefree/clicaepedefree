-- Add tax_id column to restaurants for CPF/CNPJ storage
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS tax_id text;