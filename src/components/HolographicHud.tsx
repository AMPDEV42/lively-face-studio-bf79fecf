import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Activity, Heart, Cpu, Waves } from 'lucide-react';

// ── Mood color palette ────────────────────────────────────────────────────────
const MOOD_COLORS: Record<string, { text: string; border: string; bg: string; glow: string }> = {
  happy:       { text: '#f472b6', border: 'rgba(244,114,182,0.45)', bg: 'rgba(244,114,182,0.10)', glow: '0 0 10px rgba(244,114,182,0.6)' },
  excited:     { text: '#fb923c', border: 'rgba(251,146,60,0.45)',  bg: 'rgba(251,146,60,0.10)',  glow: '0 0 10px rgba(251,146,60,0.6)'  },
  laughing:    { text: '#facc15', border: 'rgba(250,204,21,0.45)',  bg: 'rgba(250,204,21,0.10)',  glow: '0 0 10px rgba(250,204,21,0.6)'  },
  sad:         { text: '#60a5fa', border: 'rgba(96,165,250,0.45)',  bg: 'rgba(96,165,250,0.10)',  glow: '0 0 10px rgba(96,165,250,0.6)'  },
  sympathetic: { text: '#818cf8', border: 'rgba(129,140,248,0.45)', bg: 'rgba(129,140,248,0.10)', glow: '0 0 10px rgba(129,140,248,0.6)' },
  angry:       { text: '#f87171', border: 'rgba(248,113,113,0.45)', bg: 'rgba(248,113,113,0.10)', glow: '0 0 10px rgba(248,113,113,0.6)' },
  disgusted:   { text: '#a3e635', border: 'rgba(163,230,53,0.45)',  bg: 'rgba(163,230,53,0.10)',  glow: '0 0 10px rgba(163,230,53,0.6)'  },
  surprised:   { text: '#34d399', border: 'rgba(52,211,153,0.45)',  bg: 'rgba(52,211,153,0.10)',  glow: '0 0 10px rgba(52,211,153,0.6)'  },
  curious:     { text: '#22d3ee', border: 'rgba(34,211,238,0.45)',  bg: 'rgba(34,211,238,0.10)',  glow: '0 0 10px rgba(34,211,238,0.6)'  },
  thinking:    { text: '#a78bfa', border: 'rgba(167,139,250,0.45)', bg: 'rgba(167,139,250,0.10)', glow: '0 0 10px rgba(167,139,250,0.6)' },
  bored:       { text: '#94a3b8', border: 'rgba(148,163,184,0.35)', bg: 'rgba(148,163,184,0.08)', glow: 'none'                           },
  embarrassed: { text: '#fb7185', border: 'rgba(251,113,133,0.45)', bg: 'rgba(251,113,133,0.10)', glow: '0 0 10px rgba(251,113,133,0.6)' },
  neutral:     { text: '#c084fc', border: 'rgba(192,132,252,0.30)', bg: 'rgba(168,85,247,0.08)',  glow: 'none'                           },
};

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊', excited: '🤩', laughing: '😄', sad: '😢',
  sympathetic: '🥺', angry: '😠', disgusted: '😒', surprised: '😲',
  curious: '🤔', thinking: '💭', bored: '😑', embarrassed: '😳',
  neutral: '😐',
};

function getAffectionTitle(level: number): string {
  if (level === 0) return 'Stranger';
  if (level < 3)  return 'Acquaintance';
  if (level < 7)  return 'Friend';
  if (level < 15) return 'Close Friend';
  if (level < 30) return 'Best Friend';
  if (level < 50) return 'Companion';
  return 'Soulmate';
}

// ── Smooth canvas-based audio visualizer ─────────────────────────────────────
// Uses requestAnimationFrame for a continuous, fluid wave — never patchy.
// Calls getAudioLevel() directly every frame — no prop staleness delay.
const BAR_COUNT = 8;
const CANVAS_W = 56;
const CANVAS_H = 20;

function AudioVisualizer({
  active,
  getAudioLevel,
}: {
  active: boolean;
  getAudioLevel?: () => number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barsRef = useRef<{ h: number; phase: number; speed: number }[]>(
    Array.from({ length: BAR_COUNT }, (_, i) => ({
      h: 0.08,
      phase: (i / BAR_COUNT) * Math.PI * 2,
      speed: 1.8 + Math.random() * 1.4,
    }))
  );
  const rafRef = useRef<number>(0);
  const activeRef = useRef(active);
  const getAudioLevelRef = useRef(getAudioLevel);
  activeRef.current = active;
  getAudioLevelRef.current = getAudioLevel;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const now = performance.now() / 1000;
    const isActive = activeRef.current;
    // Read audio level fresh every frame — no React prop delay
    const lvl = isActive ? Math.min(1, (getAudioLevelRef.current?.() ?? 0) * 1.4) : 0;

    const barW = Math.floor((W - (BAR_COUNT - 1) * dpr) / BAR_COUNT);
    const gap = dpr;

    barsRef.current.forEach((bar, i) => {
      let target: number;
      if (isActive) {
        const wave =
          Math.sin(now * bar.speed + bar.phase) * 0.35 +
          Math.sin(now * bar.speed * 1.7 + bar.phase * 1.3) * 0.15 +
          0.5;
        // When audio level is low/zero, still show gentle wave so it doesn't freeze
        const minWave = 0.12 + Math.sin(now * 1.2 + bar.phase) * 0.06;
        target = lvl > 0.05
          ? Math.max(minWave, wave * lvl * 0.9 + 0.08)
          : minWave;
      } else {
        // Idle: very slow gentle breathing
        target = 0.06 + Math.sin(now * 0.6 + bar.phase) * 0.04;
      }

      // Fast attack, slow decay
      const lerpSpeed = target > bar.h ? 0.25 : 0.10;
      bar.h += (target - bar.h) * lerpSpeed;

      const barH = Math.max(2 * dpr, bar.h * H);
      const x = i * (barW + gap);
      const y = (H - barH) / 2;

      const grad = ctx.createLinearGradient(0, y + barH, 0, y);
      if (isActive) {
        const alpha = 0.35 + bar.h * 0.65;
        grad.addColorStop(0, `rgba(168,85,247,${alpha})`);
        grad.addColorStop(0.5, `rgba(139,92,246,${alpha + 0.1})`);
        grad.addColorStop(1, `rgba(99,179,237,${alpha})`);
      } else {
        grad.addColorStop(0, 'rgba(168,85,247,0.18)');
        grad.addColorStop(1, 'rgba(168,85,247,0.10)');
      }

      ctx.fillStyle = grad;
      const radius = barW / 2;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, radius);
      ctx.fill();

      if (isActive && bar.h > 0.3) {
        ctx.shadowColor = 'rgba(168,85,247,0.7)';
        ctx.shadowBlur = 4 * dpr;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    canvas.style.width = `${CANVAS_W}px`;
    canvas.style.height = `${CANVAS_H}px`;
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return <canvas ref={canvasRef} style={{ imageRendering: 'pixelated' }} aria-hidden="true" />;
}

// ── Session timer ─────────────────────────────────────────────────────────────
function useSessionTime() {
  const startRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const s = (elapsed % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface HolographicHudProps {
  affection: number;
  currentMood: string;
  isSpeaking: boolean;
  fps: number;
  isAnimating?: boolean;
  getAudioLevel?: () => number; // called every RAF frame — always fresh
}

// ── Component ─────────────────────────────────────────────────────────────────
export const HolographicHud: React.FC<HolographicHudProps> = ({
  affection,
  currentMood,
  isSpeaking,
  fps,
  isAnimating = false,
  getAudioLevel,
}) => {
  const [heartbeat, setHeartbeat] = useState(false);
  const [prevMood, setPrevMood] = useState(currentMood);
  const [moodChanged, setMoodChanged] = useState(false);
  const sessionTime = useSessionTime();

  const affectionLevel = Math.floor(affection / 100);
  const affectionProgress = affection % 100;
  const affectionTitle = getAffectionTitle(affectionLevel);

  useEffect(() => {
    const t = setInterval(() => setHeartbeat(p => !p), isSpeaking ? 500 : 2000);
    return () => clearInterval(t);
  }, [isSpeaking]);

  useEffect(() => {
    if (currentMood !== prevMood) {
      setPrevMood(currentMood);
      setMoodChanged(true);
      const t = setTimeout(() => setMoodChanged(false), 900);
      return () => clearTimeout(t);
    }
  }, [currentMood, prevMood]);

  const moodColor = MOOD_COLORS[currentMood] ?? MOOD_COLORS.neutral;
  const moodEmoji = MOOD_EMOJI[currentMood] ?? '😐';

  const statusLabel = isSpeaking ? 'SPEAKING' : isAnimating ? 'ANIMATING' : 'STANDBY';
  const statusColor = isSpeaking
    ? 'rgba(168,85,247,0.9)'
    : isAnimating
    ? 'rgba(34,211,238,0.7)'
    : 'rgba(34,211,238,0.3)';

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none">

      {/* ── TOP-LEFT panel ──────────────────────────────────────────────── */}
      <div
        className="absolute left-4 top-0 flex flex-col gap-[4px]"
        style={{ paddingTop: 'max(4.5rem, calc(env(safe-area-inset-top) + 4rem))' }}
      >
        {/* System header */}
        <div className="flex items-center gap-1.5">
          <Cpu className="w-2.5 h-2.5 text-cyan-400/60 shrink-0" />
          <span className="text-[8px] font-mono text-cyan-400/60 tracking-widest uppercase hidden md:inline">
            VOXIE_OS v1.4
          </span>
          <span className="text-[8px] font-mono text-cyan-400/60 tracking-widest uppercase md:hidden">
            VOXIE
          </span>
          <div className="w-10 h-0.5 bg-cyan-950/60 rounded-full overflow-hidden ml-1">
            <div
              className="h-full bg-cyan-400/70 transition-all duration-1000"
              style={{ width: `${Math.min(100, fps * 1.6)}%` }}
            />
          </div>
          <span className="text-[7px] font-mono text-cyan-400/40">{fps}fps</span>
        </div>

        {/* Divider */}
        <div className="w-28 h-px bg-gradient-to-r from-cyan-500/30 to-transparent" />

        {/* Affection */}
        <div className="flex flex-col gap-[3px] mt-0.5">
          <div className="flex items-center gap-1.5">
            <Heart
              className={`w-3 h-3 shrink-0 transition-all duration-300 ${
                heartbeat ? 'scale-125 text-pink-400' : 'scale-100 text-pink-500/70'
              }`}
              style={{ filter: heartbeat ? 'drop-shadow(0 0 4px rgba(244,114,182,0.8))' : 'none' }}
            />
            <span className="text-[9px] font-mono font-bold text-pink-400/90 tracking-tight">
              LVL {affectionLevel}
            </span>
            <span className="text-[7px] font-mono text-pink-400/50 hidden md:inline">
              {affectionTitle}
            </span>
          </div>
          <div className="relative w-24 md:w-32 h-1.5 bg-pink-950/40 rounded-full border border-pink-500/15 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${affectionProgress}%`,
                background: 'linear-gradient(90deg, #9d174d, #ec4899, #f9a8d4)',
                boxShadow: '0 0 8px rgba(236,72,153,0.5)',
              }}
            />
            {[25, 50, 75].map(tick => (
              <div
                key={tick}
                className="absolute top-0 bottom-0 w-px bg-pink-950/70"
                style={{ left: `${tick}%` }}
              />
            ))}
          </div>
          <div className="text-[7px] font-mono text-pink-400/40">
            {affectionProgress}/100 → next level
          </div>
        </div>

        {/* Divider */}
        <div className="w-28 h-px bg-gradient-to-r from-purple-500/20 to-transparent" />

        {/* Mood */}
        <div className="flex flex-col gap-[3px]">
          <div className="text-[7px] font-mono text-purple-400/40 uppercase tracking-wider">
            EMOTE_STATE
          </div>
          <div
            className="flex items-center gap-1.5 self-start px-2 py-0.5 rounded-full border transition-all duration-500"
            style={{
              color: moodColor.text,
              borderColor: moodColor.border,
              background: moodColor.bg,
              boxShadow: moodChanged ? moodColor.glow : 'none',
              opacity: 0.85,
            }}
          >
            <span className="text-[10px] leading-none">{moodEmoji}</span>
            <span className="text-[9px] font-mono uppercase tracking-tight font-semibold">
              {currentMood || 'neutral'}
            </span>
          </div>
        </div>

        {/* Session time */}
        <div className="flex items-center gap-1 mt-0.5">
          <div className="text-[7px] font-mono text-cyan-400/30 uppercase tracking-wider">SESSION</div>
          <div className="text-[8px] font-mono text-cyan-400/50 tabular-nums">{sessionTime}</div>
        </div>
      </div>

      {/* ── TOP-RIGHT panel ─────────────────────────────────────────────── */}
      <div
        className="absolute right-14 md:right-16 top-0 flex flex-col items-end gap-[5px]"
        style={{ paddingTop: 'max(4.5rem, calc(env(safe-area-inset-top) + 4rem))' }}
      >
        {/* Status label */}
        <div
          className="flex items-center gap-1.5 text-[9px] font-mono transition-colors duration-300"
          style={{ color: statusColor }}
        >
          <Activity className="w-3 h-3" />
          <span>{statusLabel}</span>
        </div>

        {/* Audio visualizer */}
        <div className="flex items-center gap-1.5">
          <Waves className="w-3 h-3 text-purple-400/40" />
          <AudioVisualizer active={isSpeaking} getAudioLevel={getAudioLevel} />
        </div>

        {/* Voice dot */}
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              isSpeaking
                ? 'bg-purple-400 animate-pulse'
                : 'bg-purple-400/20'
            }`}
            style={{
              boxShadow: isSpeaking ? '0 0 8px rgba(168,85,247,0.9)' : 'none',
            }}
          />
          <span
            className="text-[8px] font-mono hidden md:inline"
            style={{ color: isSpeaking ? 'rgba(168,85,247,0.8)' : 'rgba(168,85,247,0.3)' }}
          >
            {isSpeaking ? 'VOICE ON' : 'VOICE OFF'}
          </span>
        </div>

        {/* Session time mobile */}
        <div className="flex md:hidden">
          <div className="text-[8px] font-mono text-cyan-400/30 tabular-nums">{sessionTime}</div>
        </div>
      </div>

      {/* ── CORNER BRACKETS ─────────────────────────────────────────────── */}
      <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-cyan-500/25 rounded-tl-sm" />
      <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-cyan-500/25 rounded-tr-sm" />
      <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-cyan-500/25 rounded-bl-sm" />
      <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-cyan-500/25 rounded-br-sm" />

      {/* ── RIGHT EDGE scan line (desktop only) ─────────────────────────── */}
      <div className="hidden md:block absolute top-8 right-5 bottom-8 w-px bg-gradient-to-b from-transparent via-cyan-500/15 to-transparent" />
    </div>
  );
};
