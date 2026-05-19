/**
 * workItemBudgetStore — net-new actual-spend ledger on the WorkItem spine
 * (Sub-project D3).
 *
 * Records **actual** cost (a `CostRange` band) + actual labour hours against
 * each `WorkItem.id`. The D3 `BudgetCard` joins this against the spine's
 * planned baseline (manual `costUSD` promoted to a degenerate band, else
 * `costRangeAuto`) to surface render-only variance. It supersedes the legacy
 * PhaseTask `actualsStore` (`ogden-act-actuals`), which D3 retires from the
 * Act IA — that store/card file is preserved for audit but un-mounted.
 *
 * Steward-authored only: Goal Compass never logs real spend, so there is NO
 * generated-vs-overridden preservation contract here (unlike workItemStore).
 * Plain projectId-tagged CRUD, mirroring the `ogden-crew-members` /
 * `ogden-work-items` Zustand+persist sync class. Client-first, no DB
 * migration. Registered in `syncManifest` as `projectId-tagged`.
 *
 * Orphans by design: if a WorkItem is deleted, its actual entry remains until
 * the steward removes it explicitly — the audit history stays intact, no
 * cascade-delete (mirrors the legacy actuals discipline).
 *
 * Covenant (D3, binding): strictly project cost/budget tracking. No
 * cost-of-capital, financing, advance-purchase, investor/equity, or
 * yield-as-return semantics — those stay in Scholar-gated Sub-project C.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CostRange } from '@ogden/shared';

const now = () => new Date().toISOString();

export interface BudgetActual {
  /** `WorkItem.id` — the join key against the spine planned baseline. */
  workItemId: string;
  /** projectId tag for the `projectId-tagged` sync class. */
  projectId: string;
  /** Actual spend band. A single recorded figure is stored as low=mid=high. */
  actual: CostRange;
  actualHrs: number;
  /** ISO timestamp of last edit. */
  updatedAt: string;
  notes?: string;
}

interface WorkItemBudgetState {
  actuals: BudgetActual[];
  /** Insert or replace the actual for a (projectId, workItemId) pair. */
  upsertActual: (actual: BudgetActual) => void;
  removeActual: (projectId: string, workItemId: string) => void;
  getProjectActuals: (projectId: string) => BudgetActual[];
}

export const useWorkItemBudgetStore = create<WorkItemBudgetState>()(
  persist(
    (set, get) => ({
      actuals: [],

      upsertActual: (actual) =>
        set((s) => {
          const idx = s.actuals.findIndex(
            (a) =>
              a.projectId === actual.projectId &&
              a.workItemId === actual.workItemId,
          );
          const next: BudgetActual = { ...actual, updatedAt: now() };
          if (idx === -1) return { actuals: [...s.actuals, next] };
          const copy = s.actuals.slice();
          copy[idx] = next;
          return { actuals: copy };
        }),

      removeActual: (projectId, workItemId) =>
        set((s) => ({
          actuals: s.actuals.filter(
            (a) =>
              !(a.projectId === projectId && a.workItemId === workItemId),
          ),
        })),

      getProjectActuals: (projectId) =>
        get().actuals.filter((a) => a.projectId === projectId),
    }),
    {
      name: 'ogden-work-item-actuals',
      version: 1,
      partialize: (state) => ({ actuals: state.actuals }),
    },
  ),
);

useWorkItemBudgetStore.persist.rehydrate();
