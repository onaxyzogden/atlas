/**
 * placementSignalStore — a tiny, non-persisted pulse fired every time an
 * Observe annotation is created through `createWithDefaults` (the single
 * draw-complete persistence seam). It exists only to decouple the low-level
 * draw tools from the high-level objective workspace: tools never need to
 * know an objective is focused, and the objective layer never needs to patch
 * 28 tool components. `seq` bumps on every placement so subscribers can dedupe
 * on a monotonically increasing value; `lastId` carries the new annotation's
 * id so a listener can link captured evidence back to the feature.
 */

import { create } from 'zustand';

export interface PlacementSignalState {
  /** Monotonic counter; bumped once per annotation placement. */
  seq: number;
  /** The id of the most recently placed annotation, or null before any. */
  lastId: string | null;
  /** Fire a placement pulse for the given new annotation id. */
  signal: (id: string) => void;
}

export const usePlacementSignalStore = create<PlacementSignalState>((set) => ({
  seq: 0,
  lastId: null,
  signal: (id) => set((s) => ({ seq: s.seq + 1, lastId: id })),
}));
