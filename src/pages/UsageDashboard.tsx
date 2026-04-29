/**
 * UsageDashboard — Full-page usage & plan overview.
 * Accessible from /usage or via UserMenu.
 */

import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Crown,
  MessageSquare,
  Zap,
  Upload,
  Image,
  Wand2,
  BarChart2,
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlan } from '@/hooks/usePlan';
import { useAuth } from '@/hooks/useAuth';
import MetaTags from '@/components/MetaTags';
import {
  formatNumber,
  getProgressColor,
  getUsageColor,
  getUsagePercent,
  PLAN_CONFIGS,
} from '@/lib/plan-config';

export default function UsageDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    planId,
    planConfig,
    isPro,
    isAdmin,
    stats,
    messagePercent,
    tokenPercent,
  } = usePlan();

  const { limits } = planConfig;

  // Get current month label
  const monthLabel = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#07070f] text-white">
      <MetaTags title="Penggunaan & Paket" description="Pantau penggunaan token dan pesan bulananmu di Voxie." />

      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#07070f]/90 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/8 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <img src="/app logo/voxie logo.png" alt="Voxie" className="h-7 w-auto object-contain" />
          </div>
          <span className="text-white/20 text-sm">/</span>
          <span className="text-sm text-white/60">Penggunaan & Paket</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Current Plan Card */}
        <div
          className="rounded-2xl p-5 border"
          style={{
            background: isPro
              ? 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(88,28,135,0.1) 100%)'
              : 'rgba(255,255,255,0.03)',
            borderColor: isPro ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.07)',
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Paket Aktif</p>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-white">{planConfig.name}</h2>
                {isPro && (
                  <span
                    className="flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5"
                    style={{ background: 'rgba(139,92,246,0.25)', border: '1px solid rgba(139,92,246,0.5)', color: '#c084fc' }}
                  >
                    <Crown className="w-2.5 h-2.5" /> Pro
                  </span>
                )}
              </div>
              <p className="text-sm text-white/50">
                {planConfig.price}{planConfig.period && ` ${planConfig.period}`}
              </p>
            </div>

            {!isPro && !isAdmin && (
              <Link to="/pricing">
                <Button
                  size="sm"
                  className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5 border-0 shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                    boxShadow: '0 4px 16px rgba(139,92,246,0.35)',
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Upgrade Pro
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Monthly Usage */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white/80">Penggunaan Bulan Ini</h3>
            <span className="text-xs text-white/30">{monthLabel}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UsageCard
              icon={<MessageSquare className="w-4 h-4" />}
              label="Pesan"
              used={stats.messagesThisMonth}
              limit={limits.messagesPerMonth}
              percent={messagePercent}
              suffix="pesan"
            />
            <UsageCard
              icon={<Zap className="w-4 h-4" />}
              label="Token AI"
              used={stats.tokensThisMonth}
              limit={limits.tokensPerMonth}
              percent={tokenPercent}
              suffix="token"
            />
          </div>

          {/* Reset info */}
          <div className="flex items-center gap-2 text-xs text-white/25">
            <RefreshCw className="w-3 h-3" />
            Penggunaan direset setiap awal bulan
          </div>
        </section>

        {/* Upload Quotas */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-white/80">Kuota Upload</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <QuotaCard
              icon={<Upload className="w-4 h-4" />}
              label="Model VRM"
              used={stats.vrmUploads}
              limit={limits.maxVrmUploads}
              isPro={isPro}
            />
            <QuotaCard
              icon={<Wand2 className="w-4 h-4" />}
              label="Animasi VRMA"
              used={stats.vrmaUploads}
              limit={limits.maxVrmaUploads}
              isPro={isPro}
            />
            <QuotaCard
              icon={<Image className="w-4 h-4" />}
              label="Background"
              used={stats.backgroundUploads}
              limit={limits.maxBackgroundUploads}
              isPro={isPro}
            />
          </div>
        </section>

        {/* Feature Access */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-white/80">Akses Fitur</h3>
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}
          >
            {FEATURE_ROWS.map((row, i) => {
              const val = limits[row.key as keyof typeof limits];
              const enabled = val === true || val === 'basic' || val === 'full' || (typeof val === 'number' && val > 0) || val === null;
              return (
                <div
                  key={row.label}
                  className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-white/[0.04]' : ''}`}
                  style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                >
                  <div className="flex items-center gap-2.5 text-sm text-white/70">
                    <span className="text-violet-400/60">{row.icon}</span>
                    {row.label}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {enabled ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs text-emerald-400/80 font-medium">
                          {val === 'basic' ? 'Dasar' : val === 'full' ? 'Lengkap' : 'Aktif'}
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-white/20" />
                        <span className="text-xs text-white/25">Tidak tersedia</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Upgrade CTA for free users */}
        {!isPro && !isAdmin && (
          <div
            className="rounded-2xl p-5 text-center space-y-4"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(88,28,135,0.08) 100%)',
              border: '1px solid rgba(139,92,246,0.2)',
            }}
          >
            <div className="space-y-1">
              <p className="text-sm font-bold text-white/90">Butuh lebih banyak?</p>
              <p className="text-xs text-white/40">
                Upgrade ke Pro dan dapatkan 10.000 pesan, TTS premium, dan lebih banyak lagi.
              </p>
            </div>
            <Link to="/pricing">
              <Button
                className="h-10 px-6 rounded-xl text-sm font-bold gap-2 border-0"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                  boxShadow: '0 4px 16px rgba(139,92,246,0.35)',
                }}
              >
                <Crown className="w-4 h-4" />
                Lihat Paket Pro — Rp 79.000/bln
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface UsageCardProps {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number | null;
  percent: number;
  suffix: string;
}

function UsageCard({ icon, label, used, limit, percent, suffix }: UsageCardProps) {
  const isUnlimited = limit === null;
  const colorClass = getUsageColor(percent);
  const progressColor = getProgressColor(percent);

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-white/50">
          <span className="text-violet-400/70">{icon}</span>
          {label}
        </div>
        {!isUnlimited && percent >= 80 && (
          <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full">
            {percent >= 100 ? 'Habis' : 'Hampir habis'}
          </span>
        )}
      </div>

      <div>
        <div className="flex items-end gap-1">
          <span className={`text-2xl font-black tabular-nums ${isUnlimited ? 'text-violet-400' : colorClass}`}>
            {formatNumber(used)}
          </span>
          <span className="text-xs text-white/30 mb-0.5">
            / {formatNumber(limit)} {suffix}
          </span>
        </div>
      </div>

      {!isUnlimited ? (
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className={`h-full rounded-full bg-gradient-to-r ${progressColor} transition-all duration-700`}
            style={{ width: `${Math.max(percent, 1)}%` }}
          />
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-violet-400/70">
          <TrendingUp className="w-3 h-3" />
          Unlimited
        </div>
      )}
    </div>
  );
}

interface QuotaCardProps {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number;
  isPro: boolean;
}

function QuotaCard({ icon, label, used, limit, isPro }: QuotaCardProps) {
  const percent = getUsagePercent(used, limit);
  const progressColor = getProgressColor(percent);
  const isLocked = limit === 0;

  return (
    <div
      className="rounded-xl p-4 space-y-2.5"
      style={{
        background: isLocked ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isLocked ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      <div className="flex items-center gap-2 text-xs text-white/50">
        <span className={isLocked ? 'text-white/20' : 'text-violet-400/70'}>{icon}</span>
        {label}
      </div>

      {isLocked ? (
        <div className="space-y-1">
          <p className="text-sm font-bold text-white/20">Terkunci</p>
          <p className="text-[10px] text-violet-400/60">Butuh Pro</p>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-1">
            <span className="text-xl font-black tabular-nums text-white/80">{used}</span>
            <span className="text-xs text-white/30 mb-0.5">/ {limit}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className={`h-full rounded-full bg-gradient-to-r ${progressColor} transition-all duration-700`}
              style={{ width: `${Math.max(percent, 1)}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Feature rows config ──────────────────────────────────────────────────────

const FEATURE_ROWS = [
  { key: 'elevenLabsTTS', label: 'ElevenLabs TTS', icon: <Zap className="w-3.5 h-3.5" /> },
  { key: 'vitsTTS', label: 'VITS Anime TTS', icon: <Zap className="w-3.5 h-3.5" /> },
  { key: 'customBackgrounds', label: 'Background Custom', icon: <Image className="w-3.5 h-3.5" /> },
  { key: 'aiEnhancePersona', label: 'AI Enhance Persona', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { key: 'analytics', label: 'Analytics', icon: <BarChart2 className="w-3.5 h-3.5" /> },
  { key: 'prioritySupport', label: 'Priority Support', icon: <Crown className="w-3.5 h-3.5" /> },
  { key: 'customApi', label: 'Custom API', icon: <TrendingUp className="w-3.5 h-3.5" /> },
];
