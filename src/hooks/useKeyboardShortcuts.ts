import { useEffect } from 'react';

interface Shortcuts {
  onToggleChat?: () => void;
  onNewConversation?: () => void;
  onEscape?: () => void;
}

/**
 * Global keyboard shortcuts for the app.
 * - Ctrl/Cmd + K  → toggle chat
 * - Ctrl/Cmd + N  → new conversation
 * - Escape         → close overlays
 */
export function useKeyboardShortcuts({ onToggleChat, onNewConversation, onEscape }: Shortcuts) {
  useEffect(() => {
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
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onToggleChat, onNewConversation, onEscape]);
}
