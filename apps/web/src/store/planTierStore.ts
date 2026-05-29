/**
 * planTierStore — Plan-tier checklist progress (Slice 1.7) +
 * tier-unlock celebration log (Slice 1.10).
 *
 * Tracks which checklist items the steward has ticked for each
 * (projectId, objectiveId) pair, plus the set of tier ids that have
 * already triggered a `TierUnlockCelebration` for each project so the
 * modal never fires twice for the same unlock.
 *
 * Kept separate from the existing OLOS `checklistProgressStore` because
 * the Plan-tier and OLOS-universal objective catalogues are distinct
 * data sources with disjoint item-id namespaces — sharing one store
 * would risk seed drift and force a schema couple that the spec
 * explicitly avoids (see plan §"New file: planTierStore.ts" — separate
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

const PERSIST_KEY = 'ogden-plan-tier-progress';

type ItemIds = readonly string[];
type ByObjective = Readonly<Record<string, ItemIds>>;
type TierIds = readonly string[];

const EMPTY_ITEM_IDS: ItemIds = Object.freeze([]);
const EMPTY_BY_OBJECTIVE: ByObjective = Object.freeze({});
const EMPTY_TIER_IDS: TierIds = Object.freeze([]);

interface PlanTierProgressState {
  byProject: Record<string, ByObjective>;
  /** Tier ids that have already shown the unlock celebration, keyed by project. */
  celebratedByProject: Record<string, TierIds>;

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

  /** True if this project has already celebrated the tier unlock. */
  hasCelebratedTier: (projectId: string, tierId: string) => boolean;
  /** Mark a tier as celebrated for this project (idempotent). */
  markTierCelebrated: (projectId: string, tierId: string) => void;
}

export const usePlanTierProgressStore = create<PlanTierProgressState>()(
  persist(
    (set, get) => ({
      byProject: {},
      celebratedByProject: {},

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

      hasCelebratedTier: (projectId, tierId) =>
        (get().celebratedByProject[projectId] ?? EMPTY_TIER_IDS).includes(
          tierId,
        ),

      markTierCelebrated: (projectId, tierId) =>
        set((s) => {
          const existing = s.celebratedByProject[projectId] ?? [];
          if (existing.includes(tierId)) return s;
          return {
            celebratedByProject: {
              ...s.celebratedByProject,
              [projectId]: [...existing, tierId],
            },
          };
        }),
    }),
    {
      name: PERSIST_KEY,
      version: 2,
      partialize: (state) => ({
        byProject: state.byProject,
        celebratedByProject: state.celebratedByProject,
      }),
      // Pre-Slice-1.10 persisted state has no celebratedByProject field;
      // backfill an empty record so the new selectors stay stable.
      migrate: (persistedState, version) => {
        const safe =
          (persistedState as Partial<PlanTierProgressState> | null) ?? {};
        if (version < 2) {
          return {
            ...safe,
            celebratedByProject: safe.celebratedByProject ?? {},
          } as PlanTierProgressState;
        }
        return safe as PlanTierProgressState;
      },
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
 * Stable accessor for the tier ids this project has already celebrated.
 * Returns a frozen empty array when nothing has been celebrated yet so
 * the selector identity stays stable.
 */
export function selectCelebratedTiers(
  state: PlanTierProgressState,
  projectId: string,
): TierIds {
  return state.celebratedByProject[projectId] ?? EMPTY_TIER_IDS;
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
