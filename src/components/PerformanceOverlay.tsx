import { useEffect, useRef, useState } from 'react';

interface PerformanceOverlayProps {
  /** THREE.WebGLRenderer reference to read draw calls from */
  rendererRef: React.RefObject<{ info: { render: { calls: number } } } | null>;
}

/**
 * Performance debug overlay — only renders when `?debug=true` is in the URL.
 * Displays FPS (updated every second), memory usage (MB), and draw calls.
 *
 * Req 30.5: Show performance overlay (fps, memory, draw calls) when debug mode active.
 */
export function PerformanceOverlay({ rendererRef }: PerformanceOverlayProps) {
  const [isDebug] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('debug') === 'true';
    } catch {
      return false;
    }
  });

  const [fps, setFps] = useState(0);
  const [memoryMB, setMemoryMB] = useState<number | null>(null);
  const [drawCalls, setDrawCalls] = useState(0);

  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(performance.now());

  useEffect(() => {
    if (!isDebug) return;

    let rafId: number;

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      frameCountRef.current++;

      const now = performance.now();
      const elapsed = now - lastFpsUpdateRef.current;

      if (elapsed >= 1000) {
        const currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
        setFps(currentFps);
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = now;

        // Read draw calls from renderer
        const renderer = rendererRef.current;
        if (renderer) {
          setDrawCalls(renderer.info.render.calls);
        }

        // Read memory usage (Chrome-only non-standard API)
        const mem = (performance as any).memory;
        if (mem) {
          setMemoryMB(Math.round(mem.usedJSHeapSize / 1024 / 1024));
        }
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isDebug, rendererRef]);

  if (!isDebug) return null;

  return (
    <div
      role="status"
      aria-label="Performance debug overlay"
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.65)',
        color: '#00ff88',
        fontFamily: 'monospace',
        fontSize: '11px',
        lineHeight: '1.6',
        padding: '6px 10px',
        borderRadius: '6px',
        border: '1px solid rgba(0,255,136,0.3)',
        backdropFilter: 'blur(4px)',
        pointerEvents: 'none',
        userSelect: 'none',
        minWidth: '110px',
      }}
    >
      <div>FPS: <span style={{ color: fps < 20 ? '#ff4444' : fps < 45 ? '#ffaa00' : '#00ff88' }}>{fps}</span></div>
      <div>MEM: {memoryMB !== null ? `${memoryMB} MB` : 'N/A'}</div>
      <div>DC: {drawCalls}</div>
    </div>
  );
}
