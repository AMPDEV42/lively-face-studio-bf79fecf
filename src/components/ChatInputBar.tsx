import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Square, Mic, MicOff, Radio, WifiOff } from 'lucide-react';
import { SpeechModeButton } from '@/components/SpeechModeButton';

interface ChatInputBarProps {
  input: string;
  isLoading: boolean;
  isTTSLoading: boolean;
  online: boolean;
  speechMode: boolean;
  stt: {
    status: string;
    isReady: boolean;
    isSupported: boolean;
    transcript: string;
    error: string | null;
    start: () => void;
    stop: () => void;
  };
  sendCountdown: number | null;
  pendingTranscript: string;
  showSubtitles: boolean;
  isSpeaking: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onToggleSpeechMode: () => void;
  onToggleSubtitles?: () => void;
  onCancelPendingSend: () => void;
}

export function ChatInputBar({
  input,
  isLoading,
  isTTSLoading,
  online,
  speechMode,
  stt,
  sendCountdown,
  pendingTranscript,
  showSubtitles,
  isSpeaking,
  onInputChange,
  onSend,
  onStop,
  onToggleSpeechMode,
  onToggleSubtitles,
  onCancelPendingSend,
}: ChatInputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset textarea height when input is cleared from outside (e.g. after send)
  useEffect(() => {
    if (input === '' && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  return (
    <div className="space-y-2">
      {/* Offline banner */}
      {!online && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg cyber-glass border border-destructive/40 text-xs text-destructive neon-glow-magenta">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>Tidak ada koneksi internet</span>
        </div>
      )}

      {/* STT starting */}
      {speechMode && (stt.status === 'requesting' || stt.status === 'starting') && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg cyber-glass border border-neon-purple text-xs text-primary/60 loading-bar">
          <Mic className="w-3.5 h-3.5 shrink-0 animate-pulse" />
          <span>Menyiapkan mikrofon… tunggu sebentar</span>
        </div>
      )}

      {/* STT ready and listening */}
      {speechMode && stt.status === 'listening' && stt.isReady && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg cyber-glass border border-neon-purple-bright text-xs text-primary/80 pulse-neon">
          <Radio className="w-3.5 h-3.5 shrink-0" />
          <span>{stt.transcript || 'Siap mendengarkan — mulai bicara'}</span>
        </div>
      )}

      {/* STT listening but not ready yet */}
      {speechMode && stt.status === 'listening' && !stt.isReady && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg cyber-glass border border-neon-purple text-xs text-primary/60">
          <Mic className="w-3.5 h-3.5 shrink-0 animate-pulse" />
          <span>Hampir siap… tunggu sebentar</span>
        </div>
      )}

      {/* Countdown before auto-send */}
      {speechMode && sendCountdown !== null && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg cyber-glass border border-neon-purple text-xs">
          <span className="text-foreground/70 truncate flex-1">{pendingTranscript}</span>
          <span className="text-muted-foreground shrink-0">Kirim dalam {sendCountdown}s</span>
        </div>
      )}

      {speechMode && stt.error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg cyber-glass border border-destructive/40 text-xs text-destructive">
          <MicOff className="w-3.5 h-3.5 shrink-0" />
          <span>{stt.error}</span>
        </div>
      )}

      <div className="flex items-end gap-2 w-full">
        {/* Speech mode toggle */}
        <SpeechModeButton
          speechMode={speechMode}
          sttStatus={stt.status}
          sttSupported={stt.isSupported}
          onToggle={onToggleSpeechMode}
        />

        {/* CC Toggle */}
        <Button
          type="button"
          size="icon"
          onClick={onToggleSubtitles}
          className={`h-10 w-10 shrink-0 btn-overlay transition-all ${
            showSubtitles ? 'text-primary neon-glow-purple brightness-125' : 'text-muted-foreground opacity-40'
          }`}
          title={showSubtitles ? 'CC Aktif' : 'CC Mati'}
        >
          <div className="flex flex-col items-center gap-0.5">
            <span className={`text-[10px] font-bold border rounded-[3px] px-0.5 leading-tight transition-colors ${
              showSubtitles
                ? 'border-primary text-primary bg-primary/10 shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                : 'border-muted-foreground/40 text-muted-foreground opacity-60'
            }`}>CC</span>
            <div className={`w-1 h-1 rounded-full transition-all duration-300 ${
              showSubtitles ? 'bg-primary shadow-[0_0_5px_#a855f7] scale-100' : 'bg-muted-foreground/20 scale-50'
            }`} />
          </div>
        </Button>

        <div className="flex-1 min-w-0">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={
              speechMode ? 'Tekan tombol mic untuk bicara…' :
              online ? 'Ketik pesan…' : 'Offline — tidak bisa mengirim pesan'
            }
            disabled={isLoading || !online}
            rows={1}
            className="resize-none min-h-[40px] max-h-[120px] panel-overlay text-sm placeholder:text-muted-foreground/50 focus:border-neon-purple-bright transition-all scrollbar-thin w-full"
            style={{ height: 'auto' }}
          />
        </div>

        {isLoading || isTTSLoading ? (
          <Button type="button" size="icon" onClick={onStop}
            className="h-10 w-10 shrink-0 bg-destructive hover:bg-destructive/90 text-white shadow-sm neon-glow-magenta border-0" title="Hentikan">
            <Square className="w-3.5 h-3.5 fill-current" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            onClick={onSend}
            disabled={!input.trim() || !online}
            className={`h-10 w-10 shrink-0 shadow-sm border-0 transition-all ${
              input.trim() && online
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground neon-glow-purple hover-neon-lift'
                : 'btn-overlay opacity-60 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
