

## Plan: Persona AI Enhancement + Gender-aware TTS Voice Picker

Melanjutkan rencana yang sudah disetujui. Build error sudah selesai diperbaiki di turn sebelumnya — sekarang fokus ke 5 fitur utama.

### Bagian 1 — AI Enhance Persona di ModelManager

- Edge function baru `supabase/functions/enhance-personality/index.ts` pakai Lovable AI Gateway (`google/gemini-3-flash-preview`).
- System prompt minta hasil terstruktur: nama panggilan, gaya bicara, kepribadian inti, gaya humor, do/don't, bahasa default.
- Input: `{ name, gender, currentPersonality }`. Output: `{ personality: string }`.
- `ModelManager.tsx`: tombol "✨ Enhance dengan AI" di samping Textarea personality, loading state, replace isi field saat selesai. Toast on error (handle 429/402).

### Bagian 2 — Gender hanya Male/Female

- Migration: ubah `vrm_models.gender` default `'female'`, backfill row `'other'` → `'female'`, tambah CHECK constraint `IN ('male','female')`.
- `ModelManager.tsx` line 211: hapus `<SelectItem value="other">`. Default upload baru = `'female'`.

### Bagian 3 — Web Speech voice (termasuk pria)

- Ya, tersedia tergantung OS user. macOS/Windows umumnya menyediakan beberapa voice pria; UI akan menampilkan list aktual.
- `src/lib/web-speech-tts.ts`: tambah `listWebSpeechVoices()` return `{ voiceURI, name, lang, gender }[]` dengan heuristik regex (`male|man|pria|laki|david|mark|alex|daniel` → male; `female|woman|wanita|sarah|lily|alice` → female; sisanya `unknown`).
- Tambah `setWebSpeechVoice(voiceURI)` & `getWebSpeechVoice()` simpan ke localStorage `vrm.webspeech_voice`.
- `speakWithWebSpeech()`: pakai voice tersimpan dulu sebelum auto-pick.

### Bagian 4 — Persona dipakai sebagai system prompt

- `supabase/functions/chat/index.ts`: restructure system prompt jadi blok terpisah:
  ```
  # Persona
  {personality dari vrm_models aktif}
  
  # Behavior rules
  Selalu jawab dalam karakter persona di atas. Jangan menyebut bahwa kamu AI/model bahasa kecuali persona memintanya.
  
  # Animation catalog
  {existing animation list}
  ```
- Existing flow `personality → systemPrompt` sudah jalan, hanya perkuat strukturnya.

### Bagian 5 — Gender-aware TTS Voice Picker

- **Migration**: tambah kolom `voice_settings.gender text NOT NULL DEFAULT 'female'` (CHECK in `'male','female'`). Backfill berdasarkan nama (Roger/George/Charlie/Liam/Will/Brian/Daniel/Eric/Chris/Bill/Callum → male; Sarah/Laura/Alice/Matilda/Jessica/Lily/Mrs Claus/River → female).
- **`Settings.tsx`**: load active model gender, pass ke `TTSSettings`. Hapus standalone `VoiceSelector` (digabung ke dalam TTSSettings).
- **`TTSSettings.tsx` redesign**:
  - Props baru: `activeModelGender: 'male'|'female'`, `voices: VoiceRow[]`.
  - Klik kartu **ElevenLabs** → expand inline: dropdown voice ElevenLabs di-filter `gender = activeModelGender`, tombol Preview, set active.
  - Klik kartu **Web Speech** → expand inline: dropdown `listWebSpeechVoices()` filter by gender (group "Tidak diketahui" untuk fallback), tombol Preview, simpan ke localStorage.
  - Badge gender di tiap voice row.

### File yang dibuat/diubah

**Migration (schema)**:
- `vrm_models.gender`: default `'female'`, backfill, CHECK constraint.
- `voice_settings`: tambah kolom `gender`, backfill data existing.

**Edge function baru**:
- `supabase/functions/enhance-personality/index.ts`

**Code**:
- `src/components/ModelManager.tsx` — tombol AI enhance, hapus opsi Other.
- `src/components/TTSSettings.tsx` — expandable cards + dropdown voice gender-filtered (gabung ElevenLabs + Web Speech picker).
- `src/lib/web-speech-tts.ts` — `listWebSpeechVoices()`, `setWebSpeechVoice()`, gender heuristik.
- `src/pages/Settings.tsx` — load active model gender, hapus VoiceSelector standalone.
- `supabase/functions/chat/index.ts` — restructure system prompt blok Persona.

### Hasil yang diharapkan

1. ✅ Tombol AI Enhance generate/perbaiki deskripsi persona model.
2. ✅ Gender hanya Male/Female; default Female.
3. ✅ Web Speech menampilkan voice pria yang tersedia di OS user.
4. ✅ Persona model otomatis dipakai sebagai system prompt AI dengan struktur konsisten.
5. ✅ Klik kartu TTS → expand dropdown voice yang difilter sesuai gender model aktif, dengan tombol preview.

