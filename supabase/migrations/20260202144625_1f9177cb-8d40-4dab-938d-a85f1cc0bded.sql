-- Drop the existing function first and recreate with new columns
DROP FUNCTION IF EXISTS public.get_public_restaurant_by_slug(text);

CREATE FUNCTION public.get_public_restaurant_by_slug(slug_input text)
 RETURNS TABLE(id uuid, name text, slug text, logo_url text, banner_url text, is_open boolean, whatsapp text, delivery_enabled boolean, pickup_enabled boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.id, r.name, r.slug, r.logo_url, r.banner_url, COALESCE(r.is_open, false) AS is_open, r.whatsapp, COALESCE(r.delivery_enabled, true) AS delivery_enabled, COALESCE(r.pickup_enabled, true) AS pickup_enabled
  FROM public.restaurants r
  WHERE r.slug = slug_input
  LIMIT 1;
$function$;