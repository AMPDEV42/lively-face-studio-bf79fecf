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
- **File:** `src/components/BackgroundSelector.tsx` (atau panel ambient yang ada)
- **Masalah:** Efek partikel (sakura, hujan, salju, daun) tidak bisa diatur intensitasnya — hanya on/off.
- **Fix:** Tambah slider 0–100% untuk mengontrol jumlah partikel. Simpan ke localStorage. Default 100%.
- **Implementasi:** Tambah state `ambientIntensity` di Index.tsx, pass ke VrmViewer, gunakan sebagai multiplier untuk jumlah partikel yang di-render.

### 2. Typing speed variation — dots lebih ekspresif
- **File:** `src/components/ChatMessageList.tsx`
- **Masalah:** Dots animasi "mengetik" selalu sama kecepatannya.
- **Fix:** Variasikan kecepatan animasi dots berdasarkan panjang pesan terakhir. Implementasi via CSS variable `--dot-speed` yang di-set dinamis.

---

## 🟢 Fitur Baru (Frontend Only)

### 3. Expression presets panel
- **File:** Baru: `src/components/ExpressionPanel.tsx`, update `VrmViewer.tsx`
- **Fitur:** Panel kecil dengan tombol ekspresi cepat: 😊 Happy, 😢 Sad, 😠 Angry, 😲 Surprised, 😳 Embarrassed.
- **Implementasi:** Klik tombol → panggil `viewerRef.current.applyBlendshape(...)`. Toggle panel dengan shortcut `E`. Daftarkan `E` di `KeyboardShortcutsHelp`.

### 4. Conversation tagging / kategori
- **File:** `src/components/ChatHistoryPanel.tsx`, `src/hooks/useConversations.ts`
- **Fitur:** User bisa assign tag ke percakapan (misal: "Roleplay", "Belajar", "Santai"). Filter percakapan by tag.
- **Implementasi:** Tambah field `tags: string[]` ke `StoredConversation`. UI: chip input di rename dialog. Filter bar di atas list percakapan.

### 5. Loading state tombol Send saat transisi
- **File:** `src/components/ChatInputBar.tsx`
- **Masalah:** Ada gap antara klik Send dan chunk pertama tiba — tombol tidak ada visual disabled yang jelas.
- **Fix:** Tambah `opacity-50 cursor-wait` ke tombol Send selama `isLoading && !isStreaming` (sebelum chunk pertama).

---

## 🔵 Refactor / Code Quality

### 6. Extract conversation store logic ke custom hook terpisah
- **File:** `src/hooks/useConversations.ts` (sudah ada, tapi bisa lebih clean)
- **Masalah:** `pinConversation`, `deleteConversation`, dll bisa dikelompokkan lebih rapi.
- **Fix:** Tambah tipe `ConversationActions` yang mengekspos semua method dengan API yang konsisten.

---

## Urutan Pengerjaan yang Disarankan

1. UX #1 (Ambient intensity slider) — high value
2. Fitur #3 (Expression presets) — visual polish
3. Fitur #4 (Conversation tagging) — butuh perubahan store
4. UX #2 (Typing dots variation) — quick win
5. Fitur #5 (Send button loading state) — 5 menit
6. Refactor #6 — kapan saja
