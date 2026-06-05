/**
 * planDecisionStore — per-project, persisted Decision Log (Phase 2). Unlike
 * `planImpactReviewStore` (which holds only the mutable half of a derived flag),
 * a decision is authored whole, so this store owns complete `PlanDecision`
 * records keyed `byProject[projectId][decisionId]` — mirroring the
 * steward-raised needs in `observationNeedStore.createdByProject`.
 *
 * A decision here RECORDS INTENT only — Phase 2 does not generate Act Work
 * Packages, mutate a Plan module, or pause anything (Phase 3).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';
import {
  buildSupersedingDraft,
  type PlanDecision,
  type PlanDecisionStatus,
} from '../v3/plan/decisions/planDecision.js';

type DecisionsById = Record<string, PlanDecision>;

const PERSIST_KEY = 'ogden-plan-decisions';

interface PlanDecisionState {
  byProject: Record<string, DecisionsById>;

  /** Read one decision, or undefined if it doesn't exist. */
  getDecision: (projectId: string, id: string) => PlanDecision | undefined;
  /** Insert an authored decision (blank draft or promoted-from-flag). */
  create: (projectId: string, decision: PlanDecision) => void;
  /** Patch fields on an existing decision, stamping updatedAt. */
  update: (
    projectId: string,
    id: string,
    patch: Partial<PlanDecision>,
  ) => void;
  /** Set lifecycle status; stamps decidedAt for accepted/rejected. */
  setStatus: (
    projectId: string,
    id: string,
    status: PlanDecisionStatus,
  ) => void;
  /** Delete a decision (UI only offers this for drafts). */
  remove: (projectId: string, id: string) => void;
  /** Mark `oldId` superseded and create a fresh draft replacing it; returns the new id. */
  supersede: (projectId: string, oldId: string) => string | undefined;
}

const now = () => new Date().toISOString();

export const usePlanDecisionStore = create<PlanDecisionState>()(
  persist(
    (set, get) => {
      const setOne = (
        projectId: string,
        id: string,
        decision: PlanDecision,
      ) =>
        set((s) => {
          const project = s.byProject[projectId] ?? {};
          return {
            byProject: {
              ...s.byProject,
              [projectId]: { ...project, [id]: decision },
            },
          };
        });

      return {
        byProject: {},

        getDecision: (projectId, id) => get().byProject[projectId]?.[id],

        create: (projectId, decision) =>
          setOne(projectId, decision.id, decision),

        update: (projectId, id, patch) => {
          const existing = get().byProject[projectId]?.[id];
          if (!existing) return;
          setOne(projectId, id, { ...existing, ...patch, updatedAt: now() });
        },

        setStatus: (projectId, id, status) => {
          const existing = get().byProject[projectId]?.[id];
          if (!existing) return;
          const stamp = now();
          setOne(projectId, id, {
            ...existing,
            status,
            updatedAt: stamp,
            ...(status === 'accepted' || status === 'rejected'
              ? { decidedAt: stamp }
              : {}),
          });
        },

        remove: (projectId, id) =>
          set((s) => {
            const project = s.byProject[projectId];
            if (!project || !(id in project)) return s;
            const next = { ...project };
            delete next[id];
            return { byProject: { ...s.byProject, [projectId]: next } };
          }),

        supersede: (projectId, oldId) => {
          const existing = get().byProject[projectId]?.[oldId];
          if (!existing) return undefined;
          const stamp = now();
          const draft = buildSupersedingDraft(existing);
          set((s) => {
            const project = s.byProject[projectId] ?? {};
            return {
              byProject: {
                ...s.byProject,
                [projectId]: {
                  ...project,
                  [oldId]: {
                    ...existing,
                    status: 'superseded',
                    updatedAt: stamp,
                  },
                  [draft.id]: draft,
                },
              },
            };
          });
          return draft.id;
        },
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

rehydrateWithLogging(usePlanDecisionStore);
