/**
 * homesteadStore — per-project [lng, lat] anchor for the parcel's dwelling.
 *
 * Permaculture Scholar dialogue (wiki/concepts/atlas-sidebar-permaculture.md):
 * Mollison's Zone 0 is the home, not the parcel centroid. When set, sectors
 * and concentric zones radiate from this point instead.
 *
 * Persistence: durable IndexedDB (idbPersistStorage; Node-safe, degrades to
 * localStorage/null). Pure UI/local state — no server sync yet (intentionally
 * NOT registered in syncManifest; the [lng,lat] anchor is a device-local
 * preference). Pattern mirrors matrixTogglesStore.ts.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbPersistStorage } from '../lib/indexedDBStorage.js';

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
      // Durable IndexedDB backend (Phase 1) — see indexedDBStorage.ts.
      storage: idbPersistStorage,
      version: 1,
      // Versioning contract: v1 is the only shape so far (a flat
      // byProject<[lng,lat]> map), so `migrate` is an identity pass-through.
      // TRIP-WIRE: the NEXT change to the persisted shape MUST bump `version`
      // AND replace this with a real `migrate(persisted, from)` that reshapes
      // the old payload -- persist keeps stored state across a version bump only
      // when migrate returns the new shape, so a silent shape change here would
      // discard every project's saved homestead anchor.
      migrate: (persisted) => persisted as HomesteadState,
    },
  ),
);
