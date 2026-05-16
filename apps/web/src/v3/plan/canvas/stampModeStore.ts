/**
 * stampModeStore — singleton state for the Plan-stage tree stamp mode
 * (free / fill). Both `StampModePicker` and `useDesignElementDrawTool`
 * read from this store; they don't share a parent that could hold the
 * value as local state. Mirrors `utilityConflictStore`.
 */

import { create } from 'zustand';

export type StampMode = 'free' | 'fill';

interface StampModeState {
  mode: StampMode;
  setMode: (mode: StampMode) => void;
}

export const useStampModeStore = create<StampModeState>((set) => ({
  mode: 'free',
  setMode: (mode) => set({ mode }),
}));
