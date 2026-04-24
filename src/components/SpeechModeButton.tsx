import { Radio, Mic, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SpeechRecognitionStatus } from '@/hooks/useSpeechRecognition';

interface SpeechModeButtonProps {
  speechMode: boolean;
  sttStatus: SpeechRecognitionStatus;
  sttSupported: boolean;
  onToggle: () => void;
}

export function SpeechModeButton({
  speechMode,
  sttStatus,
  sttSupported,
  onToggle,
}: SpeechModeButtonProps) {
  if (!sttSupported) return null;

  const isListening = sttStatus === 'listening';
  const isStarting = sttStatus === 'requesting' || sttStatus === 'starting';

  return (
    <Button
      type="button"
      variant={speechMode ? 'default' : 'outline'}
      size="sm"
      onClick={onToggle}
      disabled={isStarting}
      className={`h-8 gap-1.5 text-xs transition-all ${
        speechMode
          ? isListening
            ? 'bg-destructive/20 text-destructive border-destructive/40 hover:bg-destructive/30 animate-pulse neon-glow-magenta'
            : isStarting
            ? 'bg-primary/10 text-primary/60 border-primary/30 cursor-wait'
            : 'bg-primary/20 text-primary border-primary/40 hover:bg-primary/30 neon-glow-purple'
          : 'border-border/60 text-muted-foreground hover:text-foreground hover-neon-glow'
      }`}
      title={
        isStarting
          ? 'Menyiapkan mikrofon… tunggu sebentar'
          : 'Speech Mode — bicara langsung ke asisten'
      }
    >
      {isStarting ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : speechMode ? (
        <Radio className="w-3.5 h-3.5" />
      ) : (
        <Mic className="w-3.5 h-3.5" />
      )}
      {speechMode
        ? isStarting
          ? 'Menyiapkan…'
          : isListening
          ? 'Mendengarkan'
          : 'Speech Mode'
        : 'Voice'}
    </Button>
  );
}
