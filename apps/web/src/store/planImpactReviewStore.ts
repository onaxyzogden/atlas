/**
 * planImpactReviewStore — per-project, persisted review state for Plan Impact
 * Flags. The flags themselves are DERIVED from recorded observation needs
 * (`v3/plan/impact/planImpactFlag.ts`); this store owns only the *mutable* half
 * a steward produces while triaging: the lifecycle status, the recorded
 * decision, and a free-text note. Keyed `byProject[projectId][flagId]`, where
 * `flagId` IS the source observation-need id.
 *
 * Mirrors the catalog/run split of `observationNeedStore` (and the compass
 * evidence model). A decision here only records INTENT — Phase 1 does not yet
 * mutate the plan, create Act work, or pause anything.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import {
  emptyPlanReviewRun,
  type PlanReviewDecision,
  type PlanReviewRun,
} from '../v3/plan/impact/planImpactFlag.js';

type ReviewsByFlag = Record<string, PlanReviewRun>;

const PERSIST_KEY = 'ogden-plan-impact-reviews';

interface PlanImpactReviewState {
  byProject: Record<string, ReviewsByFlag>;

  /** Read a review, falling back to a fresh empty run (never undefined). */
  getReview: (projectId: string, flagId: string) => PlanReviewRun;
  /** Record a decision — marks the flag reviewed and stamps decidedAt. */
  setDecision: (
    projectId: string,
    flagId: string,
    decision: PlanReviewDecision,
  ) => void;
  /** Set the free-text note. */
  setNote: (projectId: string, flagId: string, note: string) => void;
  /** Reopen a reviewed flag — back to open, clears the recorded decision. */
  reopen: (projectId: string, flagId: string) => void;
}

const now = () => new Date().toISOString();

export const usePlanImpactReviewStore = create<PlanImpactReviewState>()(
  persist(
    (set, get) => {
      /** Apply a mutation to one flag's review, stamping updatedAt. */
      const patch = (
        projectId: string,
        flagId: string,
        fn: (run: PlanReviewRun) => PlanReviewRun,
      ) =>
        set((s) => {
          const project = s.byProject[projectId] ?? {};
          const existing = project[flagId] ?? emptyPlanReviewRun();
          return {
            byProject: {
              ...s.byProject,
              [projectId]: {
                ...project,
                [flagId]: { ...fn(existing), updatedAt: now() },
              },
            },
          };
        });

      return {
        byProject: {},

        getReview: (projectId, flagId) =>
          get().byProject[projectId]?.[flagId] ?? emptyPlanReviewRun(),

        setDecision: (projectId, flagId, decision) =>
          patch(projectId, flagId, (run) => ({
            ...run,
            decision,
            status: 'reviewed',
            decidedAt: now(),
          })),

        setNote: (projectId, flagId, note) =>
          patch(projectId, flagId, (run) => ({ ...run, note })),

        reopen: (projectId, flagId) =>
          patch(projectId, flagId, (run) => ({
            ...run,
            status: 'open',
            decision: undefined,
            decidedAt: undefined,
          })),
      };
    },
    {
      name: PERSIST_KEY,
      version: 1,
      partialize: (state) => ({ byProject: state.byProject }),
    },
  ),
);

rehydrateWithLogging(usePlanImpactReviewStore);
