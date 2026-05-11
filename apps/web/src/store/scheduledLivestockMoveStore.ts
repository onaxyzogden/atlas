/**
 * Scheduled livestock move store — ACT-stage Module 3 (Livestock & Rotation).
 *
 * Records *planned* (forward-looking) livestock moves against Plan-stage
 * targets — either a `Paddock` polygon or a placed `Structure` (barn,
 * animal shelter). Pair: `livestockMoveLogStore` records what actually
 * happened; this store records what's intended to happen.
 *
 * Used by `RotationScheduleCard` (paddock destinations) and the
 * Structure-moves tail (structure destinations) to surface forward-looking
 * variance: the operator's `plannedDate` for each paddock vs. the
 * recovery-model's projected `targetDate` from `computeRotationSchedule`,
 * and a plain `Planned: <date>` line for structures (no variance — the
 * rotation model is paddock-centric, structure plans are just reminders).
 *
 * Auto-fulfilment: when an actual `LivestockMoveEvent` lands within ±7 days
 * of the planned date (same destination + species), the plan is marked
 * `fulfilledByEventId` and stops rendering as "Planned".
 *
 * Kept separate from `livestockMoveLogStore` so the actual log's read
 * helpers (`eventsByPaddock`, `exitsFromPaddock`, `computeRestPairs`) need
 * no plan-awareness retrofit.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LivestockMoveDirection } from './livestockMoveLogStore.js';
import type { LivestockSpecies } from './livestockStore.js';

export interface ScheduledLivestockMove {
  id: string; // 'slvm-<...>'
  projectId: string;
  /** Destination paddock. Exactly one of `toPaddockId` / `toStructureId` is set. */
  toPaddockId?: string;
  /** Destination structure (v2). Exactly one of `toPaddockId` / `toStructureId` is set. */
  toStructureId?: string;
  /** Origin paddock — optional. */
  fromPaddockId?: string;
  /** Origin structure (v2) — optional. */
  fromStructureId?: string;
  /** ISO yyyy-mm-dd. */
  plannedDate: string;
  direction: LivestockMoveDirection;
  species: LivestockSpecies;
  headCount: number | null;
  who?: string;
  notes?: string;
  /** Set when an actual LivestockMoveEvent matches this plan
   *  (same destination + species + plannedDate ± 7d window, first match wins). */
  fulfilledByEventId?: string;
  /** ISO timestamp. */
  createdAt: string;
}

interface ScheduledLivestockMoveState {
  plans: ScheduledLivestockMove[];
  addPlan: (p: ScheduledLivestockMove) => void;
  updatePlan: (id: string, patch: Partial<ScheduledLivestockMove>) => void;
  removePlan: (id: string) => void;
  markFulfilled: (id: string, eventId: string) => void;
}

/**
 * Unfulfilled plans for `paddockId` on this project, sorted by `plannedDate`
 * ascending (soonest first).
 */
export function plansByPaddock(
  plans: ScheduledLivestockMove[],
  projectId: string,
  paddockId: string,
): ScheduledLivestockMove[] {
  return plans
    .filter(
      (p) =>
        p.projectId === projectId &&
        p.toPaddockId === paddockId &&
        !p.fulfilledByEventId,
    )
    .slice()
    .sort((a, b) => (a.plannedDate < b.plannedDate ? -1 : a.plannedDate > b.plannedDate ? 1 : 0));
}

/**
 * The soonest `plannedDate >= today` unfulfilled plan for this paddock, or
 * `null`. `today` is an ISO yyyy-mm-dd string.
 */
export function nextUnfulfilledPlan(
  plans: ScheduledLivestockMove[],
  projectId: string,
  paddockId: string,
  today: string,
): ScheduledLivestockMove | null {
  const candidates = plansByPaddock(plans, projectId, paddockId).filter(
    (p) => p.plannedDate >= today,
  );
  return candidates[0] ?? null;
}

/**
 * Unfulfilled plans for `structureId` on this project (v2), sorted by
 * `plannedDate` ascending.
 */
export function plansByStructure(
  plans: ScheduledLivestockMove[],
  projectId: string,
  structureId: string,
): ScheduledLivestockMove[] {
  return plans
    .filter(
      (p) =>
        p.projectId === projectId &&
        p.toStructureId === structureId &&
        !p.fulfilledByEventId,
    )
    .slice()
    .sort((a, b) => (a.plannedDate < b.plannedDate ? -1 : a.plannedDate > b.plannedDate ? 1 : 0));
}

/**
 * All unfulfilled plans on this project whose destination is *any* structure
 * (v2). Used by the Structure-moves tail in `RotationScheduleCard`. Sorted
 * by `plannedDate` ascending.
 */
export function structureDestPlans(
  plans: ScheduledLivestockMove[],
  projectId: string,
): ScheduledLivestockMove[] {
  return plans
    .filter(
      (p) =>
        p.projectId === projectId &&
        p.toStructureId != null &&
        !p.fulfilledByEventId,
    )
    .slice()
    .sort((a, b) => (a.plannedDate < b.plannedDate ? -1 : a.plannedDate > b.plannedDate ? 1 : 0));
}

export const useScheduledLivestockMoveStore = create<ScheduledLivestockMoveState>()(
  persist(
    (set) => ({
      plans: [],
      addPlan: (p) => set((s) => ({ plans: [...s.plans, p] })),
      updatePlan: (id, patch) =>
        set((s) => ({ plans: s.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      removePlan: (id) => set((s) => ({ plans: s.plans.filter((p) => p.id !== id) })),
      markFulfilled: (id, eventId) =>
        set((s) => ({
          plans: s.plans.map((p) =>
            p.id === id ? { ...p, fulfilledByEventId: eventId } : p,
          ),
        })),
    }),
    {
      name: 'ogden-scheduled-livestock-moves',
      version: 2,
      // v1 → v2: structure-destination fields added. Existing v1 entries
      // already have `toPaddockId` set; new optional `toStructureId` /
      // `fromStructureId` simply absent. No data rewrite needed.
      migrate: (persisted, _from) => persisted as { plans: ScheduledLivestockMove[] },
    },
  ),
);

useScheduledLivestockMoveStore.persist.rehydrate();
