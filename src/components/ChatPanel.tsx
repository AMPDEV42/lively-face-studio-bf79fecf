import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronDown, X, Bot,
  Plus, History, Download, RefreshCw, MoreVertical, Upload,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { streamChat, generateTTS, parseAnimTag, isOnline, type ChatMessage } from '@/lib/chat-api';
import { generateVitsAudio, translateToJapanese } from '@/lib/vits-tts';
import { useConversations } from '@/hooks/useConversations';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ChatMessageList } from '@/components/ChatMessageList';
import { ChatHistoryPanel } from '@/components/ChatHistoryPanel';
import { ChatInputBar } from '@/components/ChatInputBar';

interface ChatPanelProps {
  onSpeakStart: (audioUrl: string, messageText?: string) => void;
  onSpeakEnd: () => void;
  onUserMessage?: (text: string) => void;
  voiceId?: string;
  personality?: string;
  ttsProvider?: 'elevenlabs' | 'webspeech' | 'vits';
  onTTSRateLimit?: () => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  onUnreadChange?: (hasUnread: boolean) => void;
  isSpeaking?: boolean;
  showSubtitles?: boolean;
  onToggleSubtitles?: () => void;
  availableAnimations?: string[];
}

export default function ChatPanel({
  onSpeakStart,
  onSpeakEnd,
  onUserMessage,
  voiceId,
  personality,
  ttsProvider = 'webspeech',
  onTTSRateLimit,
  isMobile = false,
  isOpen = true,
  onToggle,
  onUnreadChange,
  isSpeaking = false,
  showSubtitles = true,
  onToggleSubtitles,
  availableAnimations = [],
}: ChatPanelProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  isLoadingRef.current = isLoading;
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [lastAssistantText, setLastAssistantText] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const activeConvoIdRef = useRef<string | null>(null);
  const messageCountRef = useRef(0);

  // Speech recognition (STT)
  const userLang = typeof window !== 'undefined' ? (localStorage.getItem('vrm.lang') ?? 'id') : 'id';
  const sttLang = userLang === 'auto' || !userLang ? 'id-ID' :
    ({ id: 'id-ID', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN', th: 'th-TH', vi: 'vi-VN' } as Record<string, string>)[userLang] ?? 'id-ID';

  // Ref to handleSend — populated after handleSend is defined below
  const handleSendRef = useRef<((text: string) => void) | null>(null);

  // Countdown before auto-send — resets every time a new speech segment arrives
  const SEND_DELAY = 5; // seconds
  const [sendCountdown, setSendCountdown] = useState<number | null>(null);
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingTranscriptRef = useRef<string>('');

  const cancelPendingSend = useCallback(() => {
    if (sendTimerRef.current) { clearTimeout(sendTimerRef.current); sendTimerRef.current = null; }
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    setSendCountdown(null);
    pendingTranscriptRef.current = '';
  }, []);

  const scheduleSend = useCallback((text: string) => {
    // Only schedule send if speech mode is active and not currently loading/speaking
    if (!speechModeRef.current) return;
    if (isLoadingRef.current) return; // don't queue while AI is responding

    // Cancel previous timer — user is still speaking
    if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    // Accumulate transcript segments
    pendingTranscriptRef.current = pendingTranscriptRef.current
      ? `${pendingTranscriptRef.current} ${text}`
      : text;

    // Restart countdown
    setSendCountdown(SEND_DELAY);
    countdownIntervalRef.current = setInterval(() => {
      setSendCountdown(prev => (prev !== null && prev > 1 ? prev - 1 : null));
    }, 1000);

    sendTimerRef.current = setTimeout(() => {
      clearInterval(countdownIntervalRef.current!);
      countdownIntervalRef.current = null;
      setSendCountdown(null);
      const finalText = pendingTranscriptRef.current.trim();
      pendingTranscriptRef.current = '';
      if (finalText) handleSendRef.current?.(finalText);
    }, SEND_DELAY * 1000);
  }, [SEND_DELAY]);

  const stt = useSpeechRecognition(sttLang, scheduleSend);
  const [speechMode, setSpeechMode] = useState(false);
  const speechModeRef = useRef(false);
  speechModeRef.current = speechMode;

  // Pause STT while TTS is speaking to prevent feedback loop
  useEffect(() => {
    if (!speechMode) return;
    if (isSpeaking) {
      // TTS started — stop mic to avoid capturing TTS output
      stt.stop();
      cancelPendingSend();
    } else {
      // TTS ended — resume listening
      stt.start();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaking]);

  // Cleanup timers on unmount
  useEffect(() => () => cancelPendingSend(), [cancelPendingSend]);

  const {
    conversations, activeId, setActiveId, loading: convosLoading,
    loadConversations, loadMessages, createConversation,
    saveMessage, maybeSetTitle, deleteConversation, deleteMultipleConversations, renameConversation,
    importConversations, clearAllConversations,
  } = useConversations(user?.id);

  // Network status
  const [online, setOnline] = useState(isOnline());
  useEffect(() => {
    const onOnline  = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  useEffect(() => {
    if (user?.id) loadConversations();
  }, [user?.id, loadConversations]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => {
    if (isOpen && onUnreadChange) onUnreadChange(false);
  }, [isOpen, onUnreadChange]);

  const switchConversation = useCallback(async (id: string) => {
    if (isLoading) return;
    abortRef.current?.abort();
    setActiveId(id);
    activeConvoIdRef.current = id;
    messageCountRef.current = 0;
    setShowHistory(false);
    const msgs = await loadMessages(id);
    setMessages(msgs);
    messageCountRef.current = msgs.length;
  }, [isLoading, setActiveId, loadMessages]);

  const startNewConversation = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setActiveId(null);
    activeConvoIdRef.current = null;
    messageCountRef.current = 0;
    setShowHistory(false);
  }, [setActiveId]);

  const ensureConversation = useCallback(async (): Promise<string | null> => {
    if (activeConvoIdRef.current) return activeConvoIdRef.current;
    const id = await createConversation();
    if (id) {
      activeConvoIdRef.current = id;
      await loadConversations();
    }
    return id;
  }, [createConversation, loadConversations]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    setIsTTSLoading(false);
  }, []);

  // Export conversation as JSON
  const handleExport = useCallback((format: 'json' | 'txt' = 'json') => {
    if (messages.length === 0) { toast.error('Tidak ada pesan untuk diekspor'); return; }
    const title = conversations.find(c => c.id === activeId)?.title ?? 'percakapan';
    const fileName = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    if (format === 'txt') {
      const text = messages.map(m =>
        `[${m.role === 'user' ? 'Kamu' : 'Asisten'}]\n${m.content}\n`
      ).join('\n');
      const blob = new Blob([`${title}\nDiekspor: ${new Date().toLocaleString('id-ID')}\n\n${text}`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${fileName}.txt`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Diekspor sebagai .txt');
      return;
    }

    const data = { title, exported_at: new Date().toISOString(), messages };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Percakapan diekspor');
  }, [messages, conversations, activeId]);

  // Regenerate last assistant response
  const handleRegenerate = useCallback(async () => {
    if (isLoading || messages.length < 2) return;
    // Find last user message
    const lastUserIdx = [...messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserIdx === -1) return;
    const userMsgIdx = messages.length - 1 - lastUserIdx;
    const contextMessages = messages.slice(0, userMsgIdx + 1);

    // Remove last assistant message from UI
    setMessages(contextMessages);
    setIsLoading(true);

    let assistantSoFar = '';
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const animContext = availableAnimations.length > 0 
      ? `\n\n[ADMIN: Anda dapat melakukan gerakan tubuh dengan menyelipkan tag "[ANIM:NamaAnimasi]" di AKHIR pesanmu. Gunakan HANYA satu tag per pesan. Daftar gerakan Mixamo yang tersedia: ${availableAnimations.join(', ')}]`
      : "";

    try {
      await streamChat({
        messages: contextMessages,
        onDelta: upsertAssistant,
        systemPrompt: (personality || "") + animContext,
        signal: ctrl.signal,
        onDone: async () => {
          setIsLoading(false);
          if (assistantSoFar) {
            const { clean } = parseAnimTag(assistantSoFar);
            const ttsText = clean || assistantSoFar;
            if (clean !== assistantSoFar) {
              setMessages(prev => prev.map((m, i) =>
                i === prev.length - 1 && m.role === 'assistant' ? { ...m, content: clean } : m
              ));
            }
            setLastAssistantText(assistantSoFar);
            setIsTTSLoading(true);
            let ttsResult;
            if (ttsProvider === 'vits') {
              const speaker = localStorage.getItem('vrm.vits_speaker') || '特别周 Special Week (Umamusume Pretty Derby)';
              const lang = localStorage.getItem('vrm.vits_lang') || '日本語';
              const autoTranslate = localStorage.getItem('vrm.vits_auto_translate') !== 'false';
              
              let ttsInput = ttsText;
              if (lang === '日本語' && autoTranslate) {
                ttsInput = await translateToJapanese(ttsText);
              }

              try {
                const url = await generateVitsAudio({ text: ttsInput, speaker, language: lang, speed: 1.0 });
                ttsResult = { url, error: null, source: 'vits' as const };
              } catch (err) {
                ttsResult = { url: null, error: (err as Error).message, source: 'none' as const };
              }
            } else {
              ttsResult = await generateTTS(ttsText, voiceId, 2, ttsProvider === 'elevenlabs');
            }
            setIsTTSLoading(false);
            if (ttsResult.source === 'webspeech' && ttsProvider === 'elevenlabs') onTTSRateLimit?.();
            if (ttsResult.url) onSpeakStart(ttsResult.url, assistantSoFar);
            else toast.error('TTS gagal', { action: { label: 'Coba lagi', onClick: () => handleRetryTTS(ttsText, assistantSoFar) } });
          }
        },
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') { setIsLoading(false); return; }
      toast.error(e instanceof Error ? e.message : 'Regenerasi gagal');
      setIsLoading(false);
    }
  }, [isLoading, messages, personality, voiceId, ttsProvider, onTTSRateLimit, onSpeakStart]);

  // Retry TTS for last response
  const handleRetryTTS = useCallback(async (ttsText?: string, originalText?: string) => {
    const text = ttsText ?? lastAssistantText;
    if (!text) return;
    setIsTTSLoading(true);
    let ttsResult;
    if (ttsProvider === 'vits') {
      const speaker = localStorage.getItem('vrm.vits_speaker') || '特别周 Special Week (Umamusume Pretty Derby)';
      const lang = localStorage.getItem('vrm.vits_lang') || '日本語';
      const autoTranslate = localStorage.getItem('vrm.vits_auto_translate') !== 'false';
      
      let ttsInput = text;
      if (lang === '日本語' && autoTranslate) {
        ttsInput = await translateToJapanese(text);
      }

      try {
        const url = await generateVitsAudio({ text: ttsInput, speaker, language: lang, speed: 1.0 });
        ttsResult = { url, error: null, source: 'vits' as const };
      } catch (err) {
        ttsResult = { url: null, error: (err as Error).message, source: 'none' as const };
      }
    } else {
      ttsResult = await generateTTS(text, voiceId, 2, ttsProvider === 'elevenlabs');
    }
    setIsTTSLoading(false);
    if (ttsResult.source === 'webspeech' && ttsProvider === 'elevenlabs') onTTSRateLimit?.();
    if (ttsResult.url) {
      onSpeakStart(ttsResult.url, originalText ?? text);
      toast.success('Audio berhasil diputar');
    } else {
      toast.error('TTS masih gagal: ' + ttsResult.error);
    }
  }, [lastAssistantText, voiceId, ttsProvider, onTTSRateLimit, onSpeakStart]);

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    onUserMessage?.(text);

    // --- Slash Commands Interceptor ---
    if (text.startsWith('/')) {
      const parts = text.slice(1).split(' ');
      const cmd = parts[0].toLowerCase();
      const arg = parts.slice(1).join(' ');

      if (cmd === 'anim' || cmd === 'play' || availableAnimations.includes(text.slice(1))) {
        const animName = arg || text.slice(1);
        onSpeakStart('', `[ANIM:${animName}]`); // Trigger animation locally
        setInput('');
        return;
      }
      
      // Shortcut commands for popular animations
      const shortcuts: Record<string, string> = {
        'dance': 'Silly_Dance',
        'wave': 'Wave',
        'bow': 'Bow',
        'think': 'Thinking',
        'laugh': 'Laughing'
      };
      
      if (shortcuts[cmd]) {
        onSpeakStart('', `[ANIM:${shortcuts[cmd]}]`);
        setInput('');
        return;
      }
    }

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsLoading(true);

    const convoId = await ensureConversation();
    if (!convoId) { setIsLoading(false); toast.error('Gagal membuat percakapan'); return; }

    await saveMessage(convoId, 'user', text);
    messageCountRef.current += 1;
    if (messageCountRef.current === 1) maybeSetTitle(convoId, text);

    let assistantSoFar = '';
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const animContext = availableAnimations.length > 0 
      ? `\n\n[ADMIN: Anda dapat melakukan gerakan tubuh dengan menyelipkan tag "[ANIM:NamaAnimasi]" di AKHIR pesanmu. Gunakan HANYA satu tag per pesan. Daftar gerakan Mixamo yang tersedia: ${availableAnimations.join(', ')}]`
      : "";

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: upsertAssistant,
        systemPrompt: (personality || "") + animContext,
        signal: ctrl.signal,
        onDone: async () => {
          setIsLoading(false);
          if (isMobile && !isOpen && onUnreadChange) onUnreadChange(true);
          // Browser notification when tab is not active
          if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Voxie', { body: 'Asisten sudah membalas pesanmu!', icon: '/favicon.ico' });
          } else if (document.hidden && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
          }
          if (assistantSoFar) {
            const { clean } = parseAnimTag(assistantSoFar);
            const ttsText = clean || assistantSoFar;
            if (clean !== assistantSoFar) {
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === prev.length - 1 && m.role === 'assistant' ? { ...m, content: clean } : m
                )
              );
            }
            await saveMessage(convoId, 'assistant', clean || assistantSoFar);
            messageCountRef.current += 1;
            loadConversations();
            setLastAssistantText(assistantSoFar);
            setIsTTSLoading(true);
            let ttsResult;
            if (ttsProvider === 'vits') {
              const speaker = localStorage.getItem('vrm.vits_speaker') || '特别周 Special Week (Umamusume Pretty Derby)';
              const lang = localStorage.getItem('vrm.vits_lang') || '日本語';
              const autoTranslate = localStorage.getItem('vrm.vits_auto_translate') !== 'false';
              
              let ttsInput = ttsText;
              if (lang === '日本語' && autoTranslate) {
                ttsInput = await translateToJapanese(ttsText);
              }

              try {
                const url = await generateVitsAudio({ text: ttsInput, speaker, language: lang, speed: 1.0 });
                ttsResult = { url, error: null, source: 'vits' as const };
              } catch (err) {
                ttsResult = { url: null, error: (err as Error).message, source: 'none' as const };
              }
            } else {
              ttsResult = await generateTTS(ttsText, voiceId, 2, ttsProvider === 'elevenlabs');
            }
            setIsTTSLoading(false);
            if (ttsResult.source === 'webspeech' && ttsProvider === 'elevenlabs') {
              onTTSRateLimit?.();
            }
            if (ttsResult.url) {
              onSpeakStart(ttsResult.url, assistantSoFar);
            } else {
              toast.error('Audio gagal dibuat', {
                action: { label: 'Coba lagi', onClick: () => handleRetryTTS(ttsText, assistantSoFar) },
              });
            }
          }
        },
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') { setIsLoading(false); return; }
      toast.error(e instanceof Error ? e.message : 'Chat gagal');
      setIsLoading(false);
    }
  }, [
    input, isLoading, messages, personality, voiceId, isMobile, isOpen,
    onUserMessage, onSpeakStart, onUnreadChange, ttsProvider,
    ensureConversation, saveMessage, maybeSetTitle, loadConversations, handleRetryTTS,
  ]);

  // Keep ref in sync so STT auto-send can call handleSend
  useEffect(() => { handleSendRef.current = (text: string) => handleSend(text); }, [handleSend]);

  // Import conversations from JSON file
  const handleImport = useCallback(() => {
    const el = document.createElement('input');
    el.type = 'file';
    el.accept = '.json';
    el.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const result = importConversations(text);
        if (result.error) toast.error('Import gagal: ' + result.error);
        else if (result.imported === 0) toast.info('Tidak ada percakapan baru untuk diimpor');
        else toast.success(`${result.imported} percakapan berhasil diimpor`);
      };
      reader.readAsText(file);
    };
    el.click();
  }, [importConversations]);

  // ── Visual viewport offset for mobile keyboard ────────────────────────────
  // When soft keyboard opens on mobile, visualViewport shrinks.
  // We track the offset so the input bar stays just above the keyboard.
  const [kbOffset, setKbOffset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      // offsetTop = distance from top of layout viewport to top of visual viewport
      // height = visible area height (shrinks when keyboard opens)
      const hidden = window.innerHeight - vv.height - vv.offsetTop;
      setKbOffset(Math.max(0, hidden));
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  // ── Swipe-down to close (mobile) ──────────────────────────────────────────
  const swipeStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { swipeStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientY - swipeStartY.current;
    if (delta > 80) onToggle?.();
  };

  // ── Shared UI helpers ────────────────────────────────────────────────────

  const inputBar = (
    <ChatInputBar
      input={input}
      isLoading={isLoading}
      isTTSLoading={isTTSLoading}
      online={online}
      speechMode={speechMode}
      stt={stt}
      sendCountdown={sendCountdown}
      pendingTranscript={pendingTranscriptRef.current}
      showSubtitles={showSubtitles}
      isSpeaking={isSpeaking}
      onInputChange={setInput}
      onSend={() => handleSend()}
      onStop={handleStop}
      onToggleSpeechMode={() => {
        if (speechMode) { cancelPendingSend(); stt.stop(); setSpeechMode(false); }
        else { setSpeechMode(true); stt.start(); }
      }}
      onToggleSubtitles={onToggleSubtitles}
      onCancelPendingSend={cancelPendingSend}
    />
  );

  const messageList = (
    <ChatMessageList
      messages={messages}
      isLoading={isLoading}
      isTTSLoading={isTTSLoading}
      onSendPrompt={(text) => handleSend(text)}
      onRegenerate={handleRegenerate}
    />
  );

  const historyPanel = (
    <ChatHistoryPanel
      conversations={conversations}
      activeId={activeId}
      loading={convosLoading}
      onClose={() => setShowHistory(false)}
      onNew={startNewConversation}
      onSwitch={switchConversation}
      onDelete={deleteConversation}
      onDeleteMultiple={deleteMultipleConversations}
      onRename={renameConversation}
    />
  );

  // ── Mobile ────────────────────────────────────────────────────────────────
  if (isMobile) {
    if (!isOpen) {
      const hasUnread = messages.length > 0 && messages[messages.length - 1]?.role === 'assistant';
      return (
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="px-3 sm:px-4 pt-8"
            style={{
              paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
              paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
              paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
              background: 'linear-gradient(to top, rgba(6,4,14,0.80) 0%, rgba(6,4,14,0.4) 50%, transparent 100%)',
              transform: kbOffset > 0 ? `translateY(-${kbOffset}px)` : undefined,
              transition: 'transform 0.15s ease-out',
            }}>
            <div className="max-w-2xl mx-auto">
              <div className="flex items-end gap-2">
                <div className="flex-1">{inputBar}</div>
                {messages.length > 0 && (
                  <Button variant="outline" size="icon" onClick={onToggle}
                    className="relative h-10 w-10 shrink-0 btn-overlay touch-manipulation">
                    <ChevronDown className="w-4 h-4 rotate-180" />
                    {hasUnread && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background animate-pulse" />}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="absolute inset-0 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[380px] z-50 flex flex-col animate-slide-up scanlines"
        style={{ background: 'rgba(6,4,14,0.95)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderTop: '1px solid rgba(168,85,247,0.3)', borderLeft: '1px solid rgba(168,85,247,0.2)' }}>
        {showHistory ? historyPanel : (
          <>
            <div className="flex items-center justify-between px-4 border-b border-neon-purple corner-accent"
              onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
              style={{ paddingTop: 'max(0.875rem, env(safe-area-inset-top))', paddingBottom: '0.875rem' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center neon-glow-purple">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground leading-none text-neon-purple">Chat</h2>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{messages.length} pesan</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover-neon-glow touch-manipulation" onClick={() => setShowHistory(true)}><History className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover-neon-glow touch-manipulation" onClick={startNewConversation}><Plus className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={onToggle} className="h-10 w-10 text-muted-foreground touch-manipulation hover-neon-glow"><X className="w-4 h-4" /></Button>
              </div>
            </div>
            <ScrollArea className="flex-1 py-4 px-3" ref={scrollRef}>{messageList}</ScrollArea>
            <div className="px-3 pt-2 border-t border-neon-purple"
              style={{
                paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
                background: 'rgba(6,4,14,0.85)',
                transform: kbOffset > 0 ? `translateY(-${kbOffset}px)` : undefined,
                transition: 'transform 0.15s ease-out',
              }}>{inputBar}</div>
          </>
        )}
      </div>
    );
  }

  // ── Desktop ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full cyber-glass-strong backdrop-blur-xl border-l border-neon-purple-bright scanlines">
      {showHistory ? historyPanel : (
        <>
          <div className="px-3.5 py-3 border-b border-neon-purple flex items-center gap-2 corner-accent">
            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 neon-glow-purple">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-foreground leading-none truncate text-neon-purple">
                {conversations.find(c => c.id === activeId)?.title ?? 'Chat'}
              </h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">{messages.length} pesan</p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover-neon-glow" onClick={() => setShowHistory(true)} title="Riwayat">
                <History className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover-neon-glow" onClick={startNewConversation} title="Percakapan baru">
                <Plus className="w-3.5 h-3.5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover-neon-glow">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 cyber-glass-strong backdrop-blur-xl border-neon-purple-bright">
                  <DropdownMenuItem onClick={() => handleExport('json')} className="text-xs gap-2 hover-neon-glow">
                    <Download className="w-3.5 h-3.5" /> Export JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('txt')} className="text-xs gap-2 hover-neon-glow">
                    <Download className="w-3.5 h-3.5" /> Export TXT
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleImport} className="text-xs gap-2 hover-neon-glow">
                    <Upload className="w-3.5 h-3.5" /> Import JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleRegenerate}
                    disabled={isLoading || messages.length < 2}
                    className="text-xs gap-2 hover-neon-glow"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerasi
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => { if (confirm('Hapus semua riwayat chat?')) clearAllConversations(); }}
                    className="text-xs gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus semua riwayat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <ScrollArea className="flex-1 py-4 px-3 scrollbar-thin" ref={scrollRef}>{messageList}</ScrollArea>

          <div className="px-3 py-3 border-t border-neon-purple cyber-glass">
            {inputBar}
            <p className="text-[10px] text-muted-foreground/40 text-center mt-1.5">Enter kirim · Shift+Enter baris baru</p>
          </div>
        </>
      )}
    </div>
  );
}
