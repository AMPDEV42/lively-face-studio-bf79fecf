# Voxie Pricing Strategy Update — April 2026

## Ringkasan Perubahan

Voxie beralih dari model **4-tier** (Starter/Pro/Business/Enterprise) ke model **2-tier + top-up** yang lebih sederhana dan fokus.

---

## Struktur Pricing Baru

### Langganan Bulanan

| Plan | Harga | Pesan/bulan | TTS Premium | Target User |
|------|-------|-------------|-------------|-------------|
| **Starter** | Gratis | 50 | ❌ | Personal, trial |
| **Pro** | Rp 99.000 | 1.500 | ✅ OpenAI TTS | Kreator, pengguna aktif |

### Paket Top-Up (Khusus Pro)

| Paket | Harga | Pesan | TTS Chars | Per Pesan |
|-------|-------|-------|-----------|-----------|
| Mini | Rp 10.000 | +100 | +3.000 | Rp 100 |
| Standar | Rp 25.000 | +300 | +10.000 | Rp 83 |
| Hemat | Rp 50.000 | +700 | +25.000 | Rp 71 |

**Keunggulan top-up:**
- Sisa top-up **tidak hangus** — terbawa ke bulan berikutnya
- User bisa beli sesuai kebutuhan tanpa upgrade plan
- Margin tetap positif per pesan

---

## Alasan Perubahan

### 1. Simplifikasi UX
- 4 tier membingungkan user — kebanyakan pilihan
- 2 tier lebih jelas: gratis vs berbayar
- Top-up memberikan fleksibilitas tanpa kompleksitas

### 2. Margin Positif di Semua Skenario

**Kalkulasi biaya per pesan (worst case — full TTS):**
- AI (Gemini 3 Flash): $0.0007 (~Rp 11)
- OpenAI TTS: $0.0015 (~Rp 24)
- **Total: ~Rp 35/pesan**

**Revenue per pesan:**
- Pro (1.500 pesan): Rp 99.000 / 1.500 = **Rp 66/pesan**
- Top-up Hemat: Rp 50.000 / 700 = **Rp 71/pesan**

Margin: **Rp 31-36/pesan** (~50-55%) ✅

### 3. Kompetitor Benchmark

| Produk | Harga | Pesan/bulan | Per pesan |
|--------|-------|-------------|-----------|
| Replika Pro | ~Rp 320K | ~unlimited* | — |
| Character.AI+ | ~Rp 160K | ~unlimited* | — |
| **Voxie Pro** | **Rp 99K** | **1.500** | **Rp 66** |

*Unlimited dengan throttling tersembunyi

Voxie tetap **paling murah** di kelasnya dengan diferensiasi 3D VRM yang unik.

---

## Perubahan Teknis yang Dilakukan

### File yang Diubah

1. **`src/lib/plan-config.ts`**
   - Hapus `business` & `enterprise` dari `PlanId`
   - Tambah `TOP_UP_PACKAGES` config
   - Update limits Pro: 1.500 pesan, 50K TTS chars
   - Rename `elevenLabsTTS` → `premiumTTS`
   - Tambah field `ttsCharsPerMonth`

2. **`src/hooks/usePlan.ts`**
   - Tambah `topUpMessages` & `topUpTtsChars` ke `StoredUsage`
   - Tambah method `applyTopUp(messages, ttsChars)`
   - Update `canSendMessage()` untuk hitung total quota (langganan + top-up)
   - Update `canUsePremiumTTS()` untuk hitung total TTS quota
   - Migrasi otomatis data lama tanpa field baru

3. **`src/pages/Pricing.tsx`**
   - Sederhanakan jadi 2 plan (Starter + Pro)
   - Tambah section top-up packages dengan 3 pilihan
   - Update comparison table
   - Tambah FAQ tentang top-up

4. **`src/pages/Landing.tsx`**
   - Update pricing section jadi 2 plan
   - Update harga dan fitur

5. **`src/components/UpgradeModal.tsx`**
   - Update highlights Pro
   - Update harga Rp 99.000
   - Tambah mention top-up

6. **`src/lib/vits-tts.ts`**
   - Support `VITE_HF_VITS_SPACE_URL` env variable untuk private HF Space
   - Priority: localStorage → env var → public fallback

7. **`.env.example`**
   - Tambah `VITE_HF_VITS_SPACE_URL` dengan dokumentasi

---

## Langkah Selanjutnya (Backend — via Lovable)

### Prioritas Tinggi

1. **Migrasi TTS: ElevenLabs → OpenAI**
   - Update `supabase/functions/tts/index.ts`
   - Ganti endpoint ke `https://api.openai.com/v1/audio/speech`
   - Tambah `OPENAI_API_KEY` ke Lovable Cloud secrets
   - Update tabel `voice_settings` dengan voice OpenAI (nova, shimmer, alloy, echo, fable, onyx)

2. **Backend Enforcement Usage**
   - Pindahkan counter dari localStorage ke Lovable Cloud database
   - Tambah tabel `user_usage` dengan kolom: user_id, month, messages, tokens, tts_chars, top_up_messages, top_up_tts_chars
   - Enforce limit di Edge Function `chat` sebelum proses request

3. **Payment Gateway Integration**
   - Integrasi Midtrans atau Xendit untuk pasar Indonesia
   - Endpoint untuk aktivasi Pro subscription
   - Endpoint untuk pembelian top-up packages
   - Webhook untuk konfirmasi pembayaran → update user role + apply top-up

### Prioritas Sedang

4. **HuggingFace Private Space**
   - Duplicate Space `plachta/VITS-Umamusume-voice-synthesizer` ke akun HF Pro kamu
   - Set visibility Private
   - Update `VITE_HF_VITS_SPACE_URL` di Lovable Cloud env vars
   - Simpan `VITE_HUGGINGFACE_TOKEN` di secrets (jangan expose ke frontend)

5. **Analytics Dashboard**
   - Implementasi tracking usage real-time
   - Dashboard untuk monitor biaya per user
   - Alert jika ada user yang abuse (>100 pesan/hari)

---

## Proyeksi P&L dengan Pricing Baru

### Asumsi
- 70% user Pro pakai rata-rata 600 pesan/bulan (normal usage)
- 20% user Pro pakai 1.500 pesan penuh (heavy user)
- 10% user Pro beli top-up 1x/bulan (Paket Standar Rp 25K)

### Skenario: 100 Paying Pro Users

| Revenue | |
|---------|---|
| Langganan Pro (100 × Rp 99K) | Rp 9.9 juta (~$610) |
| Top-up (10 × Rp 25K) | Rp 250K (~$15) |
| **Total Revenue** | **~$625** |

| Biaya | |
|-------|---|
| Lovable Cloud (fixed) | ~$35 |
| AI (70 × 600 + 20 × 1.500 + 10 × 300 pesan) | ~$42 |
| OpenAI TTS (50% usage) | ~$21 |
| HuggingFace Pro | $9 |
| **Total Cost** | **~$107** |

| **Profit** | **~$518** |
| **Margin** | **~83%** ✅ |

Margin sangat sehat bahkan dengan asumsi konservatif.

---

## Kesimpulan

Perubahan ini membuat Voxie:
- ✅ Lebih mudah dipahami user (2 pilihan jelas)
- ✅ Margin positif di semua skenario usage
- ✅ Fleksibel dengan sistem top-up
- ✅ Tetap kompetitif vs kompetitor global
- ✅ Scalable — biaya tumbuh linear dengan revenue

Fokus sekarang: implementasi payment gateway dan backend enforcement sebelum public launch.
