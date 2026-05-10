/**
 * observeLinkPopoverStore — singleton state for the floating
 * `<ObserveLinkPopover>` that appears when a steward clicks an
 * Observe-stage feature on the Plan Current-Land map.
 *
 * Unlike `inlineFormStore`, this opens NO edit form. The popover is a
 * single "Edit in Observe →" affordance: Observe is the source of truth
 * for these features, so editing routes back to the Observe stage with
 * the relevant module preselected.
 *
 * `kind` is the Observe layer-group slug surfaced via the
 * `observe-anno-…` MapLibre layer IDs (e.g. `built-environment`,
 * `topography`, `human-context`). It maps 1:1 to Observe modules so the
 * popover can deep-link into the right module.
 */

import { create } from 'zustand';

import type { ObserveModule } from '../../observe/types.js';

export type ObserveLinkKind = ObserveModule;

export interface ObserveLinkPayload {
  /** Observe module slug — the URL route segment to deep-link to. */
  kind: ObserveLinkKind;
  /** Human-readable feature label (e.g. "Building", "Soil sample"). */
  label: string;
  /** Map anchor in [lng, lat]. Re-projected to screen coords each render. */
  anchor: [number, number];
  /** Optional feature id; reserved for Phase 2 deep-link focus. */
  featureId?: string;
}

interface ObserveLinkPopoverState {
  active: ObserveLinkPayload | null;
  open: (payload: ObserveLinkPayload) => void;
  close: () => void;
}

export const useObserveLinkPopoverStore = create<ObserveLinkPopoverState>((set) => ({
  active: null,
  open: (payload) => set({ active: payload }),
  close: () => set({ active: null }),
}));
