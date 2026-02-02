-- Create operating hours table
CREATE TABLE public.operating_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  open_time TIME NOT NULL DEFAULT '08:00',
  close_time TIME NOT NULL DEFAULT '22:00',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.operating_hours ENABLE ROW LEVEL SECURITY;

-- Public can view operating hours
CREATE POLICY "Public can view operating hours"
ON public.operating_hours
FOR SELECT
USING (true);

-- Restaurant owners or super admin can manage operating hours
CREATE POLICY "Restaurant owners or super admin can manage operating hours"
ON public.operating_hours
FOR ALL
USING (
  (restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid()))
  OR is_super_admin()
);

-- Create function to check if restaurant should be open based on operating hours
CREATE OR REPLACE FUNCTION public.check_restaurant_open_status(restaurant_id_param UUID, check_time TIMESTAMP WITH TIME ZONE DEFAULT now())
RETURNS BOOLEAN AS $$
DECLARE
  current_day INTEGER;
  current_time_val TIME;
  is_open_result BOOLEAN := false;
BEGIN
  -- Get current day of week (0 = Sunday, 6 = Saturday) in Brazil timezone
  current_day := EXTRACT(DOW FROM check_time AT TIME ZONE 'America/Sao_Paulo');
  current_time_val := (check_time AT TIME ZONE 'America/Sao_Paulo')::TIME;
  
  -- Check if there's an active operating hour for today that covers current time
  SELECT EXISTS (
    SELECT 1 FROM public.operating_hours oh
    WHERE oh.restaurant_id = restaurant_id_param
      AND oh.day_of_week = current_day
      AND oh.is_active = true
      AND current_time_val >= oh.open_time
      AND current_time_val <= oh.close_time
  ) INTO is_open_result;
  
  RETURN is_open_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to update restaurant is_open based on operating hours
CREATE OR REPLACE FUNCTION public.update_restaurants_open_status()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- Update all restaurants that have operating hours configured
  UPDATE public.restaurants r
  SET is_open = check_restaurant_open_status(r.id),
      updated_at = now()
  WHERE EXISTS (
    SELECT 1 FROM public.operating_hours oh 
    WHERE oh.restaurant_id = r.id
  );
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;