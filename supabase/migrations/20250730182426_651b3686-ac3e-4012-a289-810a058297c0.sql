-- Atualizar função para gerar slug sem hífens
CREATE OR REPLACE FUNCTION public.generate_unique_slug(restaurant_name text)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Criar slug base removendo acentos e caracteres especiais
  base_slug := lower(trim(restaurant_name));
  -- Remover acentos
  base_slug := translate(base_slug, 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiioooooouuuucn');
  -- Manter apenas letras e números
  base_slug := regexp_replace(base_slug, '[^a-z0-9]', '', 'g');
  
  final_slug := base_slug;
  
  -- Verificar se o slug já existe e adicionar número se necessário
  WHILE EXISTS (SELECT 1 FROM public.restaurants WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$function$