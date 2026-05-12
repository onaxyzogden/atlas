/**
 * planVertexEditStore — singleton, in-memory target for the Plan-stage
 * polygon vertex-edit handler.
 *
 * The selection floater (Phase 4) sets `target` to enter vertex-edit mode
 * for the currently selected polygon. The handler component reacts and
 * mounts a MapboxDraw `direct_select` instance. Esc clears the target.
 */

import { create } from 'zustand';

export type PlanVertexEditKind =
  | 'zone'
  | 'crop'
  | 'paddock'
  | 'structure'
  | 'design-element';

export interface PlanVertexEditTarget {
  kind: PlanVertexEditKind;
  id: string;
  /** Required for `design-element` kind; ignored otherwise. */
  projectId?: string;
}

interface PlanVertexEditState {
  target: PlanVertexEditTarget | null;
  setTarget: (t: PlanVertexEditTarget | null) => void;
  clear: () => void;
}

export const usePlanVertexEditStore = create<PlanVertexEditState>((set) => ({
  target: null,
  setTarget: (t) => set({ target: t }),
  clear: () => set({ target: null }),
}));
