# Rencana Implementasi: Performance Optimization

## Overview

Implementasi optimasi performa Voxie dibagi menjadi beberapa fase berdasarkan prioritas impact dan kemudahan implementasi. Fase awal fokus pada **quick wins** yang tidak mengubah arsitektur (QueryClient config, parallel queries, audio dedup), dilanjutkan ke optimasi render loop dan Three.js, kemudian ke perubahan infrastruktur server-side (Edge Functions).

Semua perubahan bersifat additive dan backward-compatible — tidak ada breaking change pada API publik komponen.

## Tasks

- [x] 1. Konfigurasi QueryClient cache dan retry strategy
  - Tambahkan `staleTime: 5 * 60 * 1000` dan `gcTime: 10 * 60 * 1000` ke `defaultOptions.queries` di `App.tsx`
  - Implementasikan fungsi `retry` yang mengembalikan `false` untuk error 4xx dan `failureCount < 3` untuk error lainnya
  - Implementasikan `retryDelay` dengan exponential backoff: `Math.min(1000 * 2 ** attemptIndex, 30000)`
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 23.1, 23.2, 23.4_

  - [ ]* 1.1 Tulis property test untuk QueryClient stale cache
    - **Property 5: QueryClient Stale Cache Prevents Refetch**
    - **Validates: Requirements 7.3, 7.5**
    - Gunakan `fast-check` untuk memverifikasi bahwa query yang di-mount ulang dalam staleTime window tidak menghasilkan network request baru

- [x] 2. Refactor Supabase queries ke parallel execution
  - Ubah fungsi `loadActive()` di `Index.tsx` dari sequential `await` menjadi `Promise.all`
  - Jalankan query `vrm_models`, `voice_settings`, dan `profiles` secara bersamaan
  - Handle partial failures: setiap result dicek secara independen, query yang gagal tidak memblokir yang lain
  - Pastikan loading state tetap ditampilkan sampai semua critical queries selesai
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 2.1 Tulis property test untuk parallel query time bound
    - **Property 6: Parallel Query Time Bound**
    - **Validates: Requirements 8.2, 8.5**
    - Mock Supabase dengan artificial delays, verifikasi total elapsed time ≤ max(delays) + 100ms

- [x] 3. Verifikasi dan perkuat Audio Analyser deduplication
  - Verifikasi bahwa `attachedElementRef` di `useAudioAnalyser.ts` sudah berfungsi dengan benar
  - Pastikan `connectAudioElement` skip pembuatan `MediaElementSource` baru jika elemen yang sama sudah terhubung
  - Pastikan `AudioContext` di-resume jika dalam state `"suspended"` saat koneksi yang sama dipanggil ulang
  - Tambahkan handling untuk `AudioContext` autoplay policy error dengan toast notification
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 21.1, 21.3, 21.4_

  - [ ]* 3.1 Tulis property test untuk audio analyser deduplication
    - **Property 4: Audio Analyser Connection Deduplication**
    - **Validates: Requirements 9.2, 9.5**
    - Untuk N calls ke `connectAudioElement` dengan elemen yang sama, verifikasi `createMediaElementSource` dipanggil tepat 1 kali

- [x] 4. Checkpoint — Verifikasi quick wins
  - Pastikan semua tests pass, tanyakan ke user jika ada pertanyaan.

- [x] 5. Optimasi render loop throttling dan Page Visibility API
  - Verifikasi implementasi frame throttler di `VrmViewer.tsx` sudah konsisten: hidden=10fps, mobile=30fps, desktop=60fps
  - Tambahkan event listener `visibilitychange` ke setup effect untuk update `isVisibleRef`
  - Pastikan cleanup effect menghapus event listener `visibilitychange`
  - Ekstrak fungsi pure `computeTargetInterval(isVisible: boolean, isMobile: boolean): number` untuk testability
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 5.1 Tulis property test untuk frame throttle
    - **Property 1: Frame Throttle Respects Target Interval**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
    - Gunakan `fast-check` dengan `fc.record({ isVisible, isMobile, elapsed })` untuk verifikasi semua kombinasi

- [x] 6. Implementasi frame budget monitor dan spring bones skip frequency
  - Ekstrak fungsi pure `computeSpringSkipFrequency(cameraDistance: number, isMobile: boolean): 1 | 2 | 4`
  - Verifikasi delta compensation: `updateSpringBones(delta * skipFrequency, vrm)` sudah benar
  - Tambahkan frame budget monitor di render loop (dev-only): log warning jika frame time > 16ms (desktop) atau > 33ms (mobile)
  - Implementasikan skip operasi non-critical (particles, spring bones) jika frame budget terlampaui
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 22.1, 22.2, 22.3, 22.4_

  - [ ]* 6.1 Tulis property test untuk spring bones skip frequency
    - **Property 3: Spring Bones Skip Frequency Selection**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
    - Verifikasi semua 3 kasus: distance > 4 → 4, distance ≤ 4 + mobile → 2, distance ≤ 4 + desktop → 1

- [x] 7. Implementasi lighting cache di LightingManager
  - Tambahkan field `private cache: LightingCacheEntry | null = null` ke class `LightingManager`
  - Tambahkan konstanta `private readonly THRESHOLD = 0.01`
  - Modifikasi `updateLighting()` untuk skip update jika max delta intensitas < THRESHOLD
  - Update cache setelah setiap update yang berhasil diterapkan
  - Pastikan `rimIntensityRef` di `VrmViewer.tsx` dibaca dari ref (bukan `localStorage`) di render loop — sudah ada, verifikasi konsistensi
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 7.1 Tulis property test untuk lighting cache threshold
    - **Property 2: Lighting Cache Threshold**
    - **Validates: Requirements 3.2, 3.3**
    - Verifikasi: delta < 0.01 → skip update, delta ≥ 0.01 → apply update dan update cache

- [x] 8. Implementasi Three.js resource disposal
  - Tambahkan fungsi `disposeVrmResources(vrm: VRM): void` yang memanggil `VRMUtils.deepDispose(vrm.scene)`
  - Tambahkan fungsi `disposeSceneObjects(scene: THREE.Scene): void` yang traverse scene dan dispose geometry, material, texture
  - Tambahkan fungsi `disposeMaterial(mat: THREE.Material): void` yang dispose semua texture properties
  - Panggil disposal functions saat VRM model baru di-load (sebelum load model baru)
  - Pastikan cleanup effect di `VrmViewer.tsx` memanggil disposal untuk renderer, controls, dan semua scene objects saat unmount
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 13.1, 13.2, 13.3, 13.4_

- [x] 9. Implementasi mobile performance config
  - Pastikan `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))` diterapkan saat `isMobile === true`
  - Pastikan `antialias: false` di WebGLRenderer constructor saat mobile
  - Disable dynamic light pulsing di render loop saat `isMobileRef.current === true` (sudah ada, verifikasi)
  - Pastikan ambient particles dinonaktifkan via `ambientEffect` prop dari `Index.tsx` saat mobile terdeteksi
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 10. Checkpoint — Verifikasi render loop dan Three.js optimasi
  - Pastikan semua tests pass, tanyakan ke user jika ada pertanyaan.

- [~] 11. Implementasi idle expression fade optimization
  - Ekstrak fungsi pure `lerp(start: number, end: number, t: number): number`
  - Verifikasi bahwa fade out idle expression (300ms) dan fade in (500ms) menggunakan lerp
  - Pastikan idle expression update loop di-pause saat TTS aktif (`setIdleExpressionPaused(true)`)
  - Pastikan fade operation tidak memblokir render loop (non-blocking, sudah menggunakan delta time)
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

  - [ ]* 11.1 Tulis property test untuk expression lerp bounds
    - **Property 10: Expression Lerp Bounds**
    - **Validates: Requirements 19.4**
    - Verifikasi `lerp(s, e, t)` selalu menghasilkan nilai dalam range `[min(s,e), max(s,e)]`

- [~] 12. Implementasi raycasting throttle untuk interaction hitbox
  - Ubah raycasting dari per-frame menjadi event-driven: hanya saat `pointermove`
  - Tambahkan throttle 30x/detik menggunakan timestamp comparison
  - Limit raycasting ke hitbox meshes saja (bukan seluruh scene)
  - Update cursor style via DOM langsung (`container.style.cursor`) bukan via React state
  - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5_

  - [ ]* 12.1 Tulis property test untuk raycasting throttle
    - **Property 11: Raycasting Throttle**
    - **Validates: Requirements 26.4**
    - Verifikasi N pointer events dalam 1 detik menghasilkan ≤ 30 raycasting operations

- [~] 13. Verifikasi lazy loading face-api dan bundle chunks
  - Verifikasi bahwa `@vladmandic/face-api` tidak di-import secara static di mana pun
  - Pastikan semua import face-api menggunakan dynamic `import()` dengan loading indicator
  - Verifikasi konfigurasi `manualChunks` di `vite.config.ts` sudah benar untuk semua vendor chunks
  - Jalankan `vite build` dan verifikasi chunk sizes sesuai requirements (three ≤ 200KB, vrm ≤ 150KB, faceapi ≤ 300KB, ui ≤ 100KB)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [~] 14. Implementasi React re-render optimization
  - Audit `Index.tsx` untuk state yang tidak mempengaruhi UI — pindahkan ke `useRef` (contoh: `lastInteractionTime` sudah ref, verifikasi lainnya)
  - Verifikasi semua event handlers di `Index.tsx` sudah menggunakan `useCallback`
  - Tambahkan `useCallback` untuk handlers yang belum menggunakannya
  - Tambahkan `useMemo` untuk computed values yang expensive jika ada
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [~] 15. Checkpoint — Verifikasi client-side optimasi lengkap
  - Pastikan semua tests pass, tanyakan ke user jika ada pertanyaan.

- [~] 16. Implementasi rate limiter di Edge Function "chat"
  - Buat interface `RateLimitEntry { count: number; resetAt: number }` di Edge Function
  - Implementasikan fungsi `checkRateLimit(userId, limit, windowMs)` menggunakan in-memory Map dengan TTL
  - Terapkan rate limit 20 request/menit untuk Edge Function "chat" menggunakan `user_id` dari Supabase Auth
  - Return HTTP 429 dengan header `Retry-After: 60` saat limit terlampaui
  - _Requirements: 14.1, 14.3, 14.4_

  - [ ]* 16.1 Tulis property test untuk rate limit enforcement
    - **Property 7: Rate Limit Enforcement**
    - **Validates: Requirements 14.1, 14.2, 14.3**
    - Verifikasi: tepat `limit` requests pertama diizinkan, semua request berikutnya dalam window mendapat 429

- [~] 17. Implementasi rate limiter di Edge Function "tts"
  - Reuse fungsi `checkRateLimit` dari task 16 (atau ekstrak ke shared module)
  - Terapkan rate limit 30 request/menit untuk Edge Function "tts"
  - Return HTTP 429 dengan header `Retry-After: 60` saat limit terlampaui
  - _Requirements: 14.2, 14.3, 14.4_

- [~] 18. Implementasi animation catalog in-memory cache di Edge Function "chat"
  - Tambahkan variabel module-level `let catalogCache: AnimationCatalogCache | null = null`
  - Implementasikan cache check: jika `catalogCache` valid (belum expired), skip query ke `vrma_animations`
  - Set TTL cache 5 menit: `expiresAt: Date.now() + 5 * 60 * 1000`
  - Tambahkan cache timestamp ke response headers untuk debugging
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [ ]* 18.1 Tulis property test untuk animation catalog cache deduplication
    - **Property 9: Animation Catalog Cache Deduplication**
    - **Validates: Requirements 18.1, 18.2**
    - Verifikasi N requests dalam 5 menit window menghasilkan tepat 1 database query

- [~] 19. Implementasi TTS response caching di Edge Function "tts"
  - Implementasikan fungsi `getCacheKey(text, voiceId)` menggunakan Web Crypto API (SHA-256, 16 char prefix)
  - Implementasikan `getCachedAudio(key)` yang lookup di Supabase Storage bucket `tts-cache`
  - Implementasikan `saveCachedAudio(key, audioData)` yang simpan ke Supabase Storage dengan metadata JSON
  - Integrasikan cache lookup sebelum memanggil ElevenLabs API, dan cache save setelah generate audio baru
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ]* 19.1 Tulis property test untuk TTS cache round-trip
    - **Property 8: TTS Cache Round-Trip**
    - **Validates: Requirements 15.1, 15.3, 15.5**
    - Verifikasi request kedua untuk (text, voiceId) yang sama mengembalikan audio yang identik tanpa memanggil ElevenLabs API

- [~] 20. Checkpoint — Verifikasi Edge Function optimasi
  - Pastikan semua tests pass, tanyakan ke user jika ada pertanyaan.

- [~] 21. Implementasi WebGL context loss recovery
  - Tambahkan event listener `webglcontextlost` pada canvas element di setup effect `VrmViewer.tsx`
  - Saat context hilang: pause render loop (`cancelAnimationFrame`), tampilkan recovery message via state
  - Tambahkan event listener `webglcontextrestored` untuk resume render loop dan reload VRM model
  - Pastikan application state (chat history, settings) dipreservasi saat context loss
  - Cleanup kedua event listeners saat component unmount
  - _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5_

- [~] 22. Implementasi performance monitoring overlay
  - Tambahkan performance overlay component (fps, memory, draw calls) yang hanya muncul saat `?debug=true` di URL
  - Implementasikan frame rate logging setiap 10 detik (dev mode atau analytics)
  - Implementasikan memory usage logging setiap 30 detik menggunakan `performance.memory` jika tersedia
  - Integrasikan `web-vitals` library untuk log LCP, FID, CLS saat page load selesai
  - _Requirements: 30.1, 30.2, 30.3, 30.5_

- [~] 23. Final checkpoint — Verifikasi semua optimasi
  - Pastikan semua tests pass, tanyakan ke user jika ada pertanyaan.
  - Jalankan `vite build` dan verifikasi tidak ada regresi pada chunk sizes
  - Verifikasi tidak ada TypeScript errors di semua file yang dimodifikasi

## Catatan

- Task bertanda `*` bersifat opsional dan bisa dilewati untuk implementasi MVP yang lebih cepat
- Setiap task mereferensikan requirements spesifik untuk traceability
- Checkpoint memastikan validasi inkremental sebelum lanjut ke fase berikutnya
- Property tests memvalidasi correctness properties universal yang didefinisikan di design.md
- Unit tests memvalidasi contoh spesifik dan edge cases
- Urutan task mengikuti prioritas: quick wins → render loop → Three.js → server-side
