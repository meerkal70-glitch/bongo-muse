import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, getSnippePayment } from '../_shared/snippe.ts';

// Lets a user re-check a pending payment (used by "Verify Missing Payments" in the app).
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const { transactionId } = await req.json();
    if (!transactionId) throw new Error('Transaction ID is required');

    const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: tx } = await admin.from('transactions').select('*').eq('id', transactionId).maybeSingle();
    if (!tx) throw new Error('Transaction not found');
    if (tx.user_id !== user.id) throw new Error('Unauthorized');

    if (tx.status === 'completed') return json({ success: true, message: 'Already processed' });
    if (!tx.order_reference) return json({ success: false, message: 'No payment reference' }, 400);

    const r = await getSnippePayment(tx.order_reference);
    if (!r.ok) return json({ success: false, message: r.message }, r.status === 404 ? 404 : 400);

    const status = r.payment?.status;
    if (status === 'completed') {
      // Atomic + idempotent: only awards credits the first time
      const { data: awarded, error } = await admin.rpc('award_transaction_credits', { p_tx: tx.id });
      if (error) throw new Error('Could not add credits. Please contact support.');
      return json({ success: true, message: awarded > 0 ? 'Payment verified and credits awarded!' : 'Already processed' });
    }
    if (['failed', 'voided', 'expired'].includes(status)) {
      await admin.from('transactions').update({ status: 'failed', error_message: `Payment ${status}` }).eq('id', tx.id).eq('status', 'pending');
      return json({ success: false, message: 'Payment failed or was cancelled.' });
    }
    return json({ success: false, message: `Payment is still ${status}` });
  } catch (error: any) {
    return json({ error: error?.message || 'Verification failed' }, 400);
  }
});
