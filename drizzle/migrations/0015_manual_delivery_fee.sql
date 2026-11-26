CREATE OR REPLACE FUNCTION public.create_manual_order(
  _restaurant_id uuid, _customer_id uuid, _name text, _phone text, _details jsonb,
  _items jsonb, _delivery_fee numeric, _address text, _payment_method text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  order_id uuid;
  subtotal_amount numeric;
  fee_amount numeric := _delivery_fee;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.restaurants WHERE id = _restaurant_id AND user_id = auth.uid()
  ) AND NOT coalesce(public.is_super_admin(auth.uid()), false) THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  IF public.normalize_customer_phone(_phone) IS NULL OR length(trim(coalesce(_name, ''))) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Nome e telefone válidos são obrigatórios';
  END IF;
  IF _payment_method IS NULL OR _payment_method NOT IN ('cash', 'credit_card', 'debit_card', 'pix', 'food_voucher', 'meal_voucher') THEN
    RAISE EXCEPTION 'Forma de pagamento inválida';
  END IF;
  IF nullif(trim(_address), '') IS NULL OR length(_address) > 500
    OR nullif(trim(_details->>'street'), '') IS NULL OR nullif(trim(_details->>'number'), '') IS NULL THEN
    RAISE EXCEPTION 'Informe o endereço e o número para entrega.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE id = _restaurant_id AND is_blocked IS NOT TRUE AND delivery_enabled IS NOT FALSE
  ) THEN
    RAISE EXCEPTION 'Esta loja não está disponível para entrega.';
  END IF;

  IF public.delivery_uses_distance(_restaurant_id) THEN
    -- The order trigger verifies the current distance fee and consumes the quote.
    IF nullif(_details->>'delivery_quote_id', '') IS NULL THEN
      RAISE EXCEPTION 'Área de entrega alterada. Calcule novamente.';
    END IF;
  ELSE
    IF _details ? 'delivery_quote_id' THEN
      RAISE EXCEPTION 'Área de entrega alterada. Calcule novamente.';
    END IF;
    SELECT round(zone.delivery_fee, 2) INTO fee_amount
    FROM public.delivery_zones AS zone
    WHERE zone.id::text = _details->>'delivery_zone_id'
      AND zone.restaurant_id = _restaurant_id AND zone.is_active
      AND zone.neighborhood = _details->>'neighborhood'
    FOR SHARE;
    IF NOT FOUND OR fee_amount IS DISTINCT FROM _delivery_fee THEN
      RAISE EXCEPTION 'Área de entrega ou taxa alterada. Confira o bairro e calcule novamente.';
    END IF;
    _details := _details - 'delivery_zone_id';
  END IF;
  IF fee_amount IS NULL OR fee_amount < 0 OR fee_amount > 1000 THEN
    RAISE EXCEPTION 'Taxa de entrega inválida.';
  END IF;

  SELECT coalesce(sum((item->>'total')::numeric), 0) INTO subtotal_amount
  FROM jsonb_array_elements(_items) AS item;

  INSERT INTO public.orders (
    restaurant_id, customer_id, customer_name, customer_phone, customer_address_details,
    items, subtotal, delivery_fee, total, address, payment_method, status, payment_status
  ) VALUES (
    _restaurant_id, _customer_id, trim(_name), _phone, _details,
    _items, subtotal_amount, fee_amount, subtotal_amount + fee_amount, _address, _payment_method, 'new', 'not_required'
  ) RETURNING id INTO order_id;
  RETURN order_id;
END;
$$;
