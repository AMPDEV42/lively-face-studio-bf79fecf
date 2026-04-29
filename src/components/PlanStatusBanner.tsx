/**
 * PlanStatusBanner — Compact inline banner showing current plan + usage.
 * Used at the top of Settings, Profile, and other pages.
 */

import { Link } from 'react-router-dom';
import { Crown, Sparkles, BarChart2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlan } from '@/hooks/usePlan';
import { formatNumber, getProgressColor, getUsagePercent } from '@/lib/plan-config';

interface PlanStatusBannerProps {
  className?: string;
}

export default function PlanStatusBanner({ className = '' }: PlanStatusBannerProps) {
  const { planConfig, isPro, isAdmin, stats, messagePercent } = usePlan();
  const { limits } = planConfig;

  const isNearLimit = messagePercent >= 80;
  const isAtLimit = messagePercent >= 100;

  return (
    <div
      className={`rounded-2xl p-4 ${className}`}
      style={{
        background: isPro
          ? 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(88,28,135,0.08) 100%)'
          : isNearLimit
          ? 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(217,119,6,0.05) 100%)'
          : 'rgba(255,255,255,0.025)',
        border: `1px solid ${
          isPro
            ? 'rgba(139,92,246,0.25)'
            : isNearLimit
            ? 'rgba(245,158,11,0.25)'
            : 'rgba(255,255,255,0.07)'
        }`,
      }}
    >
      <div className="flex items-center gap-3">
        {/* Plan icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: isPro ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${isPro ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          {isPro ? (
            <Crown className="w-4 h-4 text-violet-400" />
          ) : (
            <Zap className="w-4 h-4 text-white/40" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white/70">
              {planConfig.name}
            </span>
            {isPro && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(139,92,246,0.25)', border: '1px solid rgba(139,92,246,0.4)', color: '#c084fc' }}
              >
                AKTIF
              </span>
            )}
            {isAtLimit && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400">
                LIMIT
              </span>
            )}
            {isNearLimit && !isAtLimit && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400">
                HAMPIR HABIS
              </span>
            )}
          </div>

          {/* Message usage bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/35">
                {formatNumber(stats.messagesThisMonth)} / {formatNumber(limits.messagesPerMonth)} pesan bulan ini
              </span>
              <span className="text-[10px] text-white/25">{messagePercent}%</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(messagePercent)} transition-all duration-500`}
                style={{ width: `${Math.max(messagePercent, 1)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <Link to="/usage">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-full text-[10px] gap-1 text-white/35 hover:text-white/60 px-2"
            >
              <BarChart2 className="w-3 h-3" />
              Detail
            </Button>
          </Link>
          {!isPro && (
            <Link to="/pricing">
              <Button
                size="sm"
                className="h-7 w-full text-[10px] gap-1 border-0 px-2"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}
              >
                <Sparkles className="w-3 h-3" />
                Upgrade
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
