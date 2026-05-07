/**
 * humanContextStore — OBSERVE Module 1 (Human Context) annotations.
 *
 * Permaculture Scholar (notebook 5aa3dcf3-...): Holmgren P1 "Observe and
 * Interact" begins with the human residents. This namespace holds the
 * site-anchored social fabric — primary households, neighbour interfaces,
 * existing access roads, and the concentric Permaculture Zones radiating
 * from the homestead anchor.
 *
 * Distinct from homesteadStore (single anchor point) — this store holds
 * the broader human-context annotations layered on top of that anchor.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NeighbourPin {
  id: string;
  projectId: string;
  /** [lng, lat] */
  position: [number, number];
  label?: string;
  notes?: string;
  createdAt: string;
}

export interface Household {
  id: string;
  projectId: string;
  /** [lng, lat] */
  position: [number, number];
  label?: string;
  householdSize?: number;
  notes?: string;
  createdAt: string;
}

export type AccessRoadKind = 'public' | 'private' | 'footpath';

export interface AccessRoad {
  id: string;
  projectId: string;
  geometry: GeoJSON.LineString;
  lengthM: number;
  kind: AccessRoadKind;
  notes?: string;
  createdAt: string;
}

/**
 * Six concentric radii (metres) from the homestead anchor — Mollison Zones
 * 0–5. anchorPoint is copied at create time so the zone survives if the
 * homestead anchor is later moved or cleared.
 */
export interface PermacultureZone {
  id: string;
  projectId: string;
  /** Zones 0–5 outer radii, ascending. Zone 0 is the home itself. */
  ringRadiiM: [number, number, number, number, number, number];
  /** [lng, lat] — copied from homesteadStore at create time. */
  anchorPoint: [number, number];
  notes?: string;
  createdAt: string;
}

interface HumanContextState {
  neighbours: NeighbourPin[];
  households: Household[];
  accessRoads: AccessRoad[];
  permacultureZones: PermacultureZone[];

  addNeighbour: (n: NeighbourPin) => void;
  updateNeighbour: (id: string, patch: Partial<NeighbourPin>) => void;
  removeNeighbour: (id: string) => void;

  addHousehold: (h: Household) => void;
  updateHousehold: (id: string, patch: Partial<Household>) => void;
  removeHousehold: (id: string) => void;

  addAccessRoad: (r: AccessRoad) => void;
  updateAccessRoad: (id: string, patch: Partial<AccessRoad>) => void;
  removeAccessRoad: (id: string) => void;

  addPermacultureZone: (z: PermacultureZone) => void;
  updatePermacultureZone: (id: string, patch: Partial<PermacultureZone>) => void;
  removePermacultureZone: (id: string) => void;
}

export const useHumanContextStore = create<HumanContextState>()(
  persist(
    (set) => ({
      neighbours: [],
      households: [],
      accessRoads: [],
      permacultureZones: [],

      addNeighbour: (n) => set((s) => ({ neighbours: [...s.neighbours, n] })),
      updateNeighbour: (id, patch) =>
        set((s) => ({
          neighbours: s.neighbours.map((n) => (n.id === id ? { ...n, ...patch } : n)),
        })),
      removeNeighbour: (id) =>
        set((s) => ({ neighbours: s.neighbours.filter((n) => n.id !== id) })),

      addHousehold: (h) => set((s) => ({ households: [...s.households, h] })),
      updateHousehold: (id, patch) =>
        set((s) => ({
          households: s.households.map((h) => (h.id === id ? { ...h, ...patch } : h)),
        })),
      removeHousehold: (id) =>
        set((s) => ({ households: s.households.filter((h) => h.id !== id) })),

      addAccessRoad: (r) => set((s) => ({ accessRoads: [...s.accessRoads, r] })),
      updateAccessRoad: (id, patch) =>
        set((s) => ({
          accessRoads: s.accessRoads.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      removeAccessRoad: (id) =>
        set((s) => ({ accessRoads: s.accessRoads.filter((r) => r.id !== id) })),

      addPermacultureZone: (z) =>
        set((s) => ({ permacultureZones: [...s.permacultureZones, z] })),
      updatePermacultureZone: (id, patch) =>
        set((s) => ({
          permacultureZones: s.permacultureZones.map((z) =>
            z.id === id ? { ...z, ...patch } : z,
          ),
        })),
      removePermacultureZone: (id) =>
        set((s) => ({
          permacultureZones: s.permacultureZones.filter((z) => z.id !== id),
        })),
    }),
    { name: 'ogden-human-context', version: 1 },
  ),
);

useHumanContextStore.persist.rehydrate();
