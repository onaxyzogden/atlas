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
import type { SidebarView, SubItemId } from '../components/IconSidebar.js';

export type ColorScheme = 'light' | 'dark' | 'system';
export type SidebarGrouping = 'phase' | 'domain';

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

  // Sidebar grouping preference — shared between IconSidebar and DashboardSidebar.
  // 'phase'  = workflow-oriented (P1–P4), onboarding-friendly (default)
  // 'domain' = subject-oriented (hydrology, grazing, forestry…), matches GIS conventions
  sidebarGrouping: SidebarGrouping;
  setSidebarGrouping: (g: SidebarGrouping) => void;

  // Navigation context — session only, not persisted
  activeDashboardSection: string;
  setActiveDashboardSection: (section: string) => void;
  pendingMapContext: boolean;
  setPendingMapContext: (v: boolean) => void;

  // Map-rail navigation — lifted out of MapView so the IconSidebar (rendered
  // in ProjectPage when the Map tab is active) and MapView stay in sync. Not
  // persisted: the initial panel is derived from activeDashboardSection on
  // mount via getDomainContext().
  activeMapView: SidebarView | null;
  setActiveMapView: (v: SidebarView | null) => void;
  activeMapSubItem: SubItemId | null;
  setActiveMapSubItem: (id: SubItemId | null) => void;

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

      // Sidebar grouping — default to phase (preserves onboarding narrative)
      sidebarGrouping: 'phase' as SidebarGrouping,
      setSidebarGrouping: (g) => set({ sidebarGrouping: g }),

      // Navigation context
      activeDashboardSection: 'site-intelligence',
      setActiveDashboardSection: (section) => set({ activeDashboardSection: section }),
      pendingMapContext: false,
      setPendingMapContext: (v) => set({ pendingMapContext: v }),

      activeMapView: null,
      setActiveMapView: (v) => set({ activeMapView: v }),
      activeMapSubItem: null,
      setActiveMapSubItem: (id) => set({ activeMapSubItem: id }),

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
        sidebarGrouping: state.sidebarGrouping,
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
