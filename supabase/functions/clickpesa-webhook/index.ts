import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { clickpesaStatus } from '../_shared/clickpesa.ts';

// ClickPesa webhook (HaloPesa payments).
// Security: the payload is NEVER trusted for money. We only read the orderReference from it,
// then ask the ClickPesa API for the real status before awarding credits (exactly once).
serve(async (req) => {
  try {
    const payload = await req.json().catch(() => ({}));
    const orderReference: string | undefined = payload?.data?.orderReference ?? payload?.orderReference;
    if (!orderReference) return new Response('Missing order reference', { status: 400 });

    const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: tx } = await admin.from('transactions').select('id, status').eq('order_reference', orderReference).maybeSingle();
    if (!tx) return new Response(JSON.stringify({ received: true, note: 'unknown reference' }), { status: 200 });
    if (tx.status === 'completed') return new Response(JSON.stringify({ received: true }), { status: 200 });

    const c = await clickpesaStatus(orderReference);
    if (!c.ok) return new Response('Could not verify payment', { status: 502 });

    if (c.state === 'completed') {
      const { error } = await admin.rpc('award_transaction_credits', { p_tx: tx.id });
      if (error) return new Response('Award error', { status: 500 });
    } else if (c.state === 'failed') {
      await admin.from('transactions').update({ status: 'failed', error_message: 'Payment failed' }).eq('id', tx.id).eq('status', 'pending');
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message }), { status: 400 });
  }
});
