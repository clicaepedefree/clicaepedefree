-- Create payment methods table for restaurants
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  method_type TEXT NOT NULL CHECK (method_type IN ('cash', 'card', 'pix')),
  is_active BOOLEAN DEFAULT true,
  pix_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, method_type)
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view active payment methods" 
ON public.payment_methods 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Restaurant owners can manage their payment methods" 
ON public.payment_methods 
FOR ALL 
USING (restaurant_id IN (
  SELECT restaurants.id 
  FROM restaurants 
  WHERE restaurants.user_id = auth.uid()
));

-- Create trigger for timestamps
CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();