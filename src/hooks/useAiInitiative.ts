import { useEffect, useRef, useCallback } from 'react';
import { streamChat, type ChatMessage } from '@/lib/chat-api';
import {
  buildInitiativePrompt,
  INITIATIVE_DELAY_MS,
  INITIATIVE_COOLDOWN_MS,
} from '@/lib/ai-initiative';

interface UseAiInitiativeOptions {
  messages: ChatMessage[];
  personality?: string;
  isLoading: boolean;
  isSpeaking: boolean;
  enabled?: boolean;
  onInitiativeMessage: (text: string) => void;
}

export function useAiInitiative({
  messages,
  personality,
  isLoading,
  isSpeaking,
  enabled = true,
  onInitiativeMessage,
}: UseAiInitiativeOptions) {
  // Semua state disimpan di refs agar timer TIDAK pernah di-reset karena re-render
  const messagesRef = useRef(messages);
  const personalityRef = useRef(personality);
  const isLoadingRef = useRef(isLoading);
  const isSpeakingRef = useRef(isSpeaking);
  const onInitiativeRef = useRef(onInitiativeMessage);
  const lastUserActivityRef = useRef<number>(Date.now());
  const lastInitiativeRef = useRef<number>(0);
  const isRunningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync refs setiap render — tidak trigger re-schedule timer
  messagesRef.current = messages;
  personalityRef.current = personality;
  isLoadingRef.current = isLoading;
  isSpeakingRef.current = isSpeaking;
  onInitiativeRef.current = onInitiativeMessage;

  // Track aktivitas user dari messages
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'user') {
      lastUserActivityRef.current = Date.now();
    }
  }, [messages]);

  // Timer pakai setInterval — TIDAK ada dependency yang bisa reset ini
  useEffect(() => {
    if (!enabled) return;

    // Cek setiap 15 detik apakah sudah idle cukup lama
    const CHECK_INTERVAL = 15_000;

    timerRef.current = setInterval(async () => {
      if (isRunningRef.current) return;
      if (isLoadingRef.current) return; // jangan trigger saat AI sedang generate

      const now = Date.now();
      const idleMs = now - lastUserActivityRef.current;
      const cooldownOk = now - lastInitiativeRef.current >= INITIATIVE_COOLDOWN_MS;

      if (import.meta.env.DEV) {
        console.log(`[AI Initiative] check — idle: ${Math.round(idleMs/1000)}s, cooldown ok: ${cooldownOk}, running: ${isRunningRef.current}`);
      }

      if (idleMs < INITIATIVE_DELAY_MS) return;
      if (!cooldownOk) return;

      isRunningRef.current = true;
      lastInitiativeRef.current = now;

      if (import.meta.env.DEV) console.log('[AI Initiative] Triggering initiative message...');

      const userLang = typeof window !== 'undefined'
        ? (localStorage.getItem('vrm.lang') ?? 'id')
        : 'id';

      const systemPrompt = buildInitiativePrompt({
        lastMessages: messagesRef.current,
        personality: personalityRef.current,
        userLang,
      });

      let result = '';
      try {
        await streamChat({
          messages: [{ role: 'user', content: '.' }],
          systemPrompt,
          onDelta: (chunk) => { result += chunk; },
          onDone: () => {
            if (import.meta.env.DEV) console.log('[AI Initiative] Got response:', result);
            const clean = result.trim();
            if (clean) onInitiativeRef.current(clean);
            isRunningRef.current = false;
          },
        });
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[AI Initiative] streamChat error:', err);
        isRunningRef.current = false;
      }
    }, CHECK_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]); // hanya enabled — timer tidak pernah restart karena messages/state lain

  const resetTimer = useCallback(() => {
    lastUserActivityRef.current = Date.now();
  }, []);

  return { resetTimer };
}
