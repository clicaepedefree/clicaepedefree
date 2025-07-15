-- Fix the function to match the expected return types
DROP FUNCTION IF EXISTS public.get_restaurants_with_emails();

CREATE OR REPLACE FUNCTION public.get_restaurants_with_emails()
RETURNS TABLE (
  id uuid,
  name text,
  whatsapp text,
  user_email text,
  slug text,
  created_at timestamp with time zone,
  logo_url text,
  banner_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    r.banner_url::text
  FROM public.restaurants r
  JOIN auth.users au ON r.user_id = au.id
  ORDER BY r.created_at DESC;
END;
$$;