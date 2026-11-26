CREATE FUNCTION public.create_customer_offline_order(
  _restaurant_id uuid, _name text, _phone text, _details jsonb, _items jsonb,
  _subtotal numeric, _delivery_fee numeric, _total numeric, _address text, _payment_method text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  order_id uuid;
BEGIN
  IF NOT coalesce(public.restaurant_accepts_orders(_restaurant_id), false) THEN
    RAISE EXCEPTION 'Loja indisponível';
  END IF;
  IF _payment_method IS NULL OR _payment_method NOT IN ('credit_card', 'debit_card', 'meal_voucher', 'food_voucher')
    OR NOT EXISTS (
      SELECT 1 FROM public.payment_methods pm
      WHERE pm.restaurant_id = _restaurant_id AND pm.method_type = _payment_method AND pm.is_active = true
    ) THEN
    RAISE EXCEPTION 'Forma de pagamento indisponível';
  END IF;
  IF public.normalize_customer_phone(_phone) IS NULL OR length(trim(coalesce(_name, ''))) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Nome e telefone válidos são obrigatórios';
  END IF;
  IF _details IS NOT NULL AND (jsonb_typeof(_details) <> 'object' OR length(_details::text) > 1500) THEN
    RAISE EXCEPTION 'Endereço inválido';
  END IF;
  IF coalesce(_delivery_fee, 0) < 0 OR _subtotal IS NULL OR _subtotal < 0
    OR round(_total, 2) IS DISTINCT FROM round(_subtotal + coalesce(_delivery_fee, 0), 2) THEN
    RAISE EXCEPTION 'Valor do pedido inválido';
  END IF;
  IF nullif(trim(_address), '') IS NULL AND (_details IS NOT NULL OR coalesce(_delivery_fee, 0) <> 0) THEN
    RAISE EXCEPTION 'Endereço ou taxa inválida para retirada';
  END IF;
  IF nullif(trim(_address), '') IS NOT NULL AND public.delivery_uses_distance(_restaurant_id)
    AND nullif(_details->>'delivery_quote_id', '') IS NULL THEN
    RAISE EXCEPTION 'Calcule a entrega antes de finalizar o pedido';
  END IF;

  INSERT INTO public.orders (
    restaurant_id, customer_name, customer_phone, customer_address_details, items,
    subtotal, delivery_fee, total, address, payment_method, status, payment_status
  ) VALUES (
    _restaurant_id, trim(_name), _phone, _details, _items,
    _subtotal, coalesce(_delivery_fee, 0), round(_total, 2), nullif(trim(_address), ''), _payment_method, 'new', 'not_required'
  ) RETURNING id INTO order_id;
  RETURN order_id;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.create_customer_offline_order(uuid, text, text, jsonb, jsonb, numeric, numeric, numeric, text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.create_customer_offline_order(uuid, text, text, jsonb, jsonb, numeric, numeric, numeric, text, text) TO anon, authenticated;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.validate_distance_delivery() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  settings public.delivery_distance_settings%ROWTYPE;
  quote_id text := NEW.customer_address_details->>'delivery_quote_id';
BEGIN
  SELECT * INTO settings FROM public.delivery_distance_settings
  WHERE restaurant_id = NEW.restaurant_id;
  IF NOT coalesce(settings.enabled, false) THEN
    IF quote_id IS NOT NULL THEN RAISE EXCEPTION 'Área de entrega alterada. Calcule novamente.'; END IF;
    RETURN NEW;
  END IF;

  -- Pedidos manuais são registrados pelo operador autenticado da loja.
  IF quote_id IS NULL AND NEW.payment_method <> 'pix_online' AND (
    EXISTS (SELECT 1 FROM public.restaurants WHERE id = NEW.restaurant_id AND user_id = auth.uid())
    OR coalesce(public.is_super_admin(auth.uid()), false)
  ) THEN
    RETURN NEW;
  END IF;

  IF nullif(trim(NEW.address), '') IS NULL AND NEW.customer_address_details IS NULL THEN
    IF NEW.delivery_fee IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'Taxa inválida para retirada.'; END IF;
    RETURN NEW;
  END IF;

  IF quote_id IS NULL OR quote_id !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'Calcule a entrega antes de finalizar o pedido.';
  END IF;
  DELETE FROM public.delivery_distance_quotes
  WHERE id = quote_id::uuid
    AND restaurant_id = NEW.restaurant_id
    AND expires_at > now()
    AND origin_address = settings.origin_address
    AND distance_meters <= settings.max_km * 1000
    AND delivery_fee = public.distance_band_fee(settings, distance_meters)
    AND NEW.delivery_fee = delivery_fee
    AND round(NEW.total, 2) = round(NEW.subtotal + delivery_fee, 2)
    AND destination_hash = encode(sha256(convert_to(concat_ws(chr(31),
      NEW.address,
      NEW.customer_address_details->>'street',
      NEW.customer_address_details->>'number',
      NEW.customer_address_details->>'complement',
      NEW.customer_address_details->>'neighborhood',
      NEW.customer_address_details->>'cep'
    ), 'UTF8')), 'hex');
  IF NOT FOUND THEN RAISE EXCEPTION 'Cotação de entrega inválida ou expirada. Calcule novamente.'; END IF;
  NEW.total := round(NEW.subtotal + NEW.delivery_fee, 2);
  NEW.customer_address_details := NEW.customer_address_details - 'delivery_quote_id';
  RETURN NEW;
END;
$$;
