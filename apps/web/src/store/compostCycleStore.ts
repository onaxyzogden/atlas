/**
 * compostCycleStore — Sub-project B2, compost-cycle designer.
 *
 * A net-new, additive persisted slice (A-series additive covenant: no
 * DB migration, no API endpoint). Deliberately a *separate* store with
 * its own persist key and `version: 1`, NO `temporal`, NO `migrate` —
 * zero risk to the `ogden-compost-inventory` / `ogden-closed-loop`
 * slices it sits beside. CompostCycleCard reads compost-inventory for a
 * display-only context line but never writes across stores.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CompostMethod = 'hot' | 'cold' | 'vermicompost' | 'compost_tea';
export type CompostStatus = 'planned' | 'active' | 'cured';

export interface CompostBatch {
  id: string;
  method: CompostMethod;
  /** ISO date (YYYY-MM-DD) the batch is started / built. */
  startDateISO: string;
  /** Turn cadence in days (hot/cold only); optional. */
  turnEveryDays?: number;
  /** ISO date the batch is expected ready / cured; optional. */
  readyDateISO?: string;
  feedstockNote?: string;
  status: CompostStatus;
  /**
   * B2.1 amendment-application plan (all optional, additive — old
   * persisted rows simply lack them; `version:1` stays, no `migrate`).
   * Closes the loop from finished compost back to soil application.
   */
  appliedToZone?: string;
  applicationDateISO?: string;
  applicationRateNote?: string;
}

interface CompostCycleState {
  byProject: Record<string, CompostBatch[]>;
  addBatch: (projectId: string, batch: CompostBatch) => void;
  updateBatch: (projectId: string, batch: CompostBatch) => void;
  removeBatch: (projectId: string, id: string) => void;
  clearProject: (projectId: string) => void;
}

function listFor(
  state: CompostCycleState,
  projectId: string,
): CompostBatch[] {
  return state.byProject[projectId] ?? [];
}

export const useCompostCycleStore = create<CompostCycleState>()(
  persist(
    (set) => ({
      byProject: {},

      addBatch: (projectId, batch) =>
        set((s) => ({
          byProject: {
            ...s.byProject,
            [projectId]: [...listFor(s, projectId), batch],
          },
        })),

      updateBatch: (projectId, batch) =>
        set((s) => ({
          byProject: {
            ...s.byProject,
            [projectId]: listFor(s, projectId).map((b) =>
              b.id === batch.id ? batch : b,
            ),
          },
        })),

      removeBatch: (projectId, id) =>
        set((s) => ({
          byProject: {
            ...s.byProject,
            [projectId]: listFor(s, projectId).filter((b) => b.id !== id),
          },
        })),

      clearProject: (projectId) =>
        set((s) => {
          const next = { ...s.byProject };
          delete next[projectId];
          return { byProject: next };
        }),
    }),
    { name: 'ogden-compost-cycle', version: 1 },
  ),
);
