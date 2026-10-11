import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/snippe.ts';

// Sign in with a username + password without ever exposing anyone's email to the client.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const fail = () => json({ success: false, error: 'Akaunti haijapatikana au nywila si sahihi (Invalid username or password)' }, 400);

  try {
    const { username, password } = await req.json();
    const uname = String(username || '').toLowerCase().trim();
    if (!uname || !password || uname.length > 64) return fail();

    const supaUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const admin = createClient(supaUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const { data: prof } = await admin.from('profiles').select('id').eq('username', uname).maybeSingle();
    let email: string | null = null;
    if (prof?.id) {
      const { data: u } = await admin.auth.admin.getUserById(prof.id);
      email = u?.user?.email ?? null;
    }
    if (!email) { await new Promise((r) => setTimeout(r, 400)); return fail(); } // same answer + similar timing

    const anon = createClient(supaUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', { auth: { persistSession: false } });
    const { data, error } = await anon.auth.signInWithPassword({ email, password: String(password) });
    if (error || !data?.session) return fail();

    return json({ success: true, session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } });
  } catch {
    return fail();
  }
});
