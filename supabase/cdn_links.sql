-- Serve ALL storage files through Cloudflare (bongo-cdn worker), for every app version.
--
-- Why: older app versions (e.g. September builds) load song/cover links exactly as
-- stored in the database (Supabase host), which costs Supabase egress. Newer versions
-- rewrite the host inside the app. By storing the Cloudflare link in the database,
-- old AND new versions all download through Cloudflare's cache.
--
-- Safe for new versions: their in-app rewrite only acts on the Supabase host, so a
-- link that is already Cloudflare is left alone.
-- Only public storage links are changed (/storage/v1/object/public/...). Edge function
-- URLs, signed URLs and anything else are untouched.
--
-- Run in: Supabase Dashboard -> SQL Editor. Rollback is at the bottom.

-- 1) Rewrite helper -------------------------------------------------------------
create or replace function public.to_cdn_url(u text)
returns text language sql immutable as $$
  select case
    when u like 'https://gqxdbwnmnqvtdpxnrgtx.supabase.co/storage/v1/object/public/%'
      then replace(u, 'https://gqxdbwnmnqvtdpxnrgtx.supabase.co/', 'https://bongo-cdn.meerkal70.workers.dev/')
    else u
  end
$$;

-- 2) Trigger: any new/updated row gets Cloudflare links automatically --------------
--    (uploads keep saving Supabase links; this converts them on the way in)
create or replace function public.rewrite_storage_urls_to_cdn()
returns trigger language plpgsql as $$
declare
  j jsonb := to_jsonb(new);
  k text;
begin
  for k in select key from jsonb_each(j)
           where jsonb_typeof(value) = 'string' and key like '%url%'
  loop
    j := jsonb_set(j, array[k], to_jsonb(public.to_cdn_url(j ->> k)));
  end loop;
  new := jsonb_populate_record(new, j);
  return new;
end
$$;

-- 3) Apply to every public table that has a *url* text column ----------------------
do $$
declare
  t record;
  c record;
  n bigint;
begin
  for t in
    select distinct table_name from information_schema.columns
    where table_schema = 'public' and column_name like '%url%'
      and data_type in ('text', 'character varying')
      and table_name in (select table_name from information_schema.tables
                         where table_schema = 'public' and table_type = 'BASE TABLE')
  loop
    -- existing rows
    for c in
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = t.table_name
        and column_name like '%url%' and data_type in ('text', 'character varying')
    loop
      execute format(
        'update public.%I set %I = public.to_cdn_url(%I) where %I like %L',
        t.table_name, c.column_name, c.column_name, c.column_name,
        'https://gqxdbwnmnqvtdpxnrgtx.supabase.co/storage/v1/object/public/%');
      get diagnostics n = row_count;
      if n > 0 then raise notice '%.%: % links moved to Cloudflare', t.table_name, c.column_name, n; end if;
    end loop;

    -- future rows
    execute format('drop trigger if exists zz_cdn_urls on public.%I', t.table_name);
    execute format(
      'create trigger zz_cdn_urls before insert or update on public.%I
         for each row execute function public.rewrite_storage_urls_to_cdn()', t.table_name);
  end loop;
end $$;

-- 4) Check: should return 0 rows for tracks
-- select id, audio_url, cover_url from public.tracks
-- where audio_url like '%supabase.co/storage%' or cover_url like '%supabase.co/storage%';


-- ROLLBACK (only if needed) -------------------------------------------------------
-- do $$
-- declare t record; c record;
-- begin
--   for t in select distinct table_name from information_schema.columns
--            where table_schema='public' and column_name like '%url%'
--              and data_type in ('text','character varying')
--              and table_name in (select table_name from information_schema.tables
--                                 where table_schema='public' and table_type='BASE TABLE')
--   loop
--     execute format('drop trigger if exists zz_cdn_urls on public.%I', t.table_name);
--     for c in select column_name from information_schema.columns
--              where table_schema='public' and table_name=t.table_name
--                and column_name like '%url%' and data_type in ('text','character varying')
--     loop
--       execute format('update public.%I set %I = replace(%I, %L, %L) where %I like %L',
--         t.table_name, c.column_name, c.column_name,
--         'https://bongo-cdn.meerkal70.workers.dev/', 'https://gqxdbwnmnqvtdpxnrgtx.supabase.co/',
--         c.column_name, 'https://bongo-cdn.meerkal70.workers.dev/%');
--     end loop;
--   end loop;
-- end $$;
