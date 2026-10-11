// ClickPesa helpers (used for Halotel / HaloPesa payments). Credentials come from Edge Function secrets:
// CLICKPESA_CLIENT_ID and CLICKPESA_API_KEY.

const CP = 'https://api.clickpesa.com/third-parties';

/** HaloPesa = Halotel numbers (061x / 062x -> 25561 / 25562) */
export const isHalotel = (phone255: string) => /^255(61|62)\d{7}$/.test(phone255);

async function token(): Promise<string> {
  const id = Deno.env.get('CLICKPESA_CLIENT_ID');
  const key = Deno.env.get('CLICKPESA_API_KEY');
  if (!id || !key) throw new Error('Payment provider is not configured on the server.');
  const res = await fetch(`${CP}/generate-token`, { method: 'POST', headers: { 'client-id': id, 'api-key': key } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success || !data?.token) throw new Error('Payment provider is temporarily unavailable. Please try again.');
  return data.token; // already "Bearer ..."
}

/** Sends the USSD push to the customer. orderReference must be alphanumeric. */
export async function clickpesaInitiate(orderReference: string, amount: number, phone: string) {
  const t = await token();
  const res = await fetch(`${CP}/payments/initiate-ussd-push-request`, {
    method: 'POST',
    headers: { Authorization: t, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: String(amount), currency: 'TZS', orderReference, phoneNumber: phone }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'The payment provider rejected the request.');
  return data; // { id, status, channel, orderReference, ... }
}

/** Real status from ClickPesa (we never trust webhook payloads alone). */
export async function clickpesaStatus(orderReference: string) {
  const t = await token();
  const res = await fetch(`${CP}/payments/${encodeURIComponent(orderReference)}`, { headers: { Authorization: t } });
  const data = await res.json().catch(() => null);
  if (!res.ok) return { ok: false as const, status: res.status, message: 'Could not fetch payment status' };
  const p = Array.isArray(data) ? data[0] : data;
  if (!p) return { ok: false as const, status: 404, message: 'Transaction not found on ClickPesa' };
  const s = String(p.status || '').toUpperCase();
  const state = s === 'SUCCESS' || s === 'SETTLED' || s === 'COMPLETED' ? 'completed'
    : s === 'FAILED' || s === 'CANCELLED' || s === 'EXPIRED' ? 'failed' : 'pending';
  const amount = parseInt(String(p.collectedAmount ?? p.amount ?? '0'));
  return { ok: true as const, state, amount, raw: p };
}
