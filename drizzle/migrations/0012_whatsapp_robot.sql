CREATE TABLE public.whatsapp_robot_settings (
  restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  webhook_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  bot_name text NOT NULL DEFAULT '' CHECK (length(bot_name) <= 60),
  reply_mode text NOT NULL DEFAULT 'off' CHECK (reply_mode IN ('off', 'welcome', 'keywords')),
  notify_orders boolean NOT NULL DEFAULT false,
  keyword_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  connected boolean NOT NULL DEFAULT false
);
--> statement-breakpoint
CREATE TABLE public.whatsapp_robot_contacts (
  restaurant_id uuid NOT NULL REFERENCES public.whatsapp_robot_settings(restaurant_id) ON DELETE CASCADE,
  phone text NOT NULL,
  profile_name text NOT NULL DEFAULT '',
  last_auto_reply_at timestamptz,
  PRIMARY KEY (restaurant_id, phone)
);
--> statement-breakpoint
CREATE TABLE public.whatsapp_robot_outbox (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.whatsapp_robot_settings(restaurant_id) ON DELETE CASCADE,
  phone text NOT NULL,
  event_key text,
  message text,
  customer_name text,
  order_label text,
  order_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  available_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  UNIQUE (restaurant_id, event_key)
);
--> statement-breakpoint
CREATE INDEX whatsapp_robot_outbox_pending ON public.whatsapp_robot_outbox (available_at, id) WHERE sent_at IS NULL;
--> statement-breakpoint
ALTER TABLE public.whatsapp_robot_settings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.whatsapp_robot_contacts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.whatsapp_robot_outbox ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON public.whatsapp_robot_settings, public.whatsapp_robot_contacts, public.whatsapp_robot_outbox FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON public.whatsapp_robot_settings, public.whatsapp_robot_contacts TO service_role;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_robot_outbox TO service_role;
--> statement-breakpoint
GRANT USAGE ON SEQUENCE public.whatsapp_robot_outbox_id_seq TO service_role;
--> statement-breakpoint
CREATE FUNCTION public.enqueue_whatsapp_reply(
  _restaurant_id uuid, _phone text, _profile_name text, _event_key text, _message text, _cooldown boolean
)
RETURNS boolean
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE queued bigint;
BEGIN
  INSERT INTO public.whatsapp_robot_contacts AS contact (restaurant_id, phone, profile_name)
  VALUES (_restaurant_id, _phone, _profile_name)
  ON CONFLICT (restaurant_id, phone) DO UPDATE
  SET profile_name = coalesce(nullif(EXCLUDED.profile_name, ''), contact.profile_name);

  IF _message IS NULL THEN RETURN false; END IF;
  IF _cooldown AND EXISTS (
    SELECT 1 FROM public.whatsapp_robot_contacts
    WHERE restaurant_id = _restaurant_id AND phone = _phone
      AND last_auto_reply_at > now() - interval '5 minutes'
  ) THEN RETURN false; END IF;

  INSERT INTO public.whatsapp_robot_outbox (restaurant_id, phone, event_key, message)
  VALUES (_restaurant_id, _phone, _event_key, _message)
  ON CONFLICT (restaurant_id, event_key) DO NOTHING RETURNING id INTO queued;
  IF queued IS NULL THEN RETURN false; END IF;
  IF _cooldown THEN
    UPDATE public.whatsapp_robot_contacts SET last_auto_reply_at = now()
    WHERE restaurant_id = _restaurant_id AND phone = _phone;
  END IF;
  RETURN true;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.enqueue_whatsapp_reply(uuid, text, text, text, text, boolean) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.enqueue_whatsapp_reply(uuid, text, text, text, text, boolean) TO service_role;
--> statement-breakpoint
CREATE FUNCTION public.claim_whatsapp_outbox()
RETURNS SETOF public.whatsapp_robot_outbox
LANGUAGE sql SET search_path = ''
AS $$
  WITH claim AS (
    SELECT outbox.id FROM public.whatsapp_robot_outbox AS outbox
    WHERE outbox.sent_at IS NULL AND outbox.attempts < 6 AND outbox.available_at <= now()
    ORDER BY outbox.available_at, outbox.id
    LIMIT 12 FOR UPDATE OF outbox SKIP LOCKED
  )
  UPDATE public.whatsapp_robot_outbox AS outbox
  SET attempts = outbox.attempts + 1, available_at = now() + interval '3 minutes'
  FROM claim WHERE outbox.id = claim.id
  RETURNING outbox.*;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.claim_whatsapp_outbox() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_outbox() TO service_role;
--> statement-breakpoint
CREATE FUNCTION public.queue_whatsapp_order_update()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE normalized_phone text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status
    OR NEW.status NOT IN ('new', 'preparing', 'delivered', 'completed', 'cancelled')
    OR NOT EXISTS (
      SELECT 1 FROM public.whatsapp_robot_settings WHERE restaurant_id = NEW.restaurant_id AND connected AND notify_orders
    ) THEN RETURN NEW; END IF;

  normalized_phone := public.normalize_customer_phone(NEW.customer_phone);
  IF normalized_phone IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.whatsapp_robot_outbox (restaurant_id, phone, customer_name, order_label, order_status)
  VALUES (
    NEW.restaurant_id, substring(normalized_phone FROM 2), NEW.customer_name,
    '#' || coalesce(NEW.order_number::text, right(NEW.id::text, 8)), NEW.status
  );
  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.queue_whatsapp_order_update() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
CREATE TRIGGER queue_whatsapp_order_update AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.queue_whatsapp_order_update();
