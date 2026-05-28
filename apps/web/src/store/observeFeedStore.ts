/**
 * observeFeedStore — Slice 3.5 substrate for the OLOS spec §8.2 routing
 * contract ("verified or diverged field actions feed Observe"). Per project,
 * we keep a flat append-only list of `ObserveFeedEntry` rows, each tagged
 * with the parent objective id (the "domain" until Phase 4 introduces a
 * richer domain index). Verified tasks route via the action's
 * `observeFeedIds[]` when set, falling back to the parent objective.
 * Divergence captures always route via the parent objective.
 *
 * The store is intentionally lightweight — it is the WORKING surface the
 * Plan Revision Banner + the Phase 4 Observe Unified Land State consume,
 * NOT a re-implementation of the formal `ObservationRecord` schema. Phase 4
 * will normalise this into the canonical Observe substrate; today it just
 * needs to capture "did a verified/diverged event happen on this objective
 * with these proof items?" so the Plan-tier divergence indicator and
 * cyclical-review trigger have a real signal to read.
 *
 * Persistence: Zustand `persist` middleware, key `ogden-observe-feed`.
 * Registered as `versioned-blob` `byProject` in `syncManifest.ts`.
 * Rehydration logged via `rehydrateWithLogging` for parity with the other
 * Phase 3 stores.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import type {
  DivergenceType,
  FieldActionProofItem,
} from '@ogden/shared';

const PERSIST_KEY = 'ogden-observe-feed';

export type ObserveFeedSource = 'verified' | 'diverged';

/**
 * One row in the Observe feed. Denormalised on purpose — the source
 * FieldAction may be edited later, but the observation is a point-in-time
 * snapshot the way real Observe records work. `feedKey` is the routing
 * bucket (today: parent objectiveId; Phase 4: domain id from the proof
 * schema or the diverged objective's domain).
 */
export interface ObserveFeedEntry {
  id: string;
  projectId: string;
  feedKey: string;
  sourceType: ObserveFeedSource;
  sourceActionId: string;
  sourceActionTitle: string;
  /** Set only when `sourceType === 'diverged'`. */
  divergenceType?: DivergenceType;
  /** Set only when `sourceType === 'diverged'`. Free-text steward note. */
  divergenceNote?: string;
  /** Denormalised copy of the proof items at the moment of routing. */
  proofItems: FieldActionProofItem[];
  capturedAt: string;
  capturedBy?: string;
}

type ByProject = Record<string, ObserveFeedEntry[]>;

const EMPTY_ENTRIES: readonly ObserveFeedEntry[] = Object.freeze([]);

interface ObserveFeedState {
  byProject: ByProject;

  // --- selectors ---
  getByProject: (projectId: string) => readonly ObserveFeedEntry[];
  getByFeedKey: (
    projectId: string,
    feedKey: string,
  ) => readonly ObserveFeedEntry[];
  getByAction: (
    projectId: string,
    actionId: string,
  ) => readonly ObserveFeedEntry[];
  countByFeedKey: (projectId: string, feedKey: string) => number;
  countDivergencesByFeedKey: (
    projectId: string,
    feedKey: string,
  ) => number;

  // --- mutators ---
  appendObservation: (entry: ObserveFeedEntry) => void;
  clearForProject: (projectId: string) => void;
  /** Remove any entry sourced from the given action — used when the action
   *  is removed; keeps the feed from carrying orphan rows. */
  removeForAction: (projectId: string, actionId: string) => void;
}

export const useObserveFeedStore = create<ObserveFeedState>()(
  persist(
    (set, get) => ({
      byProject: {},

      getByProject: (projectId) =>
        get().byProject[projectId] ?? EMPTY_ENTRIES,

      getByFeedKey: (projectId, feedKey) =>
        (get().byProject[projectId] ?? []).filter((e) => e.feedKey === feedKey),

      getByAction: (projectId, actionId) =>
        (get().byProject[projectId] ?? []).filter(
          (e) => e.sourceActionId === actionId,
        ),

      countByFeedKey: (projectId, feedKey) =>
        (get().byProject[projectId] ?? []).reduce(
          (n, e) => n + (e.feedKey === feedKey ? 1 : 0),
          0,
        ),

      countDivergencesByFeedKey: (projectId, feedKey) =>
        (get().byProject[projectId] ?? []).reduce(
          (n, e) =>
            n + (e.feedKey === feedKey && e.sourceType === 'diverged' ? 1 : 0),
          0,
        ),

      appendObservation: (entry) =>
        set((s) => {
          const list = s.byProject[entry.projectId] ?? [];
          return {
            byProject: {
              ...s.byProject,
              [entry.projectId]: [...list, entry],
            },
          };
        }),

      clearForProject: (projectId) =>
        set((s) => {
          if (!(projectId in s.byProject)) return s;
          const { [projectId]: _dropped, ...rest } = s.byProject;
          return { byProject: rest };
        }),

      removeForAction: (projectId, actionId) =>
        set((s) => {
          const list = s.byProject[projectId];
          if (!list) return s;
          const next = list.filter((e) => e.sourceActionId !== actionId);
          if (next.length === list.length) return s;
          return {
            byProject: { ...s.byProject, [projectId]: next },
          };
        }),
    }),
    {
      name: PERSIST_KEY,
      version: 1,
      partialize: (state) => ({ byProject: state.byProject }),
    },
  ),
);

rehydrateWithLogging(useObserveFeedStore);

/** Stable accessor mirroring the field-action store pattern. */
export function selectObserveFeedForProject(
  state: ObserveFeedState,
  projectId: string,
): readonly ObserveFeedEntry[] {
  return state.byProject[projectId] ?? EMPTY_ENTRIES;
}
