
CREATE OR REPLACE FUNCTION public.restaurant_accepts_orders(_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE id = _restaurant_id
      AND COALESCE(is_blocked, false) = false
  );
$$;

DROP POLICY IF EXISTS "Public can create orders for active restaurants" ON public.orders;

CREATE POLICY "Public can create orders for active restaurants"
ON public.orders
FOR INSERT
WITH CHECK (public.restaurant_accepts_orders(restaurant_id));
