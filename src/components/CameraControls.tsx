import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Camera, Move3d } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import type { CameraPreset } from '@/components/VrmViewer';

interface CameraControlsProps {
  onPresetChange: (preset: CameraPreset) => void;
  onFreeModeChange: (enabled: boolean) => void;
  isFreeMode: boolean;
  currentPreset?: CameraPreset;
}

const SHOT_PRESETS: Array<{ value: CameraPreset; label: string; short: string }> = [
  { value: 'extreme-closeup',  label: 'Extreme Close-Up',  short: 'ECU' },
  { value: 'closeup',          label: 'Close-Up',          short: 'CU'  },
  { value: 'medium-closeup',   label: 'Medium Close-Up',   short: 'MCU' },
  { value: 'medium-shot',      label: 'Medium Shot',       short: 'MS'  },
  { value: 'medium-wide-shot', label: 'Medium Wide Shot',  short: 'MWS' },
  { value: 'wide-shot',        label: 'Wide Shot',         short: 'WS'  },
  { value: 'extreme-wide-shot',label: 'Extreme Wide Shot', short: 'EWS' },
];

export default function CameraControls({
  onPresetChange,
  onFreeModeChange,
  isFreeMode,
  currentPreset,
}: CameraControlsProps) {
  const isMobile = useIsMobile();
  const [selectedPreset, setSelectedPreset] = useState<CameraPreset>(currentPreset || 'medium-shot');
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetChange = (value: CameraPreset) => {
    if (isFreeMode) onFreeModeChange(false);
    setSelectedPreset(value);
    onPresetChange(value);
    if (isMobile) setIsOpen(false); // auto-close on mobile after selection
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="absolute top-16 right-4 h-10 w-10 border-border bg-secondary/80 backdrop-blur-md hover:bg-secondary/90 z-20 shadow-lg"
          title="Camera Controls"
        >
          <Camera className="h-5 w-5" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side={isMobile ? 'bottom' : 'left'}
        align={isMobile ? 'end' : 'start'}
        sideOffset={isMobile ? 8 : 4}
        className="p-3 bg-secondary/95 backdrop-blur-md border-border shadow-lg"
        style={{ width: isMobile ? 'calc(100vw - 2rem)' : '18rem', maxWidth: '18rem' }}
      >
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Shot Size</h3>

          {/* 4-col grid on desktop, 4-col on mobile (all 7 presets) */}
          <div className="grid grid-cols-4 gap-1.5">
            {SHOT_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePresetChange(preset.value)}
                disabled={isFreeMode}
                className={`
                  min-h-[40px] px-1 py-2 rounded text-xs font-medium transition-all touch-manipulation
                  ${selectedPreset === preset.value && !isFreeMode
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary border border-border/50 text-foreground/70 hover:bg-secondary/80 active:scale-95'
                  }
                  ${isFreeMode ? 'opacity-40 cursor-not-allowed' : ''}
                `}
                title={preset.label}
              >
                {preset.short}
              </button>
            ))}
          </div>

          {/* Free Camera */}
          <div className="pt-2 border-t border-border/30">
            <Button
              variant={isFreeMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFreeModeChange(!isFreeMode)}
              className="w-full gap-2 min-h-[40px]"
            >
              <Move3d className="w-4 h-4" />
              {isFreeMode ? 'Free Camera Active' : 'Free Camera'}
            </Button>
            {isFreeMode && (
              <p className="text-xs text-foreground/50 text-center mt-2">
                {isMobile ? '👆 Drag to rotate • Pinch to zoom' : '🖱️ Drag to rotate • Scroll to zoom'}
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
