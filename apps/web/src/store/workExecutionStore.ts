/**
 * workExecutionStore — ephemeral cross-component state for the Act work
 * surface (ActWorkPanel ↔ map tools ↔ highlight layer).
 *
 * Mirrors `workItemDraftStore`: plain in-memory Zustand, NOT persisted and
 * NOT registered in syncManifest — an in-flight fulfilment hand-off or a
 * transient paddock highlight has no meaning across a reload.
 *
 * Two channels:
 *   - `pending` — a work item the operator chose to fulfil via a map tool
 *     ("Log this move"). LivestockMoveTool reads it to prefill its form,
 *     shows a "Fulfilling: <title>" hint, warns on a paddock mismatch, and
 *     on save links the logged event back via `confirmTypedProofMatch`.
 *     Cleared on save and on tool disarm.
 *   - `highlightPaddockId` — transient map locate for a work row's paddock
 *     (ActWorkHighlightLayer outlines it + fitBounds). Cleared on deselect.
 */

import { create } from 'zustand';

/** The work item being fulfilled through a map tool, plus prefill values. */
export interface PendingWorkFulfilment {
  workItemId: string;
  /** Shown as the "Fulfilling: …" hint on the armed tool. */
  title: string;
  /** Planned paddock (WorkItem.linkedFeatureId) — mismatch warning anchor. */
  paddockId?: string;
  species?: string;
  who?: string;
  /** Planned date (scheduledStart) used as the form's initial date. */
  date?: string;
}

interface WorkExecutionState {
  pending: PendingWorkFulfilment | null;
  highlightPaddockId: string | null;
  setPending: (pending: PendingWorkFulfilment) => void;
  clearPending: () => void;
  setHighlight: (paddockId: string | null) => void;
}

export const useWorkExecutionStore = create<WorkExecutionState>((set) => ({
  pending: null,
  highlightPaddockId: null,
  setPending: (pending) => set({ pending }),
  clearPending: () => set({ pending: null }),
  setHighlight: (paddockId) => set({ highlightPaddockId: paddockId }),
}));
