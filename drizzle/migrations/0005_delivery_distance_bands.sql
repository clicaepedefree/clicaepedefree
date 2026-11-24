ALTER TABLE public.delivery_distance_settings ADD COLUMN price_bands jsonb;
--> statement-breakpoint
CREATE FUNCTION public.valid_delivery_price_bands(bands jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE
  band jsonb;
  previous_limit integer := 0;
  distance_limit numeric;
  fee numeric;
BEGIN
  IF jsonb_typeof(bands) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
  IF jsonb_array_length(bands) > 50 THEN RETURN false; END IF;
  FOR band IN SELECT value FROM jsonb_array_elements(bands) LOOP
    IF jsonb_typeof(band->'upToMeters') IS DISTINCT FROM 'number'
      OR jsonb_typeof(band->'feeCents') IS DISTINCT FROM 'number' THEN RETURN false; END IF;
    distance_limit := (band->>'upToMeters')::numeric;
    fee := (band->>'feeCents')::numeric;
    IF distance_limit <= previous_limit OR distance_limit > 100000
      OR mod(distance_limit, 10) <> 0 OR fee < 0 OR fee > 100000 OR fee <> trunc(fee) THEN
      RETURN false;
    END IF;
    previous_limit := distance_limit;
  END LOOP;
  RETURN true;
END;
$$;
--> statement-breakpoint
ALTER TABLE public.delivery_distance_settings ADD CONSTRAINT valid_delivery_price_bands
CHECK (price_bands IS NULL OR CASE WHEN public.valid_delivery_price_bands(price_bands)
  THEN ((NOT enabled OR jsonb_array_length(price_bands) > 0) AND
    (jsonb_array_length(price_bands) = 0 OR (price_bands->-1->>'upToMeters')::integer = max_km * 1000)) ELSE false END);
--> statement-breakpoint
CREATE FUNCTION public.distance_band_fee(settings public.delivery_distance_settings, meters integer) RETURNS numeric
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT CASE
    WHEN meters < 0 THEN NULL
    WHEN settings.price_bands IS NULL AND meters <= settings.max_km * 1000 THEN settings.delivery_fee
    ELSE (
      SELECT (band->>'feeCents')::numeric / 100
      FROM jsonb_array_elements(settings.price_bands) bands(band)
      WHERE (band->>'upToMeters')::integer >= meters
      ORDER BY (band->>'upToMeters')::integer
      LIMIT 1
    )
  END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.distance_band_fee(public.delivery_distance_settings, integer) FROM PUBLIC;
--> statement-breakpoint
CREATE FUNCTION public.delivery_fee_for_distance(_restaurant_id uuid, _meters integer, _origin_address text) RETURNS numeric
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT public.distance_band_fee(settings, _meters)
  FROM public.delivery_distance_settings settings
  WHERE restaurant_id = _restaurant_id AND enabled AND origin_address = _origin_address;
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.distance_band_fee(public.delivery_distance_settings, integer) TO service_role;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.delivery_fee_for_distance(uuid, integer, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.delivery_fee_for_distance(uuid, integer, text) TO service_role;
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
  IF NEW.payment_method <> 'pix_online' AND (
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
