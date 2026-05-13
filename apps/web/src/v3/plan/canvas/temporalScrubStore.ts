/**
 * temporalScrubStore — ephemeral year cursor for the canvas temporal slider.
 * Mirrors `useStampModeStore`: a single Zustand atom, no persistence.
 * Resets on reload (per the 2026-04-28 temporal-slider ADR).
 */
import { create } from 'zustand';

interface TemporalScrubState {
  /** Design year currently being previewed (1..50). */
  currentYear: number;
  setYear: (y: number) => void;
}

export const useTemporalScrubStore = create<TemporalScrubState>((set) => ({
  currentYear: 5,
  setYear: (y) => set({ currentYear: Math.max(1, Math.min(50, Math.round(y))) }),
}));
