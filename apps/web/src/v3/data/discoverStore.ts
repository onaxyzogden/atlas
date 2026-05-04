/**
 * Lightweight zustand store for the Discover board's compare selection.
 * Shared between DiscoverPage (the grid + tray) and DiscoverRail (the
 * shortlisted-properties panel + Compare Selected CTA).
 *
 * Selection persists only for the in-memory session — RULE 1 (mock-only).
 */

import { create } from "zustand";

export const MAX_COMPARE = 6;

interface DiscoverState {
  selected: Set<string>;
  toggle: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
}

export const useDiscoverSelection = create<DiscoverState>((set, get) => ({
  selected: new Set<string>(),
  toggle: (id) =>
    set((s) => {
      const next = new Set(s.selected);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_COMPARE) next.add(id);
      return { selected: next };
    }),
  clear: () => set({ selected: new Set<string>() }),
  has: (id) => get().selected.has(id),
}));
