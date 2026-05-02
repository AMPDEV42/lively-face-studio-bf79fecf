// Creates a Midtrans Snap transaction for Pro subscription or top-ups.
// Requires authenticated user. Returns { token, redirect_url, order_id }.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SERVER_KEY = Deno.env.get('MIDTRANS_SERVER_KEY')!;
const IS_PROD = (Deno.env.get('MIDTRANS_IS_PRODUCTION') ?? 'false').toLowerCase() === 'true';
const SNAP_BASE = IS_PROD
  ? 'https://app.midtrans.com/snap/v1/transactions'
  : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

// Product catalog (server is source of truth — never trust client prices)
type ProductType = 'pro_monthly' | 'topup_messages' | 'topup_tts';
const PRODUCTS: Record<ProductType, { name: string; unitPrice: number; unitQty: number }> = {
  pro_monthly:     { name: 'Voxie Pro - 1 Bulan',           unitPrice: 150_000, unitQty: 1 },
  topup_messages:  { name: 'Top-up 100 Pesan',              unitPrice: 25_000,  unitQty: 100 },
  topup_tts:       { name: 'Top-up 10.000 Karakter TTS',    unitPrice: 15_000,  unitQty: 10_000 },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // Auth
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data: userData } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  const user = userData?.user;
  if (!user) return json({ error: 'unauthorized' }, 401);

  // Parse body
  let body: { product_type?: ProductType; multiplier?: number };
  try { body = await req.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  const productType = body.product_type;
  const multiplier = Math.max(1, Math.min(10, Number(body.multiplier ?? 1)));
  if (!productType || !(productType in PRODUCTS)) return json({ error: 'invalid_product' }, 400);

  const product = PRODUCTS[productType];
  const grossAmount = product.unitPrice * multiplier;
  const totalQty = product.unitQty * multiplier;
  const orderId = `${productType}-${user.id.slice(0, 8)}-${Date.now()}`;

  // Get profile for customer details
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .maybeSingle();

  // Pre-insert pending order
  const { error: insertErr } = await supabase.from('orders').insert({
    user_id: user.id,
    order_id: orderId,
    product_type: productType,
    amount_idr: grossAmount,
    quantity: totalQty,
    status: 'pending',
  });
  if (insertErr) {
    console.error('orders insert error', insertErr);
    return json({ error: 'order_create_failed' }, 500);
  }

  // Build Snap request
  const snapPayload = {
    transaction_details: { order_id: orderId, gross_amount: grossAmount },
    item_details: [{
      id: productType,
      price: product.unitPrice,
      quantity: multiplier,
      name: multiplier > 1 ? `${product.name} x${multiplier}` : product.name,
    }],
    customer_details: {
      first_name: profile?.display_name ?? 'User',
      email: user.email ?? undefined,
    },
    credit_card: { secure: true },
  };

  const auth = btoa(`${SERVER_KEY}:`);
  const resp = await fetch(SNAP_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify(snapPayload),
  });
  const snapData = await resp.json();
  if (!resp.ok) {
    console.error('Snap error', snapData);
    await supabase.from('orders').update({ status: 'failed' }).eq('order_id', orderId);
    return json({ error: 'snap_failed', detail: snapData }, 502);
  }

  return json({
    token: snapData.token,
    redirect_url: snapData.redirect_url,
    order_id: orderId,
    is_production: IS_PROD,
  });
});
