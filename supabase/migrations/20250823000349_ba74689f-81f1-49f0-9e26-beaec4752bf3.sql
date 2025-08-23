-- Add override column to allow manual unblocking until end of month
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS revenue_block_exempt_until timestamp with time zone NULL;

-- Update check_revenue_limits function to respect the exemption window
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
BEGIN
  FOR restaurant_record IN 
    SELECT id FROM public.restaurants 
    WHERE is_blocked = false
      AND (revenue_block_exempt_until IS NULL OR now() > revenue_block_exempt_until)
  LOOP
    monthly_rev := public.get_monthly_revenue(restaurant_record.id);
    
    -- Block if monthly revenue >= 1800 and not already blocked
    IF monthly_rev >= 1800 THEN
      UPDATE public.restaurants 
      SET is_blocked = true, monthly_revenue = monthly_rev
      WHERE id = restaurant_record.id;
      
      blocked_count := blocked_count + 1;
    ELSE
      -- Update monthly revenue
      UPDATE public.restaurants 
      SET monthly_revenue = monthly_rev
      WHERE id = restaurant_record.id;
    END IF;
  END LOOP;
  
  RETURN blocked_count;
END;
$function$;