import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Check, Sparkles, ArrowLeft, Crown, Rocket, Zap,
  MessageSquare, Volume2, Upload, Palette, Brain,
  BarChart2, ChevronDown, ChevronUp, ArrowRight, Shield,
  Lock, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import MetaTags from '@/components/MetaTags';
import { TOP_UP_PACKAGES, MAX_TOPUP_MESSAGES } from '@/lib/plan-config';
import { usePlan } from '@/hooks/usePlan';
import { startMidtransCheckout } from '@/lib/midtrans';
import { toast } from 'sonner';

// ─── Data ────────────────────────────────────────────────────────────────────

const PRO_FEATURES = [
  { icon: <MessageSquare className="w-4 h-4" />, label: '1.500 percakapan / bulan', sub: 'Top-up jika habis, sisa tidak hangus' },
  { icon: <Volume2 className="w-4 h-4" />, label: 'OpenAI TTS Premium', sub: 'Suara AI natural & ekspresif' },
  { icon: <Volume2 className="w-4 h-4" />, label: 'VITS Anime TTS', sub: '19 karakter anime Jepang' },
  { icon: <Upload className="w-4 h-4" />, label: 'Upload model VRM sendiri', sub: 'Hingga 5 model custom' },
  { icon: <Palette className="w-4 h-4" />, label: 'Background & animasi custom', sub: '8 default + upload sendiri' },
  { icon: <Brain className="w-4 h-4" />, label: 'AI Enhance Persona', sub: 'Buat karakter lebih hidup' },
  { icon: <BarChart2 className="w-4 h-4" />, label: 'Analytics dasar', sub: 'Pantau penggunaan bulanan' },
];

const COMPARISON_ROWS = [
  { label: 'Percakapan / bulan',  starter: '50',  pro: '1.500 + top-up', highlight: true },
  { label: 'Web Speech TTS',      starter: '✓',   pro: '✓' },
  { label: 'VITS Anime TTS',      starter: '✓',   pro: '✓' },
  { label: 'OpenAI TTS Premium',  starter: '—',   pro: '✓' },
  { label: 'Upload model VRM',    starter: '—',   pro: '✓' },
  { label: 'Background custom',   starter: '—',   pro: '✓' },
  { label: 'AI Enhance Persona',  starter: '—',   pro: '✓' },
  { label: 'Analytics',           starter: '—',   pro: 'Dasar' },
  { label: 'Top-up kuota',        starter: '—',   pro: '✓' },
];

const FAQS = [
  {
    q: 'Apakah ada uji coba gratis?',
    a: 'Ya. Paket Starter sepenuhnya gratis tanpa batas waktu — 50 percakapan per bulan, tidak perlu kartu kredit. Upgrade kapan saja.',
  },
  {
    q: 'Apakah harga sudah termasuk pajak?',
    a: 'Ya. Rp 150.000/bulan sudah all-in termasuk PPN 11% sesuai ketentuan perpajakan Indonesia. Tidak ada biaya tersembunyi saat checkout.',
  },
  {
    q: 'Bagaimana cara kerja top-up kuota?',
    a: 'Jika 1.500 pesan bulananmu habis sebelum akhir bulan, beli paket top-up mulai Rp 15.000. Sisa kuota tidak hangus — terbawa ke bulan berikutnya.',
  },
  {
    q: 'Bagaimana cara upgrade ke Pro?',
    a: 'Klik tombol "Mulai Pro" dan hubungi kami via email di sales@voxie.app. Aktivasi biasanya selesai dalam hitungan jam.',
  },
  {
    q: 'Apakah bisa batal langganan kapan saja?',
    a: 'Bisa. Tidak ada kontrak jangka panjang. Batalkan kapan saja dan akses Pro tetap aktif hingga akhir periode billing berjalan.',
  },
  {
    q: 'Apa itu VITS Anime TTS?',
    a: 'Model AI khusus untuk suara karakter anime Jepang — 19 karakter dari game Uma Musume. Tersedia gratis untuk semua pengguna, termasuk Starter.',
  },
];

// ─── FAQ Item ─────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(v => !v)}
      className="w-full text-left rounded-2xl border border-white/[0.07] px-5 py-4 transition-all hover:border-white/15"
      style={{ background: open ? 'rgba(139,92,246,0.04)' : 'rgba(255,255,255,0.02)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white/90">{q}</p>
        {open
          ? <ChevronUp className="w-4 h-4 text-violet-400 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />}
      </div>
      {open && (
        <p className="text-xs text-white/50 leading-relaxed mt-3 border-t border-white/[0.06] pt-3">
          {a}
        </p>
      )}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro } = useUserRole();
  const { stats, canTopUp } = usePlan();

  const handleUpgrade = () => {
    window.location.href = 'mailto:sales@voxie.app?subject=Upgrade to Pro';
  };

  const handleTopUp = (packageId: string, messages: number) => {
    if (!isPro) return;
    if (!canTopUp(messages)) return;
    window.location.href = `mailto:sales@voxie.app?subject=Top-up ${packageId}`;
  };

  // Sisa ruang top-up yang bisa dibeli
  const topUpHeadroom = stats.topUpHeadroom;
  const isTopUpCapReached = topUpHeadroom === 0;

  return (
    <div className="min-h-screen bg-[#07070f] text-white">
      <MetaTags
        title="Harga"
        description="Mulai gratis, upgrade kapan saja. Pro Rp 150.000/bulan sudah termasuk pajak. Top-up kuota jika habis — sisa tidak hangus."
      />

      {/* ── Navbar ── */}
      <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#07070f]/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <Button
            variant="ghost" size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/8 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <img src="/app logo/voxie logo.png" alt="Voxie" className="h-7 w-auto object-contain" />
          <span className="text-white/20 text-sm">/</span>
          <span className="text-sm text-white/60">Harga</span>
          <div className="ml-auto">
            {!user && (
              <Link to="/auth?tab=signup">
                <Button size="sm" className="h-8 px-4 text-xs bg-violet-600 hover:bg-violet-500 text-white border-0 rounded-xl">
                  Mulai Gratis
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16 space-y-20">

        {/* ── Hero ── */}
        <div className="text-center space-y-5 relative">
          {/* Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-violet-600/8 blur-[100px] pointer-events-none" />

          <div className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/25 bg-violet-500/8 text-violet-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" /> Harga Transparan
          </div>
          <h1 className="relative text-4xl sm:text-6xl font-black tracking-tight leading-tight">
            Sederhana.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-300 to-pink-300">
              Tanpa Kejutan.
            </span>
          </h1>
          <p className="relative text-sm sm:text-base text-white/50 max-w-lg mx-auto leading-relaxed">
            Mulai gratis selamanya. Upgrade ke Pro saat kamu butuh lebih.
            Kuota habis? Top-up — sisa tidak hangus.
          </p>

          {isPro && (
            <div className="relative inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-sm font-semibold">
              <Crown className="w-4 h-4" /> Kamu sudah Pro! Nikmati semua fitur premium.
            </div>
          )}
        </div>

        {/* ── Plan Cards ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-3xl mx-auto">

          {/* Starter */}
          <div
            className="rounded-2xl border border-white/[0.08] p-7 flex flex-col gap-6 hover:border-white/15 transition-all"
            style={{ background: 'linear-gradient(160deg, #111020 0%, #0c0b1a 100%)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-white/60" />
              </div>
              <div>
                <h2 className="font-black text-lg text-white">Starter</h2>
                <p className="text-xs text-white/35">Untuk personal & kreator pemula</p>
              </div>
            </div>

            <div>
              <div className="flex items-end gap-1.5">
                <span className="text-5xl font-black text-white">Gratis</span>
              </div>
              <p className="text-xs text-white/30 mt-1.5">Selamanya — tidak perlu kartu kredit</p>
            </div>

            <ul className="space-y-3 flex-1">
              {[
                '1 Asisten Virtual',
                '50 percakapan / bulan',
                'Web Speech TTS (bawaan browser)',
                'VITS Anime TTS',
                '4 background default',
                'Animasi & ekspresi dasar',
              ].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-white/55">
                  <div className="w-4 h-4 rounded-full bg-white/8 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-white/50" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>

            <Button
              onClick={() => navigate(user ? '/app' : '/auth?tab=signup')}
              disabled={!!user && !isPro}
              className="w-full h-12 text-sm rounded-xl font-semibold bg-white/[0.07] hover:bg-white/12 text-white border border-white/10"
            >
              {user && !isPro ? '✓ Paket Aktif' : 'Mulai Gratis'}
            </Button>
          </div>

          {/* Pro */}
          <div
            className="relative rounded-2xl border border-violet-500/50 p-7 flex flex-col gap-6 shadow-2xl shadow-violet-500/20"
            style={{ background: 'linear-gradient(160deg, #1e1248 0%, #130d35 100%)' }}
          >
            {/* Glow inner */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-violet-500/8 to-transparent pointer-events-none" />

            {/* Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold shadow-lg shadow-violet-500/40 whitespace-nowrap">
              <Sparkles className="w-3 h-3" /> Terpopuler
            </div>

            <div className="relative flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                <Crown className="w-5 h-5 text-violet-300" />
              </div>
              <div>
                <h2 className="font-black text-lg text-white">Pro</h2>
                <p className="text-xs text-white/40">Untuk kreator & pengguna aktif</p>
              </div>
            </div>

            <div className="relative">
              <div className="flex items-end gap-1.5">
                <span className="text-5xl font-black text-white">Rp 150K</span>
                <span className="text-sm text-white/40 mb-2">/ bulan</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <Shield className="w-3 h-3 text-emerald-400" />
                <p className="text-xs text-emerald-400/90 font-medium">
                  Sudah termasuk PPN 11% — tidak ada biaya tambahan
                </p>
              </div>
            </div>

            <ul className="relative space-y-3 flex-1">
              {PRO_FEATURES.map(f => (
                <li key={f.label} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-lg bg-violet-500/20 border border-violet-500/25 flex items-center justify-center shrink-0 mt-0.5 text-violet-400">
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-sm text-white/85 font-medium leading-tight">{f.label}</p>
                    <p className="text-[11px] text-white/35 mt-0.5">{f.sub}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="relative space-y-3">
              <Button
                onClick={isPro ? undefined : handleUpgrade}
                disabled={isPro}
                className="w-full h-12 text-sm rounded-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white border-0 shadow-lg shadow-violet-500/30 gap-2"
              >
                {isPro ? (
                  <><Crown className="w-4 h-4" /> Paket Aktif</>
                ) : (
                  <>Mulai Pro Sekarang <ArrowRight className="w-4 h-4" /></>
                )}
              </Button>
              {!isPro && (
                <p className="text-center text-[11px] text-white/25">
                  Batalkan kapan saja · Tidak ada kontrak
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Top-up Section ── */}
        <div className="space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/6 text-violet-300 text-xs font-medium">
              <Zap className="w-3.5 h-3.5" /> Top-up Kuota
            </div>
            <h2 className="text-2xl sm:text-3xl font-black">Kuota Habis? Isi Ulang Instan</h2>
            <p className="text-sm text-white/40 max-w-sm mx-auto">
              Khusus pengguna Pro. Beli sekali, sisa tidak hangus — terbawa ke bulan berikutnya.
            </p>
          </div>

          {/* Info kebijakan top-up */}
          <div className="max-w-3xl mx-auto rounded-2xl border border-white/[0.07] p-4 flex flex-col sm:flex-row gap-4"
            style={{ background: 'rgba(139,92,246,0.04)' }}>
            <div className="flex items-start gap-3 flex-1">
              <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-white/80">Kebijakan Top-up</p>
                <ul className="text-[11px] text-white/45 space-y-0.5">
                  <li>• Maksimum {MAX_TOPUP_MESSAGES.toLocaleString('id-ID')} pesan top-up tersimpan sekaligus</li>
                  <li>• Sisa top-up <strong className="text-white/60">dibekukan</strong> jika langganan Pro berakhir — tidak hangus</li>
                  <li>• Aktif kembali otomatis saat berlangganan Pro lagi</li>
                </ul>
              </div>
            </div>
            {isPro && (
              <div className="shrink-0 text-right">
                <p className="text-[10px] text-white/30">Sisa ruang top-up</p>
                <p className={`text-lg font-black ${isTopUpCapReached ? 'text-red-400' : 'text-violet-300'}`}>
                  {topUpHeadroom.toLocaleString('id-ID')} pesan
                </p>
                {isTopUpCapReached && (
                  <p className="text-[10px] text-red-400/70">Batas maksimum tercapai</p>
                )}
              </div>
            )}
          </div>

          {/* Non-Pro frozen notice */}
          {!isPro && stats.topUpMessages > 0 && (
            <div className="max-w-3xl mx-auto rounded-2xl border border-amber-500/20 p-4 flex items-center gap-3"
              style={{ background: 'rgba(245,158,11,0.05)' }}>
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-300">
                  {stats.topUpMessages.toLocaleString('id-ID')} pesan top-up sedang dibekukan
                </p>
                <p className="text-[11px] text-white/40 mt-0.5">
                  Aktifkan kembali dengan berlangganan Pro — kuota tidak hangus.
                </p>
              </div>
              <Button
                onClick={handleUpgrade}
                size="sm"
                className="ml-auto shrink-0 h-8 px-4 text-xs bg-violet-600 hover:bg-violet-500 text-white border-0 rounded-xl"
              >
                Aktifkan Pro
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {TOP_UP_PACKAGES.map((pkg) => {
              const isAffordable = canTopUp(pkg.messages);
              const isDisabled = !isPro || !isAffordable;
              return (
                <div
                  key={pkg.id}
                  className={`relative rounded-2xl border flex flex-col p-5 gap-4 transition-all duration-200 ${
                    isDisabled ? 'opacity-60' : 'hover:-translate-y-1'
                  } ${
                    pkg.popular && !isDisabled
                      ? 'border-violet-500/50 shadow-xl shadow-violet-500/15'
                      : 'border-white/[0.08] hover:border-white/15'
                  }`}
                  style={{
                    background: pkg.popular
                      ? 'linear-gradient(160deg, #1a1040 0%, #120d30 100%)'
                      : 'linear-gradient(160deg, #111020 0%, #0c0b1a 100%)',
                  }}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[9px] font-bold whitespace-nowrap shadow-md">
                      ✦ Paling Hemat
                    </div>
                  )}

                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${pkg.popular ? 'text-violet-400' : 'text-white/30'}`}>
                      {pkg.label}
                    </p>
                    <p className="text-2xl font-black text-white mt-1">{pkg.price}</p>
                    <p className={`text-[10px] mt-0.5 ${pkg.popular ? 'text-violet-400/70' : 'text-white/25'}`}>
                      {pkg.perMessage}
                    </p>
                  </div>

                  <ul className="space-y-1.5 flex-1 text-xs">
                    <li className="flex items-center gap-1.5 text-white/65">
                      <Check className={`w-3 h-3 shrink-0 ${pkg.popular ? 'text-violet-400' : 'text-white/30'}`} />
                      +{pkg.messages.toLocaleString('id-ID')} pesan
                    </li>
                    <li className="flex items-center gap-1.5 text-white/65">
                      <Check className={`w-3 h-3 shrink-0 ${pkg.popular ? 'text-violet-400' : 'text-white/30'}`} />
                      +{(pkg.ttsChars / 1000).toFixed(0)}K karakter TTS
                    </li>
                    <li className="flex items-center gap-1.5 text-white/35">
                      <Check className="w-3 h-3 shrink-0 text-white/20" />
                      Tidak hangus
                    </li>
                  </ul>

                  <Button
                    onClick={() => handleTopUp(pkg.id, pkg.messages)}
                    disabled={isDisabled}
                    className={`w-full h-9 text-xs rounded-xl font-semibold transition-all ${
                      pkg.popular && !isDisabled
                        ? 'bg-violet-600 hover:bg-violet-500 text-white border-0 shadow-md shadow-violet-500/25'
                        : 'bg-white/[0.06] hover:bg-white/10 text-white/70 border border-white/10'
                    } disabled:opacity-35 disabled:cursor-not-allowed`}
                  >
                    {!isPro ? 'Perlu Pro' : isTopUpCapReached ? 'Batas Tercapai' : 'Beli Sekarang'}
                  </Button>
                </div>
              );
            })}
          </div>

          {!isPro && (
            <p className="text-center text-xs text-white/25">
              Top-up hanya tersedia untuk pengguna Pro.{' '}
              <button onClick={handleUpgrade} className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                Upgrade sekarang →
              </button>
            </p>
          )}
        </div>

        {/* ── Comparison Table ── */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black">Starter vs Pro</h2>
            <p className="text-sm text-white/35">Lihat semua perbedaannya</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/[0.07] max-w-2xl mx-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(139,92,246,0.07)' }}>
                  <th className="text-left px-5 py-4 text-white/40 font-medium text-xs w-1/2 border-b border-white/[0.07]">Fitur</th>
                  <th className="px-4 py-4 text-center font-bold text-white/50 text-xs border-b border-white/[0.07]">Starter</th>
                  <th className="px-4 py-4 text-center font-bold text-violet-300 text-xs border-b border-white/[0.07]">
                    <span className="inline-flex items-center gap-1"><Crown className="w-3 h-3" /> Pro</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr
                    key={row.label}
                    className={`border-b border-white/[0.04] transition-colors ${
                      row.highlight ? 'bg-violet-500/5' : i % 2 !== 0 ? 'bg-white/[0.012]' : ''
                    }`}
                  >
                    <td className={`px-5 py-3 text-xs ${row.highlight ? 'text-white/80 font-semibold' : 'text-white/50'}`}>
                      {row.label}
                    </td>
                    <td className={`px-4 py-3 text-center text-xs ${
                      row.starter === '✓' ? 'text-white/50' :
                      row.starter === '—' ? 'text-white/15' :
                      'text-white/60'
                    }`}>
                      {row.starter}
                    </td>
                    <td className={`px-4 py-3 text-center text-xs font-semibold ${
                      row.pro === '✓' ? 'text-violet-400' :
                      row.pro === '—' ? 'text-white/15' :
                      'text-violet-300'
                    }`}>
                      {row.pro}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black">Pertanyaan Umum</h2>
            <p className="text-sm text-white/35">Semua yang perlu kamu tahu</p>
          </div>
          <div className="space-y-2">
            {FAQS.map(faq => <FaqItem key={faq.q} {...faq} />)}
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <div
          className="relative rounded-3xl overflow-hidden p-8 sm:p-12 text-center space-y-6"
          style={{ background: 'linear-gradient(135deg, #1e1248 0%, #130d35 50%, #1a0f40 100%)' }}
        >
          {/* Decorative glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-violet-600/15 blur-[80px] pointer-events-none" />
          <div className="absolute inset-0 border border-violet-500/20 rounded-3xl pointer-events-none" />

          <div className="relative space-y-3">
            <p className="text-xs text-violet-400 font-semibold tracking-widest uppercase">Mulai Sekarang</p>
            <h2 className="text-2xl sm:text-4xl font-black leading-tight">
              Siap punya asisten virtual<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-300">
                yang benar-benar hidup?
              </span>
            </h2>
            <p className="text-sm text-white/45 max-w-sm mx-auto">
              Gratis selamanya. Upgrade ke Pro kapan saja. Tidak perlu kartu kredit untuk mulai.
            </p>
          </div>

          <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to={user ? '/app' : '/auth?tab=signup'}>
              <Button className="h-12 px-8 bg-white text-[#07070f] hover:bg-white/90 border-0 rounded-xl font-bold text-sm gap-2 shadow-xl">
                <Sparkles className="w-4 h-4" /> Mulai Gratis Sekarang
              </Button>
            </Link>
            {!isPro && (
              <Button
                onClick={handleUpgrade}
                className="h-12 px-8 bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-500/40 rounded-xl font-semibold text-sm gap-2"
              >
                <Crown className="w-4 h-4" /> Langsung ke Pro
              </Button>
            )}
          </div>

          <p className="relative text-[11px] text-white/20">
            Sudah {'>'}10.000 pengguna aktif · Batalkan kapan saja · Data aman & terenkripsi
          </p>
        </div>

      </div>
    </div>
  );
}
