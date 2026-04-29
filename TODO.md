# Voxie — To-Do List Selanjutnya

> Semua item **100% frontend-only** — tidak ada koneksi/update ke backend/Supabase.

---

## ✅ Sudah Diimplementasikan (Sesi Ini)

| # | Item | File |
|---|------|------|
| 1 | Undo hapus percakapan (toast 5 detik) | `ChatHistoryPanel.tsx` |
| 2 | Affection toast `❤️ +1` saat headpat & shoulder tap | `VrmViewer.tsx` |
| 3 | Cooldown feedback shoulder tap ("Tunggu Xs…") | `VrmViewer.tsx` |
| 4 | Message search dengan highlight | `ChatPanel.tsx`, `ChatMessageList.tsx` |
| 5 | Auto-save draft per percakapan | `ChatPanel.tsx` |
| 6 | Conversation pinning (📌 sematkan) | `ChatHistoryPanel.tsx`, `useConversations.ts` |
| 7 | Export Markdown (.md) | `ChatPanel.tsx` |
| 8 | Shortcut `P` toggle ambient particles | `useKeyboardShortcuts.ts`, `Index.tsx` |
| 9 | Label level affection dalam Bahasa Indonesia | `HolographicHud.tsx` |
| 10 | Camera shake saat headpat berhasil | `VrmViewer.tsx` |
| 11 | `/help` command diperbarui dengan shortcut `P` | `ChatPanel.tsx` |
| 12 | `filteredMessages` di-memoize dengan `useMemo` | `ChatPanel.tsx` |

---

## 🔴 Bug Fix (Prioritas Tinggi)

*(Tidak ada bug kritis yang tersisa)*

---

## 🟡 Improvement UX

### 1. Ambient effect intensity slider
- **File:** `src/components/BackgroundSelector.tsx`
- **Masalah:** Efek partikel (sakura, hujan, salju, daun) tidak bisa diatur intensitasnya — hanya on/off.
- **Fix:** Tambah slider 0–100% untuk mengontrol jumlah partikel. Simpan ke localStorage. Default 100%.
- **Implementasi:** Tambah state `ambientIntensity` di Index.tsx, pass ke VrmViewer, gunakan sebagai multiplier untuk jumlah partikel yang di-render.

### 2. Typing speed variation — dots lebih ekspresif
- **File:** `src/components/ChatMessageList.tsx`
- **Masalah:** Dots animasi "mengetik" selalu sama kecepatannya.
- **Fix:** Variasikan kecepatan animasi dots berdasarkan panjang pesan terakhir. Implementasi via CSS variable `--dot-speed` yang di-set dinamis.

### 3. Send button loading state saat transisi
- **File:** `src/components/ChatInputBar.tsx`
- **Masalah:** Ada gap antara klik Send dan chunk pertama tiba — tombol tidak ada visual disabled yang jelas.
- **Fix:** Tambah `opacity-50 cursor-wait` ke tombol Send selama `isLoading && !isStreaming` (sebelum chunk pertama).

### 4. Scroll-to-top button di chat history
- **File:** `src/components/ChatHistoryPanel.tsx`
- **Masalah:** Kalau riwayat percakapan panjang, tidak ada cara cepat kembali ke atas.
- **Fix:** Tampilkan tombol "↑ Ke atas" yang muncul saat scroll > 200px dari atas. Smooth scroll ke top saat diklik.

### 5. Tooltip pada tombol-tombol HUD
- **File:** `src/components/HolographicHud.tsx`
- **Masalah:** Ikon di HUD tidak ada keterangan — user baru tidak tahu artinya.
- **Fix:** Tambah `title` attribute atau tooltip kecil saat hover pada elemen interaktif HUD (level affection, mood badge, session timer).

---

## 🟢 Fitur Baru (Frontend Only)

### 6. Expression presets panel
- **File:** Baru: `src/components/ExpressionPanel.tsx`, update `VrmViewer.tsx`
- **Fitur:** Panel kecil dengan tombol ekspresi cepat: 😊 Happy, 😢 Sad, 😠 Angry, 😲 Surprised, 😳 Embarrassed.
- **Implementasi:** Klik tombol → panggil `viewerRef.current.applyBlendshape(...)`. Toggle panel dengan shortcut `E`. Daftarkan `E` di `KeyboardShortcutsHelp`.

### 7. Conversation tagging / kategori
- **File:** `src/components/ChatHistoryPanel.tsx`, `src/hooks/useConversations.ts`
- **Fitur:** User bisa assign tag ke percakapan (misal: "Roleplay", "Belajar", "Santai"). Filter percakapan by tag.
- **Implementasi:** Tambah field `tags: string[]` ke `StoredConversation`. UI: chip input di rename dialog. Filter bar di atas list percakapan.

### 8. Message reaction / bookmark
- **File:** `src/components/ChatMessageList.tsx`
- **Fitur:** Hover pada pesan → muncul tombol 🔖 bookmark. Pesan yang di-bookmark bisa difilter via toggle "Tampilkan tersimpan".
- **Implementasi:** Simpan `bookmarkedIds: Set<string>` ke localStorage (key per conversationId). Tambah filter toggle di header ChatPanel.

### 9. Slash command `/mood <nama>`
- **File:** `src/components/ChatPanel.tsx`
- **Fitur:** User bisa ketik `/mood happy` untuk langsung trigger ekspresi VRM tanpa mengirim pesan ke AI.
- **Implementasi:** Tambah handler di slash command interceptor. Panggil `onUserMessage` dengan format khusus yang dikenali VrmViewer. Daftarkan di `/help`.

### 10. Konfirmasi sebelum hapus semua percakapan
- **File:** `src/components/ChatPanel.tsx` (dropdown menu "Hapus semua")
- **Masalah:** Tombol "Hapus semua" langsung eksekusi tanpa konfirmasi — berbahaya.
- **Fix:** Tampilkan dialog konfirmasi kecil (inline, bukan modal besar) dengan teks "Yakin? Ini tidak bisa dibatalkan." dan dua tombol: Batal / Hapus Semua.

### 11. Keyboard shortcut `M` untuk mute/unmute TTS
- **File:** `src/hooks/useKeyboardShortcuts.ts`, `src/components/KeyboardShortcutsHelp.tsx`
- **Fitur:** Tekan `M` untuk toggle mute TTS saat sedang berbicara. Simpan preferensi ke localStorage.
- **Implementasi:** Tambah `onToggleMute` ke Shortcuts interface. Tambah entry `M` di `SHORTCUTS` array di `KeyboardShortcutsHelp`.

### 12. Indikator "AI sedang mengetik" yang lebih informatif
- **File:** `src/components/ChatMessageList.tsx`
- **Masalah:** Saat streaming, hanya ada dots — tidak ada info berapa lama sudah menunggu.
- **Fix:** Setelah 5 detik menunggu, tampilkan teks kecil "Masih memproses…" di bawah dots. Reset timer setiap kali chunk baru tiba.

---

## 🔵 Refactor / Code Quality

### 13. Extract conversation store logic ke custom hook terpisah
- **File:** `src/hooks/useConversations.ts`
- **Masalah:** `pinConversation`, `deleteConversation`, dll bisa dikelompokkan lebih rapi.
- **Fix:** Tambah tipe `ConversationActions` yang mengekspos semua method dengan API yang konsisten.

### 14. Pisahkan slash command handler ke file terpisah
- **File:** Baru: `src/lib/slash-commands.ts`, update `ChatPanel.tsx`
- **Masalah:** Blok `if (text.startsWith('/'))` di `handleSend` sudah panjang dan akan terus bertambah.
- **Fix:** Ekstrak ke `handleSlashCommand(cmd, arg, context)` yang mengembalikan `{ handled: boolean; response?: string }`.

---

## Urutan Pengerjaan yang Disarankan

1. UX #3 (Send button loading state) — 5 menit, quick win
2. UX #1 (Ambient intensity slider) — high value, visual
3. Fitur #6 (Expression presets) — visual polish
4. Fitur #10 (Konfirmasi hapus semua) — safety improvement
5. Fitur #8 (Message bookmark) — engagement feature
6. Fitur #7 (Conversation tagging) — butuh perubahan store
7. UX #2 (Typing dots variation) — quick win
8. Fitur #9 (Slash `/mood`) — extends existing system
9. Fitur #11 (Shortcut `M` mute) — keyboard power user
10. Fitur #12 (AI typing indicator) — polish
11. UX #4 (Scroll-to-top history) — minor UX
12. UX #5 (HUD tooltips) — accessibility
13. Refactor #13 & #14 — kapan saja
