import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Play, Upload, MessageSquare, Volume2, Box,
  Check, Sparkles, Star, Smile, Activity, Mic,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// ── Brand logo ────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
        <span className="text-white font-bold text-sm">V</span>
      </div>
      <div className="leading-none">
        <span className="text-white font-bold text-lg tracking-tight">Voxie</span>
        <span className="block text-[9px] text-violet-400 font-medium tracking-widest">ボクシー</span>
      </div>
    </div>
  );
}

// ── Fake chat bubble ──────────────────────────────────────────────────────────
function ChatBubble({ from, text, audio }: { from: 'ai' | 'user'; text: string; audio?: string }) {
  return (
    <div className={`flex gap-2 ${from === 'user' ? 'flex-row-reverse' : ''}`}>
      {from === 'ai' && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0 text-white text-[10px] font-bold">V</div>
      )}
      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs ${
        from === 'ai'
          ? 'bg-white/8 border border-white/10 text-white rounded-tl-sm'
          : 'bg-violet-600/70 text-white rounded-tr-sm'
      }`}>
        {from === 'ai' && <p className="text-[10px] text-violet-300 font-semibold mb-0.5">Voxie</p>}
        <p className="leading-relaxed">{text}</p>
        {audio && (
          <div className="flex items-center gap-1.5 mt-1.5 bg-white/10 rounded-lg px-2 py-1">
            <div className="flex gap-0.5 items-end h-3">
              {[3,5,4,6,3,5,4,3,5,6,4,3].map((h, i) => (
                <div key={i} className="w-0.5 bg-violet-400 rounded-full" style={{ height: `${h * 2}px` }} />
              ))}
            </div>
            <span className="text-[10px] text-violet-300 ml-1">{audio}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Landing() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white overflow-x-hidden">

      {/* ── Navbar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3.5 border-b border-white/5 bg-[#0a0a14]/80 backdrop-blur-xl">
        <Logo />
        <nav className="hidden md:flex items-center gap-6 text-sm text-white/60">
          {['Beranda','Fitur','Galeri','Harga','Dokumentasi'].map(n => (
            <a key={n} href="#" className="hover:text-white transition-colors">{n}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="h-8 text-xs text-white/70 hover:text-white hover:bg-white/10">
              Masuk
            </Button>
          </Link>
          <Link to={user ? '/app' : '/auth?tab=signup'}>
            <Button size="sm" className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white border-0 shadow-lg shadow-violet-500/30">
              Mulai Gratis
            </Button>
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative w-full overflow-hidden" style={{ paddingTop: '56.25%' /* 16:9 ratio */ }}>
        {/* Full-width background image */}
        <img
          src="/voxie-hero.png"
          alt="Voxie — Asisten Virtual 3D"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Dark overlay — stronger at edges, lighter in center */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a14]/90 via-[#0a0a14]/20 to-[#0a0a14]/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a14] via-transparent to-[#0a0a14]/70" />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: 'linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        {/* Content */}
        <div className="absolute inset-0 flex items-end pb-12 pt-20">
          <div className="w-full max-w-7xl mx-auto px-6 flex items-end justify-between gap-8">

            {/* Left — text */}
            <div className="space-y-5 max-w-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 backdrop-blur text-violet-300 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                AI + 3D + REAL-TIME
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight drop-shadow-lg">
                Asisten Virtual<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-300">
                  3D Interaktif
                </span>
              </h1>

              <p className="text-sm text-white/70 leading-relaxed max-w-sm drop-shadow">
                Upload model VRM 3D pilihanmu, lalu chat dan berinteraksi secara real-time dengan asisten AI yang merespons dengan suara dan ekspresi wajah.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Link to={user ? '/app' : '/auth?tab=signup'}>
                  <Button size="lg" className="gap-2 h-11 px-6 bg-violet-600 hover:bg-violet-500 text-white border-0 shadow-xl shadow-violet-500/40 text-sm">
                    Mulai Sekarang <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="gap-2 h-11 px-5 border-white/20 bg-black/30 hover:bg-black/50 backdrop-blur text-white text-sm">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                    <Play className="w-2.5 h-2.5 fill-white" />
                  </div>
                  Lihat Demo
                </Button>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {['bg-violet-500','bg-purple-600','bg-indigo-500','bg-pink-500'].map((c, i) => (
                    <div key={i} className={`w-7 h-7 rounded-full ${c} border-2 border-[#0a0a14] flex items-center justify-center text-[9px] font-bold`}>
                      {['A','B','C','D'][i]}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-white/50">
                  <span className="text-white font-semibold">10.000+</span> pengguna aktif ✦
                </p>
              </div>
            </div>

            {/* Right — chat panel */}
            <div className="hidden lg:block w-56 shrink-0 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl overflow-hidden mb-2">
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/8">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-[10px] font-bold">V</div>
                <div>
                  <p className="text-xs font-semibold">Voxie</p>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-[9px] text-green-400">Online</span>
                  </div>
                </div>
              </div>
              <div className="p-3 space-y-2.5">
                <ChatBubble from="ai" text="Ada yang bisa Voxie bantu hari ini?" audio="0:03" />
                <ChatBubble from="user" text="Bisa temeni aku belajar Bahasa Jepang?" />
                <ChatBubble from="ai" text="Tentu! ✨ Yuk, kita mulai dari dasar dulu ya!" audio="0:04" />
              </div>
              <div className="px-3 pb-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/8">
                  <span className="text-xs text-white/30 flex-1">Ketik pesan...</span>
                  <div className="w-6 h-6 rounded-lg bg-violet-600/80 flex items-center justify-center">
                    <ArrowRight className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Feature pills — bottom center */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {[
            { icon: <Smile className="w-3 h-3" />, label: 'Ekspresi' },
            { icon: <Mic className="w-3 h-3" />, label: 'Suara' },
            { icon: <Activity className="w-3 h-3" />, label: 'Gerakan' },
          ].map(p => (
            <div key={p.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur text-xs text-white/70">
              <span className="text-violet-400">{p.icon}</span>
              {p.label}
            </div>
          ))}
        </div>
      </section>

      {/* ── Why Voxie ── */}
      <section className="py-20 px-6 bg-gradient-to-b from-[#0a0a14] via-[#0e0b1e] to-[#0a0a14] relative overflow-hidden">
        {/* Subtle glow top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-600/5 blur-[100px] pointer-events-none" />
        <div className="max-w-6xl mx-auto">
          <div className="mb-10">
            <h2 className="text-3xl font-bold">Kenapa Voxie? <span className="text-violet-400">✦</span></h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {([
              {
                icon: <Upload className="w-7 h-7 text-violet-400" />,
                title: 'Upload VRM 3D',
                desc: 'Gunakan model VRM favoritmu dengan mudah dan cepat.',
                tag: '.vrm',
                img: '/feature-upload.png',
                chat: false,
              },
              {
                icon: <MessageSquare className="w-7 h-7 text-violet-400" />,
                title: 'Chat Real-Time',
                desc: 'AI merespons secara real-time seperti percakapan nyata.',
                tag: null,
                img: null,
                chat: true,
              },
              {
                icon: <Volume2 className="w-7 h-7 text-violet-400" />,
                title: 'Suara & Ekspresi Hidup',
                desc: 'Asisten AI berbicara dengan suara dan ekspresi wajah yang natural.',
                tag: null,
                img: '/feature-suara.png',
                chat: false,
              },
              {
                icon: <Box className="w-7 h-7 text-violet-400" />,
                title: 'Interaksi Imersif 3D',
                desc: 'Rasakan pengalaman interaktif dalam dunia 3D yang imersif.',
                tag: null,
                img: '/feature-interaksi.png',
                chat: false,
              },
            ] as const).map((f) => (
              <div key={f.title}
                className="relative rounded-2xl border border-white/8 bg-gradient-to-b from-[#13132a] to-[#0d0d1f] overflow-hidden flex flex-col group hover:border-violet-500/30 transition-all duration-300"
              >
                {/* Top: icon + title + desc */}
                <div className="p-5 pb-0 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{f.title}</h3>
                    <p className="text-xs text-white/50 leading-relaxed mt-1.5">{f.desc}</p>
                  </div>
                </div>

                {/* Bottom: character image or chat preview */}
                <div className="relative h-52 overflow-hidden mt-4">
                  {f.tag && (
                    <span className="absolute bottom-3 left-3 z-20 px-2.5 py-1 rounded-lg bg-violet-500/30 border border-violet-500/30 backdrop-blur text-violet-300 text-[11px] font-mono">
                      {f.tag}
                    </span>
                  )}
                  {f.img ? (
                    <>
                      <img
                        src={f.img}
                        alt={f.title}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Vignette — fade all edges into card background */}
                      <div className="absolute inset-0 pointer-events-none"
                        style={{
                          background: 'radial-gradient(ellipse at center, transparent 40%, #0d0d1f 100%)',
                        }}
                      />
                      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#0d0d1f] via-transparent to-[#13132a]/60" />
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col justify-center gap-2.5 px-5">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-white/10 border border-white/10 shrink-0 flex items-center justify-center text-[10px] font-bold text-white/60 mt-0.5">K</div>
                        <div className="bg-white/8 border border-white/8 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                          <p className="text-[10px] text-white/40 font-medium mb-0.5">Kamu</p>
                          <p className="text-xs text-white/80">Apa kabar?</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5">V</div>
                        <div className="bg-white/8 border border-white/8 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                          <p className="text-[10px] text-violet-300 font-medium mb-0.5">Voxie</p>
                          <p className="text-xs text-white/80">Aku baik! Kamu gimana? 😊</p>
                        </div>
                      </div>
                    </div>
                  )}                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo + Customize ── */}
      <section className="py-16 px-6 bg-gradient-to-b from-[#0a0a14] via-[#0c0c1a] to-[#0a0a14]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Demo card */}
          <div className="rounded-2xl border border-white/8 bg-[#0d0d1f] overflow-hidden flex flex-col lg:flex-row">
            {/* Left: text */}
            <div className="p-6 flex flex-col justify-center gap-4 lg:w-48 shrink-0">
              <div>
                <h3 className="text-xl font-bold leading-tight">Lihat Voxie Beraksi <span className="text-violet-400">✦</span></h3>
                <p className="text-xs text-white/50 mt-2 leading-relaxed">Streaming ekspresi, suara, dan gerakan secara real-time.</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2 border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs w-fit">
                <Play className="w-3 h-3" /> Tonton Demo
              </Button>
            </div>
            {/* Right: video */}
            <div className="relative flex-1 min-h-[220px] overflow-hidden">
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-semibold">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> LIVE
              </div>
              <video
                src="/voxie-dance.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {/* Vignette left */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#0d0d1f] via-transparent to-transparent" />
            </div>
          </div>

          {/* Customize card */}
          <div className="rounded-2xl border border-white/8 bg-[#0d0d1f] overflow-hidden flex flex-col lg:flex-row">
            {/* Left: text + controls */}
            <div className="p-6 flex flex-col justify-center gap-4 flex-1">
              <div>
                <h3 className="text-xl font-bold leading-tight">Sesuaikan <span className="text-violet-400">Karaktermu</span> <span className="text-violet-400">✦</span></h3>
                <p className="text-sm text-white/50 mt-1.5">Atur suara, kepribadian, dan gaya bicara sesuai keinginanmu.</p>
              </div>
              <div className="space-y-2.5">
                {[
                  { icon: <Mic className="w-4 h-4 text-violet-400" />, label: 'Pilih Suara', value: null },
                  { icon: <Smile className="w-4 h-4 text-violet-400" />, label: 'Atur Kepribadian', value: 'Tsundere' },
                  { icon: <MessageSquare className="w-4 h-4 text-violet-400" />, label: 'Gaya Bicara', value: 'Sopan' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/8">
                    <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <span className="text-sm text-white/70 flex-1">{item.label}</span>
                    {item.value && (
                      <span className="text-xs text-violet-300 bg-violet-500/15 px-2 py-0.5 rounded-lg">{item.value} ▾</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 w-fit">
                <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <span className="text-xs text-violet-300">Bebas Kustomisasi!</span>
              </div>
            </div>
            {/* Right: character image */}
            <div className="relative lg:w-44 min-h-[200px] overflow-hidden shrink-0">
              <img
                src="/stiker-ai.png"
                alt="Sesuaikan Karakter"
                className="absolute bottom-0 right-0 w-full object-contain object-bottom"
              />
              {/* Vignette left — lebih tipis */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#0d0d1f] via-[#0d0d1f]/30 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Trusted by ── */}
      <section className="py-12 px-6 border-y border-white/5 bg-[#080810]">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs text-white/30 mb-8 tracking-widest uppercase">Dipercaya oleh kreator, gamer, pelajar, dan profesional</p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-30">
            {['NEXUS','STELLAR','KIZUNA LABS','OTAKU STUDIO','MIRAI TECH'].map(b => (
              <span key={b} className="text-sm font-bold tracking-wider text-white">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-24 px-6 bg-gradient-to-b from-[#0a0a14] via-[#0f0b20] to-[#0a0a14] relative overflow-hidden" id="harga">
        {/* Glow center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-violet-700/6 blur-[120px] pointer-events-none" />
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Pilih Paket yang Sesuai</h2>
            <p className="text-sm text-white/50 mt-2">Semua paket termasuk fitur berbicara, gerak, dan ekspresif.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                name: 'Starter', sub: 'Untuk personal & kreator',
                price: 'Gratis', period: '',
                features: ['1 Asisten Virtual','100 percakapan/bulan','Web Speech TTS'],
                cta: 'Mulai Gratis', highlight: false,
              },
              {
                name: 'Pro', sub: 'Untuk bisnis kecil & startup',
                price: 'Rp 79.000', period: '/bulan',
                features: ['1 Asisten Virtual','10.000 percakapan/bulan','ElevenLabs TTS','Analytics Dasar'],
                cta: 'Mulai Gratis', highlight: true,
              },
              {
                name: 'Business', sub: 'Untuk bisnis & tim',
                price: 'Rp 299.000', period: '/bulan',
                features: ['3 Asisten Virtual','50.000 percakapan/bulan','ElevenLabs TTS','Analytics Lengkap','Priority Support'],
                cta: 'Mulai Gratis', highlight: false,
              },
              {
                name: 'Enterprise', sub: 'Untuk perusahaan besar',
                price: 'Custom', period: '',
                features: ['Asisten Virtual Unlimited','Percakapan Unlimited','Custom Integrasi','Dedicated Support','SLA & Keamanan Tinggi'],
                cta: 'Hubungi Sales', highlight: false,
              },
            ].map((plan) => (
              <div key={plan.name} className={`relative rounded-2xl border p-5 flex flex-col gap-4 ${
                plan.highlight
                  ? 'border-violet-500/60 bg-violet-600/10 shadow-xl shadow-violet-500/10'
                  : 'border-white/8 bg-white/3'
              }`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-semibold">
                    Terpopuler
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-sm text-white">{plan.name}</h3>
                  <p className="text-[11px] text-white/40 mt-0.5">{plan.sub}</p>
                </div>
                <div>
                  <span className="text-2xl font-bold text-white">{plan.price}</span>
                  <span className="text-xs text-white/40">{plan.period}</span>
                </div>
                <ul className="space-y-2 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-white/60">
                      <Check className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to={user ? '/app' : '/auth?tab=signup'}>
                  <Button size="sm" className={`w-full h-9 text-xs ${
                    plan.highlight
                      ? 'bg-violet-600 hover:bg-violet-500 text-white border-0 shadow-lg shadow-violet-500/30'
                      : 'bg-white/8 hover:bg-white/15 text-white border border-white/10'
                  }`}>
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust badges ── */}
      <section className="py-10 px-6 border-t border-white/5 bg-[#080810]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: '99.9%', label: 'Uptime Terjamin' },
            { value: 'ISO 27001', label: 'Standar Keamanan' },
            { value: 'GDPR', label: 'Privasi Terlindungi' },
            { value: '10K+', label: 'Pengguna Aktif' },
          ].map(b => (
            <div key={b.value} className="space-y-1">
              <p className="text-xl font-bold text-violet-400">{b.value}</p>
              <p className="text-xs text-white/40">{b.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-16">
        <Link to={user ? '/app' : '/auth?tab=signup'} className="block w-full overflow-hidden cursor-pointer group">
          <img
            src="/siap-punya-assisten.png"
            alt="Siap punya asisten virtual — Mulai Gratis Sekarang"
            className="w-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
          />
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 border-t border-white/5 bg-[#06060f] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/30">
        <Logo />
        <p>© {new Date().getFullYear()} Voxie. All rights reserved.</p>
        <div className="flex gap-4">
          {['Privasi','Syarat','Kontak'].map(l => (
            <a key={l} href="#" className="hover:text-white/60 transition-colors">{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
