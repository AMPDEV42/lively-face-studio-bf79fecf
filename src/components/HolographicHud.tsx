import React, { useEffect, useState } from 'react';
import { Activity, Heart, Zap, Cpu } from 'lucide-react';

const MOOD_COLORS: Record<string, { text: string; border: string; bg: string }> = {
  happy:       { text: '#f472b6', border: 'rgba(244,114,182,0.4)', bg: 'rgba(244,114,182,0.08)' },
  excited:     { text: '#fb923c', border: 'rgba(251,146,60,0.4)',  bg: 'rgba(251,146,60,0.08)'  },
  laughing:    { text: '#facc15', border: 'rgba(250,204,21,0.4)',  bg: 'rgba(250,204,21,0.08)'  },
  sad:         { text: '#60a5fa', border: 'rgba(96,165,250,0.4)',  bg: 'rgba(96,165,250,0.08)'  },
  sympathetic: { text: '#818cf8', border: 'rgba(129,140,248,0.4)', bg: 'rgba(129,140,248,0.08)' },
  angry:       { text: '#f87171', border: 'rgba(248,113,113,0.4)', bg: 'rgba(248,113,113,0.08)' },
  disgusted:   { text: '#a3e635', border: 'rgba(163,230,53,0.4)',  bg: 'rgba(163,230,53,0.08)'  },
  surprised:   { text: '#34d399', border: 'rgba(52,211,153,0.4)',  bg: 'rgba(52,211,153,0.08)'  },
  curious:     { text: '#22d3ee', border: 'rgba(34,211,238,0.4)',  bg: 'rgba(34,211,238,0.08)'  },
  thinking:    { text: '#a78bfa', border: 'rgba(167,139,250,0.4)', bg: 'rgba(167,139,250,0.08)' },
  bored:       { text: '#94a3b8', border: 'rgba(148,163,184,0.4)', bg: 'rgba(148,163,184,0.08)' },
  embarrassed: { text: '#fb7185', border: 'rgba(251,113,133,0.4)', bg: 'rgba(251,113,133,0.08)' },
  neutral:     { text: '#c084fc', border: 'rgba(192,132,252,0.3)', bg: 'rgba(168,85,247,0.08)'  },
};

interface HolographicHudProps {
  affection: number;
  currentMood: string;
  isSpeaking: boolean;
  fps: number;
}

export const HolographicHud: React.FC<HolographicHudProps> = ({ 
  affection, 
  currentMood, 
  isSpeaking,
  fps 
}) => {
  const [pulse, setPulse] = useState(false);
  const affectionLevel = Math.floor(affection / 100);
  const affectionProgress = affection % 100;

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-6 overflow-hidden select-none">
      {/* Top Left: System Status (Offset significantly to avoid App Title overlap) */}
      <div className="flex flex-col gap-1 anime-fade-in delay-200 mt-20 md:mt-16">
        <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-400/80 tracking-widest uppercase">
          <Cpu className="w-3 h-3" />
          <span>System.Active_v1.4</span>
        </div>
        <div className="w-24 h-0.5 bg-cyan-950/50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-cyan-400 transition-all duration-1000 shadow-[0_0_8px_cyan]" 
            style={{ width: `${Math.min(100, fps * 1.6)}%` }} 
          />
        </div>
      </div>

      {/* Center: Mood Label */}
      <div className="absolute top-1/4 left-6 flex flex-col gap-1">
        <div className="text-[8px] font-mono text-pink-500/60 uppercase">Emote_Log //</div>
        <div
          className="text-xs font-mono uppercase tracking-tighter px-2 py-0.5 rounded-full border transition-all duration-700"
          style={{
            color: MOOD_COLORS[currentMood as keyof typeof MOOD_COLORS]?.text ?? '#c084fc',
            borderColor: MOOD_COLORS[currentMood as keyof typeof MOOD_COLORS]?.border ?? 'rgba(192,132,252,0.3)',
            background: MOOD_COLORS[currentMood as keyof typeof MOOD_COLORS]?.bg ?? 'rgba(168,85,247,0.08)',
            opacity: 0.75,
          }}
        >
          {currentMood || 'neutral'}
        </div>
      </div>

      {/* Bottom Left: Affection & Vital Signs */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-pink-500/80">
            <Heart className={`w-3.5 h-3.5 ${pulse ? 'scale-110 shadow-pink-500' : 'scale-100'} transition-transform duration-500`} />
            <span className="text-[10px] font-mono font-bold tracking-tighter">AFF_LVL: {affectionLevel}</span>
          </div>
          <div className="w-32 h-1 bg-pink-950/30 rounded-full border border-pink-500/20 overflow-hidden backdrop-blur-sm">
            <div 
              className="h-full bg-gradient-to-r from-pink-600 to-pink-400 transition-all duration-700 shadow-[0_0_10px_rgba(236,72,153,0.6)]" 
              style={{ width: `${affectionProgress}%` }} 
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-[9px] font-mono text-cyan-400/60">
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            <span>SYNC {isSpeaking ? 'ACTIVE' : 'IDLE'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span>PWR 98%</span>
          </div>
        </div>
      </div>

      {/* Right side: Decorative borders & Scan readout */}
      <div className="absolute top-6 right-6 bottom-6 w-1 border-r border-cyan-500/10 flex flex-col justify-center items-end gap-2">
         {[...Array(5)].map((_, i) => (
           <div key={i} className="w-2 h-[1px] bg-cyan-500/30" />
         ))}
      </div>

      {/* Corner Brackets */}
      <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-cyan-500/40" />
      <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-cyan-500/40" />
      <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-cyan-500/40" />
      <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-cyan-500/40" />
    </div>
  );
};
