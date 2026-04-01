/**
 * UI store — manages dark mode, search palette, keyboard shortcuts,
 * and undo/redo history.
 *
 * P1 features from Section 0h:
 *   - Dark mode
 *   - Keyboard shortcuts
 *   - Search bar / command palette
 *   - Undo/redo
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ColorScheme = 'light' | 'dark' | 'system';

interface UndoEntry {
  timestamp: number;
  label: string;
  undo: () => void;
  redo: () => void;
}

interface UIState {
  // Color scheme
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  resolvedDark: boolean; // true if currently rendering dark

  // Command palette
  commandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;

  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // Undo/redo
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  pushUndo: (entry: Omit<UndoEntry, 'timestamp'>) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Color scheme
      colorScheme: 'dark' as ColorScheme,
      resolvedDark: true,
      setColorScheme: (scheme) => {
        const isDark =
          scheme === 'dark' ||
          (scheme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        set({ colorScheme: scheme, resolvedDark: isDark });
        applyColorScheme(isDark);
      },

      // Command palette
      commandPaletteOpen: false,
      openCommandPalette: () => set({ commandPaletteOpen: true }),
      closeCommandPalette: () => set({ commandPaletteOpen: false }),
      toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

      // Sidebar
      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      // Undo/redo
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,

      pushUndo: (entry) =>
        set((s) => {
          const stack = [...s.undoStack, { ...entry, timestamp: Date.now() }].slice(-50);
          return { undoStack: stack, redoStack: [], canUndo: true, canRedo: false };
        }),

      undo: () => {
        const { undoStack, redoStack } = get();
        if (undoStack.length === 0) return;
        const entry = undoStack[undoStack.length - 1]!;
        entry.undo();
        set({
          undoStack: undoStack.slice(0, -1),
          redoStack: [...redoStack, entry],
          canUndo: undoStack.length > 1,
          canRedo: true,
        });
      },

      redo: () => {
        const { undoStack, redoStack } = get();
        if (redoStack.length === 0) return;
        const entry = redoStack[redoStack.length - 1]!;
        entry.redo();
        set({
          undoStack: [...undoStack, entry],
          redoStack: redoStack.slice(0, -1),
          canUndo: true,
          canRedo: redoStack.length > 1,
        });
      },
    }),
    {
      name: 'ogden-ui',
      version: 1,
      partialize: (state) => ({
        colorScheme: state.colorScheme,
        sidebarOpen: state.sidebarOpen,
      }),
    },
  ),
);

// Hydrate from localStorage (Zustand v5)
useUIStore.persist.rehydrate();

function applyColorScheme(isDark: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

// Initialize on load
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('ogden-ui');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const scheme = parsed?.state?.colorScheme ?? 'dark';
      const isDark =
        scheme === 'dark' ||
        (scheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      applyColorScheme(isDark);
    } catch {
      applyColorScheme(true);
    }
  } else {
    applyColorScheme(true);
  }
}
