/**
 * actStructurePopoverStore — singleton, in-memory state for the Act-stage
 * `<ActStructurePopover>` that appears when a placed Plan-stage structure
 * (barn, greenhouse, well, etc.) is clicked while on the Act surface.
 *
 * Distinct from `useInlineFormStore` (which drives the Plan-stage edit form
 * and Act-tool log forms). This store only carries the structure id and an
 * anchor; the popover itself reads structure attributes from
 * `useStructureStore` directly so it stays in sync with edits made in Plan.
 *
 * Phase 2: read-only inspector. Action wiring to Act log tools lands in Phase 3.
 */

import { create } from 'zustand';

export interface ActStructurePopoverPayload {
  structureId: string;
  anchor: [number, number];
}

interface ActStructurePopoverState {
  active: ActStructurePopoverPayload | null;
  open: (payload: ActStructurePopoverPayload) => void;
  close: () => void;
}

export const useActStructurePopoverStore = create<ActStructurePopoverState>((set) => ({
  active: null,
  open: (payload) => set({ active: payload }),
  close: () => set({ active: null }),
}));
