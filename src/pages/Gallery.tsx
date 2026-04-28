import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, ExternalLink, X, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MetaTags from '@/components/MetaTags';

const GALLERY_ITEMS = [
  { id: 1, title: 'Cyberpunk City', desc: 'Background kota futuristik dengan pencahayaan neon', tag: 'Background', img: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.45.05.png' },
  { id: 2, title: 'Neon Grid', desc: 'Grid neon biru dengan efek glow', tag: 'Background', img: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.49.24.png' },
  { id: 3, title: 'Space Station', desc: 'Latar stasiun luar angkasa yang imersif', tag: 'Background', img: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.54.56.png' },
  { id: 4, title: 'Digital Void', desc: 'Ruang digital minimalis dengan efek partikel', tag: 'Background', img: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.55.55.png' },
  { id: 5, title: 'Hologram Lab', desc: 'Laboratorium hologram futuristik', tag: 'Pro', img: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.56.06.png' },
  { id: 6, title: 'Matrix Code', desc: 'Efek hujan kode matrix yang ikonik', tag: 'Pro', img: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.57.17.png' },
  { id: 7, title: 'Cyber Nexus', desc: 'Jaringan cyber dengan koneksi data visual', tag: 'Pro', img: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.59.30.png' },
  { id: 8, title: 'Quantum Realm', desc: 'Dimensi kuantum dengan efek partikel abstrak', tag: 'Pro', img: '/backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.59.41.png' },
];

const TAG_COLORS: Record<string, string> = {
  Anime: 'bg-pink-500/15 text-pink-300 border-pink-500/25',
  Background: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
  Pro: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
};

export default function Gallery() {
  const [lightbox, setLightbox] = useState<{ img: string; title: string } | null>(null);
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className="min-h-screen bg-[#07070f] text-white">
      <MetaTags title="Galeri" description="Lihat koleksi background, karakter VRM, dan scene yang tersedia di Voxie. Cyberpunk, anime, space, dan banyak lagi." />

      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#07070f]/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/8 rounded-xl">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <img src="/app logo/voxie logo.png" alt="Voxie" className="h-7 w-auto object-contain" />
          </div>
          <span className="text-white/20">/</span>
          <span className="text-sm text-white/60">Galeri</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">
        {/* Hero */}
        <div className="text-center space-y-3">
          <p className="text-xs text-violet-400 font-semibold tracking-widest uppercase">Galeri</p>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
            Lihat Apa yang Bisa{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-300">Kamu Buat</span>
          </h1>
          <p className="text-sm text-white/50 max-w-md mx-auto">
            Koleksi background, karakter, dan scene yang tersedia di Voxie.
          </p>
        </div>

        {/* Demo video card */}
        <div
          className="rounded-2xl border border-white/[0.07] overflow-hidden relative group cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #131228 0%, #0c0b1a 100%)' }}
          onClick={() => setShowVideo(true)}
        >
          <div className="aspect-video relative flex items-center justify-center">
            <video
              src="/voxie-dance.mp4"
              autoPlay loop muted playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0b1a]/80 via-transparent to-transparent pointer-events-none" />
            {/* Play overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                <Play className="w-7 h-7 text-white fill-white ml-1" />
              </div>
            </div>
            <div className="absolute bottom-4 left-4 flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> LIVE DEMO
              </div>
            </div>
            <div className="absolute bottom-4 right-4 text-white/40 text-xs">Klik untuk putar penuh</div>
          </div>
        </div>

        {/* Grid */}
        <div>
          <h2 className="text-lg font-black mb-5">Background & Scene</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {GALLERY_ITEMS.map((item) => (
              <div
                key={item.id}
                className="group rounded-xl border border-white/[0.07] overflow-hidden hover:border-violet-500/40 transition-all duration-300 cursor-pointer"
                style={{ background: 'linear-gradient(160deg, #111020 0%, #0c0b1a 100%)' }}
                onClick={() => setLightbox({ img: item.img, title: item.title })}
              >
                <div className="aspect-video relative overflow-hidden">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {/* Zoom icon on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-6 h-6 text-white/80" />
                  </div>
                  <span className={`absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TAG_COLORS[item.tag] ?? 'bg-white/10 text-white/60 border-white/10'}`}>
                    {item.tag}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold text-white/90 truncate">{item.title}</p>
                  <p className="text-[10px] text-white/40 mt-0.5 truncate">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-6 space-y-4">
          <p className="text-white/40 text-sm">Semua background tersedia langsung di dalam aplikasi.</p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/auth?tab=signup">
              <Button className="h-10 px-6 bg-violet-600 hover:bg-violet-500 text-white border-0 rounded-xl font-semibold text-sm gap-2">
                <Play className="w-4 h-4" /> Coba Sekarang
              </Button>
            </Link>
            <a href="https://hub.vroid.com" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="h-10 px-5 border-white/15 bg-white/5 hover:bg-white/10 text-white text-sm rounded-xl gap-2">
                <ExternalLink className="w-3.5 h-3.5" /> VRoid Hub
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="max-w-4xl w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightbox.img}
              alt={lightbox.title}
              className="w-full rounded-2xl border border-white/10"
            />
            <p className="text-center text-sm text-white/60">{lightbox.title}</p>
          </div>
        </div>
      )}

      {/* Video modal */}
      {showVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowVideo(false)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            onClick={() => setShowVideo(false)}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <video
              src="/voxie-dance.mp4"
              autoPlay
              controls
              playsInline
              className="w-full rounded-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
