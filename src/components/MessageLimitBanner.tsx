/**
 * MessageLimitBanner — shown inside the chat area when user is near/at message limit.
 * Handles 4 states:
 * 1. Near limit (80-99%) — amber warning
 * 2. At limit, has top-up headroom — offer top-up
 * 3. At limit, no headroom — offer upgrade
 * 4. Non-Pro with frozen top-up — remind to re-subscribe
 */

import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Crown, X, Zap, Lock } from 'lucide-react';
import { useState } from 'react';
import { usePlan } from '@/hooks/usePlan';
import { formatNumber } from '@/lib/plan-config';

export default function MessageLimitBanner() {
  const navigate = useNavigate();
  const { stats, planConfig, messagePercent, isPro, canSendMessage } = usePlan();
  const [dismissed, setDismissed] = useState(false);

  const { messagesPerMonth } = planConfig.limits;
  const isAtLimit = !canSendMessage();
  const hasFrozenTopUp = !isPro && stats.topUpMessages > 0;

  // Tampilkan banner frozen top-up untuk non-Pro yang punya sisa top-up
  if (hasFrozenTopUp && !dismissed) {
    return (
      <div
        className="mx-3 mb-2 rounded-xl px-3.5 py-2.5 flex items-center gap-3 text-xs"
        style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(217,119,6,0.07))',
          border: '1px solid rgba(245,158,11,0.25)',
        }}
      >
        <Lock className="w-4 h-4 shrink-0 text-amber-400" />
        <div className="flex-1 min-w-0">
          <p className="text-amber-300 font-medium">
            {stats.topUpMessages.toLocaleString('id-ID')} pesan top-up sedang dibekukan
          </p>
          <p className="text-white/40 text-[10px] mt-0.5">Aktif kembali saat berlangganan Pro</p>
        </div>
        <button
          onClick={() => navigate('/pricing')}
          className="shrink-0 flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg transition-all hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(147,51,234,0.4))',
            border: '1px solid rgba(139,92,246,0.5)',
            color: '#c084fc',
          }}
        >
          <Crown className="w-3 h-3" />
          Aktifkan Pro
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white/30"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // Jangan tampilkan untuk Pro unlimited atau sudah dismissed
  if (isPro || messagesPerMonth === null || dismissed) return null;

  // Tampilkan mulai 80%
  if (messagePercent < 80) return null;

  const remaining = (stats.totalMessageQuota ?? messagesPerMonth) - stats.messagesThisMonth;
  const hasTopUpHeadroom = stats.topUpHeadroom > 0;

  return (
    <div
      className="mx-3 mb-2 rounded-xl px-3.5 py-2.5 flex items-center gap-3 text-xs"
      style={{
        background: isAtLimit
          ? 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.08))'
          : 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.08))',
        border: `1px solid ${isAtLimit ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
      }}
    >
      <AlertTriangle
        className="w-4 h-4 shrink-0"
        style={{ color: isAtLimit ? '#f87171' : '#fbbf24' }}
      />

      <div className="flex-1 min-w-0">
        {isAtLimit ? (
          <div>
            <p className="text-red-300 font-medium">
              Kuota pesan habis ({formatNumber(messagesPerMonth)} pesan/bulan)
            </p>
            {hasTopUpHeadroom && (
              <p className="text-white/40 text-[10px] mt-0.5">
                Top-up mulai Rp 15.000 — sisa tidak hangus
              </p>
            )}
          </div>
        ) : (
          <p style={{ color: '#fcd34d' }}>
            Sisa <strong>{remaining}</strong> pesan bulan ini
            <span className="text-white/40 ml-1">({messagePercent}% terpakai)</span>
          </p>
        )}
      </div>

      {/* CTA: top-up jika sudah Pro & ada headroom, upgrade jika belum Pro */}
      {isAtLimit && isPro && hasTopUpHeadroom ? (
        <button
          onClick={() => navigate('/pricing#topup')}
          className="shrink-0 flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg transition-all hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(217,119,6,0.3))',
            border: '1px solid rgba(245,158,11,0.4)',
            color: '#fcd34d',
          }}
        >
          <Zap className="w-3 h-3" />
          Top-up
        </button>
      ) : (
        <button
          onClick={() => navigate('/pricing')}
          className="shrink-0 flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg transition-all hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(147,51,234,0.4))',
            border: '1px solid rgba(139,92,246,0.5)',
            color: '#c084fc',
          }}
        >
          <Crown className="w-3 h-3" />
          {isPro ? 'Top-up' : 'Upgrade'}
        </button>
      )}

      {!isAtLimit && (
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white/30"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
