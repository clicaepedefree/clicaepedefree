CREATE FUNCTION public.create_manual_counter_order(_restaurant_id uuid, _items jsonb, _payment_method text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  order_id uuid;
  subtotal_amount numeric;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.restaurants WHERE id = _restaurant_id AND user_id = auth.uid()
  ) AND NOT coalesce(public.is_super_admin(auth.uid()), false) THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  IF _payment_method IS NULL OR _payment_method NOT IN ('cash', 'credit_card', 'debit_card', 'pix', 'food_voucher', 'meal_voucher') THEN
    RAISE EXCEPTION 'Forma de pagamento inválida';
  END IF;
  IF jsonb_typeof(_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Informe os itens do pedido';
  END IF;
  IF jsonb_array_length(_items) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'O pedido deve conter de 1 a 100 itens';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(_items) AS item
    WHERE CASE WHEN jsonb_typeof(item->'total') = 'number' THEN (item->>'total')::numeric < 0 ELSE true END
  ) THEN
    RAISE EXCEPTION 'Valor de item inválido';
  END IF;

  SELECT round(sum((item->>'total')::numeric), 2) INTO subtotal_amount
  FROM jsonb_array_elements(_items) AS item;
  IF subtotal_amount > 100000 THEN RAISE EXCEPTION 'Valor do pedido excede o limite'; END IF;

  INSERT INTO public.orders (
    restaurant_id, customer_name, items, subtotal, delivery_fee, total, payment_method, status, payment_status
  ) VALUES (
    _restaurant_id, 'Usuário balcão', _items, subtotal_amount, 0, subtotal_amount, _payment_method, 'new', 'not_required'
  ) RETURNING id INTO order_id;

  RETURN order_id;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.create_manual_counter_order(uuid, jsonb, text) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.create_manual_counter_order(uuid, jsonb, text) TO authenticated;
