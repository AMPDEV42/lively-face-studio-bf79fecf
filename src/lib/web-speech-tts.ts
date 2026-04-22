/**
 * Web Speech API TTS — browser-native, no API key needed.
 * Used as fallback for free users or when ElevenLabs is unavailable.
 */

export function isWebSpeechTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

let _currentUtterance: SpeechSynthesisUtterance | null = null;

export interface WebSpeechTTSOptions {
  lang?: string;       // e.g. 'id-ID', 'en-US' — auto-detected if omitted
  rate?: number;       // 0.1–10, default 1.0
  pitch?: number;      // 0–2, default 1.0
  volume?: number;     // 0–1, default 1.0
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (e: SpeechSynthesisErrorEvent) => void;
}

/** Detect best voice for the given language */
function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Prefer exact match, then prefix match, then any
  return (
    voices.find(v => v.lang === lang) ??
    voices.find(v => v.lang.startsWith(lang.split('-')[0])) ??
    voices.find(v => v.default) ??
    voices[0] ??
    null
  );
}

/** Detect language from text for voice selection */
function detectLang(text: string): string {
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text)) return 'ja-JP';
  if (/[\uac00-\ud7af]/.test(text)) return 'ko-KR';
  if (/[\u0e00-\u0e7f]/.test(text)) return 'th-TH';
  // Default to Indonesian (most common for this app)
  return 'id-ID';
}

export function speakWithWebSpeech(text: string, opts: WebSpeechTTSOptions = {}): void {
  if (!isWebSpeechTTSSupported()) {
    opts.onError?.({ error: 'not-supported' } as SpeechSynthesisErrorEvent);
    return;
  }

  // Cancel any ongoing speech
  stopWebSpeech();

  const lang = opts.lang ?? detectLang(text);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang   = lang;
  utterance.rate   = opts.rate   ?? 1.05;
  utterance.pitch  = opts.pitch  ?? 1.0;
  utterance.volume = opts.volume ?? 1.0;

  // Try to pick a matching voice (may be empty on first call — voices load async)
  const voice = pickVoice(lang);
  if (voice) utterance.voice = voice;

  utterance.onstart = () => opts.onStart?.();
  utterance.onend   = () => { _currentUtterance = null; opts.onEnd?.(); };
  utterance.onerror = (e) => { _currentUtterance = null; opts.onError?.(e); };

  _currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopWebSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    _currentUtterance = null;
  }
}

export function isWebSpeechSpeaking(): boolean {
  return typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    window.speechSynthesis.speaking;
}

/** Preload voices (call once on app start) */
export function preloadVoices(): void {
  if (!isWebSpeechTTSSupported()) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    window.speechSynthesis.getVoices(); // trigger cache
  }, { once: true });
}
