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
  /**
   * Phase completion flag — user marks a phase `completed: true` when all
   * planned features for that phase are built. Drives the "X of Y phases
   * complete" Arc summary and the phase-card checkbox in PhasingDashboard.
   * Defaults to `false` on new phases; legacy v1 phases migrate with `false`.
   */
  completed: boolean;
  /**
   * Optional free-text working notes (blockers, vendor contacts, timeline
   * adjustments). Distinct from `description` which describes the phase's
   * conceptual role.
   */
  notes: string;
  /** ISO timestamp when `completed` last flipped to true. */
  completedAt: string | null;
  /**
   * PLAN-stage Module 7 — optional seasonal task list. Drives
   * SeasonalTaskCard + LaborBudgetSummaryCard rollups. Optional, no
   * migration; legacy phases load with `tasks` undefined.
   */
  tasks?: PhaseTask[];
}

/** A single seasonal build / maintenance task on a phase. */
export interface PhaseTask {
  id: string;
  season: 'winter' | 'spring' | 'summer' | 'fall';
  title: string;
  laborHrs: number;
  costUSD: number;
  notes?: string;
}

interface PhaseState {
  phases: BuildPhase[];
  activeFilter: string; // phase id or 'all'

  addPhase: (phase: BuildPhase) => void;
  updatePhase: (id: string, updates: Partial<BuildPhase>) => void;
  deletePhase: (id: string) => void;
  togglePhaseCompleted: (id: string) => void;
  setActiveFilter: (filter: string) => void;
  /**
   * Returns a freshly-allocated, sorted array. **Do NOT call inside a
   * Zustand selector** — it produces a new snapshot every render and
   * triggers "Maximum update depth exceeded" via `useSyncExternalStore`.
   *
   * Correct usage: subscribe to `state.phases` raw, then derive in `useMemo`:
   * ```ts
   * const allPhases = usePhaseStore((s) => s.phases);
   * const phases = useMemo(
   *   () => allPhases.filter((p) => p.projectId === id).sort((a, b) => a.order - b.order),
   *   [allPhases, id],
   * );
   * ```
   * See: wiki/decisions/2026-04-26-zustand-selector-stability.md
   */
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

      togglePhaseCompleted: (id) =>
        set((s) => ({
          phases: s.phases.map((p) =>
            p.id === id
              ? {
                  ...p,
                  completed: !p.completed,
                  completedAt: !p.completed ? new Date().toISOString() : null,
                }
              : p,
          ),
        })),

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
          completed: false,
          notes: '',
          completedAt: null,
        }));
        set((s) => ({ phases: [...s.phases, ...defaults] }));
      },
    }),
    {
      name: 'ogden-phases',
      version: 2,
      partialize: (state) => ({ phases: state.phases }),
      migrate: (persisted, version) => {
        const state = persisted as { phases?: Partial<BuildPhase>[] };
        if (version < 2 && Array.isArray(state.phases)) {
          // v1 → v2: add completion tracking fields. All existing phases
          // start uncompleted and with empty notes; users can toggle from the
          // PhasingDashboard phase-card checkbox.
          state.phases = state.phases.map((p) => ({
            completed: false,
            notes: '',
            completedAt: null,
            ...p,
          })) as BuildPhase[];
        }
        return state;
      },
    },
  ),
);

// Hydrate from localStorage (Zustand v5)
usePhaseStore.persist.rehydrate();
