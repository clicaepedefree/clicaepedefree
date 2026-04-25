-- 1. Drop legacy super admin login (replaced by Supabase Auth + super_admin_users)
DROP FUNCTION IF EXISTS public.authenticate_super_admin(text, text) CASCADE;
DROP TABLE IF EXISTS public.super_admins CASCADE;

-- 2. Add validation trigger on orders to constrain public INSERTs
CREATE OR REPLACE FUNCTION public.validate_order_payload()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- items must be a non-empty JSON array
  IF NEW.items IS NULL OR jsonb_typeof(NEW.items) <> 'array' OR jsonb_array_length(NEW.items) = 0 THEN
    RAISE EXCEPTION 'Order items must be a non-empty array';
  END IF;
  IF jsonb_array_length(NEW.items) > 100 THEN
    RAISE EXCEPTION 'Too many items in order';
  END IF;

  -- length limits on customer fields
  IF NEW.customer_name IS NOT NULL AND length(NEW.customer_name) > 200 THEN
    RAISE EXCEPTION 'customer_name too long';
  END IF;
  IF NEW.customer_phone IS NOT NULL AND length(NEW.customer_phone) > 30 THEN
    RAISE EXCEPTION 'customer_phone too long';
  END IF;
  IF NEW.address IS NOT NULL AND length(NEW.address) > 500 THEN
    RAISE EXCEPTION 'address too long';
  END IF;

  -- numeric sanity
  IF NEW.total < 0 OR NEW.subtotal < 0 OR NEW.delivery_fee < 0 THEN
    RAISE EXCEPTION 'Order amounts cannot be negative';
  END IF;
  IF NEW.total > 100000 THEN
    RAISE EXCEPTION 'Order total exceeds allowed maximum';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_order_payload_trigger ON public.orders;
CREATE TRIGGER validate_order_payload_trigger
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_order_payload();