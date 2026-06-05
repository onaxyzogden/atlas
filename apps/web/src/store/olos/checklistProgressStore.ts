/**
 * checklistProgressStore — persisted per-item completion progress.
 *
 * Checklist items don't currently live on the record schema. This store
 * tracks which items the steward has ticked off for an Objective
 * (projectId × objectiveId × itemId). Status / evidence / decisions still
 * land on the record stores; this is purely the completion ledger.
 *
 * Phase 1.5 ships local persistence; Phase 2.4 syncs through the
 * checklist-item join table once the API surface is up.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from '../persistRehydrate.js';

const PERSIST_KEY = 'ogden-olos-checklist-progress';

type ItemIds = string[];
type ByObjective = Record<string, ItemIds>;

/** Stable sentinel returned when no progress exists yet — prevents
 *  zustand selector identity churn when used directly in a component. */
const EMPTY_ITEM_IDS: ItemIds = Object.freeze([]) as unknown as ItemIds;

interface ChecklistProgressState {
  byProject: Record<string, ByObjective>;

  /** Read all completed item ids for an Objective. */
  getCompletedItemIds: (projectId: string, objectiveId: string) => ItemIds;
  /** Test whether an item is completed. */
  isCompleted: (
    projectId: string,
    objectiveId: string,
    itemId: string,
  ) => boolean;
  /** Toggle the completion of one item. */
  toggleItem: (
    projectId: string,
    objectiveId: string,
    itemId: string,
  ) => void;
  /** Set the full set explicitly (used when seeding from API). */
  setItems: (
    projectId: string,
    objectiveId: string,
    itemIds: readonly string[],
  ) => void;
  /** Clear progress for an Objective. */
  clearForObjective: (projectId: string, objectiveId: string) => void;
}

export const useChecklistProgressStore = create<ChecklistProgressState>()(
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

      setItems: (projectId, objectiveId, itemIds) =>
        set((s) => ({
          byProject: {
            ...s.byProject,
            [projectId]: {
              ...(s.byProject[projectId] ?? {}),
              [objectiveId]: [...itemIds],
            },
          },
        })),

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

rehydrateWithLogging(useChecklistProgressStore);
