# Requirements Document: Performance Optimization

## Pendahuluan

Dokumen ini mendefinisikan requirements untuk optimasi performa aplikasi Voxie — sebuah aplikasi AI companion berbasis VRM avatar dengan fitur chat, TTS, animasi 3D, dan background real-time. Aplikasi berjalan di browser (SPA) dengan stack React 18 + Vite + TypeScript + Three.js + @pixiv/three-vrm + Supabase, di-deploy ke Vercel.

Bottleneck performa yang sudah diidentifikasi meliputi:
- Render loop Three.js yang berjalan terus-menerus bahkan saat tab tidak aktif
- Bundle size besar dari library ML dan 3D
- QueryClient tanpa konfigurasi cache
- Sequential Supabase queries saat mount
- Audio analyser yang dipanggil berulang kali
- localStorage dibaca di render loop
- Lazy loading yang belum optimal
- Memory leaks dari Three.js resources

Tujuan optimasi: memastikan aplikasi smooth untuk setiap user (client-side performance) dan scalable untuk banyak user (server-side efficiency).

## Glossary

- **Render_Loop**: Loop animasi Three.js yang berjalan setiap frame untuk update scene dan render ke canvas
- **VRM_Model**: Model avatar 3D dalam format VRM yang di-load dan di-render oleh Three.js
- **Three.js_Resource**: Geometry, material, texture, atau object Three.js lainnya yang menggunakan memori GPU/CPU
- **Bundle_Chunk**: File JavaScript hasil build yang di-load oleh browser
- **QueryClient**: Instance @tanstack/react-query yang mengelola cache dan fetching data
- **Edge_Function**: Supabase Edge Function (Deno runtime) untuk chat dan TTS
- **Audio_Analyser**: Web Audio API AnalyserNode untuk lip sync dari audio stream
- **Spring_Bones**: Sistem simulasi fisika untuk gerakan sekunder (rambut, aksesoris) pada VRM model
- **Lighting_Manager**: Sistem yang mengelola pencahayaan Three.js scene
- **Frame_Rate**: Jumlah frame yang di-render per detik (fps)
- **Visibility_State**: Status visibilitas tab browser (visible/hidden) dari Page Visibility API
- **Mobile_Device**: Device dengan lebar layar < 768px atau touch-enabled device
- **Cache_Hit**: Request yang dilayani dari cache tanpa perlu fetch ulang
- **Stale_Time**: Durasi data dianggap fresh sebelum perlu refetch
- **Web_Vitals**: Metrik performa web (LCP, FID, CLS) yang diukur oleh Lighthouse
- **Memory_Leak**: Kondisi di mana memori tidak dibebaskan setelah resource tidak digunakan lagi
- **Lazy_Loading**: Teknik memuat resource hanya saat dibutuhkan, bukan saat initial load
- **Parallel_Query**: Multiple queries yang dijalankan bersamaan, bukan sequential
- **Rate_Limit**: Pembatasan jumlah request per user dalam periode waktu tertentu
- **Disposal**: Proses membebaskan memori dan resource GPU dari Three.js objects

## Requirements

### Requirement 1: Render Loop Throttling

**User Story:** Sebagai user, saya ingin aplikasi tidak menghabiskan baterai saat tab tidak aktif, sehingga device saya lebih hemat energi.

#### Acceptance Criteria

1. WHEN Visibility_State adalah "hidden", THE Render_Loop SHALL render maksimal 10 frame per detik
2. WHEN Visibility_State adalah "visible" AND Mobile_Device terdeteksi, THE Render_Loop SHALL render maksimal 30 frame per detik
3. WHEN Visibility_State adalah "visible" AND Mobile_Device tidak terdeteksi, THE Render_Loop SHALL render maksimal 60 frame per detik
4. THE Render_Loop SHALL mengukur elapsed time sejak frame terakhir dan skip render jika belum mencapai target interval
5. FOR ALL kombinasi (visibility_state, device_type), Frame_Rate aktual SHALL <= target Frame_Rate + 5% tolerance

### Requirement 2: Three.js Resource Disposal

**User Story:** Sebagai user, saya ingin aplikasi tidak mengalami memory leak saat berganti model VRM, sehingga aplikasi tetap smooth setelah penggunaan lama.

#### Acceptance Criteria

1. WHEN VRM_Model baru di-load, THE Render_Loop SHALL dispose semua Three.js_Resource dari model sebelumnya
2. THE Render_Loop SHALL memanggil dispose() pada geometry, material, dan texture dari setiap Mesh dalam scene
3. THE Render_Loop SHALL memanggil VRMUtils.deepDispose() pada VRM scene sebelum menghapusnya
4. WHEN component unmount, THE Render_Loop SHALL dispose renderer, controls, dan semua scene objects
5. FOR ALL load-dispose cycles, jumlah WebGL contexts aktif SHALL tetap = 1 (tidak bertambah)

### Requirement 3: Lighting Update Optimization

**User Story:** Sebagai developer, saya ingin lighting hanya di-update saat nilai berubah signifikan, sehingga render loop lebih efisien.

#### Acceptance Criteria

1. THE Lighting_Manager SHALL menyimpan nilai lighting terakhir dalam cache
2. WHEN nilai lighting baru berbeda < 0.01 dari cache, THE Lighting_Manager SHALL skip update
3. WHEN nilai lighting baru berbeda >= 0.01 dari cache, THE Lighting_Manager SHALL update dan simpan ke cache
4. THE Lighting_Manager SHALL membaca rimLightIntensity dari ref (bukan localStorage) di render loop
5. WHEN Mobile_Device terdeteksi, THE Lighting_Manager SHALL disable dynamic light pulsing

### Requirement 4: Spring Bones Skip Frequency

**User Story:** Sebagai user, saya ingin animasi spring bones tetap smooth tanpa membebani CPU, sehingga aplikasi responsif.

#### Acceptance Criteria

1. WHEN camera distance > 4 unit, THE Render_Loop SHALL update Spring_Bones setiap 4 frame
2. WHEN camera distance <= 4 unit AND Mobile_Device terdeteksi, THE Render_Loop SHALL update Spring_Bones setiap 2 frame
3. WHEN camera distance <= 4 unit AND Mobile_Device tidak terdeteksi, THE Render_Loop SHALL update Spring_Bones setiap frame
4. THE Render_Loop SHALL mengalikan delta time dengan skip_frequency saat update Spring_Bones
5. FOR ALL skip_frequency values, total Spring_Bones updates per detik SHALL = Frame_Rate / skip_frequency ± 10%

### Requirement 5: Bundle Size Optimization

**User Story:** Sebagai user, saya ingin aplikasi loading cepat, sehingga saya tidak menunggu lama saat pertama kali membuka aplikasi.

#### Acceptance Criteria

1. THE Bundle_Chunk "vendor-three" SHALL berukuran <= 200 KB (gzipped)
2. THE Bundle_Chunk "vendor-vrm" SHALL berukuran <= 150 KB (gzipped)
3. THE Bundle_Chunk "vendor-faceapi" SHALL berukuran <= 300 KB (gzipped)
4. THE Bundle_Chunk "vendor-ui" SHALL berukuran <= 100 KB (gzipped)
5. THE total initial bundle size (semua chunks yang di-load saat first paint) SHALL <= 800 KB (gzipped)

### Requirement 6: Lazy Loading Face API

**User Story:** Sebagai user, saya ingin aplikasi loading cepat saat pertama kali dibuka, sehingga saya bisa langsung berinteraksi dengan avatar.

#### Acceptance Criteria

1. THE aplikasi SHALL NOT import @vladmandic/face-api saat initial page load
2. WHEN fitur face detection diaktifkan user, THE aplikasi SHALL dynamic import @vladmandic/face-api
3. THE Bundle_Chunk "vendor-faceapi" SHALL NOT di-load sampai user mengaktifkan face detection
4. WHEN face detection tidak digunakan dalam session, THE Bundle_Chunk "vendor-faceapi" SHALL NOT pernah di-load
5. THE aplikasi SHALL menampilkan loading indicator saat dynamic import face-api sedang berlangsung

### Requirement 7: QueryClient Cache Configuration

**User Story:** Sebagai user, saya ingin data yang sudah di-fetch tidak di-fetch ulang setiap kali saya buka panel, sehingga aplikasi lebih responsif.

#### Acceptance Criteria

1. THE QueryClient SHALL dikonfigurasi dengan staleTime = 5 menit untuk semua queries
2. THE QueryClient SHALL dikonfigurasi dengan cacheTime = 10 menit untuk semua queries
3. WHEN query data masih dalam staleTime window, THE QueryClient SHALL NOT refetch data saat component remount
4. WHEN query data sudah melewati staleTime, THE QueryClient SHALL refetch data di background
5. FOR ALL queries yang di-mount ulang dalam staleTime window, network request count SHALL = 0

### Requirement 8: Parallel Supabase Queries

**User Story:** Sebagai user, saya ingin aplikasi loading cepat saat pertama kali dibuka, sehingga saya tidak menunggu lama untuk melihat avatar.

#### Acceptance Criteria

1. THE aplikasi SHALL menjalankan queries vrm_models, voice_settings, dan profiles secara parallel menggunakan Promise.all
2. THE total waktu loading SHALL <= max(waktu individual query) + 100ms overhead
3. WHEN salah satu query gagal, THE aplikasi SHALL tetap menampilkan data dari query yang berhasil
4. THE aplikasi SHALL menampilkan loading state sampai semua critical queries selesai
5. FOR ALL parallel query executions, total waktu SHALL <= waktu sequential execution - 30%

### Requirement 9: Audio Analyser Connection Deduplication

**User Story:** Sebagai developer, saya ingin audio analyser tidak membuat connection baru jika sudah terhubung, sehingga tidak ada resource leak.

#### Acceptance Criteria

1. THE Audio_Analyser SHALL menyimpan referensi ke HTMLAudioElement yang sedang terhubung
2. WHEN connectAudioElement dipanggil dengan elemen yang sama, THE Audio_Analyser SHALL skip pembuatan MediaElementSource baru
3. WHEN connectAudioElement dipanggil dengan elemen berbeda, THE Audio_Analyser SHALL disconnect source lama sebelum membuat yang baru
4. THE Audio_Analyser SHALL resume AudioContext jika dalam state "suspended"
5. FOR ALL N calls ke connectAudioElement dengan elemen yang sama, jumlah MediaElementSource yang dibuat SHALL = 1

### Requirement 10: localStorage Read Optimization

**User Story:** Sebagai developer, saya ingin localStorage tidak dibaca di render loop, sehingga render loop lebih cepat.

#### Acceptance Criteria

1. THE aplikasi SHALL membaca nilai localStorage hanya saat component mount atau saat user mengubah setting
2. THE aplikasi SHALL menyimpan nilai localStorage dalam ref untuk akses di render loop
3. WHEN nilai setting berubah, THE aplikasi SHALL update ref dan localStorage secara bersamaan
4. THE Render_Loop SHALL membaca nilai dari ref (bukan localStorage) untuk semua operasi per-frame
5. FOR ALL frames dalam render loop, jumlah localStorage.getItem() calls SHALL = 0

### Requirement 11: Image Asset Optimization

**User Story:** Sebagai user, saya ingin aplikasi loading cepat, sehingga saya tidak menunggu lama untuk melihat avatar.

#### Acceptance Criteria

1. THE aplikasi SHALL menyediakan background images dalam format WebP dengan fallback PNG
2. THE aplikasi SHALL lazy load background images hanya saat user membuka BackgroundSelector
3. THE aplikasi SHALL menggunakan loading="lazy" attribute untuk semua background image thumbnails
4. WHEN user belum membuka BackgroundSelector, THE aplikasi SHALL NOT load background images
5. THE aplikasi SHALL compress background images dengan quality 85% untuk balance antara ukuran dan kualitas

### Requirement 12: React Re-render Optimization

**User Story:** Sebagai developer, saya ingin komponen tidak re-render saat state internal berubah, sehingga UI lebih responsif.

#### Acceptance Criteria

1. THE aplikasi SHALL menggunakan useRef untuk state yang tidak mempengaruhi UI (lastInteractionTime, frameCount, dll)
2. THE aplikasi SHALL menggunakan useCallback untuk semua event handlers yang di-pass ke child components
3. THE aplikasi SHALL menggunakan useMemo untuk computed values yang expensive
4. WHEN state internal berubah (contoh: frameCount), THE komponen Index SHALL NOT re-render
5. THE aplikasi SHALL menggunakan React.memo untuk child components yang menerima stable props

### Requirement 13: Memory Leak Prevention

**User Story:** Sebagai user, saya ingin aplikasi tidak mengalami memory leak setelah penggunaan lama, sehingga aplikasi tetap smooth.

#### Acceptance Criteria

1. THE aplikasi SHALL dispose semua Three.js_Resource saat component unmount
2. THE aplikasi SHALL cancel semua requestAnimationFrame saat component unmount
3. THE aplikasi SHALL remove semua event listeners saat component unmount
4. THE aplikasi SHALL disconnect Audio_Analyser saat component unmount
5. FOR ALL mount-unmount cycles, memory usage SHALL kembali ke baseline ± 10 MB

### Requirement 14: Edge Function Rate Limiting

**User Story:** Sebagai system administrator, saya ingin Edge_Function tidak overload saat banyak user, sehingga service tetap stabil.

#### Acceptance Criteria

1. THE Edge_Function "chat" SHALL membatasi request per user menjadi 20 request per menit
2. THE Edge_Function "tts" SHALL membatasi request per user menjadi 30 request per menit
3. WHEN user melebihi rate limit, THE Edge_Function SHALL return HTTP 429 dengan header Retry-After
4. THE Edge_Function SHALL menggunakan Supabase Auth user_id sebagai identifier untuk rate limiting
5. THE Edge_Function SHALL menyimpan rate limit counter dalam Upstash Redis dengan TTL 60 detik

### Requirement 15: Edge Function Response Caching

**User Story:** Sebagai user, saya ingin TTS untuk teks yang sama tidak perlu di-generate ulang, sehingga response lebih cepat.

#### Acceptance Criteria

1. THE Edge_Function "tts" SHALL meng-cache response berdasarkan hash dari (text, voiceId)
2. THE Edge_Function "tts" SHALL menyimpan cached audio dalam Supabase Storage dengan TTL 24 jam
3. WHEN request TTS untuk teks yang sama, THE Edge_Function SHALL return cached audio jika masih valid
4. THE Edge_Function SHALL menghitung cache hit rate dan log ke analytics
5. FOR ALL repeated identical TTS requests, cache hit rate SHALL >= 80%

### Requirement 16: Mobile Performance Aggressiveness

**User Story:** Sebagai user mobile, saya ingin aplikasi tetap smooth di device saya, sehingga saya bisa berinteraksi dengan avatar tanpa lag.

#### Acceptance Criteria

1. WHEN Mobile_Device terdeteksi, THE aplikasi SHALL disable ambient particles (sakura, rain, snow, leaves)
2. WHEN Mobile_Device terdeteksi, THE aplikasi SHALL set pixel ratio maksimal 1.5 (bukan 2)
3. WHEN Mobile_Device terdeteksi, THE aplikasi SHALL disable antialiasing pada WebGL renderer
4. WHEN Mobile_Device terdeteksi, THE aplikasi SHALL disable dynamic light pulsing
5. WHEN Mobile_Device terdeteksi, THE aplikasi SHALL set Spring_Bones skip frequency minimal 2

### Requirement 17: Web Vitals Targets

**User Story:** Sebagai user, saya ingin aplikasi loading cepat dan responsif, sehingga pengalaman saya smooth.

#### Acceptance Criteria

1. THE aplikasi SHALL mencapai Largest Contentful Paint (LCP) <= 2.5 detik pada koneksi 4G
2. THE aplikasi SHALL mencapai First Input Delay (FID) <= 100 ms
3. THE aplikasi SHALL mencapai Cumulative Layout Shift (CLS) <= 0.1
4. THE aplikasi SHALL mencapai Time to Interactive (TTI) <= 3.5 detik pada koneksi 4G
5. THE aplikasi SHALL mencapai Lighthouse Performance Score >= 90 pada desktop dan >= 80 pada mobile

### Requirement 18: Animation Catalog Caching

**User Story:** Sebagai system administrator, saya ingin Edge_Function "chat" tidak query database setiap request, sehingga database load berkurang.

#### Acceptance Criteria

1. THE Edge_Function "chat" SHALL meng-cache animation catalog dalam memory dengan TTL 5 menit
2. WHEN cache masih valid, THE Edge_Function SHALL NOT query vrma_animations table
3. WHEN cache expired, THE Edge_Function SHALL refetch animation catalog dari database
4. THE Edge_Function SHALL include cache timestamp dalam response headers untuk debugging
5. FOR ALL chat requests dalam 5 menit window, database query count untuk animation catalog SHALL = 1

### Requirement 19: Idle Expression Fade Optimization

**User Story:** Sebagai user, saya ingin transisi ekspresi smooth tanpa membebani CPU, sehingga animasi terlihat natural.

#### Acceptance Criteria

1. WHEN TTS dimulai, THE aplikasi SHALL fade out idle expression dalam 300ms
2. THE aplikasi SHALL pause idle expression update loop saat TTS aktif
3. WHEN TTS selesai, THE aplikasi SHALL resume idle expression dengan fade in 500ms
4. THE aplikasi SHALL menggunakan lerp untuk smooth transition antara expression weights
5. THE fade operation SHALL NOT block render loop (harus async/non-blocking)

### Requirement 20: VRM Model Preloading

**User Story:** Sebagai user, saya ingin model VRM loading cepat saat pertama kali dibuka, sehingga saya tidak melihat T-pose flash.

#### Acceptance Criteria

1. THE aplikasi SHALL load VRM model di background sebelum menampilkan di scene
2. THE aplikasi SHALL menunggu minimal 10 mixer updates (≈166ms) sebelum menampilkan model
3. THE aplikasi SHALL menampilkan loading indicator selama model belum siap
4. WHEN model sudah siap, THE aplikasi SHALL fade in model dengan opacity transition 500ms
5. THE aplikasi SHALL NOT menampilkan T-pose atau pose yang tidak natural saat model pertama kali muncul

### Requirement 21: Audio Context Resume Strategy

**User Story:** Sebagai user, saya ingin audio langsung bisa diputar setelah saya berinteraksi, sehingga tidak ada delay saat TTS dimulai.

#### Acceptance Criteria

1. THE Audio_Analyser SHALL resume AudioContext saat user pertama kali berinteraksi (click, touch, keypress)
2. THE Audio_Analyser SHALL log AudioContext state (suspended/running) untuk debugging
3. WHEN AudioContext dalam state "suspended", THE Audio_Analyser SHALL resume sebelum connect audio element
4. THE Audio_Analyser SHALL handle autoplay policy error dengan menampilkan toast notification
5. THE Audio_Analyser SHALL retry resume maksimal 3 kali dengan exponential backoff jika gagal

### Requirement 22: Render Loop Frame Budget

**User Story:** Sebagai developer, saya ingin render loop tidak melebihi frame budget, sehingga tidak ada frame drop.

#### Acceptance Criteria

1. THE Render_Loop SHALL mengukur waktu eksekusi setiap frame
2. WHEN waktu eksekusi frame > 16ms (60fps budget), THE Render_Loop SHALL log warning
3. THE Render_Loop SHALL skip operasi non-critical (particles, spring bones) jika frame budget terlampaui
4. THE Render_Loop SHALL prioritas operasi: VRM update > lip sync > blink > idle expression > spring bones
5. FOR ALL frames, waktu eksekusi SHALL <= 16ms pada desktop dan <= 33ms pada mobile (95th percentile)

### Requirement 23: Supabase Query Retry Strategy

**User Story:** Sebagai user, saya ingin aplikasi tetap berfungsi meskipun ada network error sementara, sehingga pengalaman saya tidak terganggu.

#### Acceptance Criteria

1. THE QueryClient SHALL retry failed queries maksimal 3 kali dengan exponential backoff
2. THE QueryClient SHALL menunggu 1 detik sebelum retry pertama, 2 detik sebelum retry kedua, 4 detik sebelum retry ketiga
3. WHEN query gagal setelah 3 retry, THE aplikasi SHALL menampilkan error message yang informatif
4. THE QueryClient SHALL NOT retry untuk error 4xx (client error), hanya untuk 5xx dan network error
5. THE aplikasi SHALL menampilkan retry indicator saat query sedang di-retry

### Requirement 24: Three.js Scene Optimization

**User Story:** Sebagai user, saya ingin render Three.js smooth tanpa lag, sehingga animasi avatar terlihat natural.

#### Acceptance Criteria

1. THE aplikasi SHALL menggunakan frustum culling untuk skip render objects di luar camera view
2. THE aplikasi SHALL menggunakan LOD (Level of Detail) untuk VRM model jika camera distance > 5 unit
3. THE aplikasi SHALL batch draw calls untuk objects dengan material yang sama
4. THE aplikasi SHALL limit maksimal 100 draw calls per frame
5. THE aplikasi SHALL menggunakan InstancedMesh untuk particles (sakura, rain, snow) jika count > 50

### Requirement 25: TTS Audio Preloading

**User Story:** Sebagai user, saya ingin TTS audio langsung diputar tanpa delay, sehingga conversation terasa natural.

#### Acceptance Criteria

1. THE aplikasi SHALL preload TTS audio untuk response AI sebelum streaming selesai
2. THE aplikasi SHALL mulai playback audio segera setelah chunk pertama tersedia
3. THE aplikasi SHALL buffer minimal 500ms audio sebelum mulai playback untuk avoid stuttering
4. WHEN network lambat, THE aplikasi SHALL menampilkan buffering indicator
5. THE aplikasi SHALL cancel preload jika user mengirim message baru sebelum TTS selesai

### Requirement 26: Interaction Hitbox Optimization

**User Story:** Sebagai user, saya ingin interaksi headpat dan shoulder tap responsif, sehingga feedback langsung terasa.

#### Acceptance Criteria

1. THE aplikasi SHALL menggunakan raycasting hanya saat pointer bergerak (bukan setiap frame)
2. THE aplikasi SHALL limit raycasting ke hitbox meshes saja (bukan seluruh scene)
3. THE aplikasi SHALL update cursor style langsung via DOM (bukan via React state) untuk avoid re-render
4. THE aplikasi SHALL throttle raycasting menjadi maksimal 30 kali per detik
5. THE raycasting operation SHALL selesai dalam <= 5ms (95th percentile)

### Requirement 27: Supabase Realtime Optimization

**User Story:** Sebagai developer, saya ingin Supabase Realtime connection tidak membebani client, sehingga aplikasi tetap responsif.

#### Acceptance Criteria

1. THE aplikasi SHALL menggunakan single Supabase Realtime connection untuk semua subscriptions
2. THE aplikasi SHALL unsubscribe dari channels yang tidak digunakan saat component unmount
3. THE aplikasi SHALL batch Realtime updates jika multiple events datang dalam 100ms window
4. THE aplikasi SHALL reconnect Realtime connection dengan exponential backoff jika terputus
5. THE aplikasi SHALL limit maksimal 5 active Realtime subscriptions per session

### Requirement 28: Service Worker Caching Strategy

**User Story:** Sebagai user, saya ingin aplikasi bisa dibuka offline untuk melihat avatar yang sudah di-load, sehingga saya bisa berinteraksi meskipun tidak ada internet.

#### Acceptance Criteria

1. THE aplikasi SHALL menggunakan Service Worker untuk cache static assets (JS, CSS, images)
2. THE aplikasi SHALL menggunakan Cache-First strategy untuk VRM models yang sudah di-load
3. THE aplikasi SHALL menggunakan Network-First strategy untuk API calls dengan fallback ke cache
4. THE aplikasi SHALL menampilkan offline indicator jika tidak ada koneksi internet
5. THE aplikasi SHALL sync pending actions (affection gain, settings change) saat koneksi kembali

### Requirement 29: WebGL Context Loss Recovery

**User Story:** Sebagai user, saya ingin aplikasi tetap berfungsi jika WebGL context hilang, sehingga saya tidak perlu reload page.

#### Acceptance Criteria

1. THE aplikasi SHALL listen untuk event "webglcontextlost" pada canvas
2. WHEN WebGL context hilang, THE aplikasi SHALL pause render loop dan tampilkan recovery message
3. THE aplikasi SHALL listen untuk event "webglcontextrestored" untuk resume render
4. WHEN WebGL context restored, THE aplikasi SHALL reload VRM model dan resume render loop
5. THE aplikasi SHALL preserve application state (chat history, settings) saat context loss terjadi

### Requirement 30: Performance Monitoring & Analytics

**User Story:** Sebagai developer, saya ingin memonitor performa aplikasi di production, sehingga saya bisa identify bottleneck dan optimize.

#### Acceptance Criteria

1. THE aplikasi SHALL log frame rate average setiap 10 detik ke analytics
2. THE aplikasi SHALL log memory usage setiap 30 detik ke analytics
3. THE aplikasi SHALL log Web Vitals (LCP, FID, CLS) saat page load selesai
4. THE aplikasi SHALL log error rate dan error messages ke Sentry atau equivalent
5. THE aplikasi SHALL menampilkan performance overlay (fps, memory, draw calls) saat debug mode aktif
