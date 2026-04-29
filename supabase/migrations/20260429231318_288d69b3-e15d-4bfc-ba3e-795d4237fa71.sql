DROP VIEW IF EXISTS public.secure_orders_view;

CREATE VIEW public.secure_orders_view
WITH (security_invoker = true)
AS
SELECT
  id, order_number, restaurant_id, items, subtotal, delivery_fee, total,
  created_at, updated_at, status, payment_method,
  customer_name, customer_phone, address,
  payment_status, pix_txid, pix_paid_at, pix_expires_at
FROM public.orders;