/**
 * Ephemeral visibility toggle for the bottom-canvas `TemporalScrubSlider`.
 * Hidden by default; summoned via the "Year scrub" tab in `PlanPhaseTabs`.
 * Unpersisted on purpose — every Plan-stage entry starts with the slider
 * hidden. The scrubbed year itself lives in `temporalScrubStore` and is
 * preserved across hide / re-summon within a session.
 */
import { create } from 'zustand';

interface TemporalScrubVisibilityState {
  visible: boolean;
  toggle: () => void;
  setVisible: (v: boolean) => void;
}

export const useTemporalScrubVisibilityStore =
  create<TemporalScrubVisibilityState>((set) => ({
    visible: false,
    toggle: () => set((s) => ({ visible: !s.visible })),
    setVisible: (v) => set({ visible: v }),
  }));
