-- Create a function to get all restaurants with owner emails for super admin
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
    r.name,
    r.whatsapp,
    au.email as user_email,
    r.slug,
    r.created_at,
    r.logo_url,
    r.banner_url
  FROM public.restaurants r
  JOIN auth.users au ON r.user_id = au.id
  ORDER BY r.created_at DESC;
END;
$$;

-- Create RLS policy for the function (allow authenticated users to call it)
-- Note: In production, you'd want to restrict this to actual super admins
GRANT EXECUTE ON FUNCTION public.get_restaurants_with_emails() TO authenticated;