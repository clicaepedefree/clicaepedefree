-- Restore full schema from backup
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============ TABLES ============
CREATE TABLE IF NOT EXISTS public.addon_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  name text NOT NULL,
  selection_type text NOT NULL,
  is_required boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  min_selections integer DEFAULT 0,
  max_selections integer,
  PRIMARY KEY (id)
);
ALTER TABLE public.addon_groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.addon_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  addon_group_id uuid NOT NULL,
  name text NOT NULL,
  price numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  description text,
  PRIMARY KEY (id)
);
ALTER TABLE public.addon_options ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  name text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  neighborhood text NOT NULL,
  delivery_fee numeric NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.discount_coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  code text NOT NULL,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL,
  min_order_value numeric NOT NULL DEFAULT 0,
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (restaurant_id, code)
);
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.operating_hours (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  day_of_week integer NOT NULL,
  open_time time NOT NULL DEFAULT '08:00:00',
  close_time time NOT NULL DEFAULT '22:00:00',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (restaurant_id, day_of_week)
);
ALTER TABLE public.operating_hours ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.order_access_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  accessed_by uuid,
  access_type text NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.order_access_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_number integer,
  restaurant_id uuid NOT NULL,
  customer_name text,
  customer_phone text,
  items jsonb NOT NULL,
  subtotal numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  address text,
  payment_method text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  method_type text NOT NULL,
  pix_key text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (restaurant_id, method_type)
);
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.product_addon_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  addon_group_id uuid NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (product_id, addon_group_id)
);
ALTER TABLE public.product_addon_groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  category_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  image_url text,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.restaurants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  whatsapp text NOT NULL,
  logo_url text,
  banner_url text,
  tax_id text,
  responsible_name text,
  is_open boolean DEFAULT false,
  is_blocked boolean DEFAULT false,
  monthly_revenue numeric DEFAULT 0,
  revenue_block_exempt_until timestamptz,
  delivery_enabled boolean DEFAULT true,
  pickup_enabled boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (slug),
  UNIQUE (user_id)
);
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.super_admin_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (user_id)
);
ALTER TABLE public.super_admin_users ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.super_admins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (email)
);
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_products_is_featured ON public.products (is_featured) WHERE is_featured = true;

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public) VALUES ('restaurant-images', 'restaurant-images', true) ON CONFLICT (id) DO NOTHING;

-- ============ FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.validate_selection_type()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.selection_type NOT IN ('single','multiple','fractional_highest','fractional_average') THEN
    RAISE EXCEPTION 'Invalid selection_type: %', NEW.selection_type;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.assign_order_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE next_number integer;
BEGIN
  SELECT COALESCE(MAX(order_number),0)+1 INTO next_number
  FROM public.orders WHERE restaurant_id = NEW.restaurant_id;
  NEW.order_number := next_number;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.super_admin_users WHERE user_id = check_user_id);
END; $$;

CREATE OR REPLACE FUNCTION public.generate_unique_slug(restaurant_name text)
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE base_slug TEXT; final_slug TEXT; counter INTEGER := 0;
BEGIN
  base_slug := lower(trim(restaurant_name));
  base_slug := translate(base_slug,'áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiioooooouuuucn');
  base_slug := regexp_replace(base_slug,'[^a-z0-9]','','g');
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.restaurants WHERE slug = final_slug) LOOP
    counter := counter + 1; final_slug := base_slug || counter;
  END LOOP;
  RETURN final_slug;
END; $$;

CREATE OR REPLACE FUNCTION public.get_public_restaurant_by_slug(slug_input text)
RETURNS TABLE(id uuid, name text, slug text, logo_url text, banner_url text,
              is_open boolean, whatsapp text, delivery_enabled boolean, pickup_enabled boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.name, r.slug, r.logo_url, r.banner_url,
         COALESCE(r.is_open,false), r.whatsapp,
         COALESCE(r.delivery_enabled,true), COALESCE(r.pickup_enabled,true)
  FROM public.restaurants r WHERE r.slug = slug_input LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.check_restaurant_open_status(restaurant_id_param uuid, check_time timestamptz DEFAULT now())
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_day INTEGER; current_time_val TIME; is_open_result BOOLEAN := false;
BEGIN
  current_day := EXTRACT(DOW FROM check_time AT TIME ZONE 'America/Sao_Paulo');
  current_time_val := (check_time AT TIME ZONE 'America/Sao_Paulo')::TIME;
  SELECT EXISTS (
    SELECT 1 FROM public.operating_hours oh
    WHERE oh.restaurant_id = restaurant_id_param
      AND oh.day_of_week = current_day AND oh.is_active = true
      AND current_time_val >= oh.open_time AND current_time_val <= oh.close_time
  ) INTO is_open_result;
  RETURN is_open_result;
END; $$;

CREATE OR REPLACE FUNCTION public.update_restaurants_open_status()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE updated_count INTEGER := 0;
BEGIN
  UPDATE public.restaurants r
  SET is_open = public.check_restaurant_open_status(r.id), updated_at = now()
  WHERE EXISTS (SELECT 1 FROM public.operating_hours oh WHERE oh.restaurant_id = r.id);
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END; $$;

CREATE OR REPLACE FUNCTION public.get_monthly_revenue(restaurant_id_param uuid, target_time timestamptz DEFAULT now(), tz text DEFAULT 'America/Sao_Paulo')
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE local_now timestamp; local_month_start timestamp; local_next timestamp;
        ms_utc timestamptz; ne_utc timestamptz; result numeric;
BEGIN
  local_now := target_time AT TIME ZONE tz;
  local_month_start := date_trunc('month', local_now);
  local_next := local_month_start + interval '1 month';
  ms_utc := local_month_start AT TIME ZONE tz;
  ne_utc := local_next AT TIME ZONE tz;
  SELECT COALESCE(SUM(total),0) INTO result FROM public.orders
  WHERE restaurant_id = restaurant_id_param AND created_at >= ms_utc AND created_at < ne_utc AND status != 'cancelled';
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.update_monthly_revenues(target_time timestamptz DEFAULT now(), tz text DEFAULT 'America/Sao_Paulo')
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; updated_count INTEGER := 0;
BEGIN
  FOR r IN SELECT id FROM public.restaurants LOOP
    UPDATE public.restaurants SET monthly_revenue = public.get_monthly_revenue(r.id, target_time, tz) WHERE id = r.id;
    updated_count := updated_count + 1;
  END LOOP; RETURN updated_count;
END; $$;

CREATE OR REPLACE FUNCTION public.check_revenue_limits(target_time timestamptz DEFAULT now(), tz text DEFAULT 'America/Sao_Paulo')
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE blocked_count INTEGER := 0; r RECORD; monthly_rev numeric;
        v_now timestamptz := target_time; local_now timestamp := target_time AT TIME ZONE tz;
BEGIN
  IF EXTRACT(DAY FROM local_now) = 1 THEN
    UPDATE public.restaurants SET is_blocked=false, monthly_revenue=0, revenue_block_exempt_until=NULL WHERE is_blocked=true;
  END IF;
  FOR r IN SELECT id FROM public.restaurants
           WHERE is_blocked=false AND (revenue_block_exempt_until IS NULL OR v_now > revenue_block_exempt_until) LOOP
    monthly_rev := public.get_monthly_revenue(r.id, v_now, tz);
    IF monthly_rev >= 1800 THEN
      UPDATE public.restaurants SET is_blocked=true, monthly_revenue=monthly_rev WHERE id = r.id;
      blocked_count := blocked_count + 1;
    ELSE
      UPDATE public.restaurants SET monthly_revenue=monthly_rev WHERE id = r.id;
    END IF;
  END LOOP; RETURN blocked_count;
END; $$;

CREATE OR REPLACE FUNCTION public.user_owns_order_restaurant(order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o JOIN public.restaurants r ON o.restaurant_id = r.id
    WHERE o.id = order_id AND r.user_id = auth.uid()
  );
$$;

-- ============ TRIGGERS ============
DROP TRIGGER IF EXISTS trg_addon_groups_updated_at ON public.addon_groups;
CREATE TRIGGER trg_addon_groups_updated_at BEFORE UPDATE ON public.addon_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_addon_groups_validate ON public.addon_groups;
CREATE TRIGGER trg_addon_groups_validate BEFORE INSERT OR UPDATE ON public.addon_groups FOR EACH ROW EXECUTE FUNCTION public.validate_selection_type();
DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_delivery_zones_updated_at ON public.delivery_zones;
CREATE TRIGGER trg_delivery_zones_updated_at BEFORE UPDATE ON public.delivery_zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_discount_coupons_updated_at ON public.discount_coupons;
CREATE TRIGGER trg_discount_coupons_updated_at BEFORE UPDATE ON public.discount_coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_operating_hours_updated_at ON public.operating_hours;
CREATE TRIGGER trg_operating_hours_updated_at BEFORE UPDATE ON public.operating_hours FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_orders_assign_number ON public.orders;
CREATE TRIGGER trg_orders_assign_number BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.assign_order_number();
DROP TRIGGER IF EXISTS trg_payment_methods_updated_at ON public.payment_methods;
CREATE TRIGGER trg_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_restaurants_updated_at ON public.restaurants;
CREATE TRIGGER trg_restaurants_updated_at BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_super_admins_updated_at ON public.super_admins;
CREATE TRIGGER trg_super_admins_updated_at BEFORE UPDATE ON public.super_admins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RLS POLICIES ============
CREATE POLICY "Public can view addon groups" ON public.addon_groups FOR SELECT USING (true);
CREATE POLICY "Owners or super admin manage addon groups" ON public.addon_groups FOR ALL
USING ((restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid())) OR public.is_super_admin());

CREATE POLICY "Public can view addon options" ON public.addon_options FOR SELECT USING (true);
CREATE POLICY "Owners or super admin manage addon options" ON public.addon_options FOR ALL
USING ((addon_group_id IN (SELECT id FROM public.addon_groups WHERE restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid()))) OR public.is_super_admin());

CREATE POLICY "Public can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Owners or super admin manage categories" ON public.categories FOR ALL
USING ((restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid())) OR public.is_super_admin());

CREATE POLICY "Public can view active delivery zones" ON public.delivery_zones FOR SELECT USING (is_active = true);
CREATE POLICY "Owners or super admin manage delivery zones" ON public.delivery_zones FOR ALL
USING ((restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid())) OR public.is_super_admin());

CREATE POLICY "Public can view active coupons" ON public.discount_coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Owners or super admin manage coupons" ON public.discount_coupons FOR ALL
USING ((restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid())) OR public.is_super_admin());

CREATE POLICY "Public can view operating hours" ON public.operating_hours FOR SELECT USING (true);
CREATE POLICY "Owners or super admin manage operating hours" ON public.operating_hours FOR ALL
USING ((restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid())) OR public.is_super_admin());

CREATE POLICY "Owners can view order access logs" ON public.order_access_logs FOR SELECT
USING (order_id IN (SELECT o.id FROM public.orders o JOIN public.restaurants r ON o.restaurant_id = r.id WHERE r.user_id = auth.uid()));

CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners or super admin update orders" ON public.orders FOR UPDATE
USING ((restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid())) OR public.is_super_admin());
CREATE POLICY "Owners or super admin view orders" ON public.orders FOR SELECT
USING ((restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid())) OR public.is_super_admin());

CREATE POLICY "Public can view active payment methods" ON public.payment_methods FOR SELECT USING (is_active = true);
CREATE POLICY "Owners or super admin manage payment methods" ON public.payment_methods FOR ALL
USING ((restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid())) OR public.is_super_admin());

CREATE POLICY "Public can view product addon relationships" ON public.product_addon_groups FOR SELECT USING (true);
CREATE POLICY "Owners or super admin manage product addon relationships" ON public.product_addon_groups FOR ALL
USING ((product_id IN (SELECT id FROM public.products WHERE restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid()))) OR public.is_super_admin());

CREATE POLICY "Public can view active products" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Owners or super admin manage products" ON public.products FOR ALL
USING ((restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid())) OR public.is_super_admin());

CREATE POLICY "Users can create their own restaurant" ON public.restaurants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners or super admin update restaurants" ON public.restaurants FOR UPDATE
USING ((user_id = auth.uid()) OR public.is_super_admin());
CREATE POLICY "Owners or super admin view restaurants" ON public.restaurants FOR SELECT
USING ((user_id = auth.uid()) OR public.is_super_admin());

CREATE POLICY "Only super admins can view super_admin_users" ON public.super_admin_users FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view their own data" ON public.super_admins FOR SELECT USING (auth.uid()::text = id::text);

-- ============ STORAGE POLICIES ============
CREATE POLICY "Public can view restaurant images" ON storage.objects FOR SELECT USING (bucket_id = 'restaurant-images');
CREATE POLICY "Restaurant owners can upload their images" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'restaurant-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Restaurant owners can update their images" ON storage.objects FOR UPDATE
USING (bucket_id = 'restaurant-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Restaurant owners can delete their images" ON storage.objects FOR DELETE
USING (bucket_id = 'restaurant-images' AND auth.uid()::text = (storage.foldername(name))[1]);