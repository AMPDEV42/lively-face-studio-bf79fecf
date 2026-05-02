/**
 * Midtrans Snap helper — loads snap.js from Midtrans CDN and opens the popup.
 * Uses server-defined prices via the midtrans-create-transaction edge function.
 */
import { supabase } from '@/integrations/supabase/client';

// Public client key (safe in browser). For sandbox we use the sandbox key.
const SANDBOX_CLIENT_KEY = 'Mid-client-Lpyk1mcchaNy5Wib';
const PROD_CLIENT_KEY = 'Mid-client-6S_lSjjzsak2WJgY';

interface SnapResult {
  order_id: string;
  transaction_status: string;
  [k: string]: unknown;
}

interface SnapAPI {
  pay(token: string, opts: {
    onSuccess?: (r: SnapResult) => void;
    onPending?: (r: SnapResult) => void;
    onError?: (r: unknown) => void;
    onClose?: () => void;
  }): void;
}

declare global { interface Window { snap?: SnapAPI } }

let snapPromise: Promise<SnapAPI> | null = null;

function loadSnap(isProduction: boolean): Promise<SnapAPI> {
  if (snapPromise) return snapPromise;
  snapPromise = new Promise((resolve, reject) => {
    if (window.snap) return resolve(window.snap);
    const script = document.createElement('script');
    script.src = isProduction
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', isProduction ? PROD_CLIENT_KEY : SANDBOX_CLIENT_KEY);
    script.async = true;
    script.onload = () => window.snap ? resolve(window.snap) : reject(new Error('snap_not_loaded'));
    script.onerror = () => { snapPromise = null; reject(new Error('snap_script_failed')); };
    document.body.appendChild(script);
  });
  return snapPromise;
}

export type CheckoutProduct =
  | { product: 'pro_monthly' }
  | { product: 'topup'; package_id: 'topup_100' | 'topup_300' | 'topup_700' | 'topup_1500' };

export interface CheckoutCallbacks {
  onSuccess?: (orderId: string) => void;
  onPending?: (orderId: string) => void;
  onError?: (err: unknown) => void;
  onClose?: () => void;
}

export async function startMidtransCheckout(
  payload: CheckoutProduct,
  cb: CheckoutCallbacks = {},
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('not_authenticated');

  const { data, error } = await supabase.functions.invoke('midtrans-create-transaction', {
    body: payload,
  });
  if (error) throw error;
  if (!data?.token) throw new Error(data?.message ?? data?.error ?? 'checkout_failed');

  const snap = await loadSnap(Boolean(data.is_production));
  snap.pay(data.token, {
    onSuccess: (r) => cb.onSuccess?.(r.order_id),
    onPending: (r) => cb.onPending?.(r.order_id),
    onError: (e) => cb.onError?.(e),
    onClose: () => cb.onClose?.(),
  });
}
