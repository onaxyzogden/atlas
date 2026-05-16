/**
 * relationshipsArmedStore — ephemeral arm-flag for the canvas
 * relationships overlay (sockets + drag-to-connect). Mirrors
 * `useTemporalScrubStore` / `useStampModeStore`: a single Zustand atom,
 * no persistence. The audit card's "Open visual editor →" CTA arms
 * this; `RelationshipsOverlay` / `RelationshipsRail` fall through to
 * `FLAGS.RELATIONSHIPS || armed` so the existing flag-gated path
 * keeps working unchanged.
 */
import { create } from 'zustand';

interface RelationshipsArmedState {
  armed: boolean;
  arm: () => void;
  disarm: () => void;
  toggle: () => void;
}

export const useRelationshipsArmedStore = create<RelationshipsArmedState>((set) => ({
  armed: false,
  arm: () => set({ armed: true }),
  disarm: () => set({ armed: false }),
  toggle: () => set((s) => ({ armed: !s.armed })),
}));
