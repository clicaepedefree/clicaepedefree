-- Update the get_restaurants_with_emails function to include revenue calculation
CREATE OR REPLACE FUNCTION public.get_restaurants_with_emails()
 RETURNS TABLE(id uuid, name text, whatsapp text, user_email text, slug text, created_at timestamp with time zone, logo_url text, banner_url text, total_revenue numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
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
    COALESCE(SUM(o.total), 0)::numeric as total_revenue
  FROM public.restaurants r
  JOIN auth.users au ON r.user_id = au.id
  LEFT JOIN public.orders o ON r.id = o.restaurant_id
  GROUP BY r.id, r.name, r.whatsapp, au.email, r.slug, r.created_at, r.logo_url, r.banner_url
  ORDER BY r.created_at DESC;
END;
$function$