-- 1) Drop overly permissive public select policy on restaurants
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'restaurants' AND policyname = 'Public can view restaurants by slug'
  ) THEN
    EXECUTE 'DROP POLICY "Public can view restaurants by slug" ON public.restaurants';
  END IF;
END $$;

-- 2) Create a SECURITY DEFINER function exposing only safe public fields (keeps WhatsApp optional)
-- We will include whatsapp because the public site likely needs it for ordering; exclude tax_id, responsible_name,
-- is_blocked, monthly_revenue, revenue_block_exempt_until, user_id, updated_at, created_at
CREATE OR REPLACE FUNCTION public.get_public_restaurant_by_slug(slug_input text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  logo_url text,
  banner_url text,
  is_open boolean,
  whatsapp text
) AS $$
  SELECT r.id, r.name, r.slug, r.logo_url, r.banner_url, COALESCE(r.is_open, false) AS is_open, r.whatsapp
  FROM public.restaurants r
  WHERE r.slug = slug_input
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 3) Ensure only authenticated owners can query restaurants directly; no public select policy remains
-- Recreate owner-view policy if missing (idempotent safety)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'restaurants' AND policyname = 'Users can view their own restaurant'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their own restaurant" ON public.restaurants FOR SELECT USING (auth.uid() = user_id)';
  END IF;
END $$;

-- 4) Grant execute on the function to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_public_restaurant_by_slug(text) TO anon, authenticated;