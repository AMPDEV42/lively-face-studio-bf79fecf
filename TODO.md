# Voxie — To-Do List Selanjutnya

> Semua item di bawah ini **100% frontend-only** — tidak ada koneksi/update ke backend/Supabase.

---

## 🔴 Bug Fix (Prioritas Tinggi)

### 1. `updateIdleExpression` return value tidak dipakai dengan benar
- **File:** `src/lib/idle-expression-advanced.ts`
- **Masalah:** Fungsi `updateIdleExpression` di akhir ada `return { name, mood }` tapi TypeScript return type-nya `void`. Di `VrmViewer.tsx` line ~580 ada `const result = updateIdleExpression(...)` tapi TypeScript akan error karena return type mismatch.
- **Fix:** Ubah return type fungsi jadi `{ name: string; mood: string } | void` atau buat fungsi getter terpisah `getIdleExpressionState()`.

### 2. Camera jitter saat `isSpeaking` menggunakan `currentMessage` tanpa guard
- **File:** `src/components/VrmViewer.tsx` (render loop)
- **Masalah:** `currentMessage.length` bisa throw jika `currentMessage` undefined (prop tidak selalu diisi).
- **Fix:** Tambah fallback `(currentMessage ?? '').length`.

### 3. `eased` dihitung ulang per-key dalam loop lerp tapi seharusnya per-transisi
- **File:** `src/lib/idle-expression-advanced.ts` fungsi `updateIdleExpression`
- **Masalah:** `const isEaseOut = Math.random() < 0.7` dipanggil di dalam loop `_transitioning` — artinya setiap key bisa dapat easing berbeda dalam satu frame, menyebabkan ekspresi "robek".
- **Fix:** Pindahkan `isEaseOut` dan `eased` ke luar loop key, hitung sekali per frame.

---

## 🟡 Improvement UX

### 4. Subtitle/CC teks terpotong di mobile
- **File:** `src/components/VrmViewer.tsx` (subtitle render section)
- **Masalah:** Teks panjang dari AI tidak di-truncate/wrap dengan baik di layar kecil.
- **Fix:** Tambah `max-w` + `line-clamp-3` + fade gradient di bawah teks subtitle.

### 5. Chat panel tidak ada indikator "AI sedang mengetik" yang jelas
- **File:** `src/components/ChatPanel.tsx`
- **Masalah:** Saat `isLoading = true`, hanya ada spinner kecil. Tidak ada animasi "typing dots" yang terlihat di message list.
- **Fix:** Tambah bubble "typing indicator" (3 titik animasi) di akhir message list saat `isLoading`.

### 6. Tombol Stop (■) tidak muncul saat VITS sedang memproses
- **File:** `src/components/ChatPanel.tsx`
- **Masalah:** `isTTSLoading` state ada tapi tidak dipakai untuk menampilkan tombol stop di input bar saat VITS sedang generate audio.
- **Fix:** Gabungkan kondisi `isLoading || isTTSLoading` untuk tampilkan tombol stop.

### 7. Web Speech voice list tidak refresh saat tab kembali aktif
- **File:** `src/components/TTSSettings.tsx`
- **Masalah:** `listWebSpeechVoices()` hanya dipanggil saat mount + `voiceschanged`. Jika user buka settings setelah lama idle, list bisa kosong.
- **Fix:** Tambah listener `visibilitychange` untuk refresh voices saat tab kembali aktif.

---

## 🟢 Fitur Baru (Frontend Only)

### 8. Keyboard shortcut untuk ganti kamera preset
- **File:** `src/hooks/useKeyboardShortcuts.ts`, `src/pages/Index.tsx`
- **Fitur:** Tekan `1`, `2`, `3`, `4` untuk switch ke preset kamera (close-up, medium, full-body, wide).
- **Implementasi:** Tambah handler di `useKeyboardShortcuts`, pass `onCameraPreset` callback ke Index.

### 9. Tombol "Replay TTS" di bubble pesan AI
- **File:** `src/components/ChatPanel.tsx`
- **Fitur:** Setiap bubble pesan AI punya tombol kecil 🔊 untuk replay TTS pesan tersebut.
- **Implementasi:** Tambah `onReplay` handler per message, gunakan `handleRetryTTS` yang sudah ada.

### 10. Idle animation preview di `IdlePresetSelector`
- **File:** `src/components/IdlePresetSelector.tsx`
- **Fitur:** Hover/tap pada preset idle menampilkan nama animasi yang akan dipakai.
- **Implementasi:** Tambah tooltip dengan nama clip dari `useIdlePreset` hook.

### 11. Indikator mood aktif di HUD
- **File:** `src/components/HolographicHud.tsx`
- **Fitur:** Tampilkan mood saat ini (happy/sad/curious/dll) sebagai badge kecil di HUD.
- **Implementasi:** Terima prop `currentMood` dari VrmViewer (sudah ada `currentMoodName` state), render badge dengan warna sesuai mood.

### 12. Slash command `/help` di chat
- **File:** `src/components/ChatPanel.tsx`
- **Fitur:** Ketik `/help` di chat → tampilkan daftar slash command yang tersedia (`/dance`, `/wave`, `/bow`, dll).
- **Implementasi:** Tambah case di slash command interceptor, render sebagai pesan sistem (bukan dikirim ke AI).

---

## 🔵 Refactor / Code Quality

### 13. Hapus `console.log` debug yang berlebihan di idle expression
- **File:** `src/lib/idle-expression-advanced.ts`
- **Masalah:** Ada banyak `console.log` yang masih aktif (setiap transisi, setiap mood override, dll) — noise di production.
- **Fix:** Wrap semua log dengan `if (import.meta.env.DEV)` atau hapus yang tidak perlu.

### 14. Extract konstanta magic number di `VrmViewer.tsx`
- **File:** `src/components/VrmViewer.tsx`
- **Masalah:** Banyak angka hardcoded (jitter intensity `0.008`, zoom target `0.7`, dll) tersebar di render loop.
- **Fix:** Pindahkan ke konstanta bernama di atas komponen.

### 15. `ChatPanel.tsx` terlalu besar (1119 baris) — split komponen
- **File:** `src/components/ChatPanel.tsx`
- **Refactor:** Pisahkan menjadi:
  - `ChatMessageList.tsx` — render daftar pesan
  - `ChatInputBar.tsx` — input + tombol kirim + speech mode
  - `ChatHistoryPanel.tsx` — sidebar riwayat percakapan
  - `ChatPanel.tsx` — orchestrator (state + logic saja)

---

## Urutan Pengerjaan yang Disarankan

1. Bug #1, #2, #3 (fix dulu sebelum lanjut)
2. UX #5, #6 (paling terasa oleh user)
3. Fitur #9, #12 (quick win, tidak banyak kode)
4. Fitur #8, #11 (butuh sedikit wiring)
5. Refactor #13, #14, #15 (bisa dikerjakan kapan saja)
