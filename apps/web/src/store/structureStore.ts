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
  /**
   * Optional ridge/eave height in metres. Used by the §6 Solar & Climate
   * dashboard for shadow-length estimation. Falls back to the per-type
   * height table in `features/structures/footprints.ts` when unset.
   */
  heightM?: number;
  /**
   * Optional number of habitable stories (§9 multi-story-structure-support).
   * Treated as 1 when absent. Multiplies usable floor area and the rough
   * cost estimate inside the StructurePropertiesModal — does not currently
   * change the rendered footprint geometry on the map (which is a single
   * polygon at ground level regardless of vertical stack).
   */
  storiesCount?: number;
  /**
   * Optional steward-entered labor estimate in person-hours for this
   * structure. Read by the PhasingDashboard to roll up labor load by
   * phase alongside cost (§15 "Cost, labor, material need by phase").
   * Placeholder — not a scheduling engine.
   */
  laborHoursEstimate?: number;
  /**
   * Optional steward-entered material estimate in metric tons (delivered
   * mass). Read by the PhasingDashboard to roll up material demand by
   * phase alongside cost and labor (§15 "Cost, labor, material need by
   * phase"). Placeholder — not a BOM.
   */
  materialTonnageEstimate?: number;
  infrastructureReqs: string[];
  notes: string;
  /**
   * Optional marker for temporary or seasonal elements (§15 Timeline,
   * Phasing & Staged Buildout — "temporary vs permanent, seasonal phase
   * view"). `true` = present only for this phase or a subset of the year;
   * `false` / undefined = permanent. The PhasingDashboard uses this to
   * offer a "Hide temporary" toggle and render temporary items with a
   * dashed outline.
   */
  isTemporary?: boolean;
  /**
   * Optional 1-indexed months (1 = January, 12 = December) during which
   * the element is actually present on site. Meaningful only when
   * `isTemporary` is `true`. Empty / undefined = year-round when present.
   */
  seasonalMonths?: number[];
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
