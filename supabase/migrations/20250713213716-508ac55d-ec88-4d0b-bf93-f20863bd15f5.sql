-- Criar tabela de restaurantes
CREATE TABLE public.restaurants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  logo_url TEXT,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de categorias
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de grupos de adicionais
CREATE TABLE public.addon_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  selection_type TEXT NOT NULL CHECK (selection_type IN ('single', 'multiple')),
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de opções de adicionais
CREATE TABLE public.addon_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  addon_group_id UUID NOT NULL REFERENCES public.addon_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de produtos
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de relacionamento produto-grupo de adicionais
CREATE TABLE public.product_addon_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  addon_group_id UUID NOT NULL REFERENCES public.addon_groups(id) ON DELETE CASCADE,
  UNIQUE(product_id, addon_group_id)
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addon_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addon_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_addon_groups ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para restaurants
CREATE POLICY "Users can view their own restaurant" 
ON public.restaurants 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own restaurant" 
ON public.restaurants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own restaurant" 
ON public.restaurants 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Políticas para permitir visualização pública dos restaurantes por slug
CREATE POLICY "Public can view restaurants by slug" 
ON public.restaurants 
FOR SELECT 
USING (true);

-- Criar políticas RLS para categories
CREATE POLICY "Restaurant owners can manage their categories" 
ON public.categories 
FOR ALL 
USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid()));

CREATE POLICY "Public can view categories" 
ON public.categories 
FOR SELECT 
USING (true);

-- Criar políticas RLS para addon_groups
CREATE POLICY "Restaurant owners can manage their addon groups" 
ON public.addon_groups 
FOR ALL 
USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid()));

CREATE POLICY "Public can view addon groups" 
ON public.addon_groups 
FOR SELECT 
USING (true);

-- Criar políticas RLS para addon_options
CREATE POLICY "Restaurant owners can manage their addon options" 
ON public.addon_options 
FOR ALL 
USING (addon_group_id IN (
  SELECT id FROM public.addon_groups 
  WHERE restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid())
));

CREATE POLICY "Public can view addon options" 
ON public.addon_options 
FOR SELECT 
USING (true);

-- Criar políticas RLS para products
CREATE POLICY "Restaurant owners can manage their products" 
ON public.products 
FOR ALL 
USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid()));

CREATE POLICY "Public can view active products" 
ON public.products 
FOR SELECT 
USING (is_active = true);

-- Criar políticas RLS para product_addon_groups
CREATE POLICY "Restaurant owners can manage product addon relationships" 
ON public.product_addon_groups 
FOR ALL 
USING (product_id IN (
  SELECT id FROM public.products 
  WHERE restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid())
));

CREATE POLICY "Public can view product addon relationships" 
ON public.product_addon_groups 
FOR SELECT 
USING (true);

-- Criar função para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para atualizar timestamps
CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_addon_groups_updated_at
  BEFORE UPDATE ON public.addon_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar função para gerar slug único
CREATE OR REPLACE FUNCTION public.generate_unique_slug(restaurant_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Criar slug base removendo acentos e caracteres especiais
  base_slug := lower(trim(restaurant_name));
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
  
  final_slug := base_slug;
  
  -- Verificar se o slug já existe e adicionar número se necessário
  WHILE EXISTS (SELECT 1 FROM public.restaurants WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;