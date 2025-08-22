-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to check revenue limits daily at midnight
SELECT cron.schedule(
  'check-revenue-limits-daily',
  '0 0 * * *', -- Every day at midnight
  $$
  SELECT public.check_revenue_limits();
  $$
);