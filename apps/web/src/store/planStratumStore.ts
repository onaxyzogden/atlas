/**
 * planStratumStore — Plan-stratum checklist progress (Slice 1.7) +
 * stratum-unlock celebration log (Slice 1.10).
 *
 * Tracks which checklist items the steward has ticked for each
 * (projectId, objectiveId) pair, plus the set of stratum ids that have
 * already triggered a `StratumUnlockCelebration` for each project so the
 * modal never fires twice for the same unlock.
 *
 * Kept separate from the existing OLOS `checklistProgressStore` because
 * the Plan-stratum and OLOS-universal objective catalogues are distinct
 * data sources with disjoint item-id namespaces — sharing one store
 * would risk seed drift and force a schema couple that the spec
 * explicitly avoids (see plan §"New file: planStratumStore.ts" — separate
 * concern from `planVersionStore`).
 *
 * Item ids are globally unique across every objective catalogue (the
 * universal set, each per-type catalogue, and injected patch items - the
 * Sub-slice C id-namespacing rubric guarantees this), so
 * `getProgressMap(projectId)` collapses the nested record into the flat
 * `Record<itemId, boolean>` shape that the status engine
 * (`computeAllObjectiveStatuses`) consumes.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { remapId, remapTierId } from '@ogden/shared';

const PERSIST_KEY = 'ogden-plan-tier-progress';

type ItemIds = readonly string[];
type ByObjective = Readonly<Record<string, ItemIds>>;
type StratumIds = readonly string[];

const EMPTY_ITEM_IDS: ItemIds = Object.freeze([]);
const EMPTY_BY_OBJECTIVE: ByObjective = Object.freeze({});
const EMPTY_STRATUM_IDS: StratumIds = Object.freeze([]);

interface PlanStratumProgressState {
  byProject: Record<string, ByObjective>;
  /** Stratum ids that have already shown the unlock celebration, keyed by project. */
  celebratedByProject: Record<string, StratumIds>;
  /**
   * Objective ids the steward has explicitly marked Deferred, keyed by project.
   * Deferred is the "mark as Deferred instead" alternative to a blocked
   * secondary removal (spec section 8.3): the objective is shelved (progress
   * preserved) and the status engine renders it `deferred`. Threaded into
   * `computeAllObjectiveStatuses` via `toDeferredSet(selectDeferredObjectives())`.
   */
  deferredByProject: Record<string, StratumIds>;

  /** Read all completed item ids for one objective in a project. */
  getCompletedItemIds: (projectId: string, objectiveId: string) => ItemIds;
  /** Test whether a single checklist item is completed. */
  isCompleted: (
    projectId: string,
    objectiveId: string,
    itemId: string,
  ) => boolean;
  /**
   * Toggle the completion of one checklist item. Stable callback so
   * components can pass it directly to a checkbox onChange without
   * triggering a Zustand selector churn cascade.
   */
  toggleItem: (
    projectId: string,
    objectiveId: string,
    itemId: string,
  ) => void;
  /** Clear progress for one objective (used by cyclical-review revisions). */
  clearForObjective: (projectId: string, objectiveId: string) => void;

  /** True if this project has already celebrated the stratum unlock. */
  hasCelebratedStratum: (projectId: string, stratumId: string) => boolean;
  /** Mark a stratum as celebrated for this project (idempotent). */
  markStratumCelebrated: (projectId: string, stratumId: string) => void;

  /** Mark an objective Deferred for this project (idempotent, append-only). */
  deferObjective: (projectId: string, objectiveId: string) => void;
  /** Un-defer (Restore) an objective for this project (idempotent). */
  undeferObjective: (projectId: string, objectiveId: string) => void;
}

/**
 * persist `migrate`. Two historical steps compose so any older persisted
 * version lands on the current shape:
 *  - v1 -> v2: `celebratedByProject` was added (Slice 1.10); backfill `{}`.
 *  - v2 -> v3: the Plan tier spine was renamed to Stratum 1-7. Renumber the
 *    objective-id KEYS and the completed item-id VALUES under `byProject`
 *    (t{n}- -> s{n+1}-, via `remapId`) and the full tier slugs in
 *    `celebratedByProject` (via `remapTierId`). projectId keys are opaque and
 *    left untouched. Idempotent on v3+ input — the slug remaps are no-ops on
 *    already-renumbered s{n} ids.
 *  - v3 -> v4: `deferredByProject` was added (Deferred objective state, spec
 *    section 8.3); backfill `{}`. Purely additive.
 * Exported for the round-trip migration test.
 */
export function migratePlanStratumProgress(
  persistedState: unknown,
  version: number,
): PlanStratumProgressState {
  const safe =
    (persistedState as Partial<PlanStratumProgressState> | null) ?? {};
  let byProject: Record<string, ByObjective> = safe.byProject ?? {};
  let celebratedByProject: Record<string, StratumIds> =
    safe.celebratedByProject ?? {};
  const deferredByProject: Record<string, StratumIds> =
    safe.deferredByProject ?? {};

  if (version < 3) {
    const remappedByProject: Record<string, ByObjective> = {};
    for (const [projectId, byObjective] of Object.entries(byProject)) {
      const remappedObjectives: Record<string, ItemIds> = {};
      for (const [objectiveId, itemIds] of Object.entries(byObjective ?? {})) {
        remappedObjectives[remapId(objectiveId)] = (itemIds ?? []).map((id) =>
          remapId(id),
        );
      }
      remappedByProject[projectId] = remappedObjectives;
    }
    byProject = remappedByProject;

    const remappedCelebrated: Record<string, StratumIds> = {};
    for (const [projectId, tierIds] of Object.entries(celebratedByProject)) {
      remappedCelebrated[projectId] = (tierIds ?? []).map((id) =>
        remapTierId(id),
      );
    }
    celebratedByProject = remappedCelebrated;
  }

  return {
    ...safe,
    byProject,
    celebratedByProject,
    deferredByProject,
  } as PlanStratumProgressState;
}

export const usePlanStratumProgressStore = create<PlanStratumProgressState>()(
  persist(
    (set, get) => ({
      byProject: {},
      celebratedByProject: {},
      deferredByProject: {},

      getCompletedItemIds: (projectId, objectiveId) =>
        get().byProject[projectId]?.[objectiveId] ?? EMPTY_ITEM_IDS,

      isCompleted: (projectId, objectiveId, itemId) =>
        (get().byProject[projectId]?.[objectiveId] ?? []).includes(itemId),

      toggleItem: (projectId, objectiveId, itemId) =>
        set((s) => {
          const project = s.byProject[projectId] ?? {};
          const current = project[objectiveId] ?? [];
          const next = current.includes(itemId)
            ? current.filter((id) => id !== itemId)
            : [...current, itemId];
          return {
            byProject: {
              ...s.byProject,
              [projectId]: {
                ...project,
                [objectiveId]: next,
              },
            },
          };
        }),

      clearForObjective: (projectId, objectiveId) =>
        set((s) => {
          const project = s.byProject[projectId];
          if (!project) return s;
          const { [objectiveId]: _dropped, ...rest } = project;
          return {
            byProject: { ...s.byProject, [projectId]: rest },
          };
        }),

      hasCelebratedStratum: (projectId, stratumId) =>
        (get().celebratedByProject[projectId] ?? EMPTY_STRATUM_IDS).includes(
          stratumId,
        ),

      markStratumCelebrated: (projectId, stratumId) =>
        set((s) => {
          const existing = s.celebratedByProject[projectId] ?? [];
          if (existing.includes(stratumId)) return s;
          return {
            celebratedByProject: {
              ...s.celebratedByProject,
              [projectId]: [...existing, stratumId],
            },
          };
        }),

      deferObjective: (projectId, objectiveId) =>
        set((s) => {
          const existing = s.deferredByProject[projectId] ?? [];
          if (existing.includes(objectiveId)) return s;
          return {
            deferredByProject: {
              ...s.deferredByProject,
              [projectId]: [...existing, objectiveId],
            },
          };
        }),

      undeferObjective: (projectId, objectiveId) =>
        set((s) => {
          const existing = s.deferredByProject[projectId];
          if (!existing || !existing.includes(objectiveId)) return s;
          return {
            deferredByProject: {
              ...s.deferredByProject,
              [projectId]: existing.filter((id) => id !== objectiveId),
            },
          };
        }),
    }),
    {
      name: PERSIST_KEY,
      version: 4,
      partialize: (state) => ({
        byProject: state.byProject,
        celebratedByProject: state.celebratedByProject,
        deferredByProject: state.deferredByProject,
      }),
      migrate: migratePlanStratumProgress,
    },
  ),
);

rehydrateWithLogging(usePlanStratumProgressStore);

/**
 * Stable accessor for the per-project map of objective → completed item ids.
 * Returns a frozen empty record when the project has no progress yet so
 * callers using it as a hook selector see a stable identity.
 */
export function selectProjectProgress(
  state: PlanStratumProgressState,
  projectId: string,
): ByObjective {
  return state.byProject[projectId] ?? EMPTY_BY_OBJECTIVE;
}

/**
 * Stable accessor for the stratum ids this project has already celebrated.
 * Returns a frozen empty array when nothing has been celebrated yet so
 * the selector identity stays stable.
 */
export function selectCelebratedStrata(
  state: PlanStratumProgressState,
  projectId: string,
): StratumIds {
  return state.celebratedByProject[projectId] ?? EMPTY_STRATUM_IDS;
}

/**
 * Stable accessor for the objective ids this project has marked Deferred.
 * Returns a frozen empty array when nothing is deferred so the selector
 * identity stays stable.
 */
export function selectDeferredObjectives(
  state: PlanStratumProgressState,
  projectId: string,
): StratumIds {
  return state.deferredByProject[projectId] ?? EMPTY_STRATUM_IDS;
}

/**
 * Build the `ReadonlySet<string>` of deferred objective ids that
 * `computeAllObjectiveStatuses` / `computeObjectiveStatus` consume as their
 * `deferredIds` argument.
 */
export function toDeferredSet(ids: StratumIds): ReadonlySet<string> {
  return new Set(ids);
}

/**
 * Flatten the nested `byProject -> objectiveId -> ItemIds` shape into the
 * `Record<itemId, boolean>` shape expected by
 * `computeAllObjectiveStatuses`. Item ids are globally unique across all
 * objective catalogues + injected patch items, so cross-objective collapse
 * is lossless.
 */
export function toProgressMap(
  byObjective: ByObjective,
): Readonly<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  for (const itemIds of Object.values(byObjective)) {
    for (const id of itemIds) out[id] = true;
  }
  return out;
}
