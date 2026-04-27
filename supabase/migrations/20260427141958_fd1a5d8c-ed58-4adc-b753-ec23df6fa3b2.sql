
DROP POLICY IF EXISTS "Public can create orders for active restaurants" ON public.orders;
CREATE POLICY "Public can create orders for active restaurants"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (public.restaurant_accepts_orders(restaurant_id));

CREATE OR REPLACE FUNCTION public.create_public_order(
  _restaurant_id uuid,
  _customer_name text,
  _customer_phone text,
  _items jsonb,
  _subtotal numeric,
  _delivery_fee numeric,
  _total numeric,
  _address text,
  _payment_method text,
  _status text,
  _payment_status text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF NOT public.restaurant_accepts_orders(_restaurant_id) THEN
    RAISE EXCEPTION 'Restaurant not accepting orders';
  END IF;

  INSERT INTO public.orders (
    restaurant_id, customer_name, customer_phone, items,
    subtotal, delivery_fee, total, address, payment_method,
    status, payment_status
  ) VALUES (
    _restaurant_id, _customer_name, _customer_phone, _items,
    _subtotal, COALESCE(_delivery_fee, 0), _total, _address, _payment_method,
    COALESCE(_status, 'pending'), COALESCE(_payment_status, 'not_required')
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_order(uuid, text, text, jsonb, numeric, numeric, numeric, text, text, text, text) TO anon, authenticated;
