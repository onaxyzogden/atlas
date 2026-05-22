/**
 * Phase store — manages build phases and the active phase filter.
 *
 * Every placeable element (zone, structure, paddock, crop, path, utility)
 * has a `phase` field. The active filter controls map layer visibility.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { phase } from '../lib/tokens';
import type { PhaseKey } from '../v3/plan/types.js';
import type {
  MaintenanceFrequency,
  MaterialLine,
} from '../v3/plan/data/goalCompassTypes.js';
import type { ProjectRole } from '@ogden/shared';

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
  /**
   * Goal Compass provenance — `true` when this phase was produced by the
   * sequencing engine. Goal Compass uses these flags to know which rows
   * it owns and may safely regenerate; unflagged phases are user-authored
   * and untouched by the engine.
   */
  generatedFromGoalCompass?: boolean;
  /** Catalog version the engine ran when generating this phase. */
  catalogVersion?: string;
  /**
   * Annual planting calendar provenance — `true` when this phase was
   * produced by `schedulePlantingFromAreas`. Replaced wholesale on
   * regenerate; never touches user-authored or Goal-Compass rows.
   */
  generatedFromPlantingCalendar?: boolean;
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
  /**
   * Goal Compass provenance — id of the intervention that generated this
   * task. Unset for user-authored tasks. When `status: 'overridden'` the
   * engine treats this row as frozen and re-flows the rest of the plan
   * around it.
   */
  generatedFromIntervention?: string;
  /** Optional goal-criterion id this task is helping advance. */
  goalCriterionId?: string;
  /** Catalog version active when the engine generated this task. */
  catalogVersion?: string;
  /**
   * Lifecycle flag — `'generated'` until a steward edits the row, then
   * `'overridden'`. Undefined for user-authored tasks (never touched by
   * the engine).
   */
  status?: 'generated' | 'overridden';
  /**
   * Concrete calendar window. Set by `scheduleTasksToCalendar` when the
   * Goal Compass proposal is generated; null for user-authored tasks
   * that haven't been placed on the calendar yet. ISO YYYY-MM-DD.
   */
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  /**
   * Forward-compat role gate. Every generated task ships with all four
   * roles populated so the field is non-empty and ready when role-gated
   * views land. UI filtering is not wired yet.
   */
  roleAccess?: ProjectRole[];
  /**
   * Annual planting calendar provenance — composite id
   * `<species>:<cropAreaId>:<year>` set by `schedulePlantingFromAreas`.
   * Replaced wholesale on regenerate.
   */
  generatedFromPlantingCalendar?: string;
  /**
   * WS4b — recurring operational-maintenance task (spec §4.3.3). `true`
   * when emitted by `engine/maintenanceSchedule.ts` into the synthetic
   * "Ongoing maintenance" phase. Undefined on every other task → existing
   * rollups are unaffected; no persist version bump (additive optional).
   */
  isMaintenanceTask?: boolean;
  /** Recurrence cadence of a maintenance task (mirrors the catalog). */
  recurrenceFrequency?: MaintenanceFrequency;
  /** Per-occurrence materials carried for the procurement rollup. */
  materials?: MaterialLine[];
  /** Skilled help beyond the household this occurrence requires. */
  requiredPersonnel?: { skillLevel?: string; minCount: number };
  /** Free-text equipment classes the recurring task depends on. */
  equipmentRequired?: string[];
  /**
   * §5.2 Plan-Execution Tracker — steward marks an individual task done.
   * Additive optional → no persist version bump (mirrors the
   * `isMaintenanceTask` precedent above). `doneAt` is the ISO timestamp
   * of the last flip to `true`; cleared to null when toggled back off.
   * Legacy persisted tasks load with `done` undefined ⇒ not-done.
   */
  done?: boolean;
  doneAt?: string | null;
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
   * Goal Compass — replace all generated phases + their generated tasks
   * for a project while preserving:
   *   - user-authored phases (no `generatedFromGoalCompass` flag)
   *   - generated tasks the steward has overridden (`status: 'overridden'`)
   */
  replaceGoalCompassRows: (
    projectId: string,
    newPhases: BuildPhase[],
    newTasks: { phaseId: string; task: PhaseTask }[],
  ) => void;
  /**
   * Annual planting calendar — replace all planting-calendar phases +
   * tasks for a project. Mirrors `replaceGoalCompassRows` but keyed on
   * the `generatedFromPlantingCalendar` flag, so user-authored and
   * Goal-Compass rows are left untouched.
   */
  replacePlantingCalendarRows: (
    projectId: string,
    newPhases: BuildPhase[],
    newTasks: { phaseId: string; task: PhaseTask }[],
  ) => void;
  /**
   * Goal Compass — mark a generated task as overridden so future
   * regeneration leaves it untouched. Optional patch applies edits in
   * the same write.
   */
  overrideGoalCompassTask: (
    phaseId: string,
    taskId: string,
    patch?: Partial<PhaseTask>,
  ) => void;
  /**
   * §5.2 Plan-Execution Tracker — flip a single task's completion state.
   * Deliberately does NOT set `status: 'overridden'`: marking a task
   * done is execution tracking, not an authoring override, so the
   * Goal-Compass engine may still regenerate the row.
   */
  toggleTaskDone: (phaseId: string, taskId: string) => void;
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

      replaceGoalCompassRows: (projectId, newPhases, newTasks) =>
        set((s) => {
          const tasksByPhaseId = new Map<string, PhaseTask[]>();
          for (const { phaseId, task } of newTasks) {
            if (!phaseId) continue;
            const list = tasksByPhaseId.get(phaseId) ?? [];
            list.push(task);
            tasksByPhaseId.set(phaseId, list);
          }
          const preservedOverridesById = new Map<string, PhaseTask[]>();
          for (const p of s.phases) {
            if (p.projectId !== projectId) continue;
            if (!p.generatedFromGoalCompass) continue;
            const overrides = (p.tasks ?? []).filter((t) => t.status === 'overridden');
            if (overrides.length) preservedOverridesById.set(p.id, overrides);
          }
          const remaining = s.phases.filter(
            (p) => p.projectId !== projectId || !p.generatedFromGoalCompass,
          );
          const replacements = newPhases.map((p) => {
            const tasks = tasksByPhaseId.get(p.id) ?? [];
            const preserved = preservedOverridesById.get(p.id) ?? [];
            return { ...p, tasks: [...preserved, ...tasks] };
          });
          return { phases: [...remaining, ...replacements] };
        }),

      replacePlantingCalendarRows: (projectId, newPhases, newTasks) =>
        set((s) => {
          const tasksByPhaseId = new Map<string, PhaseTask[]>();
          for (const { phaseId, task } of newTasks) {
            if (!phaseId) continue;
            const list = tasksByPhaseId.get(phaseId) ?? [];
            list.push(task);
            tasksByPhaseId.set(phaseId, list);
          }
          const remaining = s.phases.filter(
            (p) => p.projectId !== projectId || !p.generatedFromPlantingCalendar,
          );
          const replacements = newPhases.map((p) => ({
            ...p,
            tasks: tasksByPhaseId.get(p.id) ?? [],
          }));
          return { phases: [...remaining, ...replacements] };
        }),

      overrideGoalCompassTask: (phaseId, taskId, patch) =>
        set((s) => ({
          phases: s.phases.map((p) => {
            if (p.id !== phaseId) return p;
            const tasks = (p.tasks ?? []).map((t) =>
              t.id === taskId ? { ...t, ...(patch ?? {}), status: 'overridden' as const } : t,
            );
            return { ...p, tasks };
          }),
        })),

      toggleTaskDone: (phaseId, taskId) =>
        set((s) => ({
          phases: s.phases.map((p) => {
            if (p.id !== phaseId) return p;
            const tasks = (p.tasks ?? []).map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    done: !t.done,
                    doneAt: !t.done ? new Date().toISOString() : null,
                  }
                : t,
            );
            return { ...p, tasks };
          }),
        })),

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
rehydrateWithLogging(usePhaseStore);
