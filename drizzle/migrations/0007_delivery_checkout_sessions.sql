CREATE TABLE public.delivery_checkout_sessions (
 token_hash text PRIMARY KEY CHECK (length(token_hash)=64),
 restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL DEFAULT (now()+interval '20 minutes'),
 requests integer NOT NULL DEFAULT 0 CHECK (requests BETWEEN 0 AND 30)
);
GRANT SELECT,INSERT,DELETE ON public.delivery_checkout_sessions TO service_role;
ALTER TABLE public.delivery_checkout_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX delivery_checkout_sessions_expiry ON public.delivery_checkout_sessions(expires_at);
CREATE FUNCTION public.reserve_delivery_checkout_request(_token_hash text,_restaurant_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE public.delivery_checkout_sessions SET requests=requests+1
 WHERE token_hash=_token_hash AND restaurant_id=_restaurant_id AND expires_at>now() AND requests<30;
 RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.reserve_delivery_checkout_request(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_delivery_checkout_request(text,uuid) TO service_role;