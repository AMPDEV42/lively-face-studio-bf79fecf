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

function _pickRandom(length: number, lastIdx: number): number {
  if (length <= 1) return 0;
  let idx: number;
  do {
    idx = Math.floor(Math.random() * length);
  } while (idx === lastIdx);
  return idx;
}

async function _playFromPool(
  pool: HTMLAudioElement[],
  files: string[],
  volume: number,
  lastIdx: number,
  setLast: (i: number) => void,
  label: string
): Promise<void> {
  if (pool.length === 0) {
    // Fallback: files not preloaded yet, create on-the-fly
    const idx = _pickRandom(files.length, lastIdx);
    setLast(idx);
    const audio = new Audio(files[idx]);
    audio.volume = Math.max(0, Math.min(1, volume));
    await audio.play().catch(e => console.warn(`[SFX] ${label} play failed:`, e));
    return;
  }

  const idx = _pickRandom(pool.length, lastIdx);
  setLast(idx);
  const audio = pool[idx];

  // Reset to start if it was previously played
  audio.currentTime = 0;
  audio.volume = Math.max(0, Math.min(1, volume));

  await audio.play().catch(e => console.warn(`[SFX] ${label} play failed:`, e));
  console.log(`[SFX] ${label} → ${files[idx].split('/').pop()} (vol: ${volume.toFixed(2)})`);
}

/** Play a random headpat sound. Respects cooldown to prevent spam. */
export function playHeadpatSfx(volume = 0.6): void {
  const now = Date.now();
  if (now - _lastHeadpatTime < COOLDOWN_MS) return;
  _lastHeadpatTime = now;

  _playFromPool(
    _headpatPool,
    headpatFiles,
    volume,
    _lastHeadpatIdx,
    (i) => { _lastHeadpatIdx = i; },
    'Headpat'
  );
}

/** Play a random shoulder tap sound. Respects cooldown to prevent spam. */
export function playShoulderTapSfx(volume = 0.6): void {
  const now = Date.now();
  if (now - _lastTapTime < COOLDOWN_MS) return;
  _lastTapTime = now;

  _playFromPool(
    _tapPool,
    tapFiles,
    volume,
    _lastTapIdx,
    (i) => { _lastTapIdx = i; },
    'ShoulderTap'
  );
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
