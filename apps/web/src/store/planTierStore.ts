/**
 * planTierStore — Plan-tier checklist progress (Slice 1.7).
 *
 * Tracks which checklist items the steward has ticked for each
 * (projectId, objectiveId) pair. Status / decision records still live on
 * other stores; this is purely the completion ledger for the YOUR
 * DECISIONS section of the ObjectiveDetailPanel.
 *
 * Kept separate from the existing OLOS `checklistProgressStore` because
 * the Plan-tier and OLOS-universal objective catalogues are distinct
 * data sources with disjoint item-id namespaces — sharing one store
 * would risk seed drift and force a schema couple that the spec
 * explicitly avoids (see plan §"New file: planTierStore.ts" — separate
 * concern from `planVersionStore`).
 *
 * Item ids are globally unique within `PLAN_TIER_OBJECTIVES`, so
 * `getProgressMap(projectId)` collapses the nested record into the flat
 * `Record<itemId, boolean>` shape that the status engine
 * (`computeAllObjectiveStatuses`) consumes.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';

const PERSIST_KEY = 'ogden-plan-tier-progress';

type ItemIds = readonly string[];
type ByObjective = Readonly<Record<string, ItemIds>>;

const EMPTY_ITEM_IDS: ItemIds = Object.freeze([]);
const EMPTY_BY_OBJECTIVE: ByObjective = Object.freeze({});

interface PlanTierProgressState {
  byProject: Record<string, ByObjective>;

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
}

export const usePlanTierProgressStore = create<PlanTierProgressState>()(
  persist(
    (set, get) => ({
      byProject: {},

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
    }),
    {
      name: PERSIST_KEY,
      version: 1,
      partialize: (state) => ({ byProject: state.byProject }),
    },
  ),
);

rehydrateWithLogging(usePlanTierProgressStore);

/**
 * Stable accessor for the per-project map of objective → completed item ids.
 * Returns a frozen empty record when the project has no progress yet so
 * callers using it as a hook selector see a stable identity.
 */
export function selectProjectProgress(
  state: PlanTierProgressState,
  projectId: string,
): ByObjective {
  return state.byProject[projectId] ?? EMPTY_BY_OBJECTIVE;
}

/**
 * Flatten the nested `byProject -> objectiveId -> ItemIds` shape into the
 * `Record<itemId, boolean>` shape expected by
 * `computeAllObjectiveStatuses`. Item ids are globally unique in
 * `PLAN_TIER_OBJECTIVES`, so cross-objective collapse is lossless.
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
