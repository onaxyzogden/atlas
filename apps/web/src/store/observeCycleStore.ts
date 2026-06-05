/**
 * observeCycleStore — Phase 4 Slice 4.1 substrate for the Temporal
 * Layer + cycle annotations (Dashboard Spec §5 + Developer Spec §6).
 *
 * One cycle counter per (projectId, domainId). Cycle 0 is implicit
 * (no entry in the history log). `advanceCycle` is called by the
 * Phase 4 Slice 4.5 `cycleAdvance` helper from `confirmDecision` /
 * `acknowledgeRevise` mutators on the existing Phase 1
 * `cyclicalReviewStore`. New observation captures stamp with the
 * current cycleId so the Temporal Layer can draw cycle-boundary
 * annotations on the x-axis.
 *
 * The store carries the per-domain *current* cycleId AND the
 * append-only history of advance events together. The dashboard
 * reads `getCurrentCycle` on capture; reads `getHistory` on chart
 * render.
 *
 * Persistence: Zustand `persist` middleware, key `ogden-observe-
 * cycles`. Registered as `versioned-blob` `byProject` in
 * `syncManifest.ts`. Rehydration logged via `rehydrateWithLogging`.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import type {
  ObserveCycleAdvanceReason,
  ObserveCycleEntry,
  ObserveDomainCycleState,
  UniversalDomain,
} from '@ogden/shared';

const PERSIST_KEY = 'ogden-observe-cycles';

type PerDomain = Partial<Record<UniversalDomain, ObserveDomainCycleState>>;
type ByProject = Record<string, PerDomain>;

const EMPTY_DOMAIN_STATE: ObserveDomainCycleState = Object.freeze({
  currentCycleId: 0,
  history: Object.freeze([]) as unknown as ObserveCycleEntry[],
});

interface ObserveCycleState {
  byProject: ByProject;

  // --- selectors ---
  getCurrentCycle: (projectId: string, domainId: UniversalDomain) => number;
  getDomainState: (
    projectId: string,
    domainId: UniversalDomain,
  ) => ObserveDomainCycleState;
  getHistory: (
    projectId: string,
    domainId: UniversalDomain,
  ) => readonly ObserveCycleEntry[];

  // --- mutators ---
  /** Advance the cycle counter for (project, domain) and log the
   *  reason. Returns the new cycleId. */
  advanceCycle: (
    projectId: string,
    domainId: UniversalDomain,
    reason: ObserveCycleAdvanceReason,
    options?: {
      planObjectiveId?: string;
      advancedAt?: string;
    },
  ) => number;
  clearForProject: (projectId: string) => void;
}

export const useObserveCycleStore = create<ObserveCycleState>()(
  persist(
    (set, get) => ({
      byProject: {},

      getDomainState: (projectId, domainId) =>
        get().byProject[projectId]?.[domainId] ?? EMPTY_DOMAIN_STATE,

      getCurrentCycle: (projectId, domainId) =>
        get().byProject[projectId]?.[domainId]?.currentCycleId ?? 0,

      getHistory: (projectId, domainId) =>
        get().byProject[projectId]?.[domainId]?.history ??
        EMPTY_DOMAIN_STATE.history,

      advanceCycle: (projectId, domainId, reason, options) => {
        const advancedAt = options?.advancedAt ?? new Date().toISOString();
        let nextCycleId = 0;
        set((s) => {
          const perDomain: PerDomain = { ...(s.byProject[projectId] ?? {}) };
          const prev = perDomain[domainId] ?? EMPTY_DOMAIN_STATE;
          nextCycleId = prev.currentCycleId + 1;
          const entry: ObserveCycleEntry = {
            domainId,
            cycleId: nextCycleId,
            advancedAt,
            reason,
            ...(options?.planObjectiveId
              ? { planObjectiveId: options.planObjectiveId }
              : {}),
          };
          perDomain[domainId] = {
            currentCycleId: nextCycleId,
            history: [...prev.history, entry],
          };
          return {
            byProject: { ...s.byProject, [projectId]: perDomain },
          };
        });
        return nextCycleId;
      },

      clearForProject: (projectId) =>
        set((s) => {
          if (!(projectId in s.byProject)) return s;
          const { [projectId]: _dropped, ...rest } = s.byProject;
          return { byProject: rest };
        }),
    }),
    {
      name: PERSIST_KEY,
      version: 1,
      partialize: (state) => ({ byProject: state.byProject }),
    },
  ),
);

rehydrateWithLogging(useObserveCycleStore);
