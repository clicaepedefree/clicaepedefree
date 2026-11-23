CREATE TABLE public.delivery_distance_settings (
  restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  origin_address text NOT NULL CHECK (length(trim(origin_address)) BETWEEN 8 AND 300),
  max_km numeric(5,2) NOT NULL CHECK (max_km > 0 AND max_km <= 100),
  delivery_fee numeric(7,2) NOT NULL CHECK (delivery_fee BETWEEN 0 AND 1000)
);
--> statement-breakpoint
ALTER TABLE public.delivery_distance_settings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON public.delivery_distance_settings TO authenticated;
--> statement-breakpoint
GRANT SELECT ON public.delivery_distance_settings TO service_role;
--> statement-breakpoint
CREATE POLICY manage_delivery_distance ON public.delivery_distance_settings TO authenticated
USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.user_id = auth.uid())
       OR coalesce(public.is_super_admin(auth.uid()), false))
WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.user_id = auth.uid())
       OR coalesce(public.is_super_admin(auth.uid()), false));
--> statement-breakpoint
CREATE FUNCTION public.delivery_uses_distance(_restaurant_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.delivery_distance_settings WHERE restaurant_id = _restaurant_id AND enabled);
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.delivery_uses_distance(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.delivery_uses_distance(uuid) TO anon, authenticated;
--> statement-breakpoint
CREATE TABLE public.delivery_distance_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  destination_hash text NOT NULL,
  origin_address text NOT NULL,
  distance_meters integer NOT NULL CHECK (distance_meters >= 0),
  delivery_fee numeric(7,2) NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);
--> statement-breakpoint
ALTER TABLE public.delivery_distance_quotes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON public.delivery_distance_quotes TO service_role;
--> statement-breakpoint
CREATE INDEX delivery_distance_quotes_expiry ON public.delivery_distance_quotes (expires_at);
--> statement-breakpoint
CREATE FUNCTION public.validate_distance_delivery() RETURNS trigger
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
    AND delivery_fee = settings.delivery_fee
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
  NEW.total := round(NEW.subtotal + settings.delivery_fee, 2);
  NEW.customer_address_details := NEW.customer_address_details - 'delivery_quote_id';
  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.validate_distance_delivery() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER validate_distance_delivery BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_distance_delivery();
--> statement-breakpoint
CREATE TABLE public.delivery_route_request_limits (
  restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  minute_start timestamptz NOT NULL,
  requests integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE public.delivery_route_request_limits ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE FUNCTION public.reserve_delivery_route_request(_restaurant_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  bucket timestamptz := date_trunc('minute', now());
BEGIN
  INSERT INTO public.delivery_route_request_limits AS limits (restaurant_id, minute_start, requests)
  VALUES (_restaurant_id, bucket, 1)
  ON CONFLICT (restaurant_id) DO UPDATE
  SET minute_start = bucket,
      requests = CASE WHEN limits.minute_start = bucket THEN limits.requests + 1 ELSE 1 END
  WHERE limits.minute_start < bucket OR limits.requests < 60;
  RETURN FOUND;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.reserve_delivery_route_request(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.reserve_delivery_route_request(uuid) TO service_role;
