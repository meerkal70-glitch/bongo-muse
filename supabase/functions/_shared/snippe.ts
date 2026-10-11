// Shared helpers for the Snippe (https://docs.snippe.sh) payment integration.
// The API key lives ONLY in the Edge Function secret SNIPPE_API_KEY (never in the app).

export const SNIPPE_BASE = 'https://api.snippe.sh';
export const PRICE_PER_CREDIT = 500; // TZS

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

export function snippeKey(): string {
  const k = Deno.env.get('SNIPPE_API_KEY');
  if (!k) throw new Error('Payment provider is not configured on the server.');
  return k;
}

/** Turn 0712345678 / +255712345678 / 255712345678 into 255712345678 */
export function normalizePhone(input: string): string {
  let p = String(input || '').replace(/[^0-9]/g, '');
  if (p.startsWith('0')) p = '255' + p.substring(1);
  if (p.length === 9) p = '255' + p;
  return p;
}

/** Ask Snippe for the real status of a payment (we never trust webhook payloads alone). */
export async function getSnippePayment(reference: string) {
  const res = await fetch(`${SNIPPE_BASE}/v1/payments/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${snippeKey()}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false as const, status: res.status, message: body?.message || 'Could not fetch payment status' };
  return { ok: true as const, payment: body.data };
}
