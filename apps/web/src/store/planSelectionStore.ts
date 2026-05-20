/**
 * planSelectionStore — ephemeral multi-selection for Plan-stage map features.
 *
 * Mirrors `observeSelectionStore`. Replaces the v1 single-select store —
 * existing consumers should read `items[0] ?? null` for backwards-compat.
 *
 * `PlanSelectionKind` is the union of every Plan feature kind that's
 * click-selectable on the map. Extend as new kinds gain selection
 * affordances.
 */

import { create } from 'zustand';

export type PlanSelectionKind =
  | 'guild'
  | 'guild-member'
  | 'zone'
  | 'crop'
  | 'paddock'
  | 'path'
  | 'structure'
  | 'fertility'
  | 'water'
  | 'utility'
  | 'setback'
  | 'flow'
  | 'transect'
  | 'design-element';

export interface PlanSelectionItem {
  kind: PlanSelectionKind;
  /** For `guild-member`, this is the parent `guildId`; pair with `memberIndex`. */
  id: string;
  /** Only required for kinds whose backing store is `byProject` (currently
   *  `design-element`). Plan-data stores are flat across projects so they
   *  ignore this field. */
  projectId?: string;
  /** Index into `Guild.members[]` for `kind === 'guild-member'`. */
  memberIndex?: number;
}

/** @deprecated kept for transition; prefer `PlanSelectionItem`. */
export type PlanSelection = PlanSelectionItem;

interface State {
  items: PlanSelectionItem[];
  set: (items: PlanSelectionItem[]) => void;
  add: (item: PlanSelectionItem) => void;
  remove: (item: PlanSelectionItem) => void;
  toggle: (item: PlanSelectionItem) => void;
  clear: () => void;
}

const sameItem = (a: PlanSelectionItem, b: PlanSelectionItem): boolean =>
  a.kind === b.kind && a.id === b.id && a.memberIndex === b.memberIndex;

export const usePlanSelectionStore = create<State>((set) => ({
  items: [],
  set: (items) => set({ items }),
  add: (item) =>
    set((s) =>
      s.items.some((x) => sameItem(x, item)) ? s : { items: [...s.items, item] },
    ),
  remove: (item) =>
    set((s) => ({ items: s.items.filter((x) => !sameItem(x, item)) })),
  toggle: (item) =>
    set((s) =>
      s.items.some((x) => sameItem(x, item))
        ? { items: s.items.filter((x) => !sameItem(x, item)) }
        : { items: [...s.items, item] },
    ),
  clear: () => set({ items: [] }),
}));
