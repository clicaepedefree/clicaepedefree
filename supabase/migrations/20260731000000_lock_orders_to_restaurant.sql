-- Enforce tenant isolation for dashboard/order reads and public order creation.
-- Existing SELECT/UPDATE policies already restrict owners through restaurants.user_id;
-- this migration tightens INSERT and adds defensive constraints/indexes so orders
-- cannot be created without a valid restaurant tenant.

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Public can create orders for active restaurants" ON public.orders;

CREATE POLICY "Public can create orders for active restaurants"
ON public.orders
FOR INSERT
WITH CHECK (
  restaurant_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = orders.restaurant_id
      AND COALESCE(r.is_blocked, false) = false
      AND COALESCE(r.is_open, true) = true
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_restaurant_id_required'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_restaurant_id_required
      CHECK (restaurant_id IS NOT NULL)
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created_at
ON public.orders (restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status_created_at
ON public.orders (restaurant_id, status, created_at DESC);
