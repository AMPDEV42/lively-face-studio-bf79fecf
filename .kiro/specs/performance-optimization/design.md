# Design Document: Performance Optimization

## Overview

Dokumen ini mendeskripsikan desain teknis untuk optimasi performa aplikasi Voxie — sebuah AI companion SPA berbasis VRM avatar dengan stack React 18 + Vite + TypeScript + Three.js + @pixiv/three-vrm + Supabase, di-deploy ke Vercel.

Optimasi dibagi menjadi dua domain utama:

1. **Client-side performance** — render loop throttling, Three.js resource disposal, bundle splitting, lazy loading, React re-render optimization, audio analyser deduplication, dan mobile-specific tuning.
2. **Server-side efficiency** — Edge Function rate limiting, TTS response caching, animation catalog in-memory caching, dan QueryClient cache configuration.

### Tujuan

- Mencapai 60 fps stabil di desktop, 30 fps di mobile, dan 10 fps saat tab tersembunyi
- Menghilangkan memory leak dari Three.js resources dan audio nodes
- Mengurangi initial bundle size agar LCP ≤ 2.5 detik pada koneksi 4G
- Melindungi Edge Functions dari overload dengan rate limiting per user
- Mengurangi latency TTS dengan response caching berbasis hash

---

## Architecture

Optimasi tidak mengubah arsitektur aplikasi secara fundamental. Perubahan bersifat additive dan targeted pada komponen yang sudah ada.

```mermaid
graph TD
    subgraph Client
        A[Index.tsx] --> B[VrmViewer.tsx]
        A --> C[useAudioAnalyser.ts]
        A --> D[QueryClient - App.tsx]
        B --> E[Render Loop - animate()]
        B --> F[LightingManager]
        B --> G[SpringBones]
        B --> H[Three.js Scene]
        E --> I[Frame Throttler]
        E --> J[Frame Budget Monitor]
        I --> K[Page Visibility API]
        I --> L[Device Detection]
    end

    subgraph Build
        M[vite.config.ts] --> N[Manual Chunks]
        N --> O[vendor-three]
        N --> P[vendor-vrm]
        N --> Q[vendor-faceapi - lazy]
        N --> R[vendor-ui]
    end

    subgraph EdgeFunctions
        S[chat/index.ts] --> T[Rate Limiter]
        S --> U[Animation Catalog Cache]
        V[tts/index.ts] --> W[Rate Limiter]
        V --> X[TTS Response Cache - Supabase Storage]
    end

    A -->|fetch| S
    A -->|fetch| V
```

### Prinsip Desain

- **Zero-regression**: Setiap optimasi harus backward-compatible. Tidak ada perubahan API publik komponen.
- **Ref-first for hot paths**: State yang diakses di render loop (60x/detik) harus disimpan dalam `useRef`, bukan `useState`.
- **Lazy by default**: Library besar (face-api, Three.js addons) hanya di-load saat dibutuhkan.
- **Graceful degradation**: Mobile mendapat konfigurasi yang lebih konservatif secara otomatis.

---

## Components and Interfaces

### 1. Frame Throttler (VrmViewer.tsx — animate())

Komponen ini sudah ada di kode. Optimasi memperkuat implementasi yang ada:

```typescript
// Sudah ada di kode, perlu dipastikan konsisten:
const targetInterval = !isVisibleRef.current
  ? 1000 / 10          // hidden tab: 10 fps
  : isMobileRef.current
    ? 1000 / 30        // mobile: 30 fps
    : 1000 / 60;       // desktop: 60 fps

const elapsed = now - lastFrameTimeRef.current;
if (elapsed < targetInterval) return; // skip frame
lastFrameTimeRef.current = now - (elapsed % targetInterval);
```

**Page Visibility API integration** (perlu ditambahkan ke setup effect):

```typescript
const handleVisibilityChange = () => {
  isVisibleRef.current = document.visibilityState === 'visible';
};
document.addEventListener('visibilitychange', handleVisibilityChange);
// cleanup: document.removeEventListener(...)
```

### 2. Three.js Resource Disposal

Fungsi disposal yang perlu ditambahkan ke cleanup effect di VrmViewer:

```typescript
function disposeVrmResources(vrm: VRM): void {
  VRMUtils.deepDispose(vrm.scene);
}

function disposeSceneObjects(scene: THREE.Scene): void {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => {
          disposeMaterial(m);
        });
      } else {
        disposeMaterial(obj.material);
      }
    }
  });
}

function disposeMaterial(mat: THREE.Material): void {
  // Dispose semua texture properties
  for (const key of Object.keys(mat)) {
    const val = (mat as any)[key];
    if (val instanceof THREE.Texture) val.dispose();
  }
  mat.dispose();
}
```

### 3. Lighting Cache (LightingManager)

Tambahkan cache comparison ke `updateLighting()`:

```typescript
interface LightingCache {
  ambientIntensity: number;
  keyLightIntensity: number;
  fillLightIntensity: number;
  rimLightIntensity: number;
}

private cache: LightingCache | null = null;
private readonly THRESHOLD = 0.01;

updateLighting(config: LightingConfig): void {
  if (this.cache) {
    const delta = Math.max(
      Math.abs(config.ambientIntensity - this.cache.ambientIntensity),
      Math.abs(config.keyLightIntensity - this.cache.keyLightIntensity),
      Math.abs(config.rimLightIntensity - this.cache.rimLightIntensity),
    );
    if (delta < this.THRESHOLD) return; // skip update
  }
  // ... apply update
  this.cache = { /* new values */ };
}
```

### 4. Spring Bones Skip Frequency

Sudah ada di kode. Perlu dipastikan delta compensation benar:

```typescript
const dist = cameraRef.current?.position.length() ?? 0;
const skipFrequency = dist > 4 ? 4 : (isMobileRef.current ? 2 : 1);
if (frameCountRef.current % skipFrequency === 0) {
  updateSpringBones(delta * skipFrequency, vrm); // compensate delta
}
```

### 5. QueryClient Configuration (App.tsx)

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 menit
      gcTime: 10 * 60 * 1000,     // 10 menit (cacheTime di v5 = gcTime)
      retry: (failureCount, error: any) => {
        // Jangan retry untuk 4xx errors
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
```

### 6. Parallel Supabase Queries (Index.tsx)

Refactor `loadActive()` dari sequential ke parallel:

```typescript
const [activeModel, activeVoice, profileData] = await Promise.all([
  supabase.from('vrm_models').select('file_path, personality').eq('is_active', true).maybeSingle(),
  supabase.from('voice_settings').select('voice_id').eq('is_active', true).maybeSingle(),
  supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
]);
// Handle partial failures: each result checked independently
```

### 7. Audio Analyser Deduplication (useAudioAnalyser.ts)

Sudah ada di kode (`attachedElementRef`). Perlu dipastikan AudioContext resume strategy:

```typescript
connectAudioElement(audio: HTMLAudioElement): void {
  // Skip jika elemen sama sudah terhubung
  if (attachedElementRef.current === audio && sourceRef.current) {
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return; // deduplication
  }
  // ... create new source
}
```

### 8. Vite Manual Chunks (vite.config.ts)

Sudah ada di kode. Perlu dipastikan face-api tidak masuk initial bundle:

```typescript
// vite.config.ts — sudah ada, perlu verifikasi
manualChunks: {
  "vendor-three": ["three"],
  "vendor-vrm": ["@pixiv/three-vrm", "@pixiv/three-vrm-animation"],
  "vendor-faceapi": ["@vladmandic/face-api"], // lazy-loaded only
  "vendor-ui": [...radix-ui components...],
}
```

Face-api harus di-import secara dynamic:

```typescript
// Bukan: import * as faceapi from '@vladmandic/face-api'
// Tapi:
const faceapi = await import('@vladmandic/face-api');
```

### 9. Rate Limiter (Edge Functions)

Interface rate limiter yang akan diimplementasikan di kedua Edge Functions:

```typescript
// Menggunakan Supabase KV atau in-memory Map per instance
interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp ms
}

async function checkRateLimit(
  userId: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  // Implementation menggunakan in-memory Map dengan TTL
  // atau Upstash Redis jika tersedia
}
```

### 10. TTS Cache (tts/index.ts)

```typescript
import { createHash } from "node:crypto"; // atau Web Crypto API

function getCacheKey(text: string, voiceId: string): string {
  return createHash('sha256')
    .update(`${text}:${voiceId}`)
    .digest('hex')
    .slice(0, 16); // 16 char prefix cukup untuk uniqueness
}

// Cache lookup di Supabase Storage
async function getCachedAudio(key: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from('tts-cache')
    .download(`${key}.mp3`);
  return data ? await blobToBase64(data) : null;
}
```

### 11. Mobile Performance Config

Centralized mobile detection dan config:

```typescript
// Di VrmViewer setup effect
const isMobile = container.clientWidth < 768 || 
  ('ontouchstart' in window);
isMobileRef.current = isMobile;

if (isMobile) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  // antialias: false sudah di-handle via constructor option
  // ambient particles: disabled via ambientEffect prop dari Index.tsx
  // dynamic light pulsing: disabled via isMobileRef check di render loop
}
```

### 12. Frame Budget Monitor

```typescript
// Di render loop, setelah semua operasi
if (import.meta.env.DEV) {
  const frameTime = performance.now() - frameStart;
  const budget = isMobileRef.current ? 33 : 16;
  if (frameTime > budget) {
    console.warn(`[RenderLoop] Frame budget exceeded: ${frameTime.toFixed(1)}ms (budget: ${budget}ms)`);
  }
}
```

---

## Data Models

### Frame Throttle State

```typescript
interface FrameThrottleState {
  lastFrameTime: number;      // performance.now() dari frame terakhir
  frameCount: number;         // total frames sejak mount
  isVisible: boolean;         // dari Page Visibility API
  isMobile: boolean;          // dari device detection
  targetFps: 10 | 30 | 60;   // derived dari isVisible + isMobile
}
```

### Lighting Cache Entry

```typescript
interface LightingCacheEntry {
  ambientIntensity: number;
  keyLightIntensity: number;
  fillLightIntensity: number;
  rimLightIntensity: number;
  lastUpdated: number; // performance.now()
}
```

### Rate Limit Entry (Edge Function)

```typescript
interface RateLimitEntry {
  userId: string;
  count: number;
  windowStart: number; // Unix timestamp ms
  limit: number;       // max requests per window
  windowMs: number;    // window duration ms (60000)
}
```

### TTS Cache Entry (Supabase Storage)

```typescript
interface TtsCacheMetadata {
  textHash: string;    // SHA-256 prefix dari text+voiceId
  voiceId: string;
  createdAt: string;   // ISO timestamp
  expiresAt: string;   // ISO timestamp (createdAt + 24h)
  hitCount: number;    // untuk analytics
}
// Audio disimpan sebagai: tts-cache/{textHash}.mp3
// Metadata disimpan sebagai: tts-cache/{textHash}.json
```

### Animation Catalog Cache (Edge Function)

```typescript
// Sudah ada di kode, tipe eksplisit:
interface AnimationCatalogCache {
  text: string;        // formatted catalog string
  expiresAt: number;   // Date.now() + 5 * 60 * 1000
}
let catalogCache: AnimationCatalogCache | null = null;
```

### QueryClient Default Options

```typescript
interface QueryDefaults {
  staleTime: 300_000;   // 5 menit
  gcTime: 600_000;      // 10 menit
  retry: (failureCount: number, error: unknown) => boolean;
  retryDelay: (attemptIndex: number) => number; // exponential backoff
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Frame Throttle Respects Target Interval

*For any* combination of (visibility_state, device_type), the render loop SHALL skip a frame if and only if the elapsed time since the last rendered frame is less than the target interval for that combination. Specifically: hidden → 100ms, visible+mobile → 33.33ms, visible+desktop → 16.67ms.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

### Property 2: Lighting Cache Threshold

*For any* pair of lighting configurations (old, new), the LightingManager SHALL skip the update if and only if the maximum absolute difference across all intensity values is strictly less than 0.01. If the difference is ≥ 0.01, the update SHALL be applied and the cache SHALL be updated to the new values.

**Validates: Requirements 3.2, 3.3**

### Property 3: Spring Bones Skip Frequency Selection

*For any* camera distance and device type, the skip frequency SHALL be determined as follows: distance > 4 → 4, distance ≤ 4 AND mobile → 2, distance ≤ 4 AND desktop → 1. Furthermore, the delta time passed to `updateSpringBones` SHALL equal `frameDelta * skipFrequency`.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 4: Audio Analyser Connection Deduplication

*For any* sequence of N calls to `connectAudioElement` with the same HTMLAudioElement instance, the number of `createMediaElementSource` calls SHALL equal exactly 1, regardless of N.

**Validates: Requirements 9.2, 9.5**

### Property 5: QueryClient Stale Cache Prevents Refetch

*For any* query that has been successfully fetched, if `connectAudioElement` is called again within the staleTime window (5 minutes), the number of new network requests SHALL equal 0.

**Validates: Requirements 7.3, 7.5**

### Property 6: Parallel Query Time Bound

*For any* set of independent Supabase queries with individual durations [d1, d2, ..., dn], when executed in parallel via `Promise.all`, the total elapsed time SHALL be ≤ max(d1, d2, ..., dn) + 100ms.

**Validates: Requirements 8.2, 8.5**

### Property 7: Rate Limit Enforcement

*For any* user making requests to an Edge Function, once the request count within the current 60-second window exceeds the configured limit (20 for chat, 30 for TTS), all subsequent requests in that window SHALL receive HTTP 429 with a `Retry-After` header.

**Validates: Requirements 14.1, 14.2, 14.3**

### Property 8: TTS Cache Round-Trip

*For any* (text, voiceId) pair, if a TTS request has been made and the cache entry is still valid (within 24 hours), a subsequent identical request SHALL return the same audio content without calling the ElevenLabs API.

**Validates: Requirements 15.1, 15.3, 15.5**

### Property 9: Animation Catalog Cache Deduplication

*For any* sequence of N chat requests arriving within a 5-minute window, the number of database queries to `vrma_animations` SHALL equal exactly 1, regardless of N.

**Validates: Requirements 18.1, 18.2**

### Property 10: Expression Lerp Bounds

*For any* start weight `s ∈ [0, 1]`, end weight `e ∈ [0, 1]`, and interpolation factor `t ∈ [0, 1]`, the lerp result `lerp(s, e, t)` SHALL satisfy `min(s, e) ≤ result ≤ max(s, e)`.

**Validates: Requirements 19.4**

### Property 11: Raycasting Throttle

*For any* sequence of N pointer move events arriving within a 1-second window, the number of raycasting operations performed SHALL be ≤ 30, regardless of N.

**Validates: Requirements 26.4**

---

## Error Handling

### Client-Side

| Skenario | Handling |
|---|---|
| WebGL context loss | Listen `webglcontextlost`, pause render loop, tampilkan recovery UI, resume saat `webglcontextrestored` |
| VRM load failure | Set `error` state, tampilkan error message, jangan crash render loop |
| Three.js disposal error | Wrap dalam try-catch, log warning, lanjutkan disposal resource lain |
| AudioContext suspended | Resume otomatis saat user interaction, retry 3x dengan exponential backoff |
| Face-api dynamic import failure | Tampilkan toast error, disable face detection feature |
| Network error saat query | QueryClient retry 3x dengan backoff 1s/2s/4s, tampilkan error setelah exhausted |

### Server-Side (Edge Functions)

| Skenario | Handling |
|---|---|
| Rate limit exceeded | Return 429 dengan `Retry-After: 60` header |
| ElevenLabs API error | Return 500, client fallback ke Web Speech |
| Supabase Storage write failure (TTS cache) | Log error, return audio langsung tanpa caching |
| Animation catalog DB error | Return empty catalog, chat tetap berfungsi tanpa animasi |
| Missing environment variables | Return 500 dengan pesan yang informatif |

### Graceful Degradation

- Jika TTS cache tidak tersedia → generate audio baru (no degradation in UX)
- Jika rate limiter tidak tersedia → allow request (fail open, log warning)
- Jika face-api gagal di-load → disable face detection, avatar tetap berfungsi
- Jika WebGL context tidak bisa di-restore → tampilkan pesan "Reload halaman"

---

## Testing Strategy

### Unit Tests

Fokus pada pure functions dan logic yang bisa diisolasi:

- `computeTargetInterval(isVisible, isMobile)` → verifikasi output untuk semua 3 kombinasi
- `shouldSkipLightingUpdate(oldConfig, newConfig, threshold)` → verifikasi threshold logic
- `computeSpringSkipFrequency(cameraDistance, isMobile)` → verifikasi semua 3 kasus
- `getCacheKey(text, voiceId)` → verifikasi deterministic hash
- `checkRateLimit(userId, count, limit)` → verifikasi boundary conditions
- `lerp(start, end, t)` → verifikasi bounds dan linearity

### Property-Based Tests

Menggunakan **fast-check** (TypeScript) untuk client-side dan **fast-check** via Deno untuk Edge Functions.

Setiap property test dikonfigurasi dengan minimum **100 iterasi**.

Tag format: `// Feature: performance-optimization, Property N: <property_text>`

**Property 1 — Frame Throttle:**
```typescript
// Feature: performance-optimization, Property 1: Frame throttle respects target interval
fc.assert(fc.property(
  fc.record({
    isVisible: fc.boolean(),
    isMobile: fc.boolean(),
    elapsed: fc.float({ min: 0, max: 200 }),
  }),
  ({ isVisible, isMobile, elapsed }) => {
    const targetInterval = !isVisible ? 100 : isMobile ? 33.33 : 16.67;
    const shouldSkip = elapsed < targetInterval;
    expect(computeShouldSkipFrame(isVisible, isMobile, elapsed)).toBe(shouldSkip);
  }
), { numRuns: 100 });
```

**Property 2 — Lighting Cache:**
```typescript
// Feature: performance-optimization, Property 2: Lighting cache threshold
fc.assert(fc.property(
  fc.record({
    oldIntensity: fc.float({ min: 0, max: 2 }),
    delta: fc.float({ min: 0, max: 0.1 }),
  }),
  ({ oldIntensity, delta }) => {
    const newIntensity = oldIntensity + delta;
    const shouldSkip = delta < 0.01;
    const manager = new LightingManager(mockScene);
    manager.updateLighting({ ...baseConfig, rimLightIntensity: oldIntensity });
    const updateCount = trackUpdateCalls(() =>
      manager.updateLighting({ ...baseConfig, rimLightIntensity: newIntensity })
    );
    expect(updateCount === 0).toBe(shouldSkip);
  }
), { numRuns: 100 });
```

**Property 3 — Spring Skip Frequency:**
```typescript
// Feature: performance-optimization, Property 3: Spring bones skip frequency selection
fc.assert(fc.property(
  fc.record({
    distance: fc.float({ min: 0, max: 10 }),
    isMobile: fc.boolean(),
  }),
  ({ distance, isMobile }) => {
    const freq = computeSpringSkipFrequency(distance, isMobile);
    if (distance > 4) expect(freq).toBe(4);
    else if (isMobile) expect(freq).toBe(2);
    else expect(freq).toBe(1);
  }
), { numRuns: 100 });
```

**Property 4 — Audio Deduplication:**
```typescript
// Feature: performance-optimization, Property 4: Audio analyser connection deduplication
fc.assert(fc.property(
  fc.integer({ min: 1, max: 20 }),
  (n) => {
    const { connectAudioElement, getCreateSourceCallCount } = createMockAnalyser();
    const audio = new MockAudioElement();
    for (let i = 0; i < n; i++) connectAudioElement(audio);
    expect(getCreateSourceCallCount()).toBe(1);
  }
), { numRuns: 100 });
```

**Property 7 — Rate Limit:**
```typescript
// Feature: performance-optimization, Property 7: Rate limit enforcement
fc.assert(fc.property(
  fc.record({
    limit: fc.integer({ min: 1, max: 50 }),
    extraRequests: fc.integer({ min: 1, max: 20 }),
  }),
  async ({ limit, extraRequests }) => {
    const rateLimiter = createRateLimiter(limit, 60000);
    const userId = 'test-user';
    // Send exactly `limit` requests — all should pass
    for (let i = 0; i < limit; i++) {
      const result = await rateLimiter.check(userId);
      expect(result.allowed).toBe(true);
    }
    // Send extra requests — all should be rejected
    for (let i = 0; i < extraRequests; i++) {
      const result = await rateLimiter.check(userId);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    }
  }
), { numRuns: 100 });
```

**Property 8 — TTS Cache Round-Trip:**
```typescript
// Feature: performance-optimization, Property 8: TTS cache round-trip
fc.assert(fc.property(
  fc.record({
    text: fc.string({ minLength: 1, maxLength: 200 }),
    voiceId: fc.string({ minLength: 1, maxLength: 50 }),
  }),
  async ({ text, voiceId }) => {
    const cache = createMockTtsCache();
    const key = getCacheKey(text, voiceId);
    // First request: cache miss, generate audio
    const audio1 = await generateWithCache(text, voiceId, cache);
    // Second request: cache hit, same audio
    const audio2 = await generateWithCache(text, voiceId, cache);
    expect(audio2).toEqual(audio1);
    expect(cache.getHitCount(key)).toBe(1);
  }
), { numRuns: 100 });
```

**Property 10 — Expression Lerp Bounds:**
```typescript
// Feature: performance-optimization, Property 10: Expression lerp bounds
fc.assert(fc.property(
  fc.record({
    start: fc.float({ min: 0, max: 1 }),
    end: fc.float({ min: 0, max: 1 }),
    t: fc.float({ min: 0, max: 1 }),
  }),
  ({ start, end, t }) => {
    const result = lerp(start, end, t);
    expect(result).toBeGreaterThanOrEqual(Math.min(start, end) - 1e-6);
    expect(result).toBeLessThanOrEqual(Math.max(start, end) + 1e-6);
  }
), { numRuns: 100 });
```

### Integration Tests

- Parallel query execution: mock Supabase dengan artificial delays, verifikasi total time ≤ max(delays) + 100ms
- TTS cache dengan Supabase Storage: test end-to-end dengan test bucket
- Rate limiter dengan concurrent requests: verifikasi tidak ada race condition
- WebGL context loss/restore: simulasikan event di jsdom

### Smoke Tests

- Build output: verifikasi chunk sizes setelah `vite build`
- Face-api tidak ada di initial bundle: parse bundle manifest
- Lighthouse CI: jalankan di CI pipeline untuk verifikasi Web Vitals targets

### Performance Monitoring

- Frame rate logging setiap 10 detik ke analytics (Req 30.1)
- Memory usage logging setiap 30 detik (Req 30.2)
- Web Vitals reporting via `web-vitals` library (Req 30.3)
- Performance overlay di debug mode: fps, memory, draw calls (Req 30.5)
