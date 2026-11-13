CREATE TABLE public.ad_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  objective text NOT NULL DEFAULT 'OUTCOME_TRAFFIC',
  daily_budget_cents integer NOT NULL DEFAULT 2000,
  duration_days integer NOT NULL DEFAULT 7,
  targeting jsonb NOT NULL DEFAULT '{}'::jsonb,
  headline text,
  primary_text text,
  cta text,
  destination_url text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_drafts TO authenticated;
GRANT ALL ON public.ad_drafts TO service_role;
ALTER TABLE public.ad_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage ad drafts" ON public.ad_drafts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND (r.user_id = auth.uid() OR public.is_super_admin(auth.uid()))))
WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND (r.user_id = auth.uid() OR public.is_super_admin(auth.uid()))));
CREATE TRIGGER ad_drafts_updated_at BEFORE UPDATE ON public.ad_drafts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX ad_drafts_restaurant_idx ON public.ad_drafts(restaurant_id, created_at DESC);