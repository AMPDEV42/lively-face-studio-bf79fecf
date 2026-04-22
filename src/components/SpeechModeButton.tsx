import { Mic, MicOff, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SpeechRecognitionStatus } from '@/hooks/useSpeechRecognition';

interface SpeechModeButtonProps {
  speechMode: boolean;
  sttStatus: SpeechRecognitionStatus;
  sttSupported: boolean;
  onToggle: () => void;
  onStartListening: () => void;
}

export function SpeechModeButton({
  speechMode,
  sttStatus,
  sttSupported,
  onToggle,
  onStartListening,
}: SpeechModeButtonProps) {
  if (!sttSupported) return null;

  const isListening = sttStatus === 'listening';
  const isProcessing = sttStatus === 'processing';

  return (
    <div className="flex items-center gap-1">
      {/* Toggle speech mode */}
      <Button
        type="button"
        variant={speechMode ? 'default' : 'outline'}
        size="sm"
        onClick={onToggle}
        className={`h-8 gap-1.5 text-xs ${
          speechMode
            ? 'bg-primary/20 text-primary border-primary/40 hover:bg-primary/30'
            : 'border-border/60 text-muted-foreground hover:text-foreground'
        }`}
        title="Speech Mode — bicara langsung ke asisten"
      >
        {speechMode ? <Radio className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        {speechMode ? 'Speech Mode' : 'Voice'}
      </Button>

      {/* Record button — only shown in speech mode */}
      {speechMode && (
        <Button
          type="button"
          size="icon"
          onClick={onStartListening}
          disabled={isListening || isProcessing}
          className={`h-8 w-8 ${
            isListening
              ? 'bg-destructive/80 text-white animate-pulse'
              : isProcessing
              ? 'bg-primary/20 text-primary border-primary/40'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
          }`}
          title={isListening ? 'Mendengarkan…' : 'Tekan untuk bicara'}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </Button>
      )}
    </div>
  );
}
