import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, BookOpen, Upload, MessageSquare, Volume2, Settings, Palette, Zap, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MetaTags from '@/components/MetaTags';

const SECTIONS = [
  {
    id: 'mulai',
    icon: <Zap className="w-4 h-4" />,
    title: 'Memulai',
    items: [
      {
        id: 'intro',
        title: 'Apa itu Voxie?',
        content: `Voxie adalah platform asisten virtual 3D interaktif berbasis AI. Kamu bisa upload model karakter VRM 3D, lalu berinteraksi dengannya secara real-time menggunakan chat teks atau suara.

Karakter akan merespons dengan suara (TTS), ekspresi wajah, dan animasi tubuh yang natural — seolah-olah kamu sedang berbicara dengan karakter anime sungguhan.`,
      },
      {
        id: 'daftar',
        title: 'Cara Daftar',
        content: `1. Klik tombol **Mulai Gratis** di halaman utama
2. Masukkan email dan password kamu
3. Verifikasi email (cek inbox)
4. Login dan kamu langsung bisa mulai

Paket Starter sepenuhnya gratis — tidak perlu kartu kredit.`,
      },
    ],
  },
  {
    id: 'model',
    icon: <Upload className="w-4 h-4" />,
    title: 'Upload Model VRM',
    items: [
      {
        id: 'apa-vrm',
        title: 'Apa itu file VRM?',
        content: `VRM adalah format file 3D standar untuk karakter humanoid, populer di komunitas VTuber dan anime. File berekstensi **.vrm**.

Kamu bisa mendapatkan model VRM dari:
- **VRoid Hub** (hub.vroid.com) — ribuan model gratis
- **VRoid Studio** — buat model sendiri
- Marketplace 3D lainnya yang mendukung format VRM`,
      },
      {
        id: 'cara-upload',
        title: 'Cara Upload Model',
        content: `1. Buka menu **Pengaturan** (ikon hamburger → Pengaturan)
2. Di bagian **Model VRM**, klik tombol **Upload VRM**
3. Pilih file .vrm dari komputer kamu (max 100MB)
4. Tunggu proses upload selesai
5. Klik **Aktifkan** pada model yang ingin digunakan

Model akan langsung muncul di layar utama setelah diaktifkan.`,
      },
      {
        id: 'personality',
        title: 'Mengatur Kepribadian',
        content: `Setiap model bisa punya kepribadian unik yang mempengaruhi cara AI merespons.

1. Klik ikon **Edit** (pensil) pada model
2. Isi kolom **Kepribadian** dengan deskripsi karakter
3. Atau klik **✨ Enhance dengan AI** untuk generate otomatis
4. Klik **Simpan**

Contoh kepribadian: *"Karakter tsundere yang awalnya dingin tapi sebenarnya peduli. Suka anime dan manga. Berbicara dengan campuran Indonesia dan Jepang."*`,
      },
    ],
  },
  {
    id: 'chat',
    icon: <MessageSquare className="w-4 h-4" />,
    title: 'Chat & Interaksi',
    items: [
      {
        id: 'mulai-chat',
        title: 'Cara Memulai Chat',
        content: `1. Klik ikon **chat** (gelembung pesan) di pojok kanan atas
2. Ketik pesan di kolom input bawah
3. Tekan **Enter** atau klik tombol kirim
4. Karakter akan merespons dengan teks dan suara

**Shortcut keyboard:**
- \`Ctrl+K\` — buka/tutup chat
- \`Enter\` — kirim pesan
- \`Shift+Enter\` — baris baru`,
      },
      {
        id: 'mode-suara',
        title: 'Mode Suara (STT)',
        content: `Kamu bisa berbicara langsung ke mikrofon:

1. Klik ikon **mikrofon** di panel chat
2. Izinkan akses mikrofon saat diminta browser
3. Mulai bicara — teks akan muncul otomatis
4. Setelah 5 detik diam, pesan otomatis terkirim

Mode suara akan otomatis berhenti saat karakter sedang berbicara untuk menghindari feedback loop.`,
      },
      {
        id: 'animasi',
        title: 'Trigger Animasi',
        content: `Kamu bisa memicu animasi tertentu dengan slash command:

- \`/wave\` — animasi melambai
- \`/dance\` — animasi menari
- \`/bow\` — animasi membungkuk
- \`/think\` — animasi berpikir
- \`/laugh\` — animasi tertawa

AI juga bisa memicu animasi secara otomatis berdasarkan konteks percakapan.`,
      },
    ],
  },
  {
    id: 'suara',
    icon: <Volume2 className="w-4 h-4" />,
    title: 'Text-to-Speech',
    items: [
      {
        id: 'tts-options',
        title: 'Pilihan TTS',
        content: `Voxie mendukung 3 mesin TTS:

**Web Speech** (Gratis)
- Suara bawaan browser/OS
- Tidak perlu koneksi khusus
- Kualitas tergantung OS

**ElevenLabs** (Pro)
- Suara AI berkualitas tinggi
- Sangat natural dan ekspresif
- Difilter otomatis sesuai gender model

**VITS Anime** (Semua)
- Suara karakter anime dari Umamusume
- Kualitas audio anime tinggi
- Mendukung auto-translate ke Jepang`,
      },
      {
        id: 'ganti-suara',
        title: 'Cara Ganti Suara',
        content: `1. Buka **Pengaturan** → bagian **Text-to-Speech**
2. Klik kartu TTS yang ingin digunakan
3. Pilih suara dari daftar (difilter sesuai gender model)
4. Klik **Preview** untuk mendengar sampel
5. Suara langsung aktif untuk percakapan berikutnya`,
      },
    ],
  },
  {
    id: 'tampilan',
    icon: <Palette className="w-4 h-4" />,
    title: 'Background & Tampilan',
    items: [
      {
        id: 'ganti-bg',
        title: 'Ganti Background',
        content: `1. Klik ikon **layers** (tumpukan) di panel kanan
2. Pilih tab **Preset** untuk background bawaan
3. Atau tab **Gambar** untuk upload foto sendiri (Pro)
4. Klik background yang diinginkan

Background akan langsung berubah tanpa reload.`,
      },
      {
        id: 'ambient',
        title: 'Efek Ambient',
        content: `Efek ambient menambahkan partikel animasi di atas background:

- 🌸 **Sakura** — kelopak bunga sakura berjatuhan
- 🌧️ **Hujan** — efek hujan deras
- ❄️ **Salju** — salju lembut berjatuhan  
- 🍃 **Daun** — daun gugur musim gugur

Efek ambient tersedia untuk pengguna **Pro**.`,
      },
      {
        id: 'kamera',
        title: 'Kontrol Kamera',
        content: `Klik ikon **kamera** untuk mengatur sudut pandang:

- **Close-up** — wajah karakter
- **Medium Shot** — setengah badan
- **Full Body** — seluruh badan
- **Free Mode** — geser/zoom bebas dengan mouse/touch`,
      },
    ],
  },
  {
    id: 'pengaturan',
    icon: <Settings className="w-4 h-4" />,
    title: 'Pengaturan Lanjutan',
    items: [
      {
        id: 'bahasa',
        title: 'Preferensi Bahasa',
        content: `Voxie mendukung deteksi bahasa otomatis. Kamu bisa mengatur bahasa default di **Pengaturan → Preferensi Bahasa**:

- Indonesia (default)
- English
- 日本語 (Japanese)
- 한국어 (Korean)
- 中文 (Chinese)
- ภาษาไทย (Thai)
- Tiếng Việt (Vietnamese)`,
      },
      {
        id: 'subtitle',
        title: 'Subtitle / CC',
        content: `Subtitle menampilkan teks yang sedang diucapkan karakter di layar.

- Klik tombol **CC** di panel chat untuk toggle
- Subtitle muncul di bagian bawah layar saat karakter berbicara
- Berguna untuk lingkungan tanpa suara`,
      },
    ],
  },
];

export default function Docs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState(() => searchParams.get('s') ?? 'mulai');
  const [activeItem, setActiveItem] = useState(() => searchParams.get('i') ?? 'intro');

  // Sync URL when navigation changes
  const navigate = (sectionId: string, itemId: string) => {
    setActiveSection(sectionId);
    setActiveItem(itemId);
    setSearchParams({ s: sectionId, i: itemId }, { replace: true });
  };

  // Validate params on mount
  useEffect(() => {
    const s = searchParams.get('s');
    const i = searchParams.get('i');
    const section = SECTIONS.find(sec => sec.id === s);
    if (section) {
      const item = section.items.find(it => it.id === i);
      if (item) {
        setActiveSection(s!);
        setActiveItem(i!);
      } else {
        setActiveItem(section.items[0].id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentSection = SECTIONS.find(s => s.id === activeSection);
  const currentItem = currentSection?.items.find(i => i.id === activeItem);

  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-bold text-white/90 mt-3 mb-1">{line.slice(2, -2)}</p>;
      }
      if (line.match(/^\d+\./)) {
        return <p key={i} className="text-white/70 text-sm leading-relaxed pl-2">{line}</p>;
      }
      if (line.startsWith('- ')) {
        return (
          <p key={i} className="text-white/70 text-sm leading-relaxed pl-2 flex gap-2">
            <span className="text-violet-400 shrink-0">•</span>
            <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-white/90">$1</strong>').replace(/`(.*?)`/g, '<code class="bg-white/10 px-1 py-0.5 rounded text-violet-300 text-xs font-mono">$1</code>') }} />
          </p>
        );
      }
      if (line === '') return <div key={i} className="h-2" />;
      return (
        <p key={i} className="text-white/70 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white/90">$1</strong>').replace(/`(.*?)`/g, '<code class="bg-white/10 px-1 py-0.5 rounded text-violet-300 text-xs font-mono">$1</code>') }}
        />
      );
    });
  };

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
      <MetaTags title="Dokumentasi" description="Panduan lengkap menggunakan Voxie — cara upload model VRM, mengatur suara, chat, background, dan fitur lainnya." />
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#07070f]/90 backdrop-blur-xl shrink-0">
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
          <span className="text-sm text-white/60">Dokumentasi</span>
        </div>
      </div>

      <div className="flex flex-1 max-w-6xl mx-auto w-full px-4 py-8 gap-6">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 hidden md:block">
          <div className="sticky top-20 space-y-1">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Panduan</span>
            </div>
            {SECTIONS.map((section) => (
              <div key={section.id}>
                <button
                  onClick={() => { navigate(section.id, section.items[0].id); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeSection === section.id
                      ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  {section.icon}
                  {section.title}
                </button>
                {activeSection === section.id && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-white/[0.07] pl-3">
                    {section.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => navigate(section.id, item.id)}
                        className={`w-full text-left text-xs py-1.5 px-2 rounded transition-all ${
                          activeItem === item.id
                            ? 'text-violet-300 font-medium'
                            : 'text-white/40 hover:text-white/70'
                        }`}
                      >
                        {item.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {/* Mobile section picker */}
          <div className="md:hidden mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => { navigate(s.id, s.items[0].id); }}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  activeSection === s.id
                    ? 'bg-violet-500/15 text-violet-300 border-violet-500/25'
                    : 'text-white/50 border-white/10 hover:border-white/20'
                }`}
              >
                {s.icon} {s.title}
              </button>
            ))}
          </div>

          {currentItem && (
            <div className="space-y-6">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-xs text-white/30">
                <span>{currentSection?.title}</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-white/60">{currentItem.title}</span>
              </div>

              {/* Article */}
              <div className="rounded-2xl border border-white/[0.07] p-6 space-y-3"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                <h1 className="text-xl font-black text-white">{currentItem.title}</h1>
                <div className="space-y-1.5">
                  {renderContent(currentItem.content)}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                {(() => {
                  const allItems = SECTIONS.flatMap(s => s.items.map(i => ({ ...i, sectionId: s.id })));
                  const idx = allItems.findIndex(i => i.id === activeItem);
                  const prev = allItems[idx - 1];
                  const next = allItems[idx + 1];
                  return (
                    <>
                      {prev ? (
                        <button onClick={() => { navigate(prev.sectionId, prev.id); }}
                          className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors">
                          <ArrowLeft className="w-3.5 h-3.5" /> {prev.title}
                        </button>
                      ) : <div />}
                      {next ? (
                        <button onClick={() => { navigate(next.sectionId, next.id); }}
                          className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors">
                          {next.title} <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      ) : <div />}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
