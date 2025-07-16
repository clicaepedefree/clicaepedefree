-- Create delivery zones table for restaurants
CREATE TABLE public.delivery_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  neighborhood TEXT NOT NULL,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

-- Create policies for delivery zones
CREATE POLICY "Public can view active delivery zones" 
ON public.delivery_zones 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Restaurant owners can manage their delivery zones" 
ON public.delivery_zones 
FOR ALL 
USING (restaurant_id IN ( SELECT restaurants.id
   FROM restaurants
  WHERE (restaurants.user_id = auth.uid())));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_delivery_zones_updated_at
BEFORE UPDATE ON public.delivery_zones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();