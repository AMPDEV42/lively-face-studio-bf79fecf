// Midtrans Snap webhook receiver. Verifies signature_key, then fulfills order.
// Public endpoint (no JWT) — must be added to config.toml with verify_jwt = false.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SERVER_KEY = Deno.env.get('MIDTRANS_SERVER_KEY')!;

async function sha512Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function ok() { return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
function bad(msg: string, status = 400) { return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return bad('method_not_allowed', 405);

  let n: Record<string, unknown>;
  try { n = await req.json(); } catch { return bad('invalid_json'); }

  const orderId = String(n.order_id ?? '');
  const statusCode = String(n.status_code ?? '');
  const grossAmount = String(n.gross_amount ?? '');
  const signatureKey = String(n.signature_key ?? '');
  const transactionStatus = String(n.transaction_status ?? '');
  const fraudStatus = String(n.fraud_status ?? '');
  const paymentType = String(n.payment_type ?? '');
  const transactionId = String(n.transaction_id ?? '');

  if (!orderId || !signatureKey) return bad('missing_fields');

  // Verify signature: sha512(order_id + status_code + gross_amount + server_key)
  const expected = await sha512Hex(`${orderId}${statusCode}${grossAmount}${SERVER_KEY}`);
  if (expected !== signatureKey.toLowerCase()) {
    console.warn('Bad signature', { orderId, expected, signatureKey });
    return bad('invalid_signature', 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Resolve final status
  let nextStatus: 'paid' | 'pending' | 'failed' | 'expired' | 'cancelled' | 'refunded' = 'pending';
  if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
    if (fraudStatus === '' || fraudStatus === 'accept') nextStatus = 'paid';
    else nextStatus = 'pending'; // challenge
  } else if (transactionStatus === 'pending') nextStatus = 'pending';
  else if (transactionStatus === 'deny' || transactionStatus === 'failure') nextStatus = 'failed';
  else if (transactionStatus === 'expire') nextStatus = 'expired';
  else if (transactionStatus === 'cancel') nextStatus = 'cancelled';
  else if (transactionStatus === 'refund' || transactionStatus === 'partial_refund') nextStatus = 'refunded';

  // Update raw notification + payment metadata
  await supabase.from('orders').update({
    payment_type: paymentType,
    transaction_id: transactionId,
    fraud_status: fraudStatus || null,
    raw_notification: n,
  }).eq('order_id', orderId);

  if (nextStatus === 'paid') {
    const { error } = await supabase.rpc('fulfill_order', { _order_id: orderId });
    if (error) {
      console.error('fulfill_order error', error);
      return bad('fulfill_failed', 500);
    }
  } else {
    await supabase.from('orders').update({ status: nextStatus }).eq('order_id', orderId);
  }

  return ok();
});
