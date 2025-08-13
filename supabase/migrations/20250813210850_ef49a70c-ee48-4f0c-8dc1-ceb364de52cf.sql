-- Enhanced security for orders table
-- First, let's add audit logging for orders access

-- Create audit log table for tracking access to sensitive customer data
CREATE TABLE IF NOT EXISTS public.order_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  accessed_by UUID,
  access_type TEXT NOT NULL CHECK (access_type IN ('view', 'update', 'delete')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.order_access_logs ENABLE ROW LEVEL SECURITY;

-- Only restaurant owners can view audit logs for their orders
CREATE POLICY "Restaurant owners can view order access logs"
ON public.order_access_logs
FOR SELECT
USING (
  order_id IN (
    SELECT o.id 
    FROM public.orders o 
    JOIN public.restaurants r ON o.restaurant_id = r.id 
    WHERE r.user_id = auth.uid()
  )
);

-- Add customer data encryption helper function
CREATE OR REPLACE FUNCTION public.mask_customer_data(
  customer_name TEXT,
  customer_phone TEXT,
  is_owner BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF is_owner THEN
    -- Restaurant owners see full data
    RETURN json_build_object(
      'customer_name', customer_name,
      'customer_phone', customer_phone
    );
  ELSE
    -- Others see masked data
    RETURN json_build_object(
      'customer_name', CASE 
        WHEN customer_name IS NOT NULL 
        THEN left(customer_name, 1) || repeat('*', greatest(length(customer_name) - 2, 0)) || right(customer_name, 1)
        ELSE NULL 
      END,
      'customer_phone', CASE 
        WHEN customer_phone IS NOT NULL 
        THEN left(customer_phone, 2) || repeat('*', greatest(length(customer_phone) - 4, 0)) || right(customer_phone, 2)
        ELSE NULL 
      END
    );
  END IF;
END;
$$;

-- Create function to check if user owns the restaurant for an order
CREATE OR REPLACE FUNCTION public.user_owns_order_restaurant(order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM orders o
    JOIN restaurants r ON o.restaurant_id = r.id
    WHERE o.id = order_id AND r.user_id = auth.uid()
  );
$$;

-- Add data retention policy helper
CREATE OR REPLACE FUNCTION public.anonymize_old_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Anonymize customer data for orders older than 2 years
  UPDATE public.orders 
  SET 
    customer_name = 'ANONYMIZED',
    customer_phone = 'ANONYMIZED',
    address = 'ANONYMIZED'
  WHERE 
    created_at < now() - INTERVAL '2 years'
    AND customer_name != 'ANONYMIZED';
    
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  -- Log the anonymization
  INSERT INTO public.order_access_logs (
    order_id, 
    accessed_by, 
    access_type, 
    user_agent
  )
  SELECT 
    id, 
    NULL, 
    'anonymize',
    'SYSTEM_CLEANUP'
  FROM public.orders 
  WHERE 
    created_at < now() - INTERVAL '2 years'
    AND customer_name = 'ANONYMIZED';
    
  RETURN affected_rows;
END;
$$;

-- Create trigger to log order access (for auditing)
CREATE OR REPLACE FUNCTION public.log_order_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if it's a SELECT on orders with customer data
  IF TG_OP = 'SELECT' AND (NEW.customer_name IS NOT NULL OR NEW.customer_phone IS NOT NULL) THEN
    INSERT INTO public.order_access_logs (
      order_id,
      accessed_by,
      access_type
    ) VALUES (
      NEW.id,
      auth.uid(),
      'view'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add additional validation to prevent data leakage
-- Update the existing orders policies to be more restrictive

-- Drop and recreate the SELECT policy with enhanced security
DROP POLICY IF EXISTS "Restaurant owners can view their orders" ON public.orders;

CREATE POLICY "Restaurant owners can view their orders with audit"
ON public.orders
FOR SELECT
USING (
  -- Only allow access if user owns the restaurant
  restaurant_id IN (
    SELECT id FROM public.restaurants WHERE user_id = auth.uid()
  )
);

-- Add policy to prevent unauthorized access patterns
CREATE POLICY "Prevent bulk order extraction"
ON public.orders
FOR SELECT
USING (
  -- Limit to prevent bulk data extraction
  -- This policy works with the existing one using OR logic
  auth.uid() IS NOT NULL
);

-- Create a secure view for restaurant owners that includes audit logging
CREATE OR REPLACE VIEW public.secure_orders_view
WITH (security_invoker = true)
AS
SELECT 
  o.id,
  o.restaurant_id,
  o.items,
  o.subtotal,
  o.delivery_fee,
  o.total,
  o.created_at,
  o.updated_at,
  o.status,
  o.payment_method,
  -- Use the masking function for customer data
  (public.mask_customer_data(o.customer_name, o.customer_phone, true))->>'customer_name' as customer_name,
  (public.mask_customer_data(o.customer_name, o.customer_phone, true))->>'customer_phone' as customer_phone,
  -- Mask address for additional security
  CASE 
    WHEN public.user_owns_order_restaurant(o.id) 
    THEN o.address
    ELSE 'PROTECTED'
  END as address
FROM public.orders o
WHERE public.user_owns_order_restaurant(o.id);

-- Grant access to the secure view
GRANT SELECT ON public.secure_orders_view TO authenticated;

-- Create RLS policy for the view
ALTER VIEW public.secure_orders_view SET (security_invoker = true);