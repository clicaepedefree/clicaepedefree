CREATE OR REPLACE FUNCTION public.protect_restaurant_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_super_admin(auth.uid()) OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.user_id := auth.uid();
    NEW.is_blocked := false;
    NEW.monthly_revenue := 0;
    NEW.revenue_block_exempt_until := NULL;
    NEW.validapay_subaccount_id := NULL;
    RETURN NEW;
  END IF;

  NEW.user_id := OLD.user_id;
  NEW.is_blocked := OLD.is_blocked;
  NEW.monthly_revenue := OLD.monthly_revenue;
  NEW.revenue_block_exempt_until := OLD.revenue_block_exempt_until;
  NEW.validapay_subaccount_id := OLD.validapay_subaccount_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_restaurant_admin_fields ON public.restaurants;
CREATE TRIGGER trg_protect_restaurant_admin_fields
BEFORE INSERT OR UPDATE ON public.restaurants
FOR EACH ROW EXECUTE FUNCTION public.protect_restaurant_admin_fields();

DROP POLICY IF EXISTS "Owners or super admin update restaurants" ON public.restaurants;
CREATE POLICY "Owners or super admin update restaurants"
ON public.restaurants FOR UPDATE
USING ((user_id = auth.uid()) OR public.is_super_admin())
WITH CHECK ((user_id = auth.uid()) OR public.is_super_admin());