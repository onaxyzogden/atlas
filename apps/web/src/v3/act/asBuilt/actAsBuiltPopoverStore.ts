/**
 * actAsBuiltPopoverStore - singleton, in-memory state for the Act-stage
 * `<ActAsBuiltPopover>` that appears when a placed Plan feature (crop area;
 * paddock + zone land in Slice 4) is clicked on the Act surface to record an
 * "as-built" deviation (reality diverges from the Plan design).
 *
 * Deliberately distinct from `useInlineFormStore` (which drives the Plan-stage
 * edit form): the Act surface must never mutate Plan geometry, so this popover
 * only emits a divergent Observe data point via `recordAsBuiltDeviation`.
 * Mirrors `actStructurePopoverStore` - an Act-scoped singleton - so the
 * tier-shell (which intentionally does NOT mount the Plan inline form host)
 * gets a self-contained affordance. Structures keep their own read-only
 * inspector.
 *
 * The payload carries the feature kind + id + click anchor; the popover reads
 * the feature's current attributes from the geometry store directly so it
 * stays in sync with edits made in Plan.
 */

import { create } from 'zustand';
import type { AsBuiltFeatureKind } from '@ogden/shared';

export interface ActAsBuiltPopoverPayload {
  kind: AsBuiltFeatureKind;
  id: string;
  anchor: [number, number];
}

interface ActAsBuiltPopoverState {
  active: ActAsBuiltPopoverPayload | null;
  open: (payload: ActAsBuiltPopoverPayload) => void;
  close: () => void;
}

export const useActAsBuiltPopoverStore = create<ActAsBuiltPopoverState>(
  (set) => ({
    active: null,
    open: (payload) => set({ active: payload }),
    close: () => set({ active: null }),
  }),
);
