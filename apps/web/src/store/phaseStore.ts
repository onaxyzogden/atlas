/**
 * Phase store — manages build phases and the active phase filter.
 *
 * Every placeable element (zone, structure, paddock, crop, path, utility)
 * has a `phase` field. The active filter controls map layer visibility.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { phase } from '../lib/tokens';
import type { PhaseKey } from '../v3/plan/types.js';

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
  /**
   * Optional Yeomans Scale of Permanence cap. When set, entities tagged
   * with this phase's `id` are visible on a Plan view iff the active
   * view's cap (PHASE_VIEW_CAP) is at or beyond this Yeomans key.
   *
   * Undefined = uncapped (always visible). Stewards set this on each
   * BuildPhase from the Phasing module UI. Default seeds populate it
   * with sensible defaults (order 1→water, 2→buildings, 3→subdivision,
   * 4→soil) and the v2→v3 persist migration backfills the same.
   *
   * Adapter hook: `apps/web/src/v3/plan/usePhaseStoreCappedEntities.ts`
   * Decision:    `wiki/decisions/2026-05-12-plan-phasestore-yeomans-adapter.md`
   */
  yeomansCap?: PhaseKey;
}

/**
 * Default Yeomans caps for the 4 seeded BuildPhases, keyed by `order`.
 * Mirrors the rough timeline: water-shaping in Year 0-1, structures by
 * Year 1-3, subdivision/fencing by Year 3-5, soil refinement Year 5+.
 */
const DEFAULT_YEOMANS_CAP_BY_ORDER: Record<number, PhaseKey> = {
  1: 'water',
  2: 'buildings',
  3: 'subdivision',
  4: 'soil',
};

/**
 * Yeomans Keyline Scale of Permanence categories used by the Plan-stage
 * phasing matrix to enforce the orthodox sequencing rule (mainframe
 * earthworks + water before structures; vegetation last).
 *
 * Per Permaculture Scholar verdict 2026-05-07
 * (`wiki/decisions/2026-05-07-atlas-plan-phasing-scholar-keep-atlas.md`),
 * `designLayer` is optional on PhaseTask: legacy tasks load with
 * `designLayer` undefined and are surfaced in an "Uncategorised" row in
 * the Scale-of-Permanence matrix until the steward classifies them.
 */
export type DesignLayer = 'earthworks' | 'water' | 'vegetation' | 'structures';

/** A single seasonal build / maintenance task on a phase. */
export interface PhaseTask {
  id: string;
  season: 'winter' | 'spring' | 'summer' | 'fall';
  title: string;
  laborHrs: number;
  costUSD: number;
  notes?: string;
  /**
   * Optional Scale-of-Permanence categorisation (Yeomans Keyline). Drives
   * the `PhasingScaleMatrixCard` row grouping. Omitted on legacy tasks.
   */
  designLayer?: DesignLayer;
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
  { name: 'Phase 1', timeframe: 'Year 0-1', order: 1, description: 'Site Intelligence — Infrastructure & Habitation', color: phase[1], yeomansCap: 'water' as PhaseKey },
  { name: 'Phase 2', timeframe: 'Year 1-3', order: 2, description: 'Design Atlas — Agricultural Systems', color: phase[2], yeomansCap: 'buildings' as PhaseKey },
  { name: 'Phase 3', timeframe: 'Year 3-5', order: 3, description: 'Collaboration & Community — Retreat & Community', color: phase[3], yeomansCap: 'subdivision' as PhaseKey },
  { name: 'Phase 4', timeframe: 'Year 5+', order: 4, description: 'Full Vision — Maturity & Expansion', color: phase[4], yeomansCap: 'soil' as PhaseKey },
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
      version: 3,
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
        if (version < 3 && Array.isArray(state.phases)) {
          // v2 → v3: backfill `yeomansCap` from `order` so the chip on
          // Year 1 / Year 5 views actually does something for existing
          // projects. Non-default orders stay undefined (steward will
          // set them from the Phasing module UI).
          state.phases = state.phases.map((p) => {
            if (p.yeomansCap !== undefined) return p as BuildPhase;
            const order = typeof p.order === 'number' ? p.order : 0;
            const cap = DEFAULT_YEOMANS_CAP_BY_ORDER[order];
            return cap !== undefined
              ? ({ ...p, yeomansCap: cap } as BuildPhase)
              : (p as BuildPhase);
          });
        }
        return state;
      },
    },
  ),
);

// Hydrate from localStorage (Zustand v5)
usePhaseStore.persist.rehydrate();
