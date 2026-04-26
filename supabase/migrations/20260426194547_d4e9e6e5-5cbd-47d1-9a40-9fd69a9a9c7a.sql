
-- 1. Adicionar campos de pagamento PIX na tabela orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS pix_txid text,
  ADD COLUMN IF NOT EXISTS pix_qrcode text,
  ADD COLUMN IF NOT EXISTS pix_copia_cola text,
  ADD COLUMN IF NOT EXISTS pix_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS pix_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS pix_e2e_id text;

CREATE INDEX IF NOT EXISTS idx_orders_pix_txid ON public.orders(pix_txid) WHERE pix_txid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);

-- Validation trigger update: allow PIX-related statuses
CREATE OR REPLACE FUNCTION public.validate_order_payload()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.items IS NULL OR jsonb_typeof(NEW.items) <> 'array' OR jsonb_array_length(NEW.items) = 0 THEN
    RAISE EXCEPTION 'Order items must be a non-empty array';
  END IF;
  IF jsonb_array_length(NEW.items) > 100 THEN
    RAISE EXCEPTION 'Too many items in order';
  END IF;
  IF NEW.customer_name IS NOT NULL AND length(NEW.customer_name) > 200 THEN
    RAISE EXCEPTION 'customer_name too long';
  END IF;
  IF NEW.customer_phone IS NOT NULL AND length(NEW.customer_phone) > 30 THEN
    RAISE EXCEPTION 'customer_phone too long';
  END IF;
  IF NEW.address IS NOT NULL AND length(NEW.address) > 500 THEN
    RAISE EXCEPTION 'address too long';
  END IF;
  IF NEW.total < 0 OR NEW.subtotal < 0 OR NEW.delivery_fee < 0 THEN
    RAISE EXCEPTION 'Order amounts cannot be negative';
  END IF;
  IF NEW.total > 100000 THEN
    RAISE EXCEPTION 'Order total exceeds allowed maximum';
  END IF;
  IF NEW.payment_status NOT IN ('not_required','aguardando_pagamento','pago','expirado','cancelado','falha_repasse') THEN
    RAISE EXCEPTION 'Invalid payment_status: %', NEW.payment_status;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Adicionar campos para PIX online em payment_methods
ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS pix_online_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS restaurant_pix_key text,
  ADD COLUMN IF NOT EXISTS restaurant_pix_key_type text;

-- 3. Criar tabela de ledger pix_transactions (auditoria)
CREATE TABLE IF NOT EXISTS public.pix_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  transaction_type text NOT NULL, -- 'cobranca' | 'repasse' | 'taxa_plataforma'
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'success' | 'failed'
  amount numeric NOT NULL,
  efi_txid text,
  efi_e2e_id text,
  efi_endtoend text,
  destination_pix_key text,
  destination_pix_key_type text,
  raw_payload jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pix_tx_order ON public.pix_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_pix_tx_restaurant ON public.pix_transactions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_pix_tx_type_status ON public.pix_transactions(transaction_type, status);

ALTER TABLE public.pix_transactions ENABLE ROW LEVEL SECURITY;

-- Owners and super admin can view their restaurant's transactions
CREATE POLICY "Owners or super admin view pix transactions"
ON public.pix_transactions FOR SELECT
USING (
  restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

-- No public INSERT/UPDATE/DELETE — only service role (edge functions) writes here

CREATE TRIGGER update_pix_transactions_updated_at
BEFORE UPDATE ON public.pix_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Trigger para validar transaction_type/status
CREATE OR REPLACE FUNCTION public.validate_pix_transaction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.transaction_type NOT IN ('cobranca','repasse','taxa_plataforma') THEN
    RAISE EXCEPTION 'Invalid transaction_type: %', NEW.transaction_type;
  END IF;
  IF NEW.status NOT IN ('pending','success','failed','cancelled','expired') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.amount < 0 THEN
    RAISE EXCEPTION 'Amount cannot be negative';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_pix_transaction_trigger
BEFORE INSERT OR UPDATE ON public.pix_transactions
FOR EACH ROW EXECUTE FUNCTION public.validate_pix_transaction();
