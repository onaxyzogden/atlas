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

/**
 * Transient per-open capture state (Slice 6). Bridges the DOM popover to the
 * map-mounted `ActAsBuiltDrawHandler` - same store-bridge pattern as
 * `planVertexEditStore`. `drawing` arms the MapboxDraw polygon tool; once the
 * steward closes a polygon the handler stashes it here via `setCaptured`, the
 * popover reads it for the readout, and `onSave` folds it into the geometry
 * diff. Reset to empty on every `open`/`close` (capture is per-feature-session).
 */
export interface ActAsBuiltCaptureState {
  drawing: boolean;
  geometry: GeoJSON.Polygon | null;
  areaM2: number | null;
}

const EMPTY_CAPTURE: ActAsBuiltCaptureState = {
  drawing: false,
  geometry: null,
  areaM2: null,
};

interface ActAsBuiltPopoverState {
  active: ActAsBuiltPopoverPayload | null;
  capture: ActAsBuiltCaptureState;
  open: (payload: ActAsBuiltPopoverPayload) => void;
  close: () => void;
  /** Arm the polygon draw tool (keeps any previously captured polygon). */
  startDrawing: () => void;
  /** Disarm the draw tool without discarding an already-captured polygon. */
  cancelDrawing: () => void;
  /** Stash the redrawn polygon + its geodesic area; disarms the draw tool. */
  setCaptured: (geometry: GeoJSON.Polygon, areaM2: number | null) => void;
  /** Drop the captured polygon (steward clicked "Clear"). */
  clearCaptured: () => void;
}

export const useActAsBuiltPopoverStore = create<ActAsBuiltPopoverState>(
  (set) => ({
    active: null,
    capture: EMPTY_CAPTURE,
    open: (payload) => set({ active: payload, capture: EMPTY_CAPTURE }),
    close: () => set({ active: null, capture: EMPTY_CAPTURE }),
    startDrawing: () =>
      set((s) => ({ capture: { ...s.capture, drawing: true } })),
    cancelDrawing: () =>
      set((s) => ({ capture: { ...s.capture, drawing: false } })),
    setCaptured: (geometry, areaM2) =>
      set({ capture: { drawing: false, geometry, areaM2 } }),
    clearCaptured: () => set({ capture: EMPTY_CAPTURE }),
  }),
);
