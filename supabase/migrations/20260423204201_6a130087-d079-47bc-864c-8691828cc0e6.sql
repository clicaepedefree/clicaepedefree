-- Refresh RPC to include monthly_orders count
DROP FUNCTION IF EXISTS public.get_restaurants_with_emails();
CREATE OR REPLACE FUNCTION public.get_restaurants_with_emails()
RETURNS TABLE(id uuid, name text, whatsapp text, user_email text, slug text, created_at timestamptz, logo_url text, banner_url text, total_revenue numeric, responsible_name text, tax_id text, is_open boolean, is_blocked boolean, monthly_revenue numeric, revenue_block_exempt_until timestamptz, monthly_orders bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ms timestamptz := (date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo'))) AT TIME ZONE 'America/Sao_Paulo';
  me timestamptz := ((date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')) + interval '1 month')) AT TIME ZONE 'America/Sao_Paulo';
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'Super admin privileges required'; END IF;
  RETURN QUERY
  SELECT r.id, r.name::text, r.whatsapp::text, au.email::text, r.slug::text, r.created_at,
         r.logo_url::text, r.banner_url::text,
         COALESCE(SUM(o.total),0)::numeric,
         r.responsible_name::text, r.tax_id::text,
         COALESCE(r.is_open,false), COALESCE(r.is_blocked,false),
         COALESCE(r.monthly_revenue,0)::numeric, r.revenue_block_exempt_until,
         COALESCE(SUM(CASE WHEN o.created_at >= ms AND o.created_at < me AND o.status != 'cancelled' THEN 1 ELSE 0 END),0)::bigint AS monthly_orders
  FROM public.restaurants r
  JOIN auth.users au ON r.user_id = au.id
  LEFT JOIN public.orders o ON r.id = o.restaurant_id
  GROUP BY r.id, au.email
  ORDER BY r.created_at DESC;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_restaurants_with_emails() TO authenticated;

-- Tighten the orders INSERT policy (remove always-true WITH CHECK)
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Public can create orders for active restaurants" ON public.orders FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = restaurant_id AND COALESCE(r.is_blocked, false) = false
  )
);