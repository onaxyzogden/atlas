/**
 * Phase store — manages build phases and the active phase filter.
 *
 * Every placeable element (zone, structure, paddock, crop, path, utility)
 * has a `phase` field. The active filter controls map layer visibility.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { phase } from '../lib/tokens';

export interface BuildPhase {
  id: string;
  projectId: string;
  name: string;
  timeframe: string; // e.g. "Year 0-1"
  order: number;
  description: string;
  color: string;
}

interface PhaseState {
  phases: BuildPhase[];
  activeFilter: string; // phase id or 'all'

  addPhase: (phase: BuildPhase) => void;
  updatePhase: (id: string, updates: Partial<BuildPhase>) => void;
  deletePhase: (id: string) => void;
  setActiveFilter: (filter: string) => void;
  getProjectPhases: (projectId: string) => BuildPhase[];
  ensureDefaults: (projectId: string) => void;
}

const DEFAULT_PHASES = [
  { name: 'Phase 1', timeframe: 'Year 0-1', order: 1, description: 'Site Intelligence — Infrastructure & Habitation', color: phase[1] },
  { name: 'Phase 2', timeframe: 'Year 1-3', order: 2, description: 'Design Atlas — Agricultural Systems', color: phase[2] },
  { name: 'Phase 3', timeframe: 'Year 3-5', order: 3, description: 'Collaboration & Community — Retreat & Community', color: phase[3] },
  { name: 'Phase 4', timeframe: 'Year 5+', order: 4, description: 'Full Vision — Maturity & Expansion', color: phase[4] },
];

export const usePhaseStore = create<PhaseState>()(
  persist(
    (set, get) => ({
      phases: [],
      activeFilter: 'all',

      addPhase: (phase) => set((s) => ({ phases: [...s.phases, phase] })),

      updatePhase: (id, updates) =>
        set((s) => ({
          phases: s.phases.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

      deletePhase: (id) =>
        set((s) => ({ phases: s.phases.filter((p) => p.id !== id) })),

      setActiveFilter: (filter) => set({ activeFilter: filter }),

      getProjectPhases: (projectId) =>
        get()
          .phases.filter((p) => p.projectId === projectId)
          .sort((a, b) => a.order - b.order),

      ensureDefaults: (projectId) => {
        const existing = get().phases.filter((p) => p.projectId === projectId);
        if (existing.length > 0) return;
        const defaults = DEFAULT_PHASES.map((d) => ({
          ...d,
          id: crypto.randomUUID(),
          projectId,
        }));
        set((s) => ({ phases: [...s.phases, ...defaults] }));
      },
    }),
    {
      name: 'ogden-phases',
      version: 1,
      partialize: (state) => ({ phases: state.phases }),
    },
  ),
);

// Hydrate from localStorage (Zustand v5)
usePhaseStore.persist.rehydrate();
