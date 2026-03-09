
DROP FUNCTION IF EXISTS public.get_restaurants_with_emails();

CREATE OR REPLACE FUNCTION public.get_restaurants_with_emails()
 RETURNS TABLE(id uuid, name text, whatsapp text, user_email text, slug text, created_at timestamp with time zone, logo_url text, banner_url text, total_revenue numeric, responsible_name text, tax_id text, is_open boolean, is_blocked boolean, monthly_revenue numeric, revenue_block_exempt_until timestamp with time zone, monthly_orders bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Super admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    r.id,
    r.name::text,
    r.whatsapp::text,
    au.email::text as user_email,
    r.slug::text,
    r.created_at,
    r.logo_url::text,
    r.banner_url::text,
    COALESCE(SUM(o.total), 0)::numeric as total_revenue,
    r.responsible_name::text,
    r.tax_id::text,
    COALESCE(r.is_open, false) as is_open,
    COALESCE(r.is_blocked, false) as is_blocked,
    COALESCE(r.monthly_revenue, 0)::numeric as monthly_revenue,
    r.revenue_block_exempt_until,
    COUNT(o.id) FILTER (
      WHERE o.created_at >= date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'
        AND o.status != 'cancelled'
    )::bigint as monthly_orders
  FROM public.restaurants r
  JOIN auth.users au ON r.user_id = au.id
  LEFT JOIN public.orders o ON r.id = o.restaurant_id
  GROUP BY r.id, r.name, r.whatsapp, au.email, r.slug, r.created_at, r.logo_url, r.banner_url, r.responsible_name, r.tax_id, r.is_open, r.is_blocked, r.monthly_revenue, r.revenue_block_exempt_until
  ORDER BY r.created_at DESC;
END;
$function$;
