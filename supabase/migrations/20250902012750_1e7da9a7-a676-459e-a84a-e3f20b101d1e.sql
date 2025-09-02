-- Atualizar a função check_revenue_limits para usar data específica e corrigir lógica de reset mensal
CREATE OR REPLACE FUNCTION public.check_revenue_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  blocked_count INTEGER := 0;
  restaurant_record RECORD;
  monthly_rev NUMERIC;
  current_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Usar data específica para testes: 01/09/2025 22:24 Brasília (UTC-3 = UTC 01:24 02/09/2025)
  current_time := '2025-09-02 01:24:00+00'::timestamp with time zone;
  
  -- Reset automático no início do mês: desbloquear restaurantes que não têm isenção ativa
  UPDATE public.restaurants 
  SET is_blocked = false, 
      revenue_block_exempt_until = NULL,
      monthly_revenue = 0
  WHERE is_blocked = true 
    AND (revenue_block_exempt_until IS NULL OR current_time > revenue_block_exempt_until)
    AND EXTRACT(DAY FROM current_time) = 1; -- Primeiro dia do mês
  
  -- Verificar limites de receita apenas para restaurantes não isentos
  FOR restaurant_record IN 
    SELECT id FROM public.restaurants 
    WHERE is_blocked = false
      AND (revenue_block_exempt_until IS NULL OR current_time > revenue_block_exempt_until)
  LOOP
    -- Calcular receita do mês corrente
    SELECT COALESCE(SUM(total), 0) INTO monthly_rev
    FROM public.orders
    WHERE restaurant_id = restaurant_record.id
      AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM current_time)
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM current_time)
      AND status != 'cancelled';
    
    -- Bloquear se receita mensal >= 1800 e não está isento
    IF monthly_rev >= 1800 THEN
      UPDATE public.restaurants 
      SET is_blocked = true, monthly_revenue = monthly_rev
      WHERE id = restaurant_record.id;
      
      blocked_count := blocked_count + 1;
    ELSE
      -- Atualizar receita mensal
      UPDATE public.restaurants 
      SET monthly_revenue = monthly_rev
      WHERE id = restaurant_record.id;
    END IF;
  END LOOP;
  
  RETURN blocked_count;
END;
$function$;