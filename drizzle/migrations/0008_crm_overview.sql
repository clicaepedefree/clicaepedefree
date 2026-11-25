CREATE FUNCTION public.crm_overview(_restaurant_id uuid)
RETURNS TABLE (customer_count bigint, purchase_count bigint, total_spent numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT count(DISTINCT c.id), count(o.id), coalesce(sum(o.total), 0)
  FROM public.customers AS c
  LEFT JOIN public.orders AS o ON o.customer_id = c.id
    AND o.restaurant_id = c.restaurant_id
    AND o.status = 'completed'
    AND o.payment_status IN ('pago', 'not_required')
  WHERE c.restaurant_id = _restaurant_id;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.crm_overview(uuid) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.crm_overview(uuid) TO authenticated;
