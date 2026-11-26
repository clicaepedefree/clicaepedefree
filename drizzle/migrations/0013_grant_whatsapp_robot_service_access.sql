GRANT ALL ON public.whatsapp_robot_settings, public.whatsapp_robot_contacts, public.whatsapp_robot_outbox TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_outbox() TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_whatsapp_reply(uuid, text, text, text, text, boolean) TO service_role;