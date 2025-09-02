-- Adjust revenue check to accept target_time and add monthly reset
DROP FUNCTION IF EXISTS public.check_revenue_limits();

CREATE OR REPLACE FUNCTION public.check_revenue_limits(target_time timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  blocked_count INTEGER := 0;
  r RECORD;
  monthly_rev NUMERIC;
  v_now timestamptz := target_time;
BEGIN
  -- Monthly reset at the start of the month: unblock and reset counters
  IF EXTRACT(DAY FROM v_now) = 1 THEN
    UPDATE public.restaurants 
    SET is_blocked = false,
        monthly_revenue = 0,
        revenue_block_exempt_until = NULL
    WHERE is_blocked = true;
  END IF;

  -- Evaluate revenue limits for non-exempt restaurants
  FOR r IN 
    SELECT id FROM public.restaurants 
    WHERE is_blocked = false
      AND (revenue_block_exempt_until IS NULL OR v_now > revenue_block_exempt_until)
  LOOP
    SELECT COALESCE(SUM(total), 0) INTO monthly_rev
    FROM public.orders
    WHERE restaurant_id = r.id
      AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM v_now)
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM v_now)
      AND status != 'cancelled';

    IF monthly_rev >= 1800 THEN
      UPDATE public.restaurants 
      SET is_blocked = true, monthly_revenue = monthly_rev
      WHERE id = r.id;
      blocked_count := blocked_count + 1;
    ELSE
      UPDATE public.restaurants 
      SET monthly_revenue = monthly_rev
      WHERE id = r.id;
    END IF;
  END LOOP;

  RETURN blocked_count;
END;
$function$;

-- Admin function to set block status bypassing RLS
CREATE OR REPLACE FUNCTION public.admin_set_restaurant_block(
  restaurant_id uuid,
  set_blocked boolean,
  exempt_until timestamptz DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  row_count INTEGER := 0;
BEGIN
  UPDATE public.restaurants
  SET is_blocked = set_blocked,
      revenue_block_exempt_until = exempt_until
  WHERE id = restaurant_id;

  GET DIAGNOSTICS row_count = ROW_COUNT;
  RETURN row_count > 0;
END;
$function$;

-- Admin function to mark a restaurant as paid until end of month
CREATE OR REPLACE FUNCTION public.admin_mark_restaurant_paid(
  restaurant_id uuid,
  for_time timestamptz DEFAULT now()
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  end_of_month timestamptz;
BEGIN
  -- Compute end of month for the provided time
  end_of_month := (date_trunc('month', for_time) + interval '1 month' - interval '1 second');

  UPDATE public.restaurants
  SET is_blocked = false,
      revenue_block_exempt_until = end_of_month
  WHERE id = restaurant_id;

  RETURN end_of_month;
END;
$function$;