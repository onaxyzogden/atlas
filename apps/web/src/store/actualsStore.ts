/**
 * Actuals store — ACT-stage Module 2 (Phased Implementation & Budgeting).
 *
 * Tracks **actual** labor hours and dollars spent against each PLAN-stage
 * `PhaseTask`. The `BudgetActualsCard` joins this against
 * `phaseStore.BuildPhase.tasks` to surface estimated-vs-actual deltas + a
 * variance percentage.
 *
 * Selector discipline: subscribers should read `state.byProject` and use
 * `useMemo` to derive their per-project slice (subscribe-then-derive,
 * `wiki/decisions/2026-04-26-zustand-selector-stability.md`).
 *
 * If a `PhaseTask` is deleted in PLAN, the actual entry orphans — by design.
 * `BudgetActualsCard` shows orphans at the bottom with a "remove" affordance;
 * we don't auto-cascade so the steward keeps full audit control.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TaskActual {
  /** PhaseTask.id — the join key against `phaseStore.BuildPhase.tasks`. */
  taskId: string;
  actualHrs: number;
  actualUSD: number;
  /** ISO timestamp of last edit. */
  updatedAt: string;
  notes?: string;
}

/** taskId → actual, scoped per project. */
export type ProjectActuals = Record<string, TaskActual>;

interface ActualsState {
  /** projectId → taskId → actual. */
  byProject: Record<string, ProjectActuals>;
  upsertActual: (projectId: string, actual: TaskActual) => void;
  removeActual: (projectId: string, taskId: string) => void;
}

export const useActualsStore = create<ActualsState>()(
  persist(
    (set) => ({
      byProject: {},
      upsertActual: (projectId, actual) =>
        set((s) => ({
          byProject: {
            ...s.byProject,
            [projectId]: {
              ...(s.byProject[projectId] ?? {}),
              [actual.taskId]: actual,
            },
          },
        })),
      removeActual: (projectId, taskId) =>
        set((s) => {
          const project = s.byProject[projectId];
          if (!project) return s;
          const next = { ...project };
          delete next[taskId];
          return { byProject: { ...s.byProject, [projectId]: next } };
        }),
    }),
    { name: 'ogden-act-actuals', version: 1 },
  ),
);

useActualsStore.persist.rehydrate();
