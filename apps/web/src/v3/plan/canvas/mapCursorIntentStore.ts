/**
 * mapCursorIntentStore — imperative cursor-affordance channel into the single
 * authoritative `useMapCursor` owner.
 *
 * Feature-specific drag/hover code (PlanDataLayers entity drags,
 * AnnotationDragHandler, AnnotationSectorHandles) used to write
 * `map.getCanvas().style.cursor = …` directly. Those bare writes lost the
 * race with `useMapCursor`'s `!important` + MutationObserver re-assertion
 * (ADR wiki/decisions/2026-05-15-atlas-map-cursor-authoritative.md). Rather
 * than fight the authority, those sites now *declare* an intent here;
 * `useMapCursor.compute()` reads it at priority 2 (below `drawArmed`, above
 * everything else) so there is exactly one cursor writer.
 *
 * Intents the hook does NOT derive from mode/hover on its own:
 *   - 'grabbing' : an entity/handle drag is in progress (dragPan suspended)
 *   - 'move'     : hovering a draggable entity (PlanDataLayers guild/
 *                  structure/zone/path/fertility)
 *   - 'grab'     : hovering a sector drag handle
 *
 * Last-writer-wins single slot; clear with `null` on drag-end / hover-leave.
 */

import { create } from 'zustand';

export type CursorIntent = 'grabbing' | 'move' | 'grab';

interface MapCursorIntentState {
  intent: CursorIntent | null;
  setIntent: (intent: CursorIntent | null) => void;
}

export const useMapCursorIntentStore = create<MapCursorIntentState>((set) => ({
  intent: null,
  setIntent: (intent) => set({ intent }),
}));

/** Imperative setter for non-React call sites (map event handlers). */
export function setCursorIntent(intent: CursorIntent | null): void {
  useMapCursorIntentStore.getState().setIntent(intent);
}
