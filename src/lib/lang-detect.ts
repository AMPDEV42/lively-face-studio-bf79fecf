/**
 * Lightweight script-based language hint.
 * Returns the most likely language code based on Unicode ranges in the text.
 * Falls back to 'en' for plain Latin text (also matches 'id' / 'vi' keywords
 * since those use Latin script).
 */
export type LangCode = 'id' | 'en' | 'ja' | 'ko' | 'zh' | 'th' | 'vi';

export const ALL_LANGS: LangCode[] = ['id', 'en', 'ja', 'ko', 'zh', 'th', 'vi'];

/** Languages that use Latin script and need word-boundary matching. */
export const LATIN_LANGS: LangCode[] = ['id', 'en', 'vi'];

/** Languages without inter-word spaces — use substring match. */
export const NO_SPACE_LANGS: LangCode[] = ['ja', 'ko', 'zh', 'th'];

export function detectLang(text: string): LangCode | null {
  if (!text) return null;
  // Hiragana / Katakana → Japanese (most reliable JP signal)
  if (/[\u3040-\u30FF]/.test(text)) return 'ja';
  // Hangul → Korean
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
  // Thai
  if (/[\u0E00-\u0E7F]/.test(text)) return 'th';
  // CJK Unified Ideographs → Chinese (or Japanese kanji-only — caller should
  // also check JA keywords as fallback).
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
  // Latin script — caller should check id/en/vi.
  return 'en';
}

/** Build the prioritized list of languages to scan for `text`. */
export function langPriority(text: string, userPref?: LangCode | null): LangCode[] {
  const detected = detectLang(text);
  const head: LangCode[] = [];
  if (userPref) head.push(userPref);
  if (detected && !head.includes(detected)) head.push(detected);
  // For CJK kanji-only text, also check JA right after ZH.
  if (detected === 'zh' && !head.includes('ja')) head.push('ja');
  // For Latin, prioritize Latin family.
  if (detected === 'en') {
    for (const l of LATIN_LANGS) if (!head.includes(l)) head.push(l);
  }
  // Append remaining.
  for (const l of ALL_LANGS) if (!head.includes(l)) head.push(l);
  return head;
}
