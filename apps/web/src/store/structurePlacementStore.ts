/**
 * structurePlacementStore — tiny local-only UI store for the structure
 * placement-mode toggle in the Plan canvas.
 *
 * Extracted 2026-05-12 from `useStructureStore` per the BE V2 unification
 * ADR (`wiki/decisions/2026-05-10-atlas-built-environment-unification.md`).
 *
 * Background: the V1 `useStructureStore` carried two concerns —
 * (a) the projected Structure array (now read directly from V2 via
 * `builtEnvironmentSelectors`) and (b) the click-to-place placementMode
 * UI state, which is purely transient and never belonged in the data
 * store. This module owns concern (b) so the V1 facade can retire.
 *
 * Not persisted. `placementMode` resets to `null` on every reload, same
 * behavior as before.
 */

import { create } from 'zustand';
import type { StructureType } from '@ogden/shared';

export interface StructurePlacementState {
  /** The structure type currently armed for click-to-place, or `null`
   *  when no placement is in progress. */
  placementMode: StructureType | null;
  setPlacementMode: (type: StructureType | null) => void;
}

export const useStructurePlacementStore = create<StructurePlacementState>(
  (set) => ({
    placementMode: null,
    setPlacementMode: (placementMode) => set({ placementMode }),
  }),
);
