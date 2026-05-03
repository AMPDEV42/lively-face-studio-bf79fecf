
## Tujuan

1. Setelah user sukses bayar di Midtrans Snap, otomatis redirect ke halaman aplikasi yang menampilkan status langganan terbaru (bukan tetap di /pricing).
2. Tambah DeepSeek sebagai fallback otomatis ketika Lovable AI Gateway mengembalikan 429 (rate limit) atau 402 (kredit habis), supaya chat & AI Enhance Persona tetap jalan.

---

## Bagian 1 — Redirect setelah pembayaran sukses

### Perubahan `src/pages/Pricing.tsx`

Saat ini handler hanya menampilkan toast lalu memanggil `refreshUsage()`. Tambahkan navigasi:

- **Pro upgrade success** → tunggu webhook fulfill (poll `usage_log`/`user_roles` lewat `refreshUsage`), lalu `navigate('/app?upgraded=pro')` setelah delay singkat (~1.5 dtk untuk webhook).
- **Top-up success** → `navigate('/app?topup=ok')` setelah delay singkat.
- **Pending** (mis. VA/QRIS) → `navigate('/profile?order=pending')` agar user bisa lihat status order di profile.

### Perubahan `src/pages/Index.tsx` (atau halaman /app utama)

Baca query param `?upgraded=pro` / `?topup=ok` saat mount → tampilkan toast konfirmasi sekali (`sonner`), lalu hapus param dari URL via `navigate(pathname, { replace: true })`.

### Perubahan `src/pages/Profile.tsx`

Tambah section ringkas "Status Langganan" yang menampilkan:
- Plan saat ini (Free/Pro/Admin) dari `useUserRole`
- `pro_until` dari `profiles` (kalau Pro)
- Sisa kuota pesan & top-up dari `usePlan().stats`
- Tombol "Lihat detail penggunaan" → `/usage` dan "Kelola langganan" → `/pricing`

Tujuannya: user yang baru bayar langsung punya tempat untuk konfirmasi visual bahwa langganannya aktif.

### Polling pendek pasca-pembayaran

Webhook Midtrans butuh ~1-3 detik untuk fulfill order. Di handler `onSuccess`:

```text
1. toast.success('Pembayaran berhasil! Mengaktifkan langganan...')
2. polling refreshUsage + roles refetch tiap 1.5s, max 5x
3. setelah role 'pro' terdeteksi (atau iter ke-5) → navigate('/app?upgraded=pro')
```

Untuk top-up: polling `usage_log.topup_messages` membesar.

---

## Bagian 2 — DeepSeek sebagai fallback Lovable AI

### Secret baru

Tambah `DEEPSEEK_API_KEY` ke Supabase secrets (nilai: yang user berikan). Akan diminta lewat `add_secret` saat eksekusi.

### Helper bersama: `supabase/functions/_shared/ai-completion.ts`

Buat helper baru (file di-include via relative import oleh tiap edge function — Deno mendukung ini):

```text
callAI({ messages, stream, model, reasoning? }) {
  1. Coba Lovable AI Gateway (https://ai.gateway.lovable.dev/v1/chat/completions)
     dengan model 'google/gemini-3-flash-preview' (atau model yang diminta).
  2. Jika respons 429 atau 402 → fallback ke DeepSeek
     (https://api.deepseek.com/v1/chat/completions, model 'deepseek-chat',
      pakai DEEPSEEK_API_KEY).
  3. Format request/response DeepSeek sudah OpenAI-compatible (termasuk SSE
     'data: {...}\n\n' dengan choices[0].delta.content), jadi stream bisa di-passthrough
     ke client tanpa perubahan parser frontend.
  4. Map error kalau dua-duanya gagal → propagate status code asli.
  5. Return: { response: Response, provider: 'lovable' | 'deepseek' }
}
```

Catatan teknis:
- DeepSeek tidak punya `google/*` model — kalau caller minta Gemini, pemetaan: → `deepseek-chat` (default), atau `deepseek-reasoner` untuk task "reasoning".
- Tool calling juga didukung DeepSeek dengan format OpenAI; cukup untuk `enhance-personality`.

### Update `supabase/functions/chat/index.ts`

- Ganti `fetch('https://ai.gateway.lovable.dev/...')` dengan `callAI(...)`.
- Tetap stream `response.body` ke client; tambah header `X-AI-Provider: lovable|deepseek` untuk debugging.
- Kalau fallback dipakai, tetap hitung quota di `usage_log` seperti sekarang.

### Update `supabase/functions/enhance-personality/index.ts`

- Ganti panggilan langsung ke Lovable AI dengan `callAI(...)` (non-stream / `stream:false`).
- Pastikan respons JSON tetap konsisten.

### TTS

`supabase/functions/tts/index.ts` pakai ElevenLabs, bukan Lovable AI → tidak perlu fallback DeepSeek.

### Frontend

Tidak ada perubahan parser. Opsional: `src/lib/chat-api.ts` baca header `X-AI-Provider` dan simpan di console untuk debugging — tidak ditampilkan ke user.

---

## Detail Teknis Lainnya

- DeepSeek SSE menggunakan format yang sama dengan OpenAI/Lovable Gateway, sehingga `streamChat()` di frontend tidak perlu diubah.
- Fallback hanya dipicu pada status `429` atau `402` dari Lovable; error lain tetap dipropagasi sebagai 500 supaya tidak menyembunyikan bug.
- Tambah log `console.warn('[AI fallback] Lovable -> DeepSeek', { status })` di edge function untuk monitoring.
- Update memory dengan catatan: "AI fallback chain: Lovable AI → DeepSeek (429/402 only)".

---

## Daftar File yang Akan Dibuat/Diubah

**Baru:**
- `supabase/functions/_shared/ai-completion.ts` — helper `callAI()` dengan fallback.

**Diubah:**
- `supabase/functions/chat/index.ts` — pakai helper.
- `supabase/functions/enhance-personality/index.ts` — pakai helper.
- `src/pages/Pricing.tsx` — handler success/pending → polling + navigate.
- `src/pages/Index.tsx` (atau `/app`) — toast dari query param + cleanup URL.
- `src/pages/Profile.tsx` — section Status Langganan.
- `src/hooks/usePlan.ts` — kecil: ekspos refresh roles juga.
- `mem://index.md` — tambah catatan AI fallback.

**Secret baru:**
- `DEEPSEEK_API_KEY`

---

## Hasil yang Diharapkan

1. User klik bayar Pro → Snap popup → bayar berhasil → toast "Mengaktifkan..." → ~2 dtk kemudian otomatis pindah ke `/app` dengan toast konfirmasi Pro aktif. Profile menampilkan status Pro + tanggal kedaluwarsa.
2. Top-up sukses → toast + redirect ke `/app`, kuota baru langsung tampil di banner.
3. Saat Lovable AI mengembalikan 429/402, chat tetap berjalan via DeepSeek tanpa user merasakan downtime; kuota `usage_log` tetap dihitung.
