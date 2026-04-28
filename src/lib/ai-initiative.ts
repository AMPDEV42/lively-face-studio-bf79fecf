/**
 * AI Initiative System
 *
 * Ketika user tidak aktif selama X menit, AI akan mengambil inisiatif
 * untuk memulai percakapan dengan pertanyaan/komentar yang kontekstual.
 *
 * Semua logika berjalan di frontend — tidak ada koneksi backend baru.
 */

export interface InitiativeContext {
  lastMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  personality?: string;
  userLang?: string;
}

// Delay sebelum AI berinisiatif (ms)
export const INITIATIVE_DELAY_MS = 1 * 60 * 1000; // 1 menit

// Minimum pesan sebelum AI mulai berinisiatif (hindari trigger di sesi baru)
export const INITIATIVE_MIN_MESSAGES = 0;

// Cooldown antar inisiatif agar tidak spam (ms)
export const INITIATIVE_COOLDOWN_MS = 5 * 60 * 1000; // 5 menit

/**
 * Bangun system prompt khusus untuk inisiatif AI.
 * Instruksikan AI untuk menunjukkan perhatian dan kepedulian kepada user.
 */
export function buildInitiativePrompt(ctx: InitiativeContext): string {
  const lang = ctx.userLang ?? 'id';
  const langInstruction =
    lang === 'ja' ? 'Respond in Japanese.' :
    lang === 'en' ? 'Respond in English.' :
    'Respond in Indonesian (Bahasa Indonesia).';

  const recentContext = ctx.lastMessages.slice(-4)
    .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
    .join('\n');

  const base = ctx.personality
    ? `${ctx.personality}\n\n`
    : '';

  // Dapatkan waktu saat ini untuk konteks
  const now = new Date();
  const hour = now.getHours();
  const timeContext = 
    hour >= 5 && hour < 10 ? 'pagi' :
    hour >= 10 && hour < 15 ? 'siang' :
    hour >= 15 && hour < 18 ? 'sore' :
    'malam';

  return `${base}${langInstruction}

The user has been quiet for a while. Show genuine care and concern by reaching out to them.

Current time context: It's ${timeContext} (${hour}:00).

Rules:
- Write EXACTLY ONE sentence (maximum 2 sentences if truly needed)
- Keep it SHORT — under 40 words total, this will be spoken aloud by a voice synthesizer
- Show genuine concern for their wellbeing
- Examples of caring topics:
  * Sudah makan belum? (Have you eaten?)
  * Jangan lupa istirahat ya~ (Don't forget to rest)
  * Lagi sibuk apa nih? Jangan terlalu capek ya (What are you busy with? Don't overwork yourself)
  * Udah minum air hari ini? (Have you had water today?)
  * Kayaknya kamu lagi fokus banget, jangan lupa istirahat sebentar (You seem very focused, take a break)
  * Butuh temen ngobrol? Aku di sini kok~ (Need someone to talk to? I'm here)
- Use time context naturally (e.g., "Udah sarapan?" in morning, "Udah makan malam?" in evening)
- If there's recent conversation context, show you remember and care about what they shared
- Be affectionate but not overbearing
- Sound like a caring friend/companion, not a chatbot
- Do NOT start with "I notice you've been quiet" or similar meta-commentary
- STRICTLY do NOT use "[ANIM:...]" tags — this is a caring message, no animations
- Use casual, warm language with occasional emoji or "~" for softness
- CRITICAL: Keep response SHORT — it will be spoken by a voice synthesizer with strict character limits

${recentContext ? `Recent conversation:\n${recentContext}\n\nReference this context if relevant to show you care and remember.` : 'This is early in the session — be gentle and welcoming.'}`;
}
