/**
 * MessageLimitBanner — shown inside the chat area when user is near/at message limit.
 * Appears as a sticky banner above the chat input.
 */

import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Crown, X, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { usePlan } from '@/hooks/usePlan';
import { formatNumber } from '@/lib/plan-config';

export default function MessageLimitBanner() {
  const navigate = useNavigate();
  const { stats, planConfig, messagePercent, isPro, canSendMessage } = usePlan();
  const [dismissed, setDismissed] = useState(false);

  const { messagesPerMonth } = planConfig.limits;

  // Don't show for pro/unlimited users or if dismissed
  if (isPro || messagesPerMonth === null || dismissed) return null;

  // Show at 80% usage
  if (messagePercent < 80) return null;

  const isAtLimit = !canSendMessage();
  const remaining = messagesPerMonth - stats.messagesThisMonth;

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
          <p className="text-red-300 font-medium">
            Batas pesan bulanan tercapai ({formatNumber(messagesPerMonth)} pesan)
          </p>
        ) : (
          <p style={{ color: '#fcd34d' }}>
            Sisa <strong>{remaining}</strong> pesan bulan ini
            <span className="text-white/40 ml-1">({messagePercent}% terpakai)</span>
          </p>
        )}
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
        Upgrade
      </button>

      {!isAtLimit && (
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
