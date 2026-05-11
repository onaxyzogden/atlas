/**
 * Scheduled livestock move store — ACT-stage Module 3 (Livestock & Rotation).
 *
 * Records *planned* (forward-looking) livestock moves against existing
 * Plan-stage `Paddock` polygons. Pair: `livestockMoveLogStore` records what
 * actually happened; this store records what's intended to happen.
 *
 * Used by `RotationScheduleCard` to surface forward-looking variance: the
 * operator's `plannedDate` for each paddock vs. the recovery-model's
 * projected `targetDate` from `computeRotationSchedule`. Auto-fulfilment:
 * when an actual `LivestockMoveEvent` lands within ±7 days of the planned
 * date (same paddock + species), the plan is marked `fulfilledByEventId`
 * and stops rendering as "Planned".
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
  /** Destination paddock — required. Structure plans deferred. */
  toPaddockId: string;
  /** Origin paddock — optional. */
  fromPaddockId?: string;
  /** ISO yyyy-mm-dd. */
  plannedDate: string;
  direction: LivestockMoveDirection;
  species: LivestockSpecies;
  headCount: number | null;
  who?: string;
  notes?: string;
  /** Set when an actual LivestockMoveEvent matches this plan
   *  (same paddock + species + plannedDate ± 7d window, first match wins). */
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
      version: 1,
    },
  ),
);

useScheduledLivestockMoveStore.persist.rehydrate();
