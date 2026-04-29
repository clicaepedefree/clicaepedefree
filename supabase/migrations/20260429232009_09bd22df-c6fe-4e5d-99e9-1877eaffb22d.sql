-- 1. Add repasse tracking columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS repasse_status text,
  ADD COLUMN IF NOT EXISTS repasse_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS repasse_id_envio text;

-- 2. Allow 'processing' as a valid status for pix_transactions
CREATE OR REPLACE FUNCTION public.validate_pix_transaction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.transaction_type NOT IN ('cobranca','repasse','taxa_plataforma') THEN
    RAISE EXCEPTION 'Invalid transaction_type: %', NEW.transaction_type;
  END IF;
  IF NEW.status NOT IN ('pending','processing','success','failed','cancelled','expired') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.amount < 0 THEN
    RAISE EXCEPTION 'Amount cannot be negative';
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Refresh secure_orders_view to include repasse fields
DROP VIEW IF EXISTS public.secure_orders_view;

CREATE VIEW public.secure_orders_view
WITH (security_invoker = true)
AS
SELECT
  id, order_number, restaurant_id, items, subtotal, delivery_fee, total,
  created_at, updated_at, status, payment_method,
  customer_name, customer_phone, address,
  payment_status, pix_txid, pix_paid_at, pix_expires_at,
  repasse_status, repasse_confirmed_at, repasse_id_envio
FROM public.orders;