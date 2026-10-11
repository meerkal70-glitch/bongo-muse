import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSnippePayment } from '../_shared/snippe.ts';

// Snippe webhook: payment.completed / payment.failed / payment.voided / payment.expired
// Security: the payload is NEVER trusted for money. We only read the payment reference from it,
// then ask the Snippe API (with our API key) for the real status before awarding credits.
// If SNIPPE_WEBHOOK_SECRET is set we also verify the HMAC signature.

async function validSignature(raw: string, req: Request): Promise<boolean> {
  const secret = Deno.env.get('SNIPPE_WEBHOOK_SECRET');
  if (!secret) return true; // optional extra layer
  const ts = req.headers.get('x-webhook-timestamp') ?? '';
  const sig = req.headers.get('x-webhook-signature') ?? '';
  if (!ts || !sig) return false;
  if (Math.abs(Date.now() / 1000 - parseInt(ts)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ts}.${raw}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex === sig;
}

serve(async (req) => {
  try {
    const raw = await req.text();
    if (!(await validSignature(raw, req))) return new Response('Invalid signature', { status: 401 });

    const payload = JSON.parse(raw || '{}');
    const reference: string | undefined = payload?.data?.reference ?? payload?.reference;
    if (!reference) return new Response('Missing reference', { status: 400 });

    const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: tx } = await admin.from('transactions').select('*').eq('order_reference', reference).maybeSingle();
    if (!tx) return new Response(JSON.stringify({ received: true, note: 'unknown reference' }), { status: 200 });

    const r = await getSnippePayment(reference);
    if (!r.ok) return new Response('Could not verify payment', { status: 502 }); // Snippe will retry

    const p = r.payment;
    if (p.status === 'completed') {
      if ((p.amount?.value ?? 0) < tx.amount) {
        await admin.from('transactions').update({ status: 'failed', error_message: 'Amount mismatch' }).eq('id', tx.id);
        return new Response(JSON.stringify({ received: true, note: 'amount mismatch' }), { status: 200 });
      }
      const { error } = await admin.rpc('award_transaction_credits', { p_tx: tx.id });
      if (error) { console.error('award error', error); return new Response('Award error', { status: 500 }); }
    } else if (['failed', 'voided', 'expired'].includes(p.status)) {
      await admin.from('transactions').update({ status: 'failed', error_message: `Payment ${p.status}` }).eq('id', tx.id).eq('status', 'pending');
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err: any) {
    console.error('snippe-webhook error', err);
    return new Response(JSON.stringify({ error: err?.message }), { status: 400 });
  }
});
