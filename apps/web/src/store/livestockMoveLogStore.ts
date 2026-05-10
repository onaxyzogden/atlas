/**
 * Livestock move log store — ACT-stage Module 3 (Livestock & Rotation).
 *
 * Records actual livestock moves (move-in / move-out / rotate-through) against
 * existing Plan-stage `Paddock` polygons. Pair: `livestockStore` describes the
 * paddock (geometry, species mix, fencing); this store records the events
 * ("moved 24 sheep into paddock-north on 2026-05-08").
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LivestockSpecies } from './livestockStore.js';

export type LivestockMoveDirection = 'move_in' | 'move_out' | 'rotate_through';

export interface LivestockMoveEvent {
  id: string;
  projectId: string;
  /** Paddock target. Set when the move is logged against a Plan paddock.
   *  Exactly one of `paddockId` / `structureId` should be set. */
  paddockId?: string;
  /** Structure target — barn, animal_shelter, etc. Set when the move is
   *  logged from the Act-stage structure inspector. */
  structureId?: string;
  date: string;
  direction: LivestockMoveDirection;
  species: LivestockSpecies;
  headCount: number | null;
  who?: string;
  notes?: string;
}

interface LivestockMoveLogState {
  events: LivestockMoveEvent[];
  addEvent: (e: LivestockMoveEvent) => void;
  updateEvent: (id: string, patch: Partial<LivestockMoveEvent>) => void;
  removeEvent: (id: string) => void;
}

/**
 * Returns the events recorded against `paddockId` for the given project,
 * sorted by `date` descending (most recent first). Pure helper — call from
 * a `useMemo` keyed on `events` to avoid re-allocating every render.
 */
export function eventsByPaddock(
  events: LivestockMoveEvent[],
  projectId: string,
  paddockId: string,
): LivestockMoveEvent[] {
  return events
    .filter((e) => e.projectId === projectId && e.paddockId === paddockId)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export const useLivestockMoveLogStore = create<LivestockMoveLogState>()(
  persist(
    (set) => ({
      events: [],
      addEvent: (e) => set((s) => ({ events: [...s.events, e] })),
      updateEvent: (id, patch) =>
        set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
    }),
    { name: 'ogden-livestock-moves', version: 2 },
  ),
);

useLivestockMoveLogStore.persist.rehydrate();
