/**
 * planConflictReviewStore — per-project, persisted triage state for Plan
 * Conflicts (Phase 5a). The conflicts themselves are DERIVED from recorded
 * observation needs paired against the Decision Log
 * (`v3/plan/conflicts/planConflict.ts`); this store owns only the *mutable* half
 * a steward produces while triaging: the lifecycle status, the recorded
 * resolution, and a free-text note. Keyed `byProject[projectId][conflictId]`,
 * where `conflictId` IS the composite `${observationId}:${decisionId}`.
 *
 * Mirrors the catalog/run split of `planImpactReviewStore` (Phase 1). A
 * resolution here only records INTENT — Phase 5a does not mutate the plan,
 * supersede a decision, or create work.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import {
  emptyPlanConflictRun,
  type PlanConflictResolution,
  type PlanConflictRun,
} from '../v3/plan/conflicts/planConflict.js';

type ReviewsByConflict = Record<string, PlanConflictRun>;

const PERSIST_KEY = 'ogden-plan-conflict-reviews';

interface PlanConflictReviewState {
  byProject: Record<string, ReviewsByConflict>;

  /** Read a review, falling back to a fresh empty run (never undefined). */
  getReview: (projectId: string, conflictId: string) => PlanConflictRun;
  /** Record a resolution — marks the conflict reviewed and stamps decidedAt. */
  setResolution: (
    projectId: string,
    conflictId: string,
    resolution: PlanConflictResolution,
  ) => void;
  /** Set the free-text note. */
  setNote: (projectId: string, conflictId: string, note: string) => void;
  /** Reopen a reviewed conflict — back to open, clears the resolution. */
  reopen: (projectId: string, conflictId: string) => void;
}

const now = () => new Date().toISOString();

export const usePlanConflictReviewStore = create<PlanConflictReviewState>()(
  persist(
    (set, get) => {
      /** Apply a mutation to one conflict's review, stamping updatedAt. */
      const patch = (
        projectId: string,
        conflictId: string,
        fn: (run: PlanConflictRun) => PlanConflictRun,
      ) =>
        set((s) => {
          const project = s.byProject[projectId] ?? {};
          const existing = project[conflictId] ?? emptyPlanConflictRun();
          return {
            byProject: {
              ...s.byProject,
              [projectId]: {
                ...project,
                [conflictId]: { ...fn(existing), updatedAt: now() },
              },
            },
          };
        });

      return {
        byProject: {},

        getReview: (projectId, conflictId) =>
          get().byProject[projectId]?.[conflictId] ?? emptyPlanConflictRun(),

        setResolution: (projectId, conflictId, resolution) =>
          patch(projectId, conflictId, (run) => ({
            ...run,
            resolution,
            status: 'reviewed',
            decidedAt: now(),
          })),

        setNote: (projectId, conflictId, note) =>
          patch(projectId, conflictId, (run) => ({ ...run, note })),

        reopen: (projectId, conflictId) =>
          patch(projectId, conflictId, (run) => ({
            ...run,
            status: 'open',
            resolution: undefined,
            decidedAt: undefined,
          })),
      };
    },
    {
      name: PERSIST_KEY,
      // Durable IndexedDB backend (Phase 1) — see indexedDBStorage.ts.
      storage: idbPersistStorage,
      version: 1,
      partialize: (state) => ({ byProject: state.byProject }),
    },
  ),
);

rehydrateWithLogging(usePlanConflictReviewStore);
