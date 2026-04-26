/**
 * Interaction SFX Manager
 *
 * Manages two audio banks (headpat & shoulder tap) using pre-generated
 * TTS audio files stored in /public/sfx/.
 *
 * Features:
 * - Random selection from bank on each trigger
 * - Anti-spam cooldown (800ms)
 * - Preloading for zero-latency playback
 * - Falls back gracefully if files are missing
 */

const HEADPAT_COUNT = 10;
const TAP_COUNT = 10;
const COOLDOWN_MS = 800;

// Pre-build the file lists
const headpatFiles = Array.from({ length: HEADPAT_COUNT }, (_, i) =>
  `/sfx/headpat/hp_${String(i + 1).padStart(2, '0')}.mp3`
);

const tapFiles = Array.from({ length: TAP_COUNT }, (_, i) =>
  `/sfx/tap/tap_${String(i + 1).padStart(2, '0')}.mp3`
);

// Preloaded Audio pool — one instance per file for instant playback
const _headpatPool: HTMLAudioElement[] = [];
const _tapPool: HTMLAudioElement[] = [];

let _headpatPreloaded = false;
let _tapPreloaded = false;

// Track last played index to avoid same sound twice in a row
let _lastHeadpatIdx = -1;
let _lastTapIdx = -1;

// Cooldown timestamps
let _lastHeadpatTime = 0;
let _lastTapTime = 0;

function _preloadBank(files: string[], pool: HTMLAudioElement[]): void {
  if (pool.length > 0) return; // already loaded
  for (const src of files) {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous'; // Important for Web Audio API
    audio.load();
    pool.push(audio);
  }
}

/** Preload headpat audio bank. Call once on component mount. */
export function preloadHeadpatSfx(): void {
  if (_headpatPreloaded) return;
  _headpatPreloaded = true;
  _preloadBank(headpatFiles, _headpatPool);
  console.log('[SFX] Headpat bank preloaded:', headpatFiles.length, 'files');
}

/** Preload shoulder tap audio bank. Call once on component mount. */
export function preloadTapSfx(): void {
  if (_tapPreloaded) return;
  _tapPreloaded = true;
  _preloadBank(tapFiles, _tapPool);
  console.log('[SFX] Tap bank preloaded:', tapFiles.length, 'files');
}

/** Get the preloaded audio pools for analyser setup */
export function getHeadpatPool(): HTMLAudioElement[] {
  return _headpatPool;
}

export function getTapPool(): HTMLAudioElement[] {
  return _tapPool;
}

function _pickRandom(length: number, lastIdx: number): number {
  if (length <= 1) return 0;
  let idx: number;
  do {
    idx = Math.floor(Math.random() * length);
  } while (idx === lastIdx);
  return idx;
}

/** Play a random headpat sound. Respects cooldown to prevent spam. Returns audio element for lip sync. */
export function playHeadpatSfx(volume = 0.6): HTMLAudioElement | null {
  const now = Date.now();
  if (now - _lastHeadpatTime < COOLDOWN_MS) return null;
  _lastHeadpatTime = now;

  // Pick the audio element that will be played
  if (_headpatPool.length === 0) {
    // Fallback: create on-the-fly
    const idx = _pickRandom(headpatFiles.length, _lastHeadpatIdx);
    _lastHeadpatIdx = idx;
    const audio = new Audio(headpatFiles[idx]);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch(e => console.warn(`[SFX] Headpat play failed:`, e));
    console.log(`[SFX] Headpat → ${headpatFiles[idx].split('/').pop()} (vol: ${volume.toFixed(2)})`);
    return audio;
  }

  // Use preloaded pool
  const idx = _pickRandom(_headpatPool.length, _lastHeadpatIdx);
  _lastHeadpatIdx = idx;
  const audio = _headpatPool[idx];

  // Reset to start and play
  audio.currentTime = 0;
  audio.volume = Math.max(0, Math.min(1, volume));
  audio.play().catch(e => console.warn(`[SFX] Headpat play failed:`, e));
  console.log(`[SFX] Headpat → ${headpatFiles[idx].split('/').pop()} (vol: ${volume.toFixed(2)})`);
  
  return audio;
}

/** Play a random shoulder tap sound. Respects cooldown to prevent spam. Returns audio element for lip sync. */
export function playShoulderTapSfx(volume = 0.6): HTMLAudioElement | null {
  const now = Date.now();
  if (now - _lastTapTime < COOLDOWN_MS) return null;
  _lastTapTime = now;

  // Pick the audio element that will be played
  if (_tapPool.length === 0) {
    // Fallback: create on-the-fly
    const idx = _pickRandom(tapFiles.length, _lastTapIdx);
    _lastTapIdx = idx;
    const audio = new Audio(tapFiles[idx]);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch(e => console.warn(`[SFX] ShoulderTap play failed:`, e));
    console.log(`[SFX] ShoulderTap → ${tapFiles[idx].split('/').pop()} (vol: ${volume.toFixed(2)})`);
    return audio;
  }

  // Use preloaded pool
  const idx = _pickRandom(_tapPool.length, _lastTapIdx);
  _lastTapIdx = idx;
  const audio = _tapPool[idx];

  // Reset to start and play
  audio.currentTime = 0;
  audio.volume = Math.max(0, Math.min(1, volume));
  audio.play().catch(e => console.warn(`[SFX] ShoulderTap play failed:`, e));
  console.log(`[SFX] ShoulderTap → ${tapFiles[idx].split('/').pop()} (vol: ${volume.toFixed(2)})`);
  
  return audio;
}

/** Check if audio files are available (at least one headpat file loads) */
export async function checkSfxAvailability(): Promise<{ headpat: boolean; tap: boolean }> {
  const check = (url: string): Promise<boolean> =>
    fetch(url, { method: 'HEAD' })
      .then(r => r.ok)
      .catch(() => false);

  const [headpat, tap] = await Promise.all([
    check(headpatFiles[0]),
    check(tapFiles[0]),
  ]);

  return { headpat, tap };
}
