-- Keeps AI songs forever: every 5 minutes the persist-ai-tracks Edge Function copies any song/cover
-- that still points at the AI provider's temporary link into our own storage.
-- Needs the Supabase secret PERSIST_KEY (any long random string). Replace <PERSIST_KEY> below with it.
create extension if not exists pg_net;
create extension if not exists pg_cron;
select cron.schedule('persist-ai-tracks', '*/5 * * * *', $cmd$
  select net.http_post(
    url := 'https://gqxdbwnmnqvtdpxnrgtx.supabase.co/functions/v1/persist-ai-tracks',
    headers := jsonb_build_object('x-cron-key', '<PERSIST_KEY>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb, timeout_milliseconds := 120000)
$cmd$);
