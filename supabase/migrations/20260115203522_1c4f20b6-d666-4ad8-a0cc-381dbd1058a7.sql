-- Criar tabela de super_admin_users para controle de acesso
CREATE TABLE IF NOT EXISTS public.super_admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir o super admin específico
INSERT INTO public.super_admin_users (user_id) 
VALUES ('a4ce8c45-e88b-4229-88d1-49e2b1e4e25f')
ON CONFLICT (user_id) DO NOTHING;

-- Habilitar RLS na tabela
ALTER TABLE public.super_admin_users ENABLE ROW LEVEL SECURITY;

-- Política para que apenas super admins vejam a tabela
CREATE POLICY "Only super admins can view super_admin_users" 
ON public.super_admin_users 
FOR SELECT 
USING (auth.uid() = user_id);

-- Função SECURITY DEFINER para verificar se usuário é super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM super_admin_users WHERE user_id = check_user_id
  );
END;
$$;

-- Atualizar política de restaurants para permitir super admin ver todos
DROP POLICY IF EXISTS "Restaurant owners can view their own restaurant" ON public.restaurants;
CREATE POLICY "Restaurant owners or super admin can view restaurants" 
ON public.restaurants 
FOR SELECT 
USING (user_id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "Restaurant owners can update their own restaurant" ON public.restaurants;
CREATE POLICY "Restaurant owners or super admin can update restaurants" 
ON public.restaurants 
FOR UPDATE 
USING (user_id = auth.uid() OR public.is_super_admin());

-- Atualizar política de orders para permitir super admin ver todos
DROP POLICY IF EXISTS "Restaurant owners can view their orders with audit" ON public.orders;
CREATE POLICY "Restaurant owners or super admin can view orders" 
ON public.orders 
FOR SELECT 
USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "Restaurant owners can update their orders" ON public.orders;
CREATE POLICY "Restaurant owners or super admin can update orders" 
ON public.orders 
FOR UPDATE 
USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

-- Atualizar política de categories
DROP POLICY IF EXISTS "Restaurant owners can manage their categories" ON public.categories;
CREATE POLICY "Restaurant owners or super admin can manage categories" 
ON public.categories 
FOR ALL 
USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

-- Atualizar política de products
DROP POLICY IF EXISTS "Restaurant owners can manage their products" ON public.products;
CREATE POLICY "Restaurant owners or super admin can manage products" 
ON public.products 
FOR ALL 
USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

-- Atualizar política de addon_groups
DROP POLICY IF EXISTS "Restaurant owners can manage their addon groups" ON public.addon_groups;
CREATE POLICY "Restaurant owners or super admin can manage addon groups" 
ON public.addon_groups 
FOR ALL 
USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

-- Atualizar política de addon_options
DROP POLICY IF EXISTS "Restaurant owners can manage their addon options" ON public.addon_options;
CREATE POLICY "Restaurant owners or super admin can manage addon options" 
ON public.addon_options 
FOR ALL 
USING (
  addon_group_id IN (
    SELECT id FROM addon_groups 
    WHERE restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
  )
  OR public.is_super_admin()
);

-- Atualizar política de delivery_zones
DROP POLICY IF EXISTS "Restaurant owners can manage their delivery zones" ON public.delivery_zones;
CREATE POLICY "Restaurant owners or super admin can manage delivery zones" 
ON public.delivery_zones 
FOR ALL 
USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

-- Atualizar política de payment_methods
DROP POLICY IF EXISTS "Restaurant owners can manage their payment methods" ON public.payment_methods;
CREATE POLICY "Restaurant owners or super admin can manage payment methods" 
ON public.payment_methods 
FOR ALL 
USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

-- Atualizar política de product_addon_groups
DROP POLICY IF EXISTS "Restaurant owners can manage product addon relationships" ON public.product_addon_groups;
CREATE POLICY "Restaurant owners or super admin can manage product addon relationships" 
ON public.product_addon_groups 
FOR ALL 
USING (
  product_id IN (
    SELECT id FROM products 
    WHERE restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
  )
  OR public.is_super_admin()
);