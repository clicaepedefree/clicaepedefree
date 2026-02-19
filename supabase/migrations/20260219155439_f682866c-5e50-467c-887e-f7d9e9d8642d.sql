
CREATE TABLE public.discount_coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL,
  code text NOT NULL,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL,
  min_order_value numeric NOT NULL DEFAULT 0,
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique code per restaurant
CREATE UNIQUE INDEX idx_discount_coupons_code_restaurant ON public.discount_coupons (restaurant_id, code);

-- Enable RLS
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;

-- Restaurant owners can manage their coupons
CREATE POLICY "Restaurant owners or super admin can manage coupons"
ON public.discount_coupons
FOR ALL
USING (
  (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()))
  OR is_super_admin()
);

-- Public can view active coupons (needed for applying coupons on menu)
CREATE POLICY "Public can view active coupons"
ON public.discount_coupons
FOR SELECT
USING (is_active = true);
