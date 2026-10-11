-- =====================================================================
-- Security hardening for payments / credits / earnings
-- Run order is irrelevant; every statement is idempotent.
-- Principle: the browser/app can SPEND credits, but only the server
-- (Edge Functions with the service role, or SECURITY DEFINER functions) can
-- ADD credits, change roles, or change earnings.
-- =====================================================================

-- 1) Spend log used to bound refunds (a refund can never exceed what was really spent recently)
create table if not exists public.credit_spend_log (
  id bigserial primary key,
  user_id uuid not null,
  amount integer not null,
  refunded integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists credit_spend_log_user_idx on public.credit_spend_log (user_id, created_at desc);
alter table public.credit_spend_log enable row level security;  -- no policies: only server code touches it

-- 2) deduct_credits: positive = spend, negative = refund (bounded by recent real spending)
create or replace function public.deduct_credits(user_id uuid, amount integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_left integer;
  v_take integer;
  r record;
begin
  if auth.uid() is null or auth.uid() <> user_id then
    raise exception 'Not authorized';
  end if;

  if amount > 0 then
    select credits into v_balance from public.profiles where id = user_id for update;
    if coalesce(v_balance, 0) < amount then return false; end if;
    update public.profiles set credits = credits - amount where id = user_id;
    insert into public.credit_spend_log (user_id, amount) values (user_id, amount);
    return true;
  elsif amount < 0 then
    -- refund: only up to what this user spent in the last 60 minutes and has not refunded yet
    v_left := -amount;
    for r in
      select l.id as lid, l.amount - l.refunded as refundable
        from public.credit_spend_log l
       where l.user_id = deduct_credits.user_id
         and l.created_at > now() - interval '60 minutes'
         and l.amount - l.refunded > 0
       order by l.created_at desc
       for update
    loop
      exit when v_left <= 0;
      v_take := least(v_left, r.refundable);
      update public.credit_spend_log set refunded = refunded + v_take where id = r.lid;
      v_left := v_left - v_take;
    end loop;
    if v_left > 0 then return false; end if; -- tried to refund more than was spent
    update public.profiles set credits = credits + (-amount) where id = user_id;
    return true;
  end if;
  return true;
end;
$$;

-- 3) add_credits: admin gift only (it used to let ANY user add ANY amount to themselves)
create or replace function public.add_credits(user_id uuid, amount integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Not authorized';
  end if;
  update public.profiles set credits = credits + amount where id = user_id;
  return true;
end;
$$;

-- 4) Protect sensitive profile columns from direct client updates
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
as $$
begin
  -- Direct requests from the app/browser run as 'authenticated' or 'anon'.
  -- Edge Functions (service role) and SECURITY DEFINER functions run as other roles and are allowed.
  if current_user in ('authenticated', 'anon') then
    if new.role is distinct from old.role and new.role = 'admin' then
      raise exception 'Not allowed: cannot grant admin';
    end if;
    if coalesce(new.is_admin, false) and not coalesce(old.is_admin, false) then
      raise exception 'Not allowed: cannot grant admin';
    end if;
    if new.earnings_balance is distinct from old.earnings_balance then
      raise exception 'Not allowed: earnings are managed by the server';
    end if;
    if coalesce(new.credits, 0) > coalesce(old.credits, 0) then
      raise exception 'Not allowed: credits can only be added by the server';
    end if;
    -- the free-lyrics counter may only go up from the client (it is reset by the server on top-up)
    if coalesce(new.lyrics_used, 0) < coalesce(old.lyrics_used, 0) then
      raise exception 'Not allowed: lyrics usage is managed by the server';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_columns on public.profiles;
create trigger trg_protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- 5) transactions: this table must only be written by the server. The old policy
--    ("Service role can manage all transactions" for PUBLIC, using true) let ANYONE edit it.
drop policy if exists "Service role can manage all transactions" on public.transactions;
revoke insert, update, delete on public.transactions from anon, authenticated;

-- 6) Artist ad rewards: no self-rewards, hard cap per event, 60s cooldown per listener+track
create or replace function public.reward_artist_dynamic_ad(
  p_track_id uuid, p_action_type text, p_ad_value_micros bigint, p_currency text default 'USD'
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_artist_id uuid;
  v_share bigint;
  v_tzs integer;
  v_micros bigint := least(greatest(coalesce(p_ad_value_micros, 0), 0), 50000); -- max ~$0.05 per event
begin
  if auth.uid() is null then return false; end if;

  select user_id into v_artist_id from public.tracks where id = p_track_id;
  if v_artist_id is null or v_artist_id = auth.uid() then return false; end if;

  if exists (
    select 1 from public.ad_earnings_ledger
     where listener_id = auth.uid() and track_id = p_track_id
       and created_at > now() - interval '60 seconds'
  ) then return false; end if;

  v_share := (v_micros * 70) / 100;
  v_tzs := (v_share * 2600) / 1000000;
  if v_tzs < 1 then v_tzs := 1; end if;

  update public.profiles set earnings_balance = coalesce(earnings_balance, 0) + v_tzs where id = v_artist_id;
  insert into public.ad_earnings_ledger (artist_id, track_id, listener_id, action_type, ad_value_micros, currency, artist_share_amount)
  values (v_artist_id, p_track_id, auth.uid(), p_action_type, v_micros, p_currency, v_tzs);
  return true;
end;
$$;
