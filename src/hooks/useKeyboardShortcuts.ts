import { useEffect } from 'react';

interface Shortcuts {
  onToggleChat?: () => void;
  onNewConversation?: () => void;
  onEscape?: () => void;
  onCameraPreset?: (preset: string) => void;
  onToggleParticles?: () => void;
}

/**
 * Global keyboard shortcuts for the app.
 * - Ctrl/Cmd + K  → toggle chat
 * - Ctrl/Cmd + N  → new conversation
 * - Escape         → close overlays
 * - 1/2/3/4        → camera presets (close-up / medium / full-body / wide)
 * - P              → toggle ambient particles
 */
export function useKeyboardShortcuts({ onToggleChat, onNewConversation, onEscape, onCameraPreset, onToggleParticles }: Shortcuts) {
  useEffect(() => {
    const CAMERA_KEYS: Record<string, string> = {
      '1': 'close-up',
      '2': 'medium-shot',
      '3': 'full-body',
      '4': 'wide',
    };

    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      // Don't fire when user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA';

      if (mod && e.key === 'k' && !isInput) {
        e.preventDefault();
        onToggleChat?.();
        return;
      }
      if (mod && e.key === 'n' && !isInput) {
        e.preventDefault();
        onNewConversation?.();
        return;
      }
      if (e.key === 'Escape') {
        onEscape?.();
        return;
      }
      // Camera preset shortcuts — only when not in input and no modifier
      if (!mod && !isInput && CAMERA_KEYS[e.key]) {
        onCameraPreset?.(CAMERA_KEYS[e.key]);
        return;
      }
      // P — toggle ambient particles
      if (!mod && !isInput && (e.key === 'p' || e.key === 'P')) {
        onToggleParticles?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onToggleChat, onNewConversation, onEscape, onCameraPreset, onToggleParticles]);
}
