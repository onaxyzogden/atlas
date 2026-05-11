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

/**
 * Canonical label maps for the two union types written into
 * `LivestockMoveEvent`. Lifted here so the popover handoff
 * (`ActStructurePopover.actions.startLivestockMoveLog`) and the in-card
 * form (`LivestockMoveCard`) share a single source of truth — adding a
 * direction or species means one edit, not three.
 */
export const DIRECTION_OPTIONS: { value: LivestockMoveDirection; label: string }[] = [
  { value: 'move_in',        label: 'Move in' },
  { value: 'move_out',       label: 'Move out' },
  { value: 'rotate_through', label: 'Rotate through' },
];

export const SPECIES_OPTIONS: { value: LivestockSpecies; label: string }[] = [
  { value: 'sheep',       label: 'Sheep' },
  { value: 'cattle',      label: 'Cattle' },
  { value: 'goats',       label: 'Goats' },
  { value: 'poultry',     label: 'Poultry' },
  { value: 'pigs',        label: 'Pigs' },
  { value: 'horses',      label: 'Horses' },
  { value: 'ducks_geese', label: 'Ducks & geese' },
  { value: 'rabbits',     label: 'Rabbits' },
  { value: 'bees',        label: 'Bees' },
];

export interface LivestockMoveEvent {
  id: string;
  projectId: string;
  /** @deprecated v2 field — kept for legacy read fallback. New writes set
   *  `toPaddockId` instead. v3 migration backfilled `toPaddockId` from this. */
  paddockId?: string;
  /** @deprecated v2 field — kept for legacy read fallback. New writes set
   *  `toStructureId` instead. v3 migration backfilled `toStructureId` from this. */
  structureId?: string;
  /** Origin paddock — set when the herd came *from* a Plan paddock.
   *  Optional: the first-ever entry to a paddock has no recorded origin.
   *  Mutually exclusive with `fromStructureId`. */
  fromPaddockId?: string;
  /** Origin structure (barn / animal_shelter). Mutually exclusive with `fromPaddockId`. */
  fromStructureId?: string;
  /** Destination paddock. Exactly one of `toPaddockId` / `toStructureId` is set
   *  on a well-formed event. Reads should also fall back to `paddockId`
   *  for pre-migration events. */
  toPaddockId?: string;
  /** Destination structure (barn / animal_shelter). Reads should also fall
   *  back to `structureId` for pre-migration events. */
  toStructureId?: string;
  date: string;
  direction: LivestockMoveDirection;
  species: LivestockSpecies;
  headCount: number | null;
  who?: string;
  notes?: string;
}

/** Destination paddock id, with legacy v2 fallback. */
export function destPaddockId(e: LivestockMoveEvent): string | undefined {
  return e.toPaddockId ?? e.paddockId;
}
/** Destination structure id, with legacy v2 fallback. */
export function destStructureId(e: LivestockMoveEvent): string | undefined {
  return e.toStructureId ?? e.structureId;
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
    .filter((e) => e.projectId === projectId && destPaddockId(e) === paddockId)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/**
 * Returns events whose *origin* (`fromPaddockId`) is this paddock — i.e. exits
 * from this cell. Useful for plan-vs-actual variance against rotation schedule.
 */
export function exitsFromPaddock(
  events: LivestockMoveEvent[],
  projectId: string,
  paddockId: string,
): LivestockMoveEvent[] {
  return events
    .filter((e) => e.projectId === projectId && e.fromPaddockId === paddockId)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/**
 * Returns events whose destination is a structure on the given project,
 * sorted most-recent first. Paddock-keyed reads silently drop these.
 */
export function structureDestEvents(
  events: LivestockMoveEvent[],
  projectId: string,
): LivestockMoveEvent[] {
  return events
    .filter((e) => e.projectId === projectId && destStructureId(e) != null)
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
    {
      name: 'ogden-livestock-moves',
      version: 3,
      migrate: (persisted, fromVersion) => {
        const state = persisted as { events?: LivestockMoveEvent[] } | undefined;
        if (state?.events && fromVersion < 3) {
          state.events = state.events.map((e) => ({
            ...e,
            toPaddockId:   e.toPaddockId   ?? e.paddockId,
            toStructureId: e.toStructureId ?? e.structureId,
          }));
        }
        return state as LivestockMoveLogState;
      },
    },
  ),
);

useLivestockMoveLogStore.persist.rehydrate();
