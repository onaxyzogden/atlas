/**
 * homesteadStore — per-project [lng, lat] anchor for the parcel's dwelling.
 *
 * Permaculture Scholar dialogue (wiki/concepts/atlas-sidebar-permaculture.md):
 * Mollison's Zone 0 is the home, not the parcel centroid. When set, sectors
 * and concentric zones radiate from this point instead.
 *
 * Persistence: localStorage. Pure UI/local state — no server sync yet.
 * Pattern mirrors matrixTogglesStore.ts.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LngLat = [number, number];

export interface HomesteadState {
  byProject: Record<string, LngLat>;
  set: (projectId: string, point: LngLat) => void;
  clear: (projectId: string) => void;
}

export const useHomesteadStore = create<HomesteadState>()(
  persist(
    (set) => ({
      byProject: {},
      set: (projectId, point) =>
        set((s) => ({ byProject: { ...s.byProject, [projectId]: point } })),
      clear: (projectId) =>
        set((s) => {
          if (!(projectId in s.byProject)) return s;
          const next = { ...s.byProject };
          delete next[projectId];
          return { byProject: next };
        }),
    }),
    {
      name: 'ogden-atlas-homestead',
      version: 1,
      migrate: (persisted) => persisted as HomesteadState,
    },
  ),
);
