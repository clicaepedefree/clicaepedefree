-- Tabela de cupons de desconto por restaurante
CREATE TABLE IF NOT EXISTS public.discount_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_value numeric(10,2) DEFAULT 0 CHECK (min_order_value >= 0),
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discount_coupons_code_not_blank CHECK (length(trim(code)) > 0),
  CONSTRAINT discount_coupons_usage_limit_positive CHECK (usage_limit IS NULL OR usage_limit > 0),
  CONSTRAINT discount_coupons_used_count_limit CHECK (usage_limit IS NULL OR used_count <= usage_limit),
  CONSTRAINT discount_coupons_unique_code_per_restaurant UNIQUE (restaurant_id, code)
);

ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;

-- Dono do restaurante pode visualizar seus próprios cupons
DROP POLICY IF EXISTS "Users can view own discount coupons" ON public.discount_coupons;
CREATE POLICY "Users can view own discount coupons"
ON public.discount_coupons
FOR SELECT
USING (
  restaurant_id IN (
    SELECT id FROM public.restaurants WHERE user_id = auth.uid()
  )
);

-- Dono do restaurante pode criar cupons para seu restaurante
DROP POLICY IF EXISTS "Users can create own discount coupons" ON public.discount_coupons;
CREATE POLICY "Users can create own discount coupons"
ON public.discount_coupons
FOR INSERT
WITH CHECK (
  restaurant_id IN (
    SELECT id FROM public.restaurants WHERE user_id = auth.uid()
  )
);

-- Dono do restaurante pode atualizar cupons do seu restaurante
DROP POLICY IF EXISTS "Users can update own discount coupons" ON public.discount_coupons;
CREATE POLICY "Users can update own discount coupons"
ON public.discount_coupons
FOR UPDATE
USING (
  restaurant_id IN (
    SELECT id FROM public.restaurants WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  restaurant_id IN (
    SELECT id FROM public.restaurants WHERE user_id = auth.uid()
  )
);

-- Dono do restaurante pode remover cupons do seu restaurante
DROP POLICY IF EXISTS "Users can delete own discount coupons" ON public.discount_coupons;
CREATE POLICY "Users can delete own discount coupons"
ON public.discount_coupons
FOR DELETE
USING (
  restaurant_id IN (
    SELECT id FROM public.restaurants WHERE user_id = auth.uid()
  )
);

-- Trigger de atualização de updated_at
DROP TRIGGER IF EXISTS update_discount_coupons_updated_at ON public.discount_coupons;
CREATE TRIGGER update_discount_coupons_updated_at
BEFORE UPDATE ON public.discount_coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
