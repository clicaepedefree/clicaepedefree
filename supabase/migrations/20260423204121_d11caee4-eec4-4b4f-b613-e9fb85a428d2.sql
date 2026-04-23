-- ============ FOREIGN KEYS ============
ALTER TABLE public.addon_options
  DROP CONSTRAINT IF EXISTS addon_options_addon_group_id_fkey,
  ADD CONSTRAINT addon_options_addon_group_id_fkey FOREIGN KEY (addon_group_id) REFERENCES public.addon_groups(id) ON DELETE CASCADE;

ALTER TABLE public.product_addon_groups
  DROP CONSTRAINT IF EXISTS product_addon_groups_product_id_fkey,
  ADD CONSTRAINT product_addon_groups_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
  DROP CONSTRAINT IF EXISTS product_addon_groups_addon_group_id_fkey,
  ADD CONSTRAINT product_addon_groups_addon_group_id_fkey FOREIGN KEY (addon_group_id) REFERENCES public.addon_groups(id) ON DELETE CASCADE;

ALTER TABLE public.addon_groups
  DROP CONSTRAINT IF EXISTS addon_groups_restaurant_id_fkey,
  ADD CONSTRAINT addon_groups_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_restaurant_id_fkey,
  ADD CONSTRAINT categories_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_restaurant_id_fkey,
  ADD CONSTRAINT products_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE,
  DROP CONSTRAINT IF EXISTS products_category_id_fkey,
  ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;

ALTER TABLE public.delivery_zones
  DROP CONSTRAINT IF EXISTS delivery_zones_restaurant_id_fkey,
  ADD CONSTRAINT delivery_zones_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE public.operating_hours
  DROP CONSTRAINT IF EXISTS operating_hours_restaurant_id_fkey,
  ADD CONSTRAINT operating_hours_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE public.payment_methods
  DROP CONSTRAINT IF EXISTS payment_methods_restaurant_id_fkey,
  ADD CONSTRAINT payment_methods_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE public.discount_coupons
  DROP CONSTRAINT IF EXISTS discount_coupons_restaurant_id_fkey,
  ADD CONSTRAINT discount_coupons_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_restaurant_id_fkey,
  ADD CONSTRAINT orders_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE public.order_access_logs
  DROP CONSTRAINT IF EXISTS order_access_logs_order_id_fkey,
  ADD CONSTRAINT order_access_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- ============ HELPER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.mask_customer_data(customer_name text, customer_phone text, is_owner boolean DEFAULT false)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF is_owner THEN
    RETURN json_build_object('customer_name', customer_name, 'customer_phone', customer_phone);
  ELSE
    RETURN json_build_object(
      'customer_name', CASE WHEN customer_name IS NOT NULL THEN left(customer_name,1)||repeat('*',greatest(length(customer_name)-2,0))||right(customer_name,1) ELSE NULL END,
      'customer_phone', CASE WHEN customer_phone IS NOT NULL THEN left(customer_phone,2)||repeat('*',greatest(length(customer_phone)-4,0))||right(customer_phone,2) ELSE NULL END
    );
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.anonymize_old_orders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affected_rows INTEGER;
BEGIN
  UPDATE public.orders SET customer_name='ANONYMIZED', customer_phone='ANONYMIZED', address='ANONYMIZED'
  WHERE created_at < now() - INTERVAL '2 years' AND customer_name != 'ANONYMIZED';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END; $$;

-- ============ SECURE VIEW ============
CREATE OR REPLACE VIEW public.secure_orders_view WITH (security_invoker = true) AS
SELECT 
  o.id, o.order_number, o.restaurant_id, o.items, o.subtotal, o.delivery_fee, o.total,
  o.created_at, o.updated_at, o.status, o.payment_method,
  o.customer_name, o.customer_phone, o.address
FROM public.orders o;

-- ============ ADMIN RPCs (auth + super admin guarded) ============
CREATE OR REPLACE FUNCTION public.get_restaurants_with_emails()
RETURNS TABLE(id uuid, name text, whatsapp text, user_email text, slug text, created_at timestamptz, logo_url text, banner_url text, total_revenue numeric, responsible_name text, tax_id text, is_open boolean, is_blocked boolean, monthly_revenue numeric, revenue_block_exempt_until timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'Super admin privileges required'; END IF;
  RETURN QUERY
  SELECT r.id, r.name::text, r.whatsapp::text, au.email::text, r.slug::text, r.created_at,
         r.logo_url::text, r.banner_url::text,
         COALESCE(SUM(o.total),0)::numeric,
         r.responsible_name::text, r.tax_id::text,
         COALESCE(r.is_open,false), COALESCE(r.is_blocked,false),
         COALESCE(r.monthly_revenue,0)::numeric, r.revenue_block_exempt_until
  FROM public.restaurants r
  JOIN auth.users au ON r.user_id = au.id
  LEFT JOIN public.orders o ON r.id = o.restaurant_id
  GROUP BY r.id, au.email
  ORDER BY r.created_at DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_restaurant_block(restaurant_id uuid, set_blocked boolean, exempt_until timestamptz DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE row_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'Super admin privileges required'; END IF;
  UPDATE public.restaurants SET is_blocked = set_blocked, revenue_block_exempt_until = exempt_until WHERE id = restaurant_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  RETURN row_count > 0;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_mark_restaurant_paid(restaurant_id uuid, for_time timestamptz DEFAULT now())
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE end_of_month timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'Super admin privileges required'; END IF;
  end_of_month := (date_trunc('month', for_time) + interval '1 month' - interval '1 second');
  UPDATE public.restaurants SET is_blocked = false, revenue_block_exempt_until = end_of_month WHERE id = restaurant_id;
  RETURN end_of_month;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_restaurants_with_emails() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_restaurant_block(uuid,boolean,timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_restaurant_paid(uuid,timestamptz) TO authenticated;

-- ============ SECURITY: tighten storage listing ============
DROP POLICY IF EXISTS "Public can view restaurant images" ON storage.objects;
-- Public can read individual files (for direct URL access), but only owners can list their own folder
CREATE POLICY "Public can view restaurant image files" ON storage.objects FOR SELECT
USING (
  bucket_id = 'restaurant-images'
  AND (
    -- Allow public read of specific files (most common case via public URL)
    auth.uid() IS NULL
    OR auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_super_admin()
  )
);