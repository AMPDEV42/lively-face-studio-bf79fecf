# Voxie — To-Do List Selanjutnya

> Semua item di bawah ini **100% frontend-only** — tidak ada koneksi/update ke backend/Supabase.

---

## ✅ Sudah Selesai (sesi ini)

- **Bug #1** — Stop button sekarang menghentikan VITS audio (`audio.src = ''` + `stopWebSpeech()`)
- **Bug #2** — AI Initiative tidak trigger saat tab hidden (`document.hidden` guard)
- **Bug #3** — `stripForTTS` sekarang juga strip `〜` (U+301C) dan `～` (U+FF5E)
- **UX #4** — Tombol 🔊 Replay TTS di setiap bubble pesan AI (hover)
- **UX #5** — Slash command `/help` menampilkan daftar command sebagai pesan sistem
- **UX #6** — Keyboard shortcut `1`/`2`/`3`/`4` untuk preset kamera
- **UX #7** — Mood indicator di HUD lebih jelas dengan warna per-mood
- **UX #8** — Subtitle di-clamp `line-clamp-3` + `max-h` agar tidak overflow di mobile
- **Fitur #10** — Smart auto-scroll: hanya scroll jika user sudah di bawah, tampilkan tombol "Pesan baru"
- **Fitur #11** — Preferensi kamera disimpan ke localStorage, persist antar reload
- **Fitur #12** — Konfirmasi hapus percakapan via toast dengan tombol Hapus/Batal
- **Fitur #13** — Counter karakter muncul saat >300 karakter, merah saat >450
- **Refactor #16** — Duplikasi VITS di-extract ke helper `runVitsTTS()` (4x → 1x)

---

## 🔴 Bug Fix (Prioritas Tinggi)

### 1. Animasi idle bisa overlap dengan animasi VRMA yang sedang main
- **File:** `src/hooks/useVrmaAnimations.ts`, `src/pages/Index.tsx`
- **Masalah:** Deep Idle timer di `Index.tsx` bisa trigger `playVrmaUrl` saat animasi VRMA lain (dari chat/TTS) masih berjalan, menyebabkan animasi "rebutan".
- **Fix:** Tambah flag `isPlayingVrma` yang di-set saat animasi non-idle sedang main. Deep Idle hanya trigger jika flag ini `false`.

### 2. `handleStop` tidak membatalkan VITS SSE EventSource yang sedang berjalan
- **File:** `src/components/ChatPanel.tsx`, `src/lib/vits-tts.ts`
- **Masalah:** `handleStop()` hanya abort `streamChat` (AbortController), tapi `generateVitsAudio` pakai `EventSource` yang tidak bisa di-abort dengan cara yang sama. Audio VITS tetap di-generate di background.
- **Fix:** Tambah `AbortController` support ke `generateVitsAudio` — saat signal di-abort, tutup `EventSource` dan reject promise.

---

## 🟡 Improvement UX

### 3. Pesan `/help` tidak ikut tersimpan ke riwayat percakapan
- **File:** `src/components/ChatPanel.tsx`
- **Masalah:** Pesan `/help` ditambahkan ke `messages` state tapi tidak disimpan ke Supabase. Saat reload, pesan hilang.
- **Fix:** Ini sebenarnya behavior yang benar (system message tidak perlu disimpan). Tapi perlu ditandai dengan role berbeda agar tidak dikirim ke AI sebagai context. Tambah `role: 'system'` ke `ChatMessage` type dan filter saat build context untuk `streamChat`.

### 4. Tombol "Pesan baru" di scroll button muncul terlalu sering
- **File:** `src/components/ChatPanel.tsx`
- **Masalah:** `onScrollCapture` di `ScrollArea` mungkin tidak bekerja optimal karena ScrollArea menggunakan internal scroll container. Perlu attach ke elemen scroll yang benar.
- **Fix:** Gunakan `useEffect` + `addEventListener` langsung ke `scrollRef.current` daripada `onScrollCapture` prop.

### 5. Keyboard shortcut `1`-`4` tidak ditampilkan di `KeyboardShortcutsHelp`
- **File:** `src/components/KeyboardShortcutsHelp.tsx`
- **Masalah:** Shortcut kamera baru belum terdaftar di panel bantuan keyboard.
- **Fix:** Tambahkan entri `1/2/3/4 — Preset kamera` ke komponen `KeyboardShortcutsHelp`.

---

## 🟢 Fitur Baru (Frontend Only)

### 6. Animasi transisi background lebih smooth
- **File:** `src/components/VrmViewer.tsx`
- **Masalah:** Background sudah punya `bgFadeIn` animation, tapi saat ganti background lama langsung hilang sebelum yang baru muncul — ada flash hitam sebentar.
- **Fix:** Render dua layer background: layer lama fade-out bersamaan dengan layer baru fade-in (crossfade). Gunakan `previousBgUrl` state.

### 7. Indikator loading VITS lebih informatif
- **File:** `src/components/ChatMessageList.tsx`
- **Masalah:** Saat VITS sedang generate audio, hanya ada teks "Generating speech…" tanpa info berapa lama biasanya.
- **Fix:** Tambah estimasi waktu "~5-15 detik" dan progress dots yang lebih ekspresif.

### 8. Simpan posisi scroll chat per-percakapan
- **File:** `src/components/ChatPanel.tsx`
- **Masalah:** Saat switch percakapan lalu kembali, scroll selalu ke bawah. Tidak ada memory posisi scroll.
- **Fix:** Simpan `scrollTop` per `activeId` di `Map` ref. Restore saat switch kembali ke percakapan yang sama.

---

## 🔵 Refactor / Code Quality

### 9. Extract konstanta magic number di `VrmViewer.tsx`
- **File:** `src/components/VrmViewer.tsx`
- **Masalah:** Banyak angka hardcoded (jitter intensity `0.008`, zoom target `0.7`, camera lerp `0.5`, dll) tersebar di render loop — sulit di-tune.
- **Fix:** Pindahkan ke objek konstanta bernama di atas komponen, misal `const CAMERA = { jitterIntensity: 0.008, zoomSpeaking: 0.7, lerpSpeed: 0.5 }`.

### 10. `ChatMessage` type perlu support `role: 'system'`
- **File:** `src/lib/chat-api.ts`
- **Masalah:** Saat ini type hanya `'user' | 'assistant'`. Pesan sistem (seperti `/help` output) tidak bisa dibedakan dari pesan AI biasa.
- **Fix:** Tambah `'system'` ke union type. Filter pesan `system` sebelum dikirim ke `streamChat`.

---

## Urutan Pengerjaan yang Disarankan

1. Bug #2 (VITS abort) — paling impactful untuk UX
2. UX #4 (scroll button fix) — quick fix
3. UX #5 (keyboard shortcuts help) — 5 menit
4. Fitur #6 (crossfade background) — visual polish
5. Refactor #10 (system message type) — prerequisite untuk fitur lain
6. Bug #1 (idle overlap) — butuh testing
