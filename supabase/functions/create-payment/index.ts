import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, snippeKey, normalizePhone, SNIPPE_BASE, PRICE_PER_CREDIT } from '../_shared/snippe.ts';

// Starts a Snippe mobile-money (USSD push) payment for buying credits.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  let txId: string | null = null;

  try {
    const { phoneNumber, credits } = await req.json();

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const qty = parseInt(credits);
    if (!qty || qty < 1 || qty > 200) throw new Error('Choose between 1 and 200 credits.');
    const amount = qty * PRICE_PER_CREDIT;

    const phone = normalizePhone(phoneNumber);
    if (!/^255[67]\d{8}$/.test(phone)) throw new Error('Enter a valid Tanzanian mobile money number.');

    const { data: profile } = await admin.from('profiles').select('display_name, username').eq('id', user.id).maybeSingle();
    const fullName = (profile?.display_name || profile?.username || 'Bongo User').trim();
    const [firstname, ...rest] = fullName.split(/\s+/);
    const lastname = rest.join(' ') || 'User';

    // 1) Create our own pending transaction first (the app listens to this row)
    const { data: tx, error: txErr } = await admin
      .from('transactions')
      .insert({ user_id: user.id, amount, credits_awarded: qty, status: 'pending', phone_number: phone })
      .select('id')
      .single();
    if (txErr || !tx) throw new Error('Could not start the payment. Please try again.');
    txId = tx.id;

    // 2) Ask Snippe to push the USSD prompt to the customer's phone
    const res = await fetch(`${SNIPPE_BASE}/v1/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${snippeKey()}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': tx.id.replace(/-/g, '').slice(0, 30), // Snippe: max 30 chars
      },
      body: JSON.stringify({
        payment_type: 'mobile',
        details: { amount, currency: 'TZS' },
        phone_number: phone,
        customer: { firstname, lastname, email: user.email || `${user.id}@bongostreaming.site` },
        webhook_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/snippe-webhook`,
        metadata: { transaction_id: tx.id, user_id: user.id, credits: String(qty) },
      }),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || result?.status !== 'success') {
      throw new Error(result?.message || 'The payment provider rejected the request.');
    }

    // We keep Snippe's payment reference in order_reference (used by webhook + verify)
    await admin.from('transactions').update({ order_reference: result.data.reference, updated_at: new Date().toISOString() }).eq('id', tx.id);

    return json({ success: true, transactionId: tx.id, message: 'Payment initiated' });
  } catch (error: any) {
    if (txId) await admin.from('transactions').update({ status: 'failed', error_message: String(error?.message || error).slice(0, 300) }).eq('id', txId);
    return json({ success: false, error: error?.message || 'Payment failed' }, 400);
  }
});
