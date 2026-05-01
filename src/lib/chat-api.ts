import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** Custom error class for plan-quota failures (HTTP 403 from edge functions) */
export class QuotaError extends Error {
  constructor(public code: 'QUOTA_EXCEEDED' | 'PRO_ONLY', message: string) {
    super(message);
    this.name = 'QuotaError';
  }
}

async function authHeader(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? `Bearer ${session.access_token}` : `Bearer ${SUPABASE_KEY}`;
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** Check if the browser has network connectivity */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Parse the optional `[ANIM:<name>]` tag the AI may append to its reply.
 */
export function parseAnimTag(text: string): { clean: string; animName: string | null } {
  if (!text) return { clean: text, animName: null };
  const re = /\s*\[ANIM:\s*([^\]\n]+?)\s*\]\s*$/i;
  const m = text.match(re);
  if (!m) return { clean: text, animName: null };
  const name = m[1].trim();
  const clean = text.slice(0, m.index).replace(/\s+$/, "");
  if (!name || name.toLowerCase() === "none") return { clean, animName: null };
  return { clean, animName: name };
}

/**
 * Strip symbols and kaomoji that TTS engines read aloud awkwardly.
 * Keeps standard punctuation, letters, numbers, and common safe chars.
 */
export function stripForTTS(text: string): string {
  if (!text) return text;
  return text
    // Remove kaomoji / emoticon patterns like (^◡^) (´∀｀) (>_<) etc.
    .replace(/[（(][^）)]{0,20}[）)]/g, '')
    // Remove standalone emoji and unicode symbols (keep basic ASCII punctuation)
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')   // Mahjong, domino, misc symbols
    .replace(/[\u{2600}-\u{27BF}]/gu, '')      // Misc symbols, dingbats
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')    // Emoji block
    .replace(/[\u{FE00}-\u{FEFF}]/gu, '')      // Variation selectors, BOM
    // Remove decorative unicode: ♡♥★☆◆◇●○▲△▼▽◎※→←↑↓
    .replace(/[♡♥★☆◆◇●○▲△▼▽◎※→←↑↓♪♫♬♩〜～]/g, '')
    // Remove tilde variants (ASCII ~ and fullwidth ～ and wave dash 〜)
    .replace(/[~～〜\u301C\uFF5E]/g, '')
    // Collapse multiple spaces/newlines left by removals
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function streamChat({
  messages,
  onDelta,
  onDone,
  systemPrompt,
  signal,
}: {
  messages: ChatMessage[];
  onDelta: (text: string) => void;
  onDone: () => void;
  systemPrompt?: string;
  signal?: AbortSignal;
}) {
  if (!isOnline()) throw new Error("Tidak ada koneksi internet.");

  const now = new Date();
  const timeContext = `[META: Waktu dunia nyata pengguna saat ini adalah ${now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} pukul ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}. Sesuaikan nada dan ucapan/sapaanmu jika berhubungan dengan waktu tersebut, act natural.]`;
  
  const modifiedPrompt = systemPrompt ? `${systemPrompt}\n\n${timeContext}` : timeContext;

  const resp = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: await authHeader(),
    },
    body: JSON.stringify({ messages, systemPrompt: modifiedPrompt }),
    signal,
  });

  if (!resp.ok || !resp.body) {
    if (resp.status === 429) throw new Error("Rate limited. Coba lagi nanti.");
    if (resp.status === 402) throw new Error("Kredit habis. Tambahkan dana.");
    if (resp.status === 403) {
      try {
        const data = await resp.json();
        if (data?.error === 'QUOTA_EXCEEDED' || data?.error === 'PRO_ONLY') {
          throw new QuotaError(data.error, data.message ?? 'Kuota habis');
        }
      } catch (e) {
        if (e instanceof QuotaError) throw e;
      }
      throw new Error("Akses ditolak.");
    }
    if (resp.status === 401) throw new Error("Sesi habis. Silakan login ulang.");
    if (resp.status >= 500) throw new Error("Server sedang bermasalah. Coba lagi.");
    throw new Error("Gagal memulai chat");
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;

  while (!done) {
    const { done: readerDone, value } = await reader.read();
    if (readerDone) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }

      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }

  onDone();
}

/** Generate TTS with automatic retry on transient failures.
 * isPro=true  → try ElevenLabs, fall back to Web Speech on 429/error
 * isPro=false → Web Speech directly, never calls ElevenLabs
 */
export async function generateTTS(
  text: string,
  voiceId?: string,
  retries = 2,
  isPro = false,
): Promise<{ url: string; error: null; source: 'elevenlabs' | 'webspeech' } |
           { url: null;   error: string; source: 'none' }> {
  if (!isOnline()) return { url: null, error: "Tidak ada koneksi internet", source: 'none' };

  // Web Speech only — never touch ElevenLabs
  if (!isPro) {
    return { url: 'webspeech://' + encodeURIComponent(text), error: null, source: 'webspeech' };
  }

  // ElevenLabs with fallback
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: await authHeader(),
        },
        body: JSON.stringify({ text, voiceId }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          // Rate limited — caller should handle provider switch
          return { url: 'webspeech://' + encodeURIComponent(text), error: null, source: 'webspeech' };
        }
        if (resp.status === 401 || resp.status === 403) return { url: null, error: "Auth error", source: 'none' };
        if (resp.status >= 500 && attempt < retries) {
          await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
          continue;
        }
        return { url: 'webspeech://' + encodeURIComponent(text), error: null, source: 'webspeech' };
      }

      const data = await resp.json();
      if (data.audioContent) {
        return { url: `data:audio/mpeg;base64,${data.audioContent}`, error: null, source: 'elevenlabs' };
      }
      return { url: null, error: "No audio content", source: 'none' };
    } catch (e) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
        continue;
      }
      return { url: 'webspeech://' + encodeURIComponent(text), error: null, source: 'webspeech' };
    }
  }
  return { url: null, error: "Max retries exceeded", source: 'none' };
}

/** Check if a TTS URL is a Web Speech fallback */
export function isWebSpeechUrl(url: string): boolean {
  return url.startsWith('webspeech://');
}

/** Extract text from a Web Speech URL */
export function getWebSpeechText(url: string): string {
  return decodeURIComponent(url.replace('webspeech://', ''));
}
