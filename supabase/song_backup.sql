-- Second copy of every song, in a separate storage bucket, so a song still plays if the main file is lost.
-- The app/website derive the backup address from the track id:
--   <SUPABASE_URL>/storage/v1/object/public/audio-backup/<track_id>.mp3
insert into storage.buckets (id, name, public) values ('audio-backup', 'audio-backup', true)
on conflict (id) do nothing;

create table if not exists public.track_backups (
  track_id uuid primary key,
  size_bytes bigint,
  backed_up_at timestamptz not null default now()
);
alter table public.track_backups enable row level security;  -- server only

-- Tracks whose main file is already on our storage but that have no backup copy yet
create or replace view public.tracks_needing_backup as
  select t.id, t.audio_url
    from public.tracks t
   where t.audio_url like '%/storage/v1/object/public/audio/%'
     and not exists (select 1 from public.track_backups b where b.track_id = t.id);
revoke all on public.tracks_needing_backup from anon, authenticated;
