/**
 * workItemDraftStore — ephemeral in-memory draft channel
 * carrying a pending corrective work-item draft from
 * RotationAdherenceActionsCard to PlanExecutionTrackerCard.
 *
 * Render-only payload-passing. Not written to storage, not registered
 * in the sync registry. No schema change to WorkItem. Never reads or
 * writes the status field.
 *
 * Covenant: strictly agronomic / operating analytics.
 * Forbidden scope: any monetary, commercial, or usurious framing.
 */
import { create } from 'zustand';

export interface WorkItemDraft {
  title: string;
  notes?: string;
  paddockId?: string;
  source: 'rotation-adherence';
}

interface WorkItemDraftState {
  draft: WorkItemDraft | null;
  setDraft: (d: WorkItemDraft) => void;
  clearDraft: () => void;
}

export const useWorkItemDraftStore = create<WorkItemDraftState>((set) => ({
  draft: null,
  setDraft: (d) => set({ draft: d }),
  clearDraft: () => set({ draft: null }),
}));
