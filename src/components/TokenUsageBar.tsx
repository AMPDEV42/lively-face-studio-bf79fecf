/**
 * TokenUsageBar — Compact usage progress bar for messages & tokens.
 * Used in UserMenu, sidebar, and the UsageDashboard.
 */

import { MessageSquare, Zap, TrendingUp } from 'lucide-react';
import { usePlan } from '@/hooks/usePlan';
import {
  formatNumber,
  getProgressColor,
  getUsageColor,
} from '@/lib/plan-config';

interface TokenUsageBarProps {
  /** 'compact' = single line, 'full' = two rows with labels */
  variant?: 'compact' | 'full';
  className?: string;
}

export default function TokenUsageBar({ variant = 'full', className = '' }: TokenUsageBarProps) {
  const { stats, planConfig, messagePercent, tokenPercent, isPro } = usePlan();
  const { limits } = planConfig;

  if (variant === 'compact') {
    return (
      <div className={`space-y-1.5 ${className}`}>
        {/* Messages */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40 flex items-center gap-1">
              <MessageSquare className="w-2.5 h-2.5" />
              Pesan
            </span>
            <span className={`text-[10px] font-semibold tabular-nums ${getUsageColor(messagePercent)}`}>
              {formatNumber(stats.messagesThisMonth)} / {formatNumber(limits.messagesPerMonth)}
            </span>
          </div>
          <ProgressBar percent={messagePercent} />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Messages row */}
      <UsageRow
        icon={<MessageSquare className="w-3.5 h-3.5" />}
        label="Pesan bulan ini"
        used={stats.messagesThisMonth}
        limit={limits.messagesPerMonth}
        percent={messagePercent}
      />

      {/* Tokens row */}
      <UsageRow
        icon={<Zap className="w-3.5 h-3.5" />}
        label="Token AI"
        used={stats.tokensThisMonth}
        limit={limits.tokensPerMonth}
        percent={tokenPercent}
      />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ percent }: { percent: number }) {
  const color = getProgressColor(percent);
  return (
    <div
      className="h-1.5 rounded-full overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.06)' }}
    >
      <div
        className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-500`}
        style={{ width: `${Math.max(percent, 2)}%` }}
      />
    </div>
  );
}

interface UsageRowProps {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number | null;
  percent: number;
}

function UsageRow({ icon, label, used, limit, percent }: UsageRowProps) {
  const isUnlimited = limit === null;
  const colorClass = getUsageColor(percent);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-white/50 text-xs">
          <span className="text-violet-400/70">{icon}</span>
          {label}
        </div>
        <span className={`text-xs font-semibold tabular-nums ${isUnlimited ? 'text-violet-400' : colorClass}`}>
          {isUnlimited ? (
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {formatNumber(used)} / ∞
            </span>
          ) : (
            `${formatNumber(used)} / ${formatNumber(limit)}`
          )}
        </span>
      </div>
      {!isUnlimited && <ProgressBar percent={percent} />}
      {isUnlimited && (
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(139,92,246,0.15)' }}>
          <div className="h-full w-full rounded-full bg-gradient-to-r from-violet-600/40 to-purple-500/40" />
        </div>
      )}
    </div>
  );
}
