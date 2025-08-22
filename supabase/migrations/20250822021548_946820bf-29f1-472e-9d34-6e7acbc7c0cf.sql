-- Add control fields to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN is_open BOOLEAN DEFAULT true,
ADD COLUMN is_blocked BOOLEAN DEFAULT false,
ADD COLUMN monthly_revenue NUMERIC DEFAULT 0;

-- Create function to calculate monthly revenue for a restaurant
CREATE OR REPLACE FUNCTION public.get_monthly_revenue(restaurant_id_param UUID, target_month INTEGER DEFAULT NULL, target_year INTEGER DEFAULT NULL)
RETURNS NUMERIC AS $$
DECLARE
  calc_month INTEGER;
  calc_year INTEGER;
  result NUMERIC;
BEGIN
  -- Use current month/year if not specified
  calc_month := COALESCE(target_month, EXTRACT(MONTH FROM CURRENT_DATE));
  calc_year := COALESCE(target_year, EXTRACT(YEAR FROM CURRENT_DATE));
  
  SELECT COALESCE(SUM(total), 0) INTO result
  FROM public.orders
  WHERE restaurant_id = restaurant_id_param
    AND EXTRACT(MONTH FROM created_at) = calc_month
    AND EXTRACT(YEAR FROM created_at) = calc_year
    AND status != 'cancelled';
    
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create function to update monthly revenue for all restaurants
CREATE OR REPLACE FUNCTION public.update_monthly_revenues()
RETURNS INTEGER AS $$
DECLARE
  restaurant_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  FOR restaurant_record IN 
    SELECT id FROM public.restaurants
  LOOP
    UPDATE public.restaurants 
    SET monthly_revenue = public.get_monthly_revenue(restaurant_record.id)
    WHERE id = restaurant_record.id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check and block restaurants over limit
CREATE OR REPLACE FUNCTION public.check_revenue_limits()
RETURNS INTEGER AS $$
DECLARE
  blocked_count INTEGER := 0;
  restaurant_record RECORD;
  monthly_rev NUMERIC;
BEGIN
  FOR restaurant_record IN 
    SELECT id FROM public.restaurants WHERE is_blocked = false
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
$$ LANGUAGE plpgsql SECURITY DEFINER;