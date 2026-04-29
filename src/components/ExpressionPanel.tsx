import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ExpressionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onExpression: (weights: Record<string, number>) => void;
  onClear: () => void;
}

const EXPRESSIONS = [
  { label: '😊', name: 'Happy',       weights: { happy: 1 } },
  { label: '😢', name: 'Sad',         weights: { sad: 1 } },
  { label: '😠', name: 'Angry',       weights: { angry: 1 } },
  { label: '😲', name: 'Surprised',   weights: { surprised: 1 } },
  { label: '😳', name: 'Embarrassed', weights: { embarrassed: 1 } },
  { label: '🤩', name: 'Excited',     weights: { happy: 0.8, surprised: 0.5 } },
  { label: '😄', name: 'Laughing',    weights: { happy: 1, relaxed: 0.5 } },
  { label: '🥺', name: 'Pleading',    weights: { sad: 0.6, surprised: 0.4 } },
  { label: '😑', name: 'Bored',       weights: { neutral: 1 } },
  { label: '😐', name: 'Neutral',     weights: { neutral: 0 } },
] as const;

export function ExpressionPanel({ isOpen, onClose, onExpression, onClear }: ExpressionPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 animate-msg-in"
      role="dialog"
      aria-label="Panel Ekspresi"
    >
      <div className="cyber-glass border border-neon-purple rounded-2xl p-3 shadow-2xl w-64">
        {/* Header */}
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold text-foreground/80">Ekspresi Cepat</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { onClear(); onClose(); }}
              className="text-[10px] text-muted-foreground/60 hover:text-primary px-1.5 py-0.5 rounded transition-colors"
              title="Reset ekspresi"
            >
              Reset
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              aria-label="Tutup panel ekspresi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expression grid */}
        <div className="grid grid-cols-5 gap-1.5">
          {EXPRESSIONS.map((expr) => (
            <button
              key={expr.name}
              onClick={() => {
                if (expr.name === 'Neutral') {
                  onClear();
                } else {
                  onExpression(expr.weights as Record<string, number>);
                }
                onClose();
              }}
              className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl hover:bg-primary/15 active:scale-95 transition-all group"
              title={expr.name}
            >
              <span className="text-xl leading-none">{expr.label}</span>
              <span className="text-[9px] text-muted-foreground/60 group-hover:text-primary/80 transition-colors leading-tight text-center">
                {expr.name}
              </span>
            </button>
          ))}
        </div>

        {/* Hint */}
        <p className="text-[9px] text-muted-foreground/30 text-center mt-2">
          Tekan <kbd className="font-mono bg-secondary/60 border border-border/40 rounded px-1">E</kbd> untuk buka/tutup
        </p>
      </div>
    </div>
  );
}
