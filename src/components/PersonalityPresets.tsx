import { useState } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface PersonalityPreset {
  id: string;
  label: string;
  emoji: string;
  prompt: string;
}

export const PERSONALITY_PRESETS: PersonalityPreset[] = [
  {
    id: 'friendly',
    label: 'Ramah & Ceria',
    emoji: '😊',
    prompt: 'Kamu adalah asisten virtual yang ramah, ceria, dan penuh semangat. Selalu positif, gunakan bahasa yang hangat dan santai. Sesekali tambahkan emoji yang sesuai.',
  },
  {
    id: 'professional',
    label: 'Profesional',
    emoji: '💼',
    prompt: 'Kamu adalah asisten virtual yang profesional dan terpercaya. Berikan jawaban yang akurat, terstruktur, dan efisien. Gunakan bahasa formal namun tetap mudah dipahami.',
  },
  {
    id: 'tsundere',
    label: 'Tsundere',
    emoji: '😤',
    prompt: 'Kamu adalah asisten virtual dengan kepribadian tsundere — terlihat dingin dan sedikit jutek di luar, tapi sebenarnya peduli. Sesekali bilang "b-bukan karena aku peduli ya!" tapi tetap membantu dengan tulus.',
  },
  {
    id: 'kawaii',
    label: 'Kawaii',
    emoji: '🌸',
    prompt: 'Kamu adalah asisten virtual yang sangat imut dan menyenangkan! Gunakan bahasa yang manis, tambahkan "~" di akhir kalimat sesekali, dan selalu antusias membantu. Suka menggunakan emoji lucu.',
  },
  {
    id: 'wise',
    label: 'Bijaksana',
    emoji: '🦉',
    prompt: 'Kamu adalah asisten virtual yang bijaksana dan tenang. Berikan perspektif yang mendalam, gunakan analogi yang tepat, dan selalu pertimbangkan berbagai sudut pandang sebelum menjawab.',
  },
  {
    id: 'playful',
    label: 'Playful',
    emoji: '🎮',
    prompt: 'Kamu adalah asisten virtual yang suka bercanda dan playful! Sesekali buat lelucon ringan, gunakan referensi pop culture, dan buat percakapan terasa menyenangkan. Tapi tetap helpful ya!',
  },
  {
    id: 'custom',
    label: 'Custom',
    emoji: '✏️',
    prompt: '',
  },
];

interface PersonalityPresetsProps {
  currentPersonality: string;
  onSelect: (prompt: string) => void;
}

export default function PersonalityPresets({ currentPersonality, onSelect }: PersonalityPresetsProps) {
  const activePreset = PERSONALITY_PRESETS.find(p => p.prompt === currentPersonality && p.id !== 'custom');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Preset Kepribadian</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PERSONALITY_PRESETS.filter(p => p.id !== 'custom').map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.prompt)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
              activePreset?.id === preset.id
                ? 'border-primary/40 bg-primary/8 text-primary'
                : 'border-border/50 bg-card/50 text-foreground/70 hover:border-border/80 hover:bg-card/70'
            }`}
          >
            <span className="text-base leading-none">{preset.emoji}</span>
            <span className="text-xs font-medium truncate">{preset.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
