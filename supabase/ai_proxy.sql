-- =====================================================================
-- AI proxy support + (STAGED) lock-down of secrets
-- =====================================================================

-- Rate-limit log for the ai-proxy Edge Function (server only: RLS on, no policies)
create table if not exists public.ai_proxy_log (
  id bigserial primary key,
  user_id uuid not null,
  path text,
  created_at timestamptz not null default now()
);
create index if not exists ai_proxy_log_user_idx on public.ai_proxy_log (user_id, created_at desc);
alter table public.ai_proxy_log enable row level security;
