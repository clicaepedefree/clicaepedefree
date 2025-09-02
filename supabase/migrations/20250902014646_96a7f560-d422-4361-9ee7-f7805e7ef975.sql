-- Timezone-aware monthly revenue functions aligned to Brasília time

-- Replace get_monthly_revenue to use timezone boundaries
CREATE OR REPLACE FUNCTION public.get_monthly_revenue(
  restaurant_id_param uuid,
  target_time timestamptz DEFAULT now(),
  tz text DEFAULT 'America/Sao_Paulo'
)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  local_now timestamp;
  local_month_start timestamp;
  local_next_month_start timestamp;
  month_start_utc timestamptz;
  next_month_start_utc timestamptz;
  result NUMERIC;
BEGIN
  -- Convert target time to local timezone and compute month boundaries
  local_now := target_time AT TIME ZONE tz;
  local_month_start := date_trunc('month', local_now);
  local_next_month_start := local_month_start + interval '1 month';
  
  -- Convert local boundaries back to UTC for comparison with timestamptz
  month_start_utc := local_month_start AT TIME ZONE tz;
  next_month_start_utc := local_next_month_start AT TIME ZONE tz;
  
  SELECT COALESCE(SUM(total), 0) INTO result
  FROM public.orders
  WHERE restaurant_id = restaurant_id_param
    AND created_at >= month_start_utc
    AND created_at < next_month_start_utc
    AND status != 'cancelled';
    
  RETURN result;
END;
$function$;

-- Replace update_monthly_revenues to accept a target time and timezone
CREATE OR REPLACE FUNCTION public.update_monthly_revenues(
  target_time timestamptz DEFAULT now(),
  tz text DEFAULT 'America/Sao_Paulo'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  updated_count INTEGER := 0;
BEGIN
  FOR r IN SELECT id FROM public.restaurants LOOP
    UPDATE public.restaurants 
    SET monthly_revenue = public.get_monthly_revenue(r.id, target_time, tz)
    WHERE id = r.id;
    updated_count := updated_count + 1;
  END LOOP;
  RETURN updated_count;
END;
$function$;

-- Update check_revenue_limits to use timezone-aware monthly revenue and local day check
CREATE OR REPLACE FUNCTION public.check_revenue_limits(
  target_time timestamptz DEFAULT now(),
  tz text DEFAULT 'America/Sao_Paulo'
)
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
  local_now timestamp := target_time AT TIME ZONE tz;
BEGIN
  -- Monthly reset at the start of the month (local time)
  IF EXTRACT(DAY FROM local_now) = 1 THEN
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
    monthly_rev := public.get_monthly_revenue(r.id, v_now, tz);

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