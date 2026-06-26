/**
 * launchMilestoneStore -- persisted "milestone reached" state for the Act-side
 * Launch Progress panel. The Plan stage authored each Mode-5 (Launch
 * Preparation) objective's `progressTracking.milestones` (>=2 `{ metric, cadence }`
 * pairs) as DISPLAY-ONLY execution bookkeeping. This store is the live half: it
 * records, per project + objective + milestone, that the executing steward has
 * marked that milestone reached -- so the Act Launch Progress panel can show a
 * crossed-off checklist that survives reloads.
 *
 * Shape: byProject[projectId][objectiveId][milestoneKey] -> { reachedAt, reachedBy }.
 *   - `milestoneKey` is the milestone's authored `metric` string (distinct per
 *     objective in the catalogue), so the panel keys each row by `metric` and the
 *     store needs no separate slug -- one source of truth, no lookup mismatch.
 *   - `reachedAt` is an ISO timestamp; `reachedBy` defaults to 'act-tier' (a
 *     roster pick or the default -- NO free text, so there is NO covenant surface
 *     here, unlike the monitoring reading `note`).
 *
 * Display + record-only: marking a milestone reached NEVER gates or freezes the
 * Act loop, and NEVER mutates the catalogue objective. `markReached` is
 * idempotent; `clearReached` is remove-only (it strips exactly the one key, never
 * anything else). Client-only IndexedDB (`ogden-launch-milestone-progress`, v1),
 * registered in syncManifest (the coverage guard fails the build if it is not).
 * Mirrors the realityCheckStore / actMandateStore persist/rehydrate idiom.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One milestone's reached record. */
export interface MilestoneReached {
  /** ISO timestamp the milestone was marked reached. */
  reachedAt: string;
  /** Who marked it -- a roster pick or the 'act-tier' default. */
  reachedBy: string;
}

/** milestoneKey (the authored metric) -> reached record, for one objective. */
export type ObjectiveMilestones = Record<string, MilestoneReached>;

/** objectiveId -> its reached milestones, for one project. */
export type ProjectMilestones = Record<string, ObjectiveMilestones>;

/** Stable empty record returned when an objective has no reached milestones. */
export const EMPTY_OBJECTIVE_MILESTONES: ObjectiveMilestones = Object.freeze({});

interface LaunchMilestoneState {
  /** Reached-milestone state keyed by projectId -> objectiveId -> milestoneKey. */
  byProject: Record<string, ProjectMilestones>;

  /**
   * Mark ONE milestone reached. IDEMPOTENT: a second call for an already-reached
   * milestone is a no-op (the original reach time stands). `by` defaults to
   * 'act-tier', `at` to now; tests pass explicit values.
   */
  markReached(
    projectId: string,
    objectiveId: string,
    milestoneKey: string,
    by?: string,
    at?: string,
  ): void;

  /** Clear ONE milestone's reached state. Remove-only; no-op if not reached. */
  clearReached(projectId: string, objectiveId: string, milestoneKey: string): void;

  /** Drop the entire reached-milestone record for a project. */
  reset(projectId: string): void;
}

// ---------------------------------------------------------------------------
// Selectors (pure -- safe in render + unit-testable without the store)
// ---------------------------------------------------------------------------

/**
 * The reached-milestone map for ONE objective, defaulting to the stable frozen
 * empty record when absent. The frozen sentinel keeps the render selector
 * referentially stable while an objective has no reached milestones yet.
 */
export function milestonesFor(
  byProject: Record<string, ProjectMilestones>,
  projectId: string,
  objectiveId: string,
): ObjectiveMilestones {
  return byProject[projectId]?.[objectiveId] ?? EMPTY_OBJECTIVE_MILESTONES;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Immutably write one objective's milestone map back into byProject. */
function writeObjectiveMap(
  byProject: Record<string, ProjectMilestones>,
  projectId: string,
  objectiveId: string,
  objectiveMap: ObjectiveMilestones,
): Record<string, ProjectMilestones> {
  return {
    ...byProject,
    [projectId]: {
      ...(byProject[projectId] ?? {}),
      [objectiveId]: objectiveMap,
    },
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useLaunchMilestoneStore = create<LaunchMilestoneState>()(
  persist(
    (set) => ({
      byProject: {},

      markReached: (projectId, objectiveId, milestoneKey, by, at) =>
        set((s) => {
          const current = milestonesFor(s.byProject, projectId, objectiveId);
          if (milestoneKey in current) return s; // idempotent -- no-op
          const objectiveMap: ObjectiveMilestones = {
            ...current,
            [milestoneKey]: {
              reachedAt: at ?? new Date().toISOString(),
              reachedBy: by ?? 'act-tier',
            },
          };
          return {
            byProject: writeObjectiveMap(
              s.byProject,
              projectId,
              objectiveId,
              objectiveMap,
            ),
          };
        }),

      clearReached: (projectId, objectiveId, milestoneKey) =>
        set((s) => {
          const current = milestonesFor(s.byProject, projectId, objectiveId);
          if (!(milestoneKey in current)) return s; // no-op
          const { [milestoneKey]: _removed, ...rest } = current;
          return {
            byProject: writeObjectiveMap(
              s.byProject,
              projectId,
              objectiveId,
              rest,
            ),
          };
        }),

      reset: (projectId) =>
        set((s) => {
          if (!(projectId in s.byProject)) return s; // no-op
          const { [projectId]: _removed, ...rest } = s.byProject;
          return { byProject: rest };
        }),
    }),
    {
      name: 'ogden-launch-milestone-progress',
      version: 1,
      // Synced project data lives in IndexedDB like every other byProject store
      // (Node-safe; degrades to localStorage/null). No schema migrate at v1.
      // TRIP-WIRE: the next change to the persisted shape (the byProject
      // milestone map) MUST bump `version` AND add a `migrate(persisted, from)`.
      // persist drops any stored state whose version != current when no migrate
      // is supplied, so a silent shape change would discard recorded milestones.
      storage: idbPersistStorage,
      partialize: (state) => ({ byProject: state.byProject }),
    },
  ),
);

rehydrateWithLogging(useLaunchMilestoneStore);

// ---------------------------------------------------------------------------
// React hook -- the render-layer read seam
// ---------------------------------------------------------------------------

/**
 * Subscribe to the reached-milestone map for ONE objective. Returns the stored
 * inner record (or the frozen empty sentinel), which is referentially stable
 * until a mark/clear creates a new map -- so no memoisation is needed.
 */
export function useObjectiveMilestones(
  projectId: string,
  objectiveId: string,
): ObjectiveMilestones {
  return useLaunchMilestoneStore((s) =>
    milestonesFor(s.byProject, projectId, objectiveId),
  );
}
