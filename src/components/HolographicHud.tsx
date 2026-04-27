import React, { useEffect, useState } from 'react';
import { Activity, Heart, Zap, Cpu } from 'lucide-react';

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

      {/* Center: Mood Label (appears only briefly on change in VrmViewer, but static indicator here) */}
      <div className="absolute top-1/4 left-6 flex flex-col gap-1 opacity-40">
         <div className="text-[8px] font-mono text-pink-500/60 uppercase">Emote_Log //</div>
         <div className="text-xs font-mono text-pink-400/80 uppercase tracking-tighter">
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
