
DROP POLICY IF EXISTS "Public can create orders for active restaurants" ON public.orders;
CREATE POLICY "Public can create orders for active restaurants"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (public.restaurant_accepts_orders(restaurant_id));
