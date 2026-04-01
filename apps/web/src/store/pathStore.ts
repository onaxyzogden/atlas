/**
 * Path store — roads, trails, corridors, animal movement routes.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  createdAt: string;
  updatedAt: string;
}

export const PATH_TYPE_CONFIG: Record<PathType, { label: string; color: string; dashArray: number[]; width: number }> = {
  main_road:        { label: 'Main Road',         color: '#8B6E4E', dashArray: [],     width: 3 },
  secondary_road:   { label: 'Secondary Road',    color: '#7A6B3A', dashArray: [],     width: 2.5 },
  emergency_access: { label: 'Emergency Access',  color: '#c44e3f', dashArray: [6, 3], width: 2.5 },
  service_road:     { label: 'Service Road',      color: '#6B6B6B', dashArray: [],     width: 2 },
  pedestrian_path:  { label: 'Pedestrian Path',   color: '#8A9A74', dashArray: [4, 4], width: 2 },
  trail:            { label: 'Trail',             color: '#5B8A72', dashArray: [3, 3], width: 1.5 },
  farm_lane:        { label: 'Farm Lane',         color: '#7A6B3A', dashArray: [8, 4], width: 2 },
  animal_corridor:  { label: 'Animal Corridor',   color: '#8A7A4A', dashArray: [2, 2], width: 2 },
  grazing_route:    { label: 'Grazing Route',     color: '#6B8A4A', dashArray: [4, 2], width: 1.5 },
  arrival_sequence: { label: 'Arrival Sequence',  color: '#c4a265', dashArray: [],     width: 2.5 },
  quiet_route:      { label: 'Quiet Route',       color: '#6B5B8A', dashArray: [6, 4], width: 1.5 },
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
