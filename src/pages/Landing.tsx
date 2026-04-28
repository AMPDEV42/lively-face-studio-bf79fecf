import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Play, Upload, MessageSquare, Volume2, Box,
  Check, Sparkles, Smile, Activity, Mic, Zap, Shield, Globe,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/40">
        <span className="text-white font-black text-base">V</span>
      </div>
      <div className="leading-none">
        <span className="text-white font-bold text-xl tracking-tight">Voxie</span>
        <span className="block text-[9px] text-violet-400/80 font-medium tracking-[0.2em] mt-0.5">ボクシー</span>
      </div>
    </div>
  );
}

function ChatBubble({ from, text, audio }: { from: 'ai' | 'user'; text: string; audio?: string }) {
  return (
    <div className={`flex gap-2 ${from === 'user' ? 'flex-row-reverse' : ''}`}>
      {from === 'ai' && (
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0 text-white text-[9px] font-bold mt-0.5">V</div>
      )}
      <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed ${
        from === 'ai'
          ? 'bg-white/8 border border-white/10 text-white/90 rounded-tl-sm'
          : 'bg-violet-600/80 text-white rounded-tr-sm'
      }`}>
        {from === 'ai' && <p className="text-[9px] text-violet-300 font-semibold mb-0.5">Voxie</p>}
        <p>{text}</p>
        {audio && (
          <div className="flex items-center gap-1.5 mt-1.5 bg-white/10 rounded-lg px-2 py-1">
            <div className="flex gap-0.5 items-end h-3">
              {[2,4,3,5,2,4,3,2,4,5,3,2].map((h, i) => (
                <div key={i} className="w-0.5 bg-violet-400/80 rounded-full" style={{ height: `${h * 2}px` }} />
              ))}
            </div>
            <span className="text-[9px] text-violet-300/80 ml-1">{audio}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const ctaHref = user ? '/app' : '/auth?tab=signup';

  return (
    <div className="min-h-screen bg-[#07070f] text-white overflow-x-hidden">

      {/* ── Navbar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-10 py-4 border-b border-white/[0.06] bg-[#07070f]/85 backdrop-blur-2xl">
        <Logo />
        <nav className="hidden md:flex items-center gap-7 text-sm text-white/50">
          {[
            { label: 'Beranda', href: '/', isAnchor: false },
            { label: 'Fitur', href: '#fitur', isAnchor: true },
            { label: 'Galeri', href: '/gallery', isAnchor: false },
            { label: 'Harga', href: '/pricing', isAnchor: false },
            { label: 'Dokumentasi', href: '/docs', isAnchor: false },
          ].map(n => (
            n.isAnchor
              ? <a key={n.label} href={n.href} onClick={(e) => { e.preventDefault(); document.querySelector(n.href)?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-white transition-colors duration-200 cursor-pointer">{n.label}</a>
              : <Link key={n.label} to={n.href} className="hover:text-white transition-colors duration-200">{n.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="h-9 px-4 text-xs text-white/60 hover:text-white hover:bg-white/8 rounded-xl">
              Masuk
            </Button>
          </Link>
          <Link to={ctaHref}>
            <Button size="sm" className="h-9 px-5 text-xs bg-violet-600 hover:bg-violet-500 text-white border-0 rounded-xl shadow-lg shadow-violet-500/25 font-semibold">
              Mulai Gratis
            </Button>
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative w-full overflow-hidden" style={{ paddingTop: 'clamp(400px, 56.25vw, 56.25%)' }}>
        <img src="/voxie-hero.png" alt="Voxie" className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07070f]/95 via-[#07070f]/40 to-[#07070f]/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07070f] via-transparent to-[#07070f]/70" />
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(139,92,246,1) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,1) 1px,transparent 1px)',
          backgroundSize: '50px 50px'
        }} />

        <div className="absolute inset-0 flex items-end pb-10 sm:pb-14 pt-20">
          <div className="w-full max-w-7xl mx-auto px-5 sm:px-6 lg:px-10 flex items-end justify-between gap-6">
            <div className="space-y-4 sm:space-y-6 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/25 bg-violet-500/8 backdrop-blur-sm text-violet-300 text-[10px] sm:text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                AI · 3D · REAL-TIME
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black leading-[1.05] sm:leading-[1.0] tracking-tight">
                Asisten Virtual<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-300 to-pink-300">
                  3D Interaktif
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-white/60 leading-relaxed max-w-xs sm:max-w-sm">
                Upload model VRM 3D pilihanmu dan berinteraksi real-time dengan asisten AI yang merespons dengan suara dan ekspresi wajah.
              </p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Link to={ctaHref}>
                  <Button size="sm" className="gap-2 h-10 sm:h-12 px-5 sm:px-7 bg-violet-600 hover:bg-violet-500 text-white border-0 rounded-xl shadow-2xl shadow-violet-500/35 text-xs sm:text-sm font-semibold">
                    Mulai Sekarang <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                </Link>
                <Button variant="outline" size="sm" className="gap-2 h-10 sm:h-12 px-4 sm:px-6 border-white/15 bg-white/5 hover:bg-white/10 backdrop-blur text-white text-xs sm:text-sm rounded-xl">
                  <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center">
                    <Play className="w-2 h-2 fill-white" />
                  </div>
                  Lihat Demo
                </Button>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex -space-x-2">
                  {['bg-violet-500','bg-purple-600','bg-indigo-500','bg-pink-500'].map((c,i) => (
                    <div key={i} className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full ${c} border-2 border-[#07070f] flex items-center justify-center text-[8px] sm:text-[9px] font-bold`}>
                      {['A','B','C','D'][i]}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] sm:text-xs text-white/45">
                  <span className="text-white/80 font-semibold">10.000+</span> pengguna aktif ✦
                </p>
              </div>
            </div>

            {/* Chat panel — desktop only */}
            <div className="hidden lg:flex flex-col w-52 shrink-0 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden mb-4">
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/8 bg-white/[0.03]">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-[9px] font-bold shrink-0">V</div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">Voxie</p>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[9px] text-emerald-400">Online</span>
                  </div>
                </div>
              </div>
              <div className="p-3 space-y-2">
                <ChatBubble from="ai" text="Ada yang bisa Voxie bantu hari ini?" audio="0:03" />
                <ChatBubble from="user" text="Bisa temeni aku belajar Bahasa Jepang?" />
                <ChatBubble from="ai" text="Tentu! ✨ Yuk, kita mulai dari dasar dulu ya!" audio="0:04" />
              </div>
              <div className="px-3 pb-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/8">
                  <span className="text-[11px] text-white/25 flex-1">Ketik pesan...</span>
                  <div className="w-5 h-5 rounded-lg bg-violet-600/80 flex items-center justify-center shrink-0">
                    <ArrowRight className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature pills */}
        <div className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2">
          {[
            { icon: <Smile className="w-3 h-3" />, label: 'Ekspresi' },
            { icon: <Mic className="w-3 h-3" />, label: 'Suara' },
            { icon: <Activity className="w-3 h-3" />, label: 'Gerakan' },
          ].map(p => (
            <div key={p.label} className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-black/50 border border-white/10 backdrop-blur-sm text-[10px] sm:text-xs text-white/65">
              <span className="text-violet-400">{p.icon}</span>{p.label}
            </div>
          ))}
        </div>
      </section>

      {/* ── Why Voxie ── */}
      <section id="fitur" className="relative py-14 px-6 lg:px-10 overflow-hidden" style={{ background: 'linear-gradient(180deg, #07070f 0%, #0d0a1f 50%, #07070f 100%)' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-violet-600/6 blur-[120px] pointer-events-none" />
        <div className="relative max-w-6xl mx-auto">
          <div className="mb-8 sm:mb-12">
            <p className="text-xs text-violet-400 font-semibold tracking-widest uppercase mb-2 sm:mb-3">Fitur Unggulan</p>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">Kenapa Voxie? <span className="text-violet-400">✦</span></h2>
            <p className="text-xs sm:text-sm text-white/40 mt-2 max-w-md">Semua yang kamu butuhkan untuk asisten virtual yang benar-benar hidup.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {([
              { icon: <Upload className="w-6 h-6 text-violet-400" />, title: 'Upload VRM 3D', desc: 'Gunakan model VRM favoritmu dengan mudah dan cepat.', tag: '.vrm', img: '/feature-upload.png', chat: false },
              { icon: <MessageSquare className="w-6 h-6 text-violet-400" />, title: 'Chat Real-Time', desc: 'AI merespons secara real-time seperti percakapan nyata.', tag: null, img: null, chat: true },
              { icon: <Volume2 className="w-6 h-6 text-violet-400" />, title: 'Suara & Ekspresi Hidup', desc: 'Asisten AI berbicara dengan suara dan ekspresi wajah yang natural.', tag: null, img: '/feature-suara.png', chat: false },
              { icon: <Box className="w-6 h-6 text-violet-400" />, title: 'Interaksi Imersif 3D', desc: 'Rasakan pengalaman interaktif dalam dunia 3D yang imersif.', tag: null, img: '/feature-interaksi.png', chat: false },
            ] as const).map((f) => (
              <div key={f.title} className="group relative rounded-2xl border border-white/[0.07] overflow-hidden flex flex-col hover:border-violet-500/40 transition-all duration-300"
                style={{ background: 'linear-gradient(160deg, #131228 0%, #0c0b1a 100%)' }}>
                {/* Hover glow */}
                <div className="absolute inset-0 bg-violet-600/0 group-hover:bg-violet-600/[0.04] transition-all duration-300 pointer-events-none" />
                <div className="p-5 pb-0 space-y-3 relative">
                  <div className="w-11 h-11 rounded-xl bg-violet-500/12 border border-violet-500/20 flex items-center justify-center">
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white/90">{f.title}</h3>
                    <p className="text-xs text-white/45 leading-relaxed mt-1.5">{f.desc}</p>
                  </div>
                </div>
                <div className="relative h-52 overflow-hidden mt-4">
                  {f.tag && (
                    <span className="absolute bottom-3 left-3 z-20 px-2.5 py-1 rounded-lg bg-violet-500/25 border border-violet-500/30 backdrop-blur-sm text-violet-300 text-[11px] font-mono font-semibold">
                      {f.tag}
                    </span>
                  )}
                  {f.img ? (
                    <>
                      <img src={f.img} alt={f.title} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 35%, #0c0b1a 95%)' }} />
                      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#0c0b1a] via-transparent to-[#131228]/50" />
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col justify-center gap-3 px-5" style={{ background: 'linear-gradient(180deg, transparent, #0c0b1a)' }}>
                      {[
                        { avatar: 'K', name: 'Kamu', msg: 'Apa kabar?', isAI: false },
                        { avatar: 'V', name: 'Voxie', msg: 'Aku baik! Kamu gimana? 😊', isAI: true },
                      ].map(b => (
                        <div key={b.name} className="flex items-start gap-2.5">
                          <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5 ${b.isAI ? 'bg-gradient-to-br from-violet-500 to-purple-700' : 'bg-white/10 border border-white/10 text-white/50'}`}>{b.avatar}</div>
                          <div className="bg-white/[0.07] border border-white/8 rounded-2xl rounded-tl-sm px-3.5 py-2">
                            <p className={`text-[9px] font-semibold mb-0.5 ${b.isAI ? 'text-violet-300' : 'text-white/35'}`}>{b.name}</p>
                            <p className="text-xs text-white/75">{b.msg}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo + Customize ── */}
      <section className="py-12 px-6 lg:px-10" style={{ background: 'linear-gradient(180deg, #07070f 0%, #0b0918 50%, #07070f 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 sm:mb-10">
            <p className="text-xs text-violet-400 font-semibold tracking-widest uppercase mb-2 sm:mb-3">Demo & Kustomisasi</p>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">Lihat & Rasakan Sendiri</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Demo card */}
            <div className="rounded-2xl border border-white/[0.07] overflow-hidden flex flex-col lg:flex-row group" style={{ background: 'linear-gradient(135deg, #131228 0%, #0c0b1a 100%)' }}>
              <div className="p-5 sm:p-7 flex flex-col justify-center gap-4 sm:gap-5 lg:w-52 shrink-0">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 text-[10px] font-semibold mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> LIVE
                  </div>
                  <h3 className="text-xl font-black leading-tight">Lihat Voxie<br />Beraksi <span className="text-violet-400">✦</span></h3>
                  <p className="text-xs text-white/45 leading-relaxed mt-2">Streaming ekspresi, suara, dan gerakan secara real-time.</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2 border-white/12 bg-white/[0.05] hover:bg-white/10 text-white text-xs w-fit rounded-xl">
                  <Play className="w-3 h-3 fill-white" /> Tonton Demo
                </Button>
              </div>
              <div className="relative flex-1 min-h-[220px] overflow-hidden">
                <video src="/voxie-dance.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#131228] via-transparent to-transparent" />
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#0c0b1a]/60 to-transparent" />
              </div>
            </div>

            {/* Customize card */}
            <div className="rounded-2xl border border-white/[0.07] overflow-hidden flex flex-col lg:flex-row group relative" style={{ background: 'linear-gradient(135deg, #131228 0%, #0c0b1a 100%)' }}>
              <div className="p-5 sm:p-7 flex flex-col justify-center gap-4 flex-1">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/12 border border-violet-500/20 text-violet-300 text-[10px] font-semibold mb-3">
                    <Sparkles className="w-3 h-3" /> Kustomisasi
                  </div>
                  <h3 className="text-xl font-black leading-tight">Sesuaikan <span className="text-violet-400">Karaktermu</span> <span className="text-violet-400">✦</span></h3>
                  <p className="text-xs text-white/45 mt-2 leading-relaxed">Atur suara, kepribadian, dan gaya bicara sesuai keinginanmu.</p>
                </div>
                <div className="space-y-2">
                  {[
                    { icon: <Mic className="w-3.5 h-3.5 text-violet-400" />, label: 'Pilih Suara', value: null },
                    { icon: <Smile className="w-3.5 h-3.5 text-violet-400" />, label: 'Atur Kepribadian', value: 'Tsundere' },
                    { icon: <MessageSquare className="w-3.5 h-3.5 text-violet-400" />, label: 'Gaya Bicara', value: 'Sopan' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:border-violet-500/25 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-violet-500/12 flex items-center justify-center shrink-0">{item.icon}</div>
                      <span className="text-xs text-white/65 flex-1">{item.label}</span>
                      {item.value && <span className="text-[11px] text-violet-300 bg-violet-500/12 border border-violet-500/20 px-2 py-0.5 rounded-lg">{item.value} ▾</span>}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/8 border border-violet-500/15 w-fit">
                  <Sparkles className="w-3 h-3 text-violet-400 shrink-0" />
                  <span className="text-[11px] text-violet-300 font-medium">Bebas Kustomisasi!</span>
                </div>
              </div>

              {/* Character image mobile — tampil di bawah konten */}
              <div className="overflow-hidden lg:hidden -mx-5 -mb-5">
                <img
                  src="/stiker-ai.png"
                  alt="Karakter AI"
                  className="w-4/5 mx-auto block object-contain"
                  style={{ transform: 'translateY(25%)', marginTop: '-50%' }}
                />
              </div>

              {/* Character image desktop — pojok kanan bawah dalam card */}
              <div className="relative lg:w-52 shrink-0 hidden lg:block self-stretch">
                <img
                  src="/stiker-ai.png"
                  alt="Karakter AI"
                  className="absolute bottom-0 right-0 w-80 object-contain object-bottom transition-transform duration-500 hover:scale-110 drop-shadow-[0_0_30px_rgba(139,92,246,0.3)]"
                  style={{ transform: 'translateY(25%)' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trusted by ── */}
      <section className="py-8 px-6 lg:px-10 border-y border-white/[0.05]" style={{ background: '#050509' }}>
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-[11px] text-white/25 mb-8 tracking-[0.25em] uppercase font-medium">Dipercaya oleh kreator, gamer, pelajar, dan profesional</p>
          <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-10 opacity-25">
            {['NEXUS','STELLAR','KIZUNA LABS','OTAKU STUDIO','MIRAI TECH'].map(b => (
              <span key={b} className="text-sm font-black tracking-widest text-white">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="relative py-16 px-6 lg:px-10 overflow-hidden" id="harga" style={{ background: 'linear-gradient(180deg, #07070f 0%, #0e0b22 50%, #07070f 100%)' }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-violet-700/5 blur-[140px] pointer-events-none" />
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-8 sm:mb-14">
            <p className="text-xs text-violet-400 font-semibold tracking-widest uppercase mb-2 sm:mb-3">Harga</p>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">Pilih Paket yang Sesuai</h2>
            <p className="text-xs sm:text-sm text-white/40 mt-2">Semua paket termasuk fitur berbicara, gerak, dan ekspresif.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Starter', sub: 'Personal & kreator', price: 'Gratis', period: '', features: ['1 Asisten Virtual','100 percakapan/bulan','Web Speech TTS'], cta: 'Mulai Gratis', highlight: false },
              { name: 'Pro', sub: 'Bisnis kecil & startup', price: 'Rp 79.000', period: '/bulan', features: ['1 Asisten Virtual','10.000 percakapan/bulan','ElevenLabs TTS','Analytics Dasar'], cta: 'Mulai Gratis', highlight: true },
              { name: 'Business', sub: 'Bisnis & tim', price: 'Rp 299.000', period: '/bulan', features: ['3 Asisten Virtual','50.000 percakapan/bulan','ElevenLabs TTS','Analytics Lengkap','Priority Support'], cta: 'Mulai Gratis', highlight: false },
              { name: 'Enterprise', sub: 'Perusahaan besar', price: 'Custom', period: '', features: ['Asisten Unlimited','Percakapan Unlimited','Custom Integrasi','Dedicated Support','SLA Tinggi'], cta: 'Hubungi Sales', highlight: false },
            ].map((plan) => (
              <div key={plan.name} className={`relative rounded-2xl border p-5 flex flex-col gap-4 transition-all duration-300 ${
                plan.highlight
                  ? 'border-violet-500/50 shadow-2xl shadow-violet-500/15'
                  : 'border-white/[0.07] hover:border-white/15'
              }`} style={{ background: plan.highlight ? 'linear-gradient(160deg, #1a1040 0%, #120d30 100%)' : 'linear-gradient(160deg, #111020 0%, #0c0b1a 100%)' }}>
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[10px] font-bold shadow-lg shadow-violet-500/30">
                    ✦ Terpopuler
                  </div>
                )}
                <div>
                  <h3 className="font-black text-sm text-white">{plan.name}</h3>
                  <p className="text-[11px] text-white/35 mt-0.5">{plan.sub}</p>
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-black text-white">{plan.price}</span>
                  <span className="text-xs text-white/35 mb-0.5">{plan.period}</span>
                </div>
                <ul className="space-y-2 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-white/55">
                      <Check className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />{f}
                    </li>
                  ))}
                </ul>
                <Link to={ctaHref}>
                  <Button size="sm" className={`w-full h-9 text-xs rounded-xl font-semibold ${
                    plan.highlight
                      ? 'bg-violet-600 hover:bg-violet-500 text-white border-0 shadow-lg shadow-violet-500/25'
                      : 'bg-white/[0.07] hover:bg-white/12 text-white border border-white/10'
                  }`}>{plan.cta}</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust badges ── */}
      <section className="py-8 px-6 lg:px-10 border-t border-white/[0.05]" style={{ background: '#050509' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { icon: <Zap className="w-5 h-5 text-violet-400 mx-auto mb-2" />, value: '99.9%', label: 'Uptime Terjamin' },
            { icon: <Shield className="w-5 h-5 text-violet-400 mx-auto mb-2" />, value: 'ISO 27001', label: 'Standar Keamanan' },
            { icon: <Globe className="w-5 h-5 text-violet-400 mx-auto mb-2" />, value: 'GDPR', label: 'Privasi Terlindungi' },
            { icon: <Sparkles className="w-5 h-5 text-violet-400 mx-auto mb-2" />, value: '10K+', label: 'Pengguna Aktif' },
          ].map(b => (
            <div key={b.value} className="space-y-1">
              {b.icon}
              <p className="text-2xl font-black text-white">{b.value}</p>
              <p className="text-xs text-white/35">{b.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-0">
        <Link to={ctaHref} className="block w-full overflow-hidden cursor-pointer group">
          <img src="/siap-punya-assisten.png" alt="Mulai Gratis Sekarang" className="w-full object-cover group-hover:scale-[1.015] transition-transform duration-500" />
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="py-7 px-6 lg:px-10 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-5" style={{ background: '#03030a' }}>
        <Logo />
        <p className="text-xs text-white/20">© {new Date().getFullYear()} Voxie. All rights reserved.</p>
        <div className="flex gap-5">
          {[
            { label: 'Privasi', href: '/legal?tab=privasi' },
            { label: 'Syarat', href: '/legal?tab=syarat' },
            { label: 'Kontak', href: '/legal?tab=kontak' },
          ].map(l => (
            <a key={l.label} href={l.href} className="text-xs text-white/25 hover:text-white/60 transition-colors">{l.label}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
