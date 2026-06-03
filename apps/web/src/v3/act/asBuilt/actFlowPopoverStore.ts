/**
 * actFlowPopoverStore - singleton, in-memory state for the Act-stage
 * `<ActFlowConnectorPopover>`: a rail-activated list-capture form that records a
 * source->sink material flow (default materialKind `greywater`) into
 * `closedLoopStore` with `origin: 'list'`.
 *
 * Deliberately distinct from `useInlineFormStore` (which drives the Plan-stage
 * inline edit forms): the Act tier-shell intentionally does NOT mount the Plan
 * inline form host, so - like `actAsBuiltPopoverStore` - this is a self-contained
 * Act-scoped singleton. Unlike the as-built popover it carries no map anchor or
 * draw-capture sub-state: the flow tool is armed from the tools rail, not from a
 * map click, so the popover renders through the reusable `Modal` (portal-to-body)
 * rather than anchoring to a projected lng/lat.
 */

import { create } from 'zustand';

interface ActFlowPopoverState {
  open: boolean;
  openPopover: () => void;
  close: () => void;
}

export const useActFlowPopoverStore = create<ActFlowPopoverState>((set) => ({
  open: false,
  openPopover: () => set({ open: true }),
  close: () => set({ open: false }),
}));
