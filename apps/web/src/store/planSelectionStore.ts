/**
 * planSelectionStore — ephemeral selection for Plan-stage map features.
 *
 * Mirrors `observeSelectionStore` but scoped to PLAN. v1: single-select,
 * guilds only. Add new `PlanSelectionKind` values as more Plan features
 * become click-selectable.
 */

import { create } from 'zustand';

export type PlanSelectionKind = 'guild';

export interface PlanSelection {
  kind: PlanSelectionKind;
  id: string;
}

interface State {
  selected: PlanSelection | null;
  setSelected: (s: PlanSelection | null) => void;
  clear: () => void;
}

export const usePlanSelectionStore = create<State>((set) => ({
  selected: null,
  setSelected: (s) => set({ selected: s }),
  clear: () => set({ selected: null }),
}));
