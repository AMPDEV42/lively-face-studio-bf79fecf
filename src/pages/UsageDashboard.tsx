/**
 * UsageDashboard — Full-page usage & plan overview.
 * Accessible from /usage or via UserMenu.
 */

import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Crown, MessageSquare, Zap, Upload, Image,
  Wand2, BarChart2, Sparkles, CheckCircle2, XCircle,
  RefreshCw, TrendingUp, Lock, Info, ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlan } from '@/hooks/usePlan';
import { useAuth } from '@/hooks/useAuth';
import MetaTags from '@/components/MetaTags';
import {
  formatNumber, getProgressColor, getUsageColor,
  getUsagePercent, PLAN_CONFIGS, MAX_TOPUP_MESSAGES,
} from '@/lib/plan-config';

export default function UsageDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    planConfig, isPro, isAdmin, stats,
    messagePercent, tokenPercent, ttsPercent,
  } = usePlan();

  const { limits } = planConfig;
  const monthLabel = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const hasFrozenTopUp = !isPro && stats.topUpMessages > 0;
  const hasActiveTopUp = isPro && stats.topUpMessages > 0;
  const topUpCapPercent = Math.round((stats.topUpMessages / MAX_TOPUP_MESSAGES) * 100);

  return (
    <div className="min-h-screen bg-[#07070f] text-white">
      <MetaTags title="Penggunaan & Paket" description="Pantau penggunaan token dan pesan bulananmu di Voxie." />

      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#07070f]/90 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}
            className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/8 rounded-xl">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <img src="/app logo/voxie logo.png" alt="Voxie" className="h-7 w-auto object-contain" />
          <span className="text-white/20 text-sm">/</span>
          <span className="text-sm text-white/60">Penggunaan & Paket</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* ── Current Plan Card ── */}
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
                  <span className="flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5"
                    style={{ background: 'rgba(139,92,246,0.25)', border: '1px solid rgba(139,92,246,0.5)', color: '#c084fc' }}>
                    <Crown className="w-2.5 h-2.5" /> Pro
                  </span>
                )}
              </div>
              <p className="text-sm text-white/50">
                {planConfig.price}{planConfig.period && ` ${planConfig.period}`}
                {isPro && <span className="text-emerald-400/70 ml-2 text-xs">· Sudah termasuk pajak</span>}
              </p>
            </div>
            {!isPro && !isAdmin && (
              <Link to="/pricing">
                <Button size="sm" className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5 border-0 shrink-0"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 4px 16px rgba(139,92,246,0.35)' }}>
                  <Sparkles className="w-3.5 h-3.5" /> Upgrade Pro
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* ── Frozen Top-up Alert ── */}
        {hasFrozenTopUp && (
          <div className="rounded-2xl border border-amber-500/25 p-4 flex items-start gap-3"
            style={{ background: 'rgba(245,158,11,0.06)' }}>
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-amber-300">
                {stats.topUpMessages.toLocaleString('id-ID')} pesan top-up sedang dibekukan
              </p>
              <p className="text-xs text-white/40">
                Top-up tidak hangus — akan aktif kembali otomatis saat kamu berlangganan Pro lagi.
              </p>
            </div>
            <Link to="/pricing">
              <Button size="sm" className="h-8 px-3 text-xs bg-violet-600 hover:bg-violet-500 text-white border-0 rounded-xl shrink-0">
                Aktifkan Pro
              </Button>
            </Link>
          </div>
        )}

        {/* ── Monthly Usage ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white/80">Penggunaan Bulan Ini</h3>
            <span className="text-xs text-white/30">{monthLabel}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Messages */}
            <div className="rounded-xl p-4 space-y-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <MessageSquare className="w-3.5 h-3.5 text-violet-400/70" />
                  Pesan
                </div>
                {messagePercent >= 80 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    messagePercent >= 100
                      ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                      : 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
                  }`}>
                    {messagePercent >= 100 ? 'HABIS' : 'HAMPIR HABIS'}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-end gap-1">
                  <span className={`text-2xl font-black tabular-nums ${getUsageColor(messagePercent)}`}>
                    {formatNumber(stats.messagesThisMonth)}
                  </span>
                  <span className="text-xs text-white/30 mb-0.5">
                    / {formatNumber(stats.totalMessageQuota ?? limits.messagesPerMonth)} pesan
                  </span>
                </div>
                {hasActiveTopUp && (
                  <p className="text-[10px] text-violet-400/70 mt-0.5">
                    Termasuk {stats.topUpMessages.toLocaleString('id-ID')} pesan top-up
                  </p>
                )}
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(messagePercent)} transition-all duration-700`}
                  style={{ width: `${Math.max(messagePercent, 1)}%` }} />
              </div>
            </div>

            {/* Tokens */}
            <UsageCard
              icon={<Zap className="w-3.5 h-3.5" />}
              label="Token AI"
              used={stats.tokensThisMonth}
              limit={limits.tokensPerMonth}
              percent={tokenPercent}
              suffix="token"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-white/25">
            <RefreshCw className="w-3 h-3" />
            Penggunaan bulanan direset setiap awal bulan
          </div>
        </section>

        {/* ── Top-up Status (Pro only) ── */}
        {isPro && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white/80">Status Top-up</h3>
              <Link to="/pricing#topup" className="text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2">
                Beli top-up →
              </Link>
            </div>
            <div className="rounded-xl p-4 space-y-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Zap className="w-3.5 h-3.5 text-violet-400/70" />
                  Saldo top-up tersimpan
                </div>
                <div className="flex items-center gap-1.5">
                  <Info className="w-3 h-3 text-white/25" />
                  <span className="text-[10px] text-white/25">Maks. {MAX_TOPUP_MESSAGES.toLocaleString('id-ID')} pesan</span>
                </div>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-black tabular-nums text-violet-300">
                  {stats.topUpMessages.toLocaleString('id-ID')}
                </span>
                <span className="text-xs text-white/30 mb-0.5">
                  / {MAX_TOPUP_MESSAGES.toLocaleString('id-ID')} pesan
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-500 transition-all duration-700"
                  style={{ width: `${Math.max(topUpCapPercent, 1)}%` }} />
              </div>
              <p className="text-[10px] text-white/30">
                Sisa ruang: <span className="text-white/50 font-medium">{stats.topUpHeadroom.toLocaleString('id-ID')} pesan</span>
                {' '}· Tidak hangus saat bulan berganti
              </p>
            </div>
          </section>
        )}

        {/* ── Upload Quotas ── */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-white/80">Kuota Upload</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <QuotaCard icon={<Upload className="w-4 h-4" />} label="Model VRM"
              used={stats.vrmUploads} limit={limits.maxVrmUploads} />
            <QuotaCard icon={<Wand2 className="w-4 h-4" />} label="Animasi VRMA"
              used={stats.vrmaUploads} limit={limits.maxVrmaUploads} />
            <QuotaCard icon={<Image className="w-4 h-4" />} label="Background"
              used={stats.backgroundUploads} limit={limits.maxBackgroundUploads} />
          </div>
        </section>

        {/* ── Feature Access ── */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-white/80">Akses Fitur</h3>
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            {FEATURE_ROWS.map((row, i) => {
              const val = limits[row.key as keyof typeof limits];
              const enabled = val === true || val === 'basic' || val === 'full'
                || (typeof val === 'number' && val > 0) || val === null;
              return (
                <div key={row.label}
                  className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-white/[0.04]' : ''}`}
                  style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
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

        {/* ── Security Notice (frontend-only tracking) ── */}
        <div className="rounded-xl border border-white/[0.05] p-3 flex items-start gap-2.5"
          style={{ background: 'rgba(255,255,255,0.015)' }}>
          <ShieldAlert className="w-3.5 h-3.5 text-white/20 shrink-0 mt-0.5" />
          <p className="text-[10px] text-white/25 leading-relaxed">
            Penggunaan saat ini dilacak di perangkatmu. Backend enforcement akan segera diaktifkan untuk keamanan penuh.
          </p>
        </div>

        {/* ── Upgrade CTA for free users ── */}
        {!isPro && !isAdmin && (
          <div className="rounded-2xl p-5 text-center space-y-4"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(88,28,135,0.08) 100%)',
              border: '1px solid rgba(139,92,246,0.2)',
            }}>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white/90">Butuh lebih banyak?</p>
              <p className="text-xs text-white/40">
                Upgrade ke Pro — 1.500 pesan/bulan, TTS premium, upload VRM, dan top-up jika habis.
              </p>
            </div>
            <Link to="/pricing">
              <Button className="h-10 px-6 rounded-xl text-sm font-bold gap-2 border-0"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 4px 16px rgba(139,92,246,0.35)' }}>
                <Crown className="w-4 h-4" />
                Lihat Paket Pro — Rp 150.000/bln
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
    <div className="rounded-xl p-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
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
          <div className={`h-full rounded-full bg-gradient-to-r ${progressColor} transition-all duration-700`}
            style={{ width: `${Math.max(percent, 1)}%` }} />
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
}

function QuotaCard({ icon, label, used, limit }: QuotaCardProps) {
  const percent = getUsagePercent(used, limit);
  const progressColor = getProgressColor(percent);
  const isLocked = limit === 0;

  return (
    <div className="rounded-xl p-4 space-y-2.5"
      style={{
        background: isLocked ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isLocked ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)'}`,
      }}>
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
            <div className={`h-full rounded-full bg-gradient-to-r ${progressColor} transition-all duration-700`}
              style={{ width: `${Math.max(percent, 1)}%` }} />
          </div>
        </>
      )}
    </div>
  );
}

const FEATURE_ROWS = [
  { key: 'premiumTTS',        label: 'OpenAI TTS Premium',  icon: <Zap className="w-3.5 h-3.5" /> },
  { key: 'vitsTTS',           label: 'VITS Anime TTS',       icon: <Zap className="w-3.5 h-3.5" /> },
  { key: 'customBackgrounds', label: 'Background Custom',    icon: <Image className="w-3.5 h-3.5" /> },
  { key: 'aiEnhancePersona',  label: 'AI Enhance Persona',   icon: <Sparkles className="w-3.5 h-3.5" /> },
  { key: 'analytics',         label: 'Analytics',            icon: <BarChart2 className="w-3.5 h-3.5" /> },
  { key: 'prioritySupport',   label: 'Priority Support',     icon: <Crown className="w-3.5 h-3.5" /> },
  { key: 'customApi',         label: 'Custom API',           icon: <TrendingUp className="w-3.5 h-3.5" /> },
];
