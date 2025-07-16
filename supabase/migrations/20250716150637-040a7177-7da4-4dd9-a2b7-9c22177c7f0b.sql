-- Create table for super admin users
CREATE TABLE public.super_admins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Create policies for super admins (only they can see themselves)
CREATE POLICY "Super admins can view their own data" 
ON public.super_admins 
FOR SELECT 
USING (auth.uid()::text = id::text);

-- Create function to authenticate super admin
CREATE OR REPLACE FUNCTION public.authenticate_super_admin(
  admin_email text,
  admin_password text
)
RETURNS TABLE (
  id uuid,
  email text,
  success boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_record public.super_admins%ROWTYPE;
BEGIN
  -- Find admin by email
  SELECT * INTO admin_record 
  FROM public.super_admins 
  WHERE super_admins.email = admin_email;
  
  -- Check if admin exists and password matches
  IF admin_record.id IS NOT NULL AND 
     crypt(admin_password, admin_record.password_hash) = admin_record.password_hash THEN
    RETURN QUERY SELECT admin_record.id, admin_record.email, true;
  ELSE
    RETURN QUERY SELECT NULL::uuid, NULL::text, false;
  END IF;
END;
$$;

-- Insert the first super admin
INSERT INTO public.super_admins (email, password_hash)
VALUES ('gustavo@clicaepede.online', crypt('Pr0t3g1do@', gen_salt('bf')));

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.authenticate_super_admin(text, text) TO anon;