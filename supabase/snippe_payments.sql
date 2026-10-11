-- Atomically marks a transaction completed and awards its credits exactly once.
-- Callable ONLY by the service role (Edge Functions), never by app users.
create or replace function public.award_transaction_credits(p_tx uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_credits integer;
begin
  update public.transactions
     set status = 'completed', updated_at = now()
   where id = p_tx and status <> 'completed'
  returning user_id, credits_awarded into v_user, v_credits;

  if v_user is null then
    return 0; -- already awarded (or unknown)
  end if;

  update public.profiles set credits = coalesce(credits, 0) + v_credits where id = v_user;
  return v_credits;
end;
$$;

revoke all on function public.award_transaction_credits(uuid) from public, anon, authenticated;
grant execute on function public.award_transaction_credits(uuid) to service_role;

-- Which provider handled each payment: HaloPesa (Halotel) -> clickpesa, everything else -> snippe
alter table public.transactions add column if not exists provider text;
update public.transactions set provider = case when order_reference like $$SN%$$ then $$snippe$$ else $$clickpesa$$ end where provider is null;
alter table public.transactions alter column provider set default $$snippe$$;
