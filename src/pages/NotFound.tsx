import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MetaTags from '@/components/MetaTags';

export default function NotFound() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex items-center justify-center p-4">
      <MetaTags title="404 — Halaman Tidak Ditemukan" description="Halaman yang kamu cari tidak ada." />
      <div className="text-center space-y-6 max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto">
          <SearchX className="w-8 h-8 text-violet-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl font-black text-white/90">404</h1>
          <p className="text-white/60 text-sm">
            Halaman <code className="text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded text-xs">{location.pathname}</code> tidak ditemukan.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link to="/">
            <Button className="gap-2 bg-violet-600 hover:bg-violet-500 text-white border-0 rounded-xl">
              <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
