/**
 * Structure store — manages placed structures with localStorage persistence.
 *
 * Phase 2: Structures are placed on the map via click-to-place,
 * with predefined footprint polygons that can be rotated.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type StructureType =
  | 'cabin'
  | 'yurt'
  | 'pavilion'
  | 'greenhouse'
  | 'barn'
  | 'workshop'
  | 'prayer_space'
  | 'bathhouse'
  | 'classroom'
  | 'storage'
  | 'animal_shelter'
  | 'compost_station'
  | 'water_pump_house'
  | 'tent_glamping'
  | 'fire_circle'
  | 'lookout'
  | 'earthship'
  | 'solar_array'
  | 'well'
  | 'water_tank';

export interface Structure {
  id: string;
  projectId: string;
  name: string;
  type: StructureType;
  center: [number, number]; // [lng, lat]
  geometry: GeoJSON.Polygon;
  rotationDeg: number;
  widthM: number;
  depthM: number;
  phase: string;
  costEstimate: number | null;
  infrastructureReqs: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  /** Server-assigned UUID after backend sync (undefined = not yet synced) */
  serverId?: string;
}

interface StructureState {
  structures: Structure[];
  placementMode: StructureType | null;

  addStructure: (structure: Structure) => void;
  updateStructure: (id: string, updates: Partial<Structure>) => void;
  deleteStructure: (id: string) => void;
  setPlacementMode: (type: StructureType | null) => void;
}

export const useStructureStore = create<StructureState>()(
  persist(
    (set) => ({
      structures: [],
      placementMode: null,

      addStructure: (structure) =>
        set((s) => ({ structures: [...s.structures, structure] })),

      updateStructure: (id, updates) =>
        set((s) => ({
          structures: s.structures.map((st) =>
            st.id === id ? { ...st, ...updates, updatedAt: new Date().toISOString() } : st,
          ),
        })),

      deleteStructure: (id) =>
        set((s) => ({ structures: s.structures.filter((st) => st.id !== id) })),

      setPlacementMode: (type) => set({ placementMode: type }),
    }),
    {
      name: 'ogden-structures',
      version: 2,
      partialize: (state) => ({ structures: state.structures }),
      migrate: (persisted, version) => {
        const state = persisted as { structures?: Structure[] };
        if (version < 2 && Array.isArray(state.structures)) {
          // v1 → v2: add serverId field to all existing structures
          state.structures = state.structures.map((s) => ({ serverId: undefined, ...s }));
        }
        return state;
      },
    },
  ),
);

// Hydrate from localStorage (Zustand v5)
useStructureStore.persist.rehydrate();
