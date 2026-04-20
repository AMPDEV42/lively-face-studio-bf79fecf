

## Plan: Default idle VRMA loop + micro body movement (chest up only)

### Tujuan
Avatar utama tidak terlihat statis. Tambahkan:
1. **Default idle VRMA** auto-loop (kategori `idle`, gerakan kepala ringan dari library).
2. **Micro body gesture prosedural** — sway kiri-kanan halus + breathing (naik-turun dada) **hanya dari pinggang/spine ke atas**. Pinggul, kaki, dan posisi root tetap diam.

### Strategi

**A. Database (pakai data existing)**
- Sudah ada tabel `vrma_animations` dengan kolom `category`. Pakai kategori `idle` untuk filter.
- Asumsi user sudah upload VRMA bernama "idle gerakan kepala" lewat Animation Studio dengan category=idle. Plan ini hanya code — tidak ada migration baru.
- Jika belum ada VRMA idle di library, micro-gesture prosedural tetap jalan sebagai fallback.

**B. `src/components/VrmViewer.tsx`**
- Tambah loader baru (mirip pola talking clips) untuk query `vrma_animations` dengan `category='idle'`, ambil clip pertama, simpan di `idleClipRef`.
- Tambah `idleActionRef` untuk action loop-nya.
- **Auto-play idle**: setelah VRM loaded + idle clip loaded → `playVRMA(mixer, clip, { loop: true, fadeIn: 0.5 })`. 
- **Pause idle saat ada aktivitas lain**: kalau `vrmaActionRef` (admin preview) atau talking VRMA aktif → fade out idle. Saat selesai → fade idle balik in.
- **Cleanup**: stop idle action saat unmount.

**C. Micro body gesture prosedural (di `vrm-animations.ts`)**
Tambah fungsi baru `updateIdleMicroGestures(elapsed, vrm)`:
- Target bones via `vrm.humanoid.getNormalizedBoneNode()`:
  - `spine` — sway kiri-kanan: `rotation.z = sin(elapsed * 0.6) * 0.015` (~0.86°)
  - `chest` — breathing: `rotation.x = sin(elapsed * 1.4) * 0.025` (naik-turun halus, ~1.4°), kombinasi sedikit `position.y` offset dihindari (jaga rig stabil — pakai rotasi saja)
  - `upperChest` (jika ada) — tambahan breathing kecil `rotation.x = sin(elapsed * 1.4 + 0.3) * 0.012`
  - **JANGAN sentuh**: `hips`, `upperLeg`, `lowerLeg`, `foot`, root scene position. Pinggang ke bawah benar-benar diam.
- **Additive ke VRMA**: panggil micro-gesture **SETELAH** `mixer.update(delta)` dan **SEBELUM** `vrm.update(delta)`. Karena idle VRMA "gerakan kepala" hanya sentuh head/neck, micro-gesture pada spine/chest tidak konflik. Untuk safety, hanya tambahkan ke `rotation` axis yang tidak di-drive VRMA (cek bone names di clip → kemungkinan besar hanya head/neck).
- **Skip saat speaking VRMA atau admin preview aktif** (agar talking clips di chest/spine tidak ditimpa) — gate via flag `vrmaActionRef.current` & `isTalkingPlayingRef.current`.

**D. Integrasi di animate loop (`VrmViewer.tsx`)**
Setelah `mixerRef.current.update(delta)`:
```ts
const isManualOrTalking = vrmaActionRef.current || isTalkingPlayingRef.current;
if (!isManualOrTalking) {
  updateIdleMicroGestures(elapsed, vrm);
}
```

### File yang diubah
- `src/lib/vrm-animations.ts` — tambah `updateIdleMicroGestures` + state.
- `src/components/VrmViewer.tsx`:
  - Tambah `idleClipRef`, `idleActionRef`.
  - Loader idle clip dari Supabase (similar to talking loader).
  - Auto-play loop saat ready + pause/resume sesuai aktivitas.
  - Panggil `updateIdleMicroGestures` di animate loop.
  - Import fungsi baru.

### Hasil yang diharapkan
- Avatar default loop animasi kepala VRMA + sway halus spine + breathing chest.
- Pinggul ke kaki benar-benar diam (tidak ada gerakan kaki/pinggul).
- Saat user chat → talking VRMA take over (idle pause). Saat selesai → idle resume.
- Saat admin preview VRMA → idle pause sampai preview selesai.
- Tidak ada perubahan database / RLS / UI.

