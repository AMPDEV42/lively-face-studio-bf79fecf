// Creates a Midtrans Snap transaction. Server is source of truth for prices.
// Body: { product: 'pro_monthly' } | { product: 'topup', package_id: 'topup_100' }
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

const PRO_MONTHLY = { name: 'Voxie Pro - 1 Bulan', priceIDR: 150_000 };

const TOPUP_PACKAGES: Record<string, { name: string; messages: number; ttsChars: number; priceIDR: number }> = {
  topup_100:  { name: 'Top-up Mini (100 pesan + 3K TTS)',     messages: 100,  ttsChars: 3_000,  priceIDR: 15_000 },
  topup_300:  { name: 'Top-up Standar (300 pesan + 10K TTS)', messages: 300,  ttsChars: 10_000, priceIDR: 29_000 },
  topup_700:  { name: 'Top-up Hemat (700 pesan + 25K TTS)',   messages: 700,  ttsChars: 25_000, priceIDR: 49_000 },
  topup_1500: { name: 'Top-up Bulanan (1500 pesan + 50K TTS)', messages: 1_500, ttsChars: 50_000, priceIDR: 99_000 },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data: userData } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  const user = userData?.user;
  if (!user) return json({ error: 'unauthorized' }, 401);

  let body: { product?: string; package_id?: string };
  try { body = await req.json(); } catch { return json({ error: 'invalid_json' }, 400); }

  let productType: 'pro_monthly' | 'topup_bundle';
  let itemName: string;
  let priceIDR: number;
  let messagesQty = 0;
  let ttsQty = 0;
  let itemId: string;

  if (body.product === 'pro_monthly') {
    // Block double-purchase: enforce single Pro role at a time? Allow extension via fulfill_order.
    productType = 'pro_monthly';
    itemName = PRO_MONTHLY.name;
    priceIDR = PRO_MONTHLY.priceIDR;
    itemId = 'pro_monthly';
  } else if (body.product === 'topup' && body.package_id && TOPUP_PACKAGES[body.package_id]) {
    // Top-up only allowed for Pro users
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const isPro = (roles ?? []).some((r) => r.role === 'pro' || r.role === 'admin');
    if (!isPro) return json({ error: 'pro_only', message: 'Top-up hanya untuk pengguna Pro.' }, 403);

    const pkg = TOPUP_PACKAGES[body.package_id];
    productType = 'topup_bundle';
    itemName = pkg.name;
    priceIDR = pkg.priceIDR;
    messagesQty = pkg.messages;
    ttsQty = pkg.ttsChars;
    itemId = body.package_id;
  } else {
    return json({ error: 'invalid_product' }, 400);
  }

  const orderId = `${itemId}-${user.id.slice(0, 8)}-${Date.now()}`;

  const { data: profile } = await supabase
    .from('profiles').select('display_name').eq('user_id', user.id).maybeSingle();

  const { error: insertErr } = await supabase.from('orders').insert({
    user_id: user.id,
    order_id: orderId,
    product_type: productType,
    amount_idr: priceIDR,
    quantity: messagesQty || 1,
    quantity_tts: ttsQty,
    status: 'pending',
  });
  if (insertErr) {
    console.error('orders insert error', insertErr);
    return json({ error: 'order_create_failed' }, 500);
  }

  const snapPayload = {
    transaction_details: { order_id: orderId, gross_amount: priceIDR },
    item_details: [{ id: itemId, price: priceIDR, quantity: 1, name: itemName }],
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
