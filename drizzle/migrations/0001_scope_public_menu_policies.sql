CREATE OR REPLACE FUNCTION public.restaurant_menu_is_public(_restaurant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = _restaurant_id)
$$;
GRANT EXECUTE ON FUNCTION public.restaurant_menu_is_public(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories" ON public.categories FOR SELECT
USING (public.restaurant_menu_is_public(restaurant_id));

DROP POLICY IF EXISTS "Public can view operating hours" ON public.operating_hours;
CREATE POLICY "Public can view operating hours" ON public.operating_hours FOR SELECT
USING (is_active = true AND public.restaurant_menu_is_public(restaurant_id));

DROP POLICY IF EXISTS "Public can view addon groups" ON public.addon_groups;
CREATE POLICY "Public can view addon groups" ON public.addon_groups FOR SELECT
USING (public.restaurant_menu_is_public(restaurant_id));

DROP POLICY IF EXISTS "Public can view addon options" ON public.addon_options;
CREATE POLICY "Public can view addon options" ON public.addon_options FOR SELECT
USING (EXISTS (SELECT 1 FROM public.addon_groups g WHERE g.id = addon_group_id AND public.restaurant_menu_is_public(g.restaurant_id)));

DROP POLICY IF EXISTS "Public can view product addon relationships" ON public.product_addon_groups;
CREATE POLICY "Public can view product addon relationships" ON public.product_addon_groups FOR SELECT
USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_active = true));