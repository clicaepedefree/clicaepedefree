CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('validapay-reconcile-charges')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'validapay-reconcile-charges');

SELECT cron.schedule(
  'validapay-reconcile-charges',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://defowjmlqmheecydnyrj.supabase.co/functions/v1/validapay-reconcile-charges',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZm93am1scW1oZWVjeWRueXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NjUzOTEsImV4cCI6MjA5MjU0MTM5MX0.ez8wLA0W6R4S3X_Dcw2DA7H-GefOKLSAAj_eZxMQkb4"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  );
  $$
);