/**
 * customDrawSelectionStore — transient UI state for arming a specific
 * uploaded custom GLB as the model that the next `custom-glb` placement
 * will reference.
 *
 * Cleared after every draw completion (or when the user disarms the
 * tool), so this never persists. Per ADR 2026-05-11 Phase 6.
 */

import { create } from 'zustand';

interface CustomDrawSelectionState {
  activeCustomModelId: string | null;
  set: (id: string | null) => void;
}

export const useCustomDrawSelectionStore = create<CustomDrawSelectionState>(
  (set) => ({
    activeCustomModelId: null,
    set: (id) => set({ activeCustomModelId: id }),
  }),
);
