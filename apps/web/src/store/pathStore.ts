/**
 * Path store — roads, trails, corridors, animal movement routes.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { path } from '../lib/tokens';

export type PathType =
  | 'main_road'
  | 'secondary_road'
  | 'emergency_access'
  | 'service_road'
  | 'pedestrian_path'
  | 'trail'
  | 'farm_lane'
  | 'animal_corridor'
  | 'grazing_route'
  | 'arrival_sequence'
  | 'quiet_route';

export interface DesignPath {
  id: string;
  projectId: string;
  name: string;
  type: PathType;
  color: string;
  geometry: GeoJSON.LineString;
  lengthM: number;
  phase: string;
  notes: string;
  /**
   * Optional marker for temporary or seasonal paths (§15 Timeline,
   * Phasing & Staged Buildout — "temporary vs permanent, seasonal phase
   * view"). `true` = present only for this phase or a subset of the year
   * (e.g., winter-only grazing route); `false` / undefined = permanent.
   * The PhasingDashboard uses this to offer a "Hide temporary" toggle and
   * render temporary items with a dashed outline.
   */
  isTemporary?: boolean;
  /**
   * Optional 1-indexed months (1 = January, 12 = December) during which
   * the path is actually in use. Meaningful only when `isTemporary` is
   * `true`. Empty / undefined = year-round when present.
   */
  seasonalMonths?: number[];
  createdAt: string;
  updatedAt: string;
}

export const PATH_TYPE_CONFIG: Record<PathType, { label: string; color: string; dashArray: number[]; width: number }> = {
  main_road:        { label: 'Main Road',         color: path.main_road, dashArray: [],     width: 3 },
  secondary_road:   { label: 'Secondary Road',    color: path.secondary_road, dashArray: [],     width: 2.5 },
  emergency_access: { label: 'Emergency Access',  color: path.emergency_access, dashArray: [6, 3], width: 2.5 },
  service_road:     { label: 'Service Road',      color: path.service_road, dashArray: [],     width: 2 },
  pedestrian_path:  { label: 'Pedestrian Path',   color: path.pedestrian_path, dashArray: [4, 4], width: 2 },
  trail:            { label: 'Trail',             color: path.trail, dashArray: [3, 3], width: 1.5 },
  farm_lane:        { label: 'Farm Lane',         color: path.farm_lane, dashArray: [8, 4], width: 2 },
  animal_corridor:  { label: 'Animal Corridor',   color: path.animal_corridor, dashArray: [2, 2], width: 2 },
  grazing_route:    { label: 'Grazing Route',     color: path.grazing_route, dashArray: [4, 2], width: 1.5 },
  arrival_sequence: { label: 'Arrival Sequence',  color: path.arrival_sequence, dashArray: [],     width: 2.5 },
  quiet_route:      { label: 'Quiet Route',       color: path.quiet_route, dashArray: [6, 4], width: 1.5 },
};

interface PathState {
  paths: DesignPath[];

  addPath: (path: DesignPath) => void;
  updatePath: (id: string, updates: Partial<DesignPath>) => void;
  deletePath: (id: string) => void;
}

export const usePathStore = create<PathState>()(
  persist(
    (set) => ({
      paths: [],

      addPath: (path) => set((s) => ({ paths: [...s.paths, path] })),

      updatePath: (id, updates) =>
        set((s) => ({
          paths: s.paths.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p,
          ),
        })),

      deletePath: (id) => set((s) => ({ paths: s.paths.filter((p) => p.id !== id) })),
    }),
    { name: 'ogden-paths', version: 1 },
  ),
);

// Hydrate from localStorage (Zustand v5)
usePathStore.persist.rehydrate();
