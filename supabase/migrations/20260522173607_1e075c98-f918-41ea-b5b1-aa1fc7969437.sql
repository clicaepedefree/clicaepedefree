
-- ============================================================
-- 1. Alterações em tabelas existentes
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS validapay_charge_id text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_validapay_charge_id ON public.orders(validapay_charge_id);

ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS restaurant_pix_key_holder_name text,
  ADD COLUMN IF NOT EXISTS restaurant_pix_key_holder_document text;

-- Atualiza validação de payment_status para aceitar novos valores
CREATE OR REPLACE FUNCTION public.validate_order_payload()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
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
  IF NEW.payment_status NOT IN (
    'not_required','aguardando_pagamento','pago','expirado','cancelado','falha_repasse',
    'pendente','reembolsado'
  ) THEN
    RAISE EXCEPTION 'Invalid payment_status: %', NEW.payment_status;
  END IF;
  RETURN NEW;
END;
$function$;

-- ============================================================
-- 2. payment_gateway_settings (singleton)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_gateway_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'validapay',
  environment text NOT NULL DEFAULT 'sandbox',
  master_pix_key text,
  webhook_url text,
  fee_per_sale numeric NOT NULL DEFAULT 1.00,
  withdrawal_fee numeric NOT NULL DEFAULT 5.00,
  minimum_withdrawal numeric NOT NULL DEFAULT 10.00,
  release_delay_hours integer NOT NULL DEFAULT 0,
  auto_withdrawal_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_gateway_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin manage gateway settings"
ON public.payment_gateway_settings FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE TRIGGER trg_payment_gateway_settings_updated_at
BEFORE UPDATE ON public.payment_gateway_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed singleton
INSERT INTO public.payment_gateway_settings (provider, environment)
SELECT 'validapay', 'sandbox'
WHERE NOT EXISTS (SELECT 1 FROM public.payment_gateway_settings);

-- ============================================================
-- 3. wallets
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL UNIQUE,
  available_balance numeric NOT NULL DEFAULT 0,
  pending_balance numeric NOT NULL DEFAULT 0,
  total_received numeric NOT NULL DEFAULT 0,
  total_withdrawn numeric NOT NULL DEFAULT 0,
  total_fees numeric NOT NULL DEFAULT 0,
  total_refunded numeric NOT NULL DEFAULT 0,
  sales_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallets_restaurant_id ON public.wallets(restaurant_id);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners or super admin view wallets"
ON public.wallets FOR SELECT
USING (
  restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

CREATE TRIGGER trg_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-cria carteira ao criar restaurante
CREATE OR REPLACE FUNCTION public.create_wallet_for_restaurant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (restaurant_id) VALUES (NEW.id)
  ON CONFLICT (restaurant_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_wallet ON public.restaurants;
CREATE TRIGGER trg_create_wallet
AFTER INSERT ON public.restaurants
FOR EACH ROW EXECUTE FUNCTION public.create_wallet_for_restaurant();

-- Backfill carteiras dos restaurantes existentes
INSERT INTO public.wallets (restaurant_id)
SELECT id FROM public.restaurants
ON CONFLICT (restaurant_id) DO NOTHING;

-- ============================================================
-- 4. wallet_transactions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL,
  order_id uuid,
  withdrawal_id uuid,
  refund_id uuid,
  transaction_type text NOT NULL,
  amount numeric NOT NULL,
  fee numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL,
  balance_after numeric,
  status text NOT NULL DEFAULT 'completed',
  description text,
  customer_name text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON public.wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_restaurant ON public.wallet_transactions(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_order ON public.wallet_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_type ON public.wallet_transactions(transaction_type);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners or super admin view wallet transactions"
ON public.wallet_transactions FOR SELECT
USING (
  restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

-- Validação de wallet_transactions
CREATE OR REPLACE FUNCTION public.validate_wallet_transaction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.transaction_type NOT IN ('venda','taxa_venda','saque','taxa_saque','reembolso','ajuste') THEN
    RAISE EXCEPTION 'Invalid transaction_type: %', NEW.transaction_type;
  END IF;
  IF NEW.status NOT IN ('pending','completed','failed','cancelled') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_wallet_tx
BEFORE INSERT OR UPDATE ON public.wallet_transactions
FOR EACH ROW EXECUTE FUNCTION public.validate_wallet_transaction();

-- Atualiza wallet ao inserir transação completed
CREATE OR REPLACE FUNCTION public.apply_wallet_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta numeric;
BEGIN
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  IF NEW.transaction_type = 'venda' THEN
    UPDATE public.wallets
    SET available_balance = available_balance + NEW.net_amount,
        total_received = total_received + NEW.amount,
        total_fees = total_fees + NEW.fee,
        sales_count = sales_count + 1
    WHERE id = NEW.wallet_id;

  ELSIF NEW.transaction_type = 'saque' THEN
    UPDATE public.wallets
    SET available_balance = available_balance - NEW.amount,
        total_withdrawn = total_withdrawn + NEW.net_amount,
        total_fees = total_fees + NEW.fee
    WHERE id = NEW.wallet_id;

  ELSIF NEW.transaction_type = 'reembolso' THEN
    UPDATE public.wallets
    SET available_balance = available_balance - NEW.amount,
        total_refunded = total_refunded + NEW.amount
    WHERE id = NEW.wallet_id;

  ELSIF NEW.transaction_type = 'ajuste' THEN
    UPDATE public.wallets
    SET available_balance = available_balance + NEW.amount
    WHERE id = NEW.wallet_id;
  END IF;

  -- Atualiza balance_after na própria linha
  SELECT available_balance INTO delta FROM public.wallets WHERE id = NEW.wallet_id;
  UPDATE public.wallet_transactions SET balance_after = delta WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_wallet_tx
AFTER INSERT ON public.wallet_transactions
FOR EACH ROW EXECUTE FUNCTION public.apply_wallet_transaction();

-- ============================================================
-- 5. withdrawal_requests
-- ============================================================

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  user_id uuid,
  gross_amount numeric NOT NULL,
  fee numeric NOT NULL DEFAULT 5.00,
  net_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  pix_key text NOT NULL,
  pix_key_type text NOT NULL,
  holder_name text,
  holder_document text,
  validapay_withdrawal_id text,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_restaurant ON public.withdrawal_requests(restaurant_id, created_at DESC);
-- Impede saques simultâneos pendentes
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_withdrawal_per_restaurant
ON public.withdrawal_requests(restaurant_id)
WHERE status IN ('pending','processing');

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners or super admin view withdrawals"
ON public.withdrawal_requests FOR SELECT
USING (
  restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

CREATE TRIGGER trg_withdrawal_requests_updated_at
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validação
CREATE OR REPLACE FUNCTION public.validate_withdrawal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending','processing','completed','failed','cancelled') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.gross_amount <= 0 OR NEW.net_amount < 0 OR NEW.fee < 0 THEN
    RAISE EXCEPTION 'Invalid withdrawal amounts';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_withdrawal
BEFORE INSERT OR UPDATE ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_withdrawal();

-- ============================================================
-- 6. refund_transactions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.refund_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  restaurant_id uuid NOT NULL,
  amount numeric NOT NULL,
  reason text,
  reason_code text DEFAULT 'CUSTOMER_REQUEST',
  status text NOT NULL DEFAULT 'pending',
  validapay_refund_id text,
  error_message text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_refunds_order ON public.refund_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_restaurant ON public.refund_transactions(restaurant_id, created_at DESC);

ALTER TABLE public.refund_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners or super admin view refunds"
ON public.refund_transactions FOR SELECT
USING (
  restaurant_id IN (SELECT id FROM public.restaurants WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

-- ============================================================
-- 7. webhook_logs (idempotência)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'validapay',
  event_id text,
  event_type text,
  signature_valid boolean,
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  error_message text,
  payload jsonb NOT NULL,
  headers jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_webhook_event_id
ON public.webhook_logs(provider, event_id)
WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON public.webhook_logs(created_at DESC);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin view webhook logs"
ON public.webhook_logs FOR SELECT
USING (public.is_super_admin());

-- ============================================================
-- 8. Função: total disponível para saque considerando saques pendentes
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_available_for_withdrawal(_restaurant_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bal numeric := 0;
  pending numeric := 0;
BEGIN
  SELECT COALESCE(available_balance, 0) INTO bal FROM public.wallets WHERE restaurant_id = _restaurant_id;
  SELECT COALESCE(SUM(gross_amount), 0) INTO pending
    FROM public.withdrawal_requests
    WHERE restaurant_id = _restaurant_id AND status IN ('pending','processing');
  RETURN GREATEST(bal - pending, 0);
END;
$$;
