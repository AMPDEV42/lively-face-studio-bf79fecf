import { useNavigate, Link } from 'react-router-dom';
import { Check, Sparkles, ArrowLeft, Zap, Crown, Building2, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    icon: <Rocket className="w-5 h-5 text-violet-400" />,
    price: 'Gratis',
    period: '',
    desc: 'Untuk personal & kreator pemula',
    features: [
      '1 Asisten Virtual',
      '100 percakapan / bulan',
      'Web Speech TTS',
      '4 background default',
      'Animasi dasar',
    ],
    cta: 'Mulai Gratis',
    highlight: false,
    badge: null,
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: <Crown className="w-5 h-5 text-violet-300" />,
    price: 'Rp 79.000',
    period: '/ bulan',
    desc: 'Untuk kreator & bisnis kecil',
    features: [
      '1 Asisten Virtual',
      '10.000 percakapan / bulan',
      'ElevenLabs TTS (suara premium)',
      'VITS Anime TTS',
      '8 background + upload custom',
      'Semua animasi & ekspresi',
      'AI Enhance Persona',
      'Analytics dasar',
    ],
    cta: 'Mulai Pro',
    highlight: true,
    badge: '✦ Terpopuler',
  },
  {
    id: 'business',
    name: 'Business',
    icon: <Building2 className="w-5 h-5 text-violet-400" />,
    price: 'Rp 299.000',
    period: '/ bulan',
    desc: 'Untuk tim & bisnis berkembang',
    features: [
      '3 Asisten Virtual',
      '50.000 percakapan / bulan',
      'Semua fitur Pro',
      'Analytics lengkap',
      'Priority support',
      'Custom persona lanjutan',
    ],
    cta: 'Mulai Business',
    highlight: false,
    badge: null,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: <Zap className="w-5 h-5 text-violet-400" />,
    price: 'Custom',
    period: '',
    desc: 'Untuk perusahaan besar',
    features: [
      'Asisten Virtual unlimited',
      'Percakapan unlimited',
      'Custom integrasi API',
      'Dedicated support',
      'SLA tinggi',
      'On-premise tersedia',
    ],
    cta: 'Hubungi Sales',
    highlight: false,
    badge: null,
  },
];

const FAQS = [
  { q: 'Apakah ada uji coba gratis?', a: 'Ya, paket Starter sepenuhnya gratis tanpa batas waktu. Kamu bisa upgrade kapan saja.' },
  { q: 'Bagaimana cara upgrade ke Pro?', a: 'Saat ini upgrade dilakukan manual. Hubungi kami via email atau tombol Hubungi Sales untuk proses aktivasi.' },
  { q: 'Apakah bisa downgrade?', a: 'Bisa. Downgrade berlaku di akhir periode billing berjalan.' },
  { q: 'Apa itu ElevenLabs TTS?', a: 'ElevenLabs adalah layanan text-to-speech AI berkualitas tinggi dengan suara yang sangat natural dan ekspresif, tersedia di paket Pro ke atas.' },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro } = useUserRole();

  const handleCTA = (planId: string) => {
    if (planId === 'starter') {
      navigate(user ? '/app' : '/auth?tab=signup');
    } else if (planId === 'enterprise') {
      window.location.href = 'mailto:sales@voxie.app?subject=Enterprise Inquiry';
    } else {
      // Pro / Business — arahkan ke kontak / payment
      window.location.href = 'mailto:sales@voxie.app?subject=Upgrade to ' + planId;
    }
  };

  return (
    <div className="min-h-screen bg-[#07070f] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#07070f]/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/8 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <span className="text-white font-black text-xs">V</span>
            </div>
            <span className="text-sm font-bold text-white">Voxie</span>
          </div>
          <span className="text-white/20 text-sm">/</span>
          <span className="text-sm text-white/60">Harga</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16 space-y-16">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/25 bg-violet-500/8 text-violet-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" /> Pilih Paket
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
            Harga yang <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-300">Transparan</span>
          </h1>
          <p className="text-sm text-white/50 max-w-md mx-auto">
            Mulai gratis, upgrade kapan saja. Tidak ada biaya tersembunyi.
          </p>
          {isPro && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-sm font-semibold">
              <Crown className="w-4 h-4" /> Kamu sudah Pro!
            </div>
          )}
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border flex flex-col p-5 gap-5 transition-all duration-300 ${
                plan.highlight
                  ? 'border-violet-500/50 shadow-2xl shadow-violet-500/15'
                  : 'border-white/[0.07] hover:border-white/15'
              }`}
              style={{
                background: plan.highlight
                  ? 'linear-gradient(160deg, #1a1040 0%, #120d30 100%)'
                  : 'linear-gradient(160deg, #111020 0%, #0c0b1a 100%)',
              }}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[10px] font-bold shadow-lg shadow-violet-500/30 whitespace-nowrap">
                  {plan.badge}
                </div>
              )}

              {/* Plan header */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/12 border border-violet-500/20 flex items-center justify-center">
                    {plan.icon}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white">{plan.name}</h3>
                    <p className="text-[10px] text-white/35">{plan.desc}</p>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-end gap-1">
                <span className="text-2xl font-black text-white">{plan.price}</span>
                {plan.period && <span className="text-xs text-white/35 mb-0.5">{plan.period}</span>}
              </div>

              {/* Features */}
              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-white/60">
                    <Check className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                onClick={() => handleCTA(plan.id)}
                disabled={plan.id === 'pro' && isPro}
                className={`w-full h-10 text-xs rounded-xl font-semibold ${
                  plan.highlight
                    ? 'bg-violet-600 hover:bg-violet-500 text-white border-0 shadow-lg shadow-violet-500/25'
                    : 'bg-white/[0.07] hover:bg-white/12 text-white border border-white/10'
                }`}
              >
                {plan.id === 'pro' && isPro ? '✓ Paket Aktif' : plan.cta}
              </Button>
            </div>
          ))}
        </div>

        {/* Comparison table — mobile friendly */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-center">Perbandingan Fitur</h2>
          <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.07]" style={{ background: 'rgba(139,92,246,0.06)' }}>
                  <th className="text-left px-4 py-3 text-white/50 font-medium w-1/3">Fitur</th>
                  {PLANS.map((p) => (
                    <th key={p.id} className={`px-3 py-3 text-center font-bold ${p.highlight ? 'text-violet-300' : 'text-white/70'}`}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Asisten Virtual', values: ['1', '1', '3', '∞'] },
                  { label: 'Percakapan / bulan', values: ['100', '10.000', '50.000', '∞'] },
                  { label: 'Web Speech TTS', values: ['✓', '✓', '✓', '✓'] },
                  { label: 'ElevenLabs TTS', values: ['—', '✓', '✓', '✓'] },
                  { label: 'VITS Anime TTS', values: ['—', '✓', '✓', '✓'] },
                  { label: 'Background custom', values: ['—', '✓', '✓', '✓'] },
                  { label: 'AI Enhance Persona', values: ['—', '✓', '✓', '✓'] },
                  { label: 'Analytics', values: ['—', 'Dasar', 'Lengkap', 'Lengkap'] },
                  { label: 'Priority Support', values: ['—', '—', '✓', '✓'] },
                  { label: 'Custom API', values: ['—', '—', '—', '✓'] },
                ].map((row, i) => (
                  <tr key={row.label} className={`border-b border-white/[0.04] ${i % 2 === 0 ? '' : 'bg-white/[0.015]'}`}>
                    <td className="px-4 py-2.5 text-white/60">{row.label}</td>
                    {row.values.map((v, j) => (
                      <td key={j} className={`px-3 py-2.5 text-center ${
                        v === '✓' ? 'text-violet-400' : v === '—' ? 'text-white/20' : 'text-white/70'
                      } ${PLANS[j].highlight ? 'font-semibold' : ''}`}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="text-xl font-black text-center">Pertanyaan Umum</h2>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-white/[0.07] p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p className="text-sm font-semibold text-white/90 mb-1.5">{faq.q}</p>
                <p className="text-xs text-white/50 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center space-y-4 py-4">
          <p className="text-white/40 text-sm">Masih ragu? Mulai gratis dulu, tidak perlu kartu kredit.</p>
          <Link to={user ? '/app' : '/auth?tab=signup'}>
            <Button className="h-11 px-8 bg-violet-600 hover:bg-violet-500 text-white border-0 rounded-xl shadow-lg shadow-violet-500/25 font-semibold gap-2">
              <Sparkles className="w-4 h-4" /> Mulai Gratis Sekarang
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
