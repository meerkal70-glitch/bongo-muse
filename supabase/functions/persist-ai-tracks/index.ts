import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Copies AI songs (audio + cover) from the AI provider's temporary links into our own storage,
// so users never lose a song when the provider's link expires (~2 weeks). Runs on a schedule and
// fixes any track still pointing at a temporary link, no matter which app version created it.
const TEMP_HOST = /(aiquickdraw\.com|\.kie\.ai|kie\.ai|suno\.ai|suno\.com|apiboxfile\.com|sunoapi\.org)/i;

serve(async (req) => {
  if (req.headers.get('x-cron-key') !== Deno.env.get('PERSIST_KEY') || !Deno.env.get('PERSIST_KEY')) {
    return new Response('Forbidden', { status: 403 });
  }
  const supaUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const admin = createClient(supaUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const own = new URL(supaUrl).host;

  const { data: rows } = await admin
    .from('tracks')
    .select('id,audio_url,cover_url')
    .or(`audio_url.not.ilike.%${own}%,and(cover_url.not.is.null,cover_url.not.ilike.%${own}%)`)
    .order('created_at', { ascending: false })
    .limit(8);

  const results: any[] = [];
  for (const t of rows ?? []) {
    const patch: Record<string, string> = {};
    const note: string[] = [];

    try {
      if (t.audio_url && !t.audio_url.includes(own) && TEMP_HOST.test(new URL(t.audio_url).host)) {
        const r = await fetch(t.audio_url);
        if (!r.ok) throw new Error(`audio ${r.status}`);
        const buf = new Uint8Array(await r.arrayBuffer());
        const path = `ai_tracks/${t.id}.mp3`;
        const { error } = await admin.storage.from('audio').upload(path, buf, { contentType: 'audio/mpeg', upsert: true });
        if (error) throw error;
        patch.audio_url = admin.storage.from('audio').getPublicUrl(path).data.publicUrl;
        note.push('audio');
      }
    } catch (e: any) { note.push(`audio-failed:${e?.message || e}`); }

    try {
      if (t.cover_url && !t.cover_url.includes(own) && TEMP_HOST.test(new URL(t.cover_url).host)) {
        const r = await fetch(t.cover_url);
        if (!r.ok) throw new Error(`cover ${r.status}`);
        const buf = new Uint8Array(await r.arrayBuffer());
        const path = `ai_covers/${t.id}.jpg`;
        const { error } = await admin.storage.from('images').upload(path, buf, { contentType: r.headers.get('content-type') || 'image/jpeg', upsert: true });
        if (error) throw error;
        patch.cover_url = admin.storage.from('images').getPublicUrl(path).data.publicUrl;
        note.push('cover');
      }
    } catch (e: any) { note.push(`cover-failed:${e?.message || e}`); }

    if (Object.keys(patch).length) await admin.from('tracks').update(patch).eq('id', t.id);
    results.push({ id: t.id, note });
  }

  // Backup step: keep a second copy of each song in the separate `audio-backup` bucket
  const backed: string[] = [];
  const { data: need } = await admin.from('tracks_needing_backup').select('id,audio_url').limit(10);
  for (const t of need ?? []) {
    try {
      const r = await fetch(t.audio_url);
      if (!r.ok) throw new Error(`audio ${r.status}`);
      const buf = new Uint8Array(await r.arrayBuffer());
      const { error } = await admin.storage.from('audio-backup').upload(`${t.id}.mp3`, buf, { contentType: 'audio/mpeg', upsert: true });
      if (error) throw error;
      await admin.from('track_backups').upsert({ track_id: t.id, size_bytes: buf.length });
      backed.push(t.id);
    } catch { /* retried on the next run */ }
  }
  return new Response(JSON.stringify({ checked: rows?.length ?? 0, results, backed: backed.length }), { headers: { 'Content-Type': 'application/json' } });
});
