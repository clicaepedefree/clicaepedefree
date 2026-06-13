
-- 1. Restrict payment_methods: remove public SELECT, expose only safe columns via SECURITY DEFINER function
DROP POLICY IF EXISTS "Public can view active payment methods" ON public.payment_methods;

CREATE OR REPLACE FUNCTION public.get_public_payment_methods(_restaurant_id uuid)
RETURNS TABLE (
  id uuid,
  method_type text,
  is_active boolean,
  pix_key text,
  pix_online_enabled boolean,
  has_online_pix boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pm.id,
         pm.method_type::text,
         pm.is_active,
         CASE WHEN pm.method_type = 'pix' AND pm.is_active THEN pm.pix_key ELSE NULL END,
         COALESCE(pm.pix_online_enabled, false),
         (COALESCE(pm.pix_online_enabled, false) AND pm.restaurant_pix_key IS NOT NULL)
  FROM public.payment_methods pm
  WHERE pm.restaurant_id = _restaurant_id
    AND pm.is_active = true;
$$;

REVOKE ALL ON FUNCTION public.get_public_payment_methods(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_payment_methods(uuid) TO anon, authenticated;

-- 2. Discount coupons: drop public SELECT (codes were enumerable). Validation should happen server-side via RPC/edge function.
DROP POLICY IF EXISTS "Public can view active coupons" ON public.discount_coupons;

-- 3. Lock down SECURITY DEFINER functions: revoke broad EXECUTE, grant only where needed
REVOKE EXECUTE ON FUNCTION public.admin_mark_restaurant_paid(uuid, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_restaurant_block(uuid, boolean, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_restaurants_with_emails() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.anonymize_old_orders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_revenue_limits(timestamptz, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_monthly_revenues(timestamptz, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_restaurants_open_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_monthly_revenue(uuid, timestamptz, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_available_for_withdrawal(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mask_customer_data(text, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_owns_order_restaurant(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_restaurant_open_status(uuid, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restaurant_accepts_orders(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restaurant_accepts_orders(uuid) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
-- public catalog/order creation must stay reachable
GRANT EXECUTE ON FUNCTION public.get_public_restaurant_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_order(uuid, text, text, jsonb, numeric, numeric, numeric, text, text, text, text) TO anon, authenticated;
