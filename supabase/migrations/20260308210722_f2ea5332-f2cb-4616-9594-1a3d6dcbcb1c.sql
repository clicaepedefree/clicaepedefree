
-- Add order_number column
ALTER TABLE public.orders ADD COLUMN order_number integer;

-- Backfill existing orders with sequential numbers per restaurant
WITH numbered AS (
  SELECT id, restaurant_id,
         ROW_NUMBER() OVER (PARTITION BY restaurant_id ORDER BY created_at ASC) AS rn
  FROM public.orders
)
UPDATE public.orders o
SET order_number = n.rn
FROM numbered n
WHERE o.id = n.id;

-- Create function to auto-assign sequential order number per restaurant
CREATE OR REPLACE FUNCTION public.assign_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_number integer;
BEGIN
  SELECT COALESCE(MAX(order_number), 0) + 1 INTO next_number
  FROM public.orders
  WHERE restaurant_id = NEW.restaurant_id;
  
  NEW.order_number := next_number;
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_order_number();
