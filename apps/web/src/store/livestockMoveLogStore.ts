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
  /**
   * v4 — Linked-pair pointer. Set on both legs of a split rotation; each
   *  leg's `linkedEventId` points at the partner's `id`. `direction` on
   *  persisted v4 events is `'move_in'` or `'move_out'` only (never
   *  `'rotate_through'` — the type union retains the value as a
   *  write-time picker convenience that the form layer splits into a
   *  pair before persisting).
   */
  linkedEventId?: string;
  /**
   * D0 spine link — the scheduled-livestock-move `WorkItem` this actual
   * move fulfils (set by `scheduledLivestockMoveStore.markFulfilled`).
   * Additive optional → no version bump.
   */
  workItemId?: string;
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
 * Returns the partner leg of a paired rotation, or undefined when the
 * event has no `linkedEventId` (single-leg move) or the partner has
 * been removed.
 */
export function linkedPartner(
  events: LivestockMoveEvent[],
  event: LivestockMoveEvent,
): LivestockMoveEvent | undefined {
  if (!event.linkedEventId) return undefined;
  return events.find((e) => e.id === event.linkedEventId);
}

/**
 * Returns the two legs of a pair given either leg's id. `exit` is the
 * `move_out` leg, `entry` is the `move_in` leg. Either may be undefined
 * if the event is not part of a pair or its partner was removed.
 */
export function getPair(
  events: LivestockMoveEvent[],
  eventId: string,
): { exit?: LivestockMoveEvent; entry?: LivestockMoveEvent } {
  const a = events.find((e) => e.id === eventId);
  if (!a) return {};
  const b = a.linkedEventId ? events.find((e) => e.id === a.linkedEventId) : undefined;
  const exit = a.direction === 'move_out' ? a : b?.direction === 'move_out' ? b : undefined;
  const entry = a.direction === 'move_in' ? a : b?.direction === 'move_in' ? b : undefined;
  return { exit, entry };
}

/**
 * Build two cross-pointing events for a write-time rotate_through. Returns
 * `[exitLeg, entryLeg]`; caller `addEvent`s both. Ids are derived from a
 * shared seed so re-runs are stable for tests / dev-tools inspection.
 *
 * `exitDate` defaults to `entryDate` when omitted (same-day rotation).
 * Origin and destination are passed as `{paddockId | structureId}`
 * partial records — exactly one of each pair should be set.
 */
export function buildRotatePair(args: {
  projectId: string;
  entryDate: string;
  exitDate?: string;
  species: LivestockSpecies;
  headCount: number | null;
  from: { paddockId?: string; structureId?: string };
  to: { paddockId?: string; structureId?: string };
  who?: string;
  notes?: string;
  idSeed?: string;
}): [LivestockMoveEvent, LivestockMoveEvent] {
  const seed =
    args.idSeed ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const exitId = `lvm-${seed}-out`;
  const entryId = `lvm-${seed}-in`;
  const exitDate = args.exitDate && args.exitDate.trim() !== '' ? args.exitDate : args.entryDate;
  const common = {
    projectId: args.projectId,
    species: args.species,
    headCount: args.headCount,
    who: args.who,
    notes: args.notes,
  };
  const exitLeg: LivestockMoveEvent = {
    ...common,
    id: exitId,
    date: exitDate,
    direction: 'move_out',
    fromPaddockId: args.from.paddockId,
    fromStructureId: args.from.structureId,
    linkedEventId: entryId,
  };
  const entryLeg: LivestockMoveEvent = {
    ...common,
    id: entryId,
    date: args.entryDate,
    direction: 'move_in',
    toPaddockId: args.to.paddockId,
    toStructureId: args.to.structureId,
    linkedEventId: exitId,
  };
  return [exitLeg, entryLeg];
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
      // v4 — cascade removal across linked pairs. Removing either leg of a
      //  rotation removes the partner too. Operator-facing rationale: a
      //  paired rotation is one operational act; removing only the exit
      //  while keeping the entry (or vice-versa) would silently corrupt
      //  rest-pair accounting on the rotation card.
      removeEvent: (id) =>
        set((s) => {
          const target = s.events.find((e) => e.id === id);
          if (!target) return { events: s.events };
          const drop = new Set<string>([id]);
          if (target.linkedEventId) drop.add(target.linkedEventId);
          return { events: s.events.filter((e) => !drop.has(e.id)) };
        }),
    }),
    {
      name: 'ogden-livestock-moves',
      version: 4,
      migrate: (persisted, fromVersion) => {
        const state = persisted as { events?: LivestockMoveEvent[] } | undefined;
        if (state?.events && fromVersion < 3) {
          // v2 → v3: backfill to* from legacy paddockId / structureId.
          state.events = state.events.map((e) => ({
            ...e,
            toPaddockId:   e.toPaddockId   ?? e.paddockId,
            toStructureId: e.toStructureId ?? e.structureId,
          }));
        }
        if (state?.events && fromVersion < 4) {
          // v3 → v4: split every `direction === 'rotate_through'` event
          //  into a linked pair (move_out + move_in). Ids are derived from
          //  the original event id so re-rehydration is idempotent.
          const out: LivestockMoveEvent[] = [];
          for (const e of state.events) {
            if (e.direction !== 'rotate_through') {
              out.push(e);
              continue;
            }
            const exitId = `${e.id}-out`;
            const entryId = `${e.id}-in`;
            const common = {
              projectId: e.projectId,
              date: e.date,
              species: e.species,
              headCount: e.headCount,
              who: e.who,
              notes: e.notes,
            };
            out.push({
              ...common,
              id: exitId,
              direction: 'move_out',
              fromPaddockId: e.fromPaddockId,
              fromStructureId: e.fromStructureId,
              linkedEventId: entryId,
            });
            out.push({
              ...common,
              id: entryId,
              direction: 'move_in',
              toPaddockId: e.toPaddockId ?? e.paddockId,
              toStructureId: e.toStructureId ?? e.structureId,
              linkedEventId: exitId,
            });
          }
          state.events = out;
        }
        return state as LivestockMoveLogState;
      },
    },
  ),
);

useLivestockMoveLogStore.persist.rehydrate();
