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
/** Per-objective steward-entered parameter values, keyed by parameter item id. */
type ValuesByObjective = Readonly<Record<string, Readonly<Record<string, string>>>>;

const EMPTY_ITEM_IDS: ItemIds = Object.freeze([]);
const EMPTY_BY_OBJECTIVE: ByObjective = Object.freeze({});
const EMPTY_STRATUM_IDS: StratumIds = Object.freeze([]);
const EMPTY_VALUES: Readonly<Record<string, string>> = Object.freeze({});

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
  /**
   * Steward-entered operating-threshold parameter values (§10.1 Integration),
   * keyed project -> objective -> parameter-item-id -> value. A PARALLEL slice
   * to `byProject`: it holds free-text parameter entries (the protocol token
   * source) and is deliberately kept separate from checklist completion so the
   * status engine (`toProgressMap`) is never touched. Empty until a steward
   * fills the S6 Integration parameter group.
   */
  valuesByProject: Record<string, ValuesByObjective>;

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
  /**
   * Mark a checklist item as complete. Idempotent — no-op when the item
   * is already in the completed list. Unlike `toggleItem`, this never
   * removes a completed item, making it safe to call from form-save
   * handlers (e.g. s1-vision form capture) without accidentally
   * unchecking a manually-ticked item.
   */
  setItemComplete: (
    projectId: string,
    objectiveId: string,
    itemId: string,
  ) => void;
  /** Clear progress for one objective (used by cyclical-review revisions). */
  clearForObjective: (projectId: string, objectiveId: string) => void;
  /**
   * Discard ALL progress for the given objective ids in a project: clears the
   * completed-item list (`byProject`), Deferred membership
   * (`deferredByProject`), and parameter values (`valuesByProject`) for each
   * id. Used by the primary-type-change flow when a switch orphans
   * old-type-unique objectives. No-op for ids the project has no progress
   * under, and a stable no-op (returns the same state) when `objectiveIds` is
   * empty. Does NOT touch `celebratedByProject` (a stratum-unlock log, not
   * objective progress).
   */
  discardObjectivesProgress: (
    projectId: string,
    objectiveIds: readonly string[],
  ) => void;
  /**
   * Deep-copy every per-project progress slice (completed items, celebrated
   * strata, Deferred objectives, parameter values) from `sourceId` to
   * `targetId`. Makes a project-clone preserve the steward's checklist work —
   * `duplicateProject` / `cascadeCloneProject` copy design-intent entities but
   * NOT stratum progress. Overwrites any existing progress under `targetId`;
   * a stable no-op when the source has no progress in any slice.
   */
  cloneForProject: (sourceId: string, targetId: string) => void;

  /** True if this project has already celebrated the stratum unlock. */
  hasCelebratedStratum: (projectId: string, stratumId: string) => boolean;
  /** Mark a stratum as celebrated for this project (idempotent). */
  markStratumCelebrated: (projectId: string, stratumId: string) => void;

  /** Mark an objective Deferred for this project (idempotent, append-only). */
  deferObjective: (projectId: string, objectiveId: string) => void;
  /** Un-defer (Restore) an objective for this project (idempotent). */
  undeferObjective: (projectId: string, objectiveId: string) => void;

  /**
   * Set one parameter value for an objective. An empty/whitespace-only value is
   * stored as-is (the `buildProtocolOutputs` derive step trims + omits blanks);
   * callers may pass `''` to clear a field.
   */
  setParameterValue: (
    projectId: string,
    objectiveId: string,
    itemId: string,
    value: string,
  ) => void;
  /** Read the parameter-value map for one objective (itemId -> value). */
  getParameterValues: (
    projectId: string,
    objectiveId: string,
  ) => Readonly<Record<string, string>>;
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
 *  - v4 -> v5: `valuesByProject` was added (§10.1 operating-threshold parameter
 *    values, the protocol token source); backfill `{}`. Purely additive — never
 *    touches `byProject`/`celebratedByProject`/`deferredByProject`.
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
  const valuesByProject: Record<string, ValuesByObjective> =
    safe.valuesByProject ?? {};

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
    valuesByProject,
  } as PlanStratumProgressState;
}

export const usePlanStratumProgressStore = create<PlanStratumProgressState>()(
  persist(
    (set, get) => ({
      byProject: {},
      celebratedByProject: {},
      deferredByProject: {},
      valuesByProject: {},

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

      setItemComplete: (projectId, objectiveId, itemId) =>
        set((s) => {
          const project = s.byProject[projectId] ?? {};
          const current = project[objectiveId] ?? [];
          if (current.includes(itemId)) return s; // already complete -- no-op
          return {
            byProject: {
              ...s.byProject,
              [projectId]: {
                ...project,
                [objectiveId]: [...current, itemId],
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

      discardObjectivesProgress: (projectId, objectiveIds) =>
        set((s) => {
          if (objectiveIds.length === 0) return s;
          const drop = new Set(objectiveIds);

          // byProject — drop the orphaned objectives' completed-item lists.
          let nextByProject = s.byProject;
          const project = s.byProject[projectId];
          if (project && Object.keys(project).some((id) => drop.has(id))) {
            const rest: Record<string, ItemIds> = {};
            for (const [objId, itemIds] of Object.entries(project)) {
              if (!drop.has(objId)) rest[objId] = itemIds;
            }
            nextByProject = { ...s.byProject, [projectId]: rest };
          }

          // valuesByProject — drop the orphaned objectives' parameter values.
          let nextValues = s.valuesByProject;
          const values = s.valuesByProject[projectId];
          if (values && Object.keys(values).some((id) => drop.has(id))) {
            const rest: Record<string, Readonly<Record<string, string>>> = {};
            for (const [objId, v] of Object.entries(values)) {
              if (!drop.has(objId)) rest[objId] = v;
            }
            nextValues = { ...s.valuesByProject, [projectId]: rest };
          }

          // deferredByProject — drop any Deferred membership for these ids.
          let nextDeferred = s.deferredByProject;
          const deferred = s.deferredByProject[projectId];
          if (deferred && deferred.some((id) => drop.has(id))) {
            nextDeferred = {
              ...s.deferredByProject,
              [projectId]: deferred.filter((id) => !drop.has(id)),
            };
          }

          return {
            byProject: nextByProject,
            valuesByProject: nextValues,
            deferredByProject: nextDeferred,
          };
        }),

      cloneForProject: (sourceId, targetId) =>
        set((s) => {
          const srcBy = s.byProject[sourceId];
          const srcCelebrated = s.celebratedByProject[sourceId];
          const srcDeferred = s.deferredByProject[sourceId];
          const srcValues = s.valuesByProject[sourceId];
          if (!srcBy && !srcCelebrated && !srcDeferred && !srcValues) return s;

          // Deep-copy each slice so the clone is independent of the source.
          const next: Partial<PlanStratumProgressState> = {};
          if (srcBy) {
            const copy: Record<string, ItemIds> = {};
            for (const [objId, itemIds] of Object.entries(srcBy)) {
              copy[objId] = [...itemIds];
            }
            next.byProject = { ...s.byProject, [targetId]: copy };
          }
          if (srcCelebrated) {
            next.celebratedByProject = {
              ...s.celebratedByProject,
              [targetId]: [...srcCelebrated],
            };
          }
          if (srcDeferred) {
            next.deferredByProject = {
              ...s.deferredByProject,
              [targetId]: [...srcDeferred],
            };
          }
          if (srcValues) {
            const copy: Record<string, Readonly<Record<string, string>>> = {};
            for (const [objId, v] of Object.entries(srcValues)) {
              copy[objId] = { ...v };
            }
            next.valuesByProject = { ...s.valuesByProject, [targetId]: copy };
          }
          return next;
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

      setParameterValue: (projectId, objectiveId, itemId, value) =>
        set((s) => {
          const project = s.valuesByProject[projectId] ?? {};
          const objective = project[objectiveId] ?? {};
          return {
            valuesByProject: {
              ...s.valuesByProject,
              [projectId]: {
                ...project,
                [objectiveId]: { ...objective, [itemId]: value },
              },
            },
          };
        }),

      getParameterValues: (projectId, objectiveId) =>
        get().valuesByProject[projectId]?.[objectiveId] ?? EMPTY_VALUES,
    }),
    {
      name: PERSIST_KEY,
      version: 5,
      partialize: (state) => ({
        byProject: state.byProject,
        celebratedByProject: state.celebratedByProject,
        deferredByProject: state.deferredByProject,
        valuesByProject: state.valuesByProject,
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
 * Stable accessor for one objective's parameter-value map (itemId -> value).
 * Returns a frozen empty record when the objective has no entries yet so a
 * hook selector keeps a stable identity (Zustand v5 — avoid inline filters).
 */
export function selectParameterValues(
  state: PlanStratumProgressState,
  projectId: string,
  objectiveId: string,
): Readonly<Record<string, string>> {
  return state.valuesByProject[projectId]?.[objectiveId] ?? EMPTY_VALUES;
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
