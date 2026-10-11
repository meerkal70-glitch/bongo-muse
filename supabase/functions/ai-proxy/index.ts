import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/snippe.ts';

// Server-side relay to the AI music provider (Kie / Suno).
// The real API key never leaves the server: clients send their own Supabase session token,
// and this function adds the provider key (read with the service role) before forwarding.
const ALLOWED = /^\/(generate|separate-vocals|vocal-removal|chat\/credit|voice|lyrics|mp4)(\/|$)/;
const ADMIN_ONLY = /^\/(chat\/credit|generate\/credit)(\/|$|\?)/;
const HOURLY_LIMIT = 60; // provider calls that start work (POST) per user per hour

const out = (body: string, status: number, type = 'application/json') =>
  new Response(body, { status, headers: { ...corsHeaders, 'Content-Type': type } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const idx = url.pathname.indexOf('/ai-proxy');
    const path = idx >= 0 ? url.pathname.slice(idx + '/ai-proxy'.length) : url.pathname;
    if (!ALLOWED.test(path)) return out(JSON.stringify({ code: 404, msg: 'Not found' }), 404);

    const supaUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const userClient = createClient(supaUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return out(JSON.stringify({ code: 401, msg: 'Unauthorized' }), 401);

    const admin = createClient(supaUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const isAdmin = me?.role === 'admin';
    if (ADMIN_ONLY.test(path + url.search) && !isAdmin) return out(JSON.stringify({ code: 403, msg: 'Forbidden' }), 403);

    // Per-user rate limit on requests that start paid work
    if (req.method === 'POST' && !isAdmin) {
      const since = new Date(Date.now() - 3600_000).toISOString();
      const { count } = await admin.from('ai_proxy_log').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since);
      if ((count ?? 0) >= HOURLY_LIMIT) return out(JSON.stringify({ code: 429, msg: 'Too many requests. Please wait a bit.' }), 429);
      await admin.from('ai_proxy_log').insert({ user_id: user.id, path });
    }

    const { data: settings } = await admin.from('system_settings').select('key,value').in('key', ['ai_api_provider', 'kie_api_key', 'suno_api_key']);
    const s: Record<string, string> = Object.fromEntries((settings ?? []).map((r: any) => [r.key, r.value]));
    const provider = s.ai_api_provider === 'kie' ? 'kie' : 'suno';
    const apiKey = provider === 'kie' ? (Deno.env.get('KIE_API_KEY') || s.kie_api_key) : (Deno.env.get('SUNO_API_KEY') || s.suno_api_key);
    if (!apiKey) return out(JSON.stringify({ code: 500, msg: 'AI provider is not configured' }), 500);

    const base = provider === 'kie' ? 'https://api.kie.ai/api/v1' : 'https://api.sunoapi.org/api/v1';
    const upstream = await fetch(`${base}${path}${url.search}`, {
      method: req.method,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text(),
    });
    return out(await upstream.text(), upstream.status, upstream.headers.get('content-type') || 'application/json');
  } catch (e: any) {
    return out(JSON.stringify({ code: 500, msg: 'Proxy error' }), 500);
  }
});
