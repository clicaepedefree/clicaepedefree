CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.whatsapp_robot_worker (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex')
);
REVOKE ALL ON public.whatsapp_robot_worker FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.whatsapp_robot_worker TO service_role;
ALTER TABLE public.whatsapp_robot_worker ENABLE ROW LEVEL SECURITY;
INSERT INTO public.whatsapp_robot_worker (id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.whatsapp_dispatch_token_valid(_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(length(_token) >= 32 AND EXISTS (SELECT 1 FROM public.whatsapp_robot_worker WHERE token = _token), false)
$$;
REVOKE ALL ON FUNCTION public.whatsapp_dispatch_token_valid(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_dispatch_token_valid(text) TO service_role;

CREATE OR REPLACE FUNCTION public.call_whatsapp_dispatch()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _token text;
BEGIN
  SELECT token INTO _token FROM public.whatsapp_robot_worker;
  IF _token IS NULL THEN RETURN; END IF;
  PERFORM net.http_post(
    url := 'https://defowjmlqmheecydnyrj.supabase.co/functions/v1/whatsapp-robot/dispatch',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || _token, 'x-region','us-east-1'),
    body := '{}'::jsonb
  );
END $$;
REVOKE ALL ON FUNCTION public.call_whatsapp_dispatch() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.call_whatsapp_dispatch() TO service_role;

CREATE OR REPLACE FUNCTION public.whatsapp_outbox_kick()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.call_whatsapp_dispatch();
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_outbox_kick() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS whatsapp_outbox_kick ON public.whatsapp_robot_outbox;
CREATE TRIGGER whatsapp_outbox_kick AFTER INSERT ON public.whatsapp_robot_outbox
  FOR EACH STATEMENT EXECUTE FUNCTION public.whatsapp_outbox_kick();