
-- Subcontas ValidaPay por restaurante
CREATE TABLE public.validapay_subaccounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL UNIQUE REFERENCES public.restaurants(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL CHECK (account_type IN ('PF','PJ')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  form_id TEXT,
  subaccount_id TEXT,
  subaccount_number TEXT,
  branch TEXT,
  ispb TEXT,
  holder_name TEXT NOT NULL,
  holder_document TEXT NOT NULL,
  holder_email TEXT,
  holder_phone TEXT,
  rejection_reason TEXT,
  raw_request JSONB,
  raw_response JSONB,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.validapay_subaccounts TO authenticated;
GRANT ALL ON public.validapay_subaccounts TO service_role;

ALTER TABLE public.validapay_subaccounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own subaccount" ON public.validapay_subaccounts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.user_id = auth.uid()));

CREATE POLICY "Super admins read all subaccounts" ON public.validapay_subaccounts
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_subaccounts_updated_at
  BEFORE UPDATE ON public.validapay_subaccounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Quick lookup column on restaurants
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS validapay_subaccount_id TEXT;
CREATE INDEX IF NOT EXISTS idx_restaurants_validapay_subaccount_id ON public.restaurants(validapay_subaccount_id);
