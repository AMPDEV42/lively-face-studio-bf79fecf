# Perbaikan Lip Sync untuk Interaction Audio (Headpat & Shoulder Tap)

## Masalah yang Ditemukan

Saat fitur mengelus kepala (headpat) dan menyentuh tubuh (shoulder tap) diaktifkan, audio sound effect berhasil diputar tetapi **mulut model tidak bergerak** seperti berbicara.

### Root Cause Analysis

1. **AudioContext Created Too Early**
   - AudioContext dibuat saat preload (sebelum user interaction)
   - Browser memerlukan user gesture untuk membuat AudioContext
   - Akibatnya: AudioContext dalam state `suspended`

2. **Analyser Setup Timing Issue**
   - Analyser disetup untuk semua audio saat preload (500ms setelah mount)
   - Ini terjadi sebelum user berinteraksi dengan halaman
   - Akibatnya: `createMediaElementSource()` gagal atau tidak terhubung dengan benar

3. **Audio Level Always Zero**
   - Karena analyser tidak terhubung dengan benar, audio level selalu 0
   - Lip sync memerlukan audio level > 0 untuk menggerakkan mulut
   - Akibatnya: Mulut tidak bergerak meskipun audio terdengar

4. **Missing Audio Output Connection**
   - Analyser tidak terhubung ke `destination`
   - Audio tidak terdengar setelah terhubung ke Web Audio API
   - Perlu: `analyser.connect(audioContext.destination)`

## Solusi yang Diterapkan

### 1. Lazy AudioContext Initialization
```typescript
const audioContextInitializedRef = useRef(false);

// AudioContext dibuat HANYA setelah user gesture (headpat/shoulder tap)
const setupInteractionAudioAnalyser = useCallback(async (audio: HTMLAudioElement) => {
  if (!interactionAudioContextRef.current) {
    // Ini akan berhasil karena dipanggil setelah user click/touch
    interactionAudioContextRef.current = new AudioContext();
    // ... setup analyser
  }
  // ...
}, []);
```

### 2. Setup Analyser on First Interaction
```typescript
// Di headpat handler:
if (audio) {
  interactionAudioRef.current = audio;
  
  // Setup analyser HANYA pada interaksi pertama
  if (!audioContextInitializedRef.current) {
    await setupInteractionAudioAnalyser(audio);
    // Setelah setup selesai, baru enable lip sync
    isInteractionSpeakingRef.current = true;
    setIsInteractionSpeaking(true);
  } else {
    // Analyser sudah ready, langsung enable lip sync
    isInteractionSpeakingRef.current = true;
    setIsInteractionSpeaking(true);
  }
}
```

### 3. Proper Audio Graph Connection
```typescript
// CRITICAL: Connect analyser to destination
const source = audioContext.createMediaElementSource(audio);
source.connect(analyser);
analyser.connect(audioContext.destination); // ← PENTING!
```

Tanpa koneksi ke `destination`, audio tidak akan terdengar setelah terhubung ke Web Audio API.

### 4. Remove Preload Analyser Setup
```typescript
// SEBELUM (SALAH):
useEffect(() => {
  preloadHeadpatSfx();
  preloadTapSfx();
  
  setTimeout(() => {
    // Setup analyser untuk semua audio - INI TERLALU DINI!
    headpatPool.forEach(audio => setupInteractionAudioAnalyser(audio));
  }, 500);
}, []);

// SESUDAH (BENAR):
useEffect(() => {
  preloadHeadpatSfx();
  preloadTapSfx();
  // Analyser akan disetup saat interaksi pertama
}, []);
```

## Alur Kerja Setelah Perbaikan

1. **Mount Component**
   - Preload audio files (headpat & tap)
   - AudioContext belum dibuat
   - Analyser belum disetup

2. **User First Interaction** (headpat/shoulder tap)
   - User click/touch → user gesture detected
   - Audio diputar via `playHeadpatSfx()` atau `playShoulderTapSfx()`
   - `setupInteractionAudioAnalyser()` dipanggil:
     - Buat AudioContext (berhasil karena ada user gesture)
     - Buat Analyser node
     - Connect: audio → source → analyser → destination
     - Set `audioContextInitializedRef.current = true`
   - Enable lip sync: `isInteractionSpeakingRef.current = true`

3. **Render Loop**
   - Check `isInteractionSpeakingRef.current === true`
   - Call `getInteractionAudioLevel()`:
     - Read frequency data dari analyser
     - Calculate average level (0-1)
     - Return level untuk lip sync
   - `updateLipSync(level, vrm, delta)` menggerakkan mulut

4. **Audio Ends**
   - Event listener `ended` triggered
   - Disable lip sync: `isInteractionSpeakingRef.current = false`
   - Clear audio reference

5. **Subsequent Interactions**
   - AudioContext sudah ready (`audioContextInitializedRef.current === true`)
   - Skip setup, langsung enable lip sync
   - Reuse existing analyser connection

## Testing Checklist

- [x] Audio terdengar saat headpat
- [x] Audio terdengar saat shoulder tap
- [x] Mulut bergerak saat audio headpat diputar
- [x] Mulut bergerak saat audio shoulder tap diputar
- [x] Tidak ada error AudioContext di console
- [x] Audio level > 0 saat audio diputar (check console log)
- [x] Lip sync berhenti saat audio selesai
- [x] Interaksi kedua dan seterusnya bekerja dengan baik

## Debug Logging

Untuk memverifikasi sistem bekerja, check console log:

```
[Interaction Audio] Audio files preloaded, analyser will be setup on first interaction
[SFX] Headpat → hp_04.mp3 (vol: 0.60)
[Interaction Audio] AudioContext and Analyser created after user gesture
[Interaction Audio] Source node created and connected
[Interaction Audio] Setup complete - Context state: running
[Interaction] Headpat audio playing, lip sync enabled
[Interaction Audio] Level: 0.234 avg: 59.8
[Interaction Audio] Level: 0.187 avg: 47.7
[Lip Sync] Active - isInteractionSpeaking: true level: 0.234
[Interaction] Headpat audio ended, lip sync disabled
```

## Files Modified

- `src/components/VrmViewer.tsx`
  - Added `audioContextInitializedRef` to track initialization state
  - Modified `setupInteractionAudioAnalyser()` to connect analyser to destination
  - Updated preload effect to skip analyser setup
  - Modified headpat handler to setup analyser on first interaction
  - Modified shoulder tap handler to setup analyser on first interaction
  - Updated `getInteractionAudioLevel()` to check initialization state

## Technical Notes

### Why AudioContext Needs User Gesture?

Browser autoplay policy memerlukan user gesture untuk:
- Membuat AudioContext
- Memutar audio
- Resume suspended AudioContext

Ini untuk mencegah website memutar audio tanpa izin user.

### Why Connect to Destination?

Saat audio element terhubung ke Web Audio API via `createMediaElementSource()`:
- Audio tidak lagi diputar langsung ke speaker
- Harus terhubung ke `audioContext.destination` untuk terdengar
- Graph: `source → analyser → destination`

### Performance Considerations

- AudioContext dibuat sekali, reused untuk semua audio
- Analyser node dibuat sekali, reused untuk semua audio
- Source node dibuat per audio element (disimpan di Map)
- Minimal overhead setelah initialization

## Kesimpulan

Masalah lip sync untuk interaction audio telah diperbaiki dengan memindahkan inisialisasi AudioContext dan analyser setup dari preload ke saat user pertama kali berinteraksi. Ini memastikan:

1. AudioContext dibuat setelah user gesture (sesuai browser policy)
2. Analyser terhubung dengan benar ke audio element
3. Audio level terbaca dengan benar untuk lip sync
4. Mulut model bergerak sesuai dengan audio yang diputar

Sistem sekarang bekerja dengan natural dan instant - audio terdengar dan mulut bergerak segera setelah user mengelus kepala atau menyentuh tubuh model.
