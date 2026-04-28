import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CONTENT = {
  privasi: {
    title: 'Kebijakan Privasi',
    updated: '28 April 2026',
    sections: [
      {
        title: '1. Data yang Kami Kumpulkan',
        body: `Kami mengumpulkan data berikut saat kamu menggunakan Voxie:

- **Akun**: email dan nama tampilan yang kamu daftarkan
- **Model VRM**: file yang kamu upload disimpan di server kami
- **Percakapan**: riwayat chat disimpan untuk melanjutkan percakapan
- **Preferensi**: pengaturan tampilan, suara, dan bahasa disimpan secara lokal`,
      },
      {
        title: '2. Cara Kami Menggunakan Data',
        body: `Data kamu digunakan untuk:

- Menjalankan layanan Voxie (autentikasi, penyimpanan model, chat AI)
- Meningkatkan kualitas layanan
- Mengirim notifikasi penting terkait akun (bukan spam)

Kami **tidak** menjual data kamu ke pihak ketiga.`,
      },
      {
        title: '3. Penyimpanan Data',
        body: `Data disimpan menggunakan infrastruktur Supabase (PostgreSQL + Storage) yang berlokasi di server aman. Data percakapan disimpan terenkripsi.

Kamu bisa menghapus semua data akun kapan saja melalui halaman Profil → Hapus Akun.`,
      },
      {
        title: '4. Cookie & Penyimpanan Lokal',
        body: `Kami menggunakan localStorage browser untuk menyimpan preferensi (background, suara, bahasa). Tidak ada cookie tracking pihak ketiga.`,
      },
      {
        title: '5. Hak Kamu',
        body: `Kamu berhak untuk:

- Mengakses data yang kami simpan tentang kamu
- Meminta penghapusan data akun
- Mengekspor riwayat percakapan

Hubungi kami di privacy@voxie.app untuk permintaan terkait data.`,
      },
    ],
  },
  syarat: {
    title: 'Syarat & Ketentuan',
    updated: '28 April 2026',
    sections: [
      {
        title: '1. Penerimaan Syarat',
        body: `Dengan menggunakan Voxie, kamu menyetujui syarat dan ketentuan ini. Jika tidak setuju, harap tidak menggunakan layanan kami.`,
      },
      {
        title: '2. Penggunaan yang Diizinkan',
        body: `Kamu boleh menggunakan Voxie untuk:

- Interaksi personal dengan asisten virtual
- Hiburan, belajar, dan kreativitas
- Penggunaan komersial sesuai paket yang dipilih`,
      },
      {
        title: '3. Penggunaan yang Dilarang',
        body: `Kamu **tidak boleh** menggunakan Voxie untuk:

- Membuat konten yang melanggar hukum atau merugikan orang lain
- Menyebarkan misinformasi atau konten berbahaya
- Melakukan reverse engineering atau eksploitasi sistem
- Menggunakan model VRM yang melanggar hak cipta tanpa izin`,
      },
      {
        title: '4. Konten yang Kamu Upload',
        body: `Kamu bertanggung jawab penuh atas model VRM dan konten yang kamu upload. Pastikan kamu memiliki hak untuk menggunakan konten tersebut.

Kami berhak menghapus konten yang melanggar syarat ini tanpa pemberitahuan.`,
      },
      {
        title: '5. Batasan Layanan',
        body: `Voxie disediakan "sebagaimana adanya". Kami tidak menjamin layanan selalu tersedia 100% tanpa gangguan. Kami tidak bertanggung jawab atas kerugian yang timbul dari penggunaan layanan.`,
      },
      {
        title: '6. Perubahan Syarat',
        body: `Kami dapat mengubah syarat ini sewaktu-waktu. Perubahan signifikan akan diberitahukan melalui email atau notifikasi dalam aplikasi.`,
      },
    ],
  },
  kontak: {
    title: 'Hubungi Kami',
    updated: '28 April 2026',
    sections: [
      {
        title: 'Tim Voxie',
        body: `Kami senang mendengar dari kamu! Hubungi kami untuk pertanyaan, masukan, atau laporan masalah.`,
      },
      {
        title: 'Email',
        body: `- **Umum**: hello@voxie.app
- **Dukungan teknis**: support@voxie.app
- **Privasi & data**: privacy@voxie.app
- **Kerjasama bisnis**: sales@voxie.app`,
      },
      {
        title: 'Waktu Respons',
        body: `Kami berusaha merespons dalam **1-2 hari kerja**. Untuk pengguna Pro, respons diprioritaskan dalam 24 jam.`,
      },
      {
        title: 'Laporan Bug',
        body: `Temukan bug? Kirim laporan ke support@voxie.app dengan:

- Deskripsi masalah
- Langkah untuk mereproduksi
- Screenshot (jika ada)
- Browser dan OS yang digunakan`,
      },
    ],
  },
};

function renderBody(text: string) {
  return text.split('\n').map((line, i) => {
    if (line === '') return <div key={i} className="h-2" />;
    if (line.startsWith('- ')) {
      return (
        <p key={i} className="text-white/65 text-sm leading-relaxed flex gap-2 pl-2">
          <span className="text-violet-400 shrink-0">•</span>
          <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-white/90">$1</strong>') }} />
        </p>
      );
    }
    return (
      <p key={i} className="text-white/65 text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white/90">$1</strong>') }} />
    );
  });
}

export default function Legal() {
  const [params] = useSearchParams();
  const tab = (params.get('tab') ?? 'privasi') as keyof typeof CONTENT;
  const page = CONTENT[tab] ?? CONTENT.privasi;

  return (
    <div className="min-h-screen bg-[#07070f] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#07070f]/90 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/8 rounded-xl">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <img src="/app logo/voxie logo.png" alt="Voxie" className="h-7 w-auto object-contain" />
          </div>
          <span className="text-white/20">/</span>
          <span className="text-sm text-white/60">{page.title}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {/* Tab switcher */}
        <div className="flex gap-2">
          {(['privasi', 'syarat', 'kontak'] as const).map((t) => (
            <Link key={t} to={`/legal?tab=${t}`}>
              <button className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all capitalize ${
                tab === t
                  ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                  : 'text-white/40 border-white/10 hover:border-white/20 hover:text-white/70'
              }`}>
                {t === 'privasi' ? 'Privasi' : t === 'syarat' ? 'Syarat' : 'Kontak'}
              </button>
            </Link>
          ))}
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black">{page.title}</h1>
          <p className="text-xs text-white/30 mt-1">Terakhir diperbarui: {page.updated}</p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {page.sections.map((section) => (
            <div key={section.title} className="rounded-2xl border border-white/[0.07] p-5 space-y-3"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              <h2 className="text-sm font-bold text-white/90">{section.title}</h2>
              <div className="space-y-1.5">{renderBody(section.body)}</div>
            </div>
          ))}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06] text-xs text-white/30">
          <span>© {new Date().getFullYear()} Voxie</span>
          <div className="flex gap-4">
            <Link to="/legal?tab=privasi" className="hover:text-white/60 transition-colors">Privasi</Link>
            <Link to="/legal?tab=syarat" className="hover:text-white/60 transition-colors">Syarat</Link>
            <Link to="/legal?tab=kontak" className="hover:text-white/60 transition-colors">Kontak</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
