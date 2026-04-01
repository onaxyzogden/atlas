/**
 * useKeyboardShortcuts — global keyboard shortcut handler.
 *
 * Registers Cmd/Ctrl+K for command palette, Cmd/Ctrl+Z for undo,
 * Cmd/Ctrl+Shift+Z for redo, and other navigation shortcuts.
 */

import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useUIStore } from '../store/uiStore.js';

export function useKeyboardShortcuts() {
  const togglePalette = useUIStore((s) => s.toggleCommandPalette);
  const undo = useUIStore((s) => s.undo);
  const redo = useUIStore((s) => s.redo);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setColorScheme = useUIStore((s) => s.setColorScheme);
  const colorScheme = useUIStore((s) => s.colorScheme);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Don't capture in input elements (except for palette/undo)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Cmd/Ctrl + K — Command palette (always)
      if (mod && e.key === 'k') {
        e.preventDefault();
        togglePalette();
        return;
      }

      // Cmd/Ctrl + Z — Undo (when not in input)
      if (mod && !e.shiftKey && e.key === 'z' && !isInput) {
        e.preventDefault();
        undo();
        return;
      }

      // Cmd/Ctrl + Shift + Z — Redo (when not in input)
      if (mod && e.shiftKey && e.key === 'z' && !isInput) {
        e.preventDefault();
        redo();
        return;
      }

      // Cmd/Ctrl + Shift + D — Toggle dark mode
      if (mod && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
        return;
      }

      // Cmd/Ctrl + B — Toggle sidebar
      if (mod && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // When not in input
      if (!isInput) {
        // Cmd/Ctrl + N — New project
        if (mod && e.key === 'n') {
          e.preventDefault();
          navigate({ to: '/new' });
          return;
        }

        // Cmd/Ctrl + H — Home
        if (mod && e.key === 'h') {
          e.preventDefault();
          navigate({ to: '/' });
          return;
        }

        // ? — Show shortcuts help (could open palette with "help" query)
        if (e.key === '?' && !mod) {
          togglePalette();
          return;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePalette, undo, redo, toggleSidebar, setColorScheme, colorScheme, navigate]);
}
