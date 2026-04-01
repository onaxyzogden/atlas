/**
 * Zone store — manages custom land-use zones with localStorage persistence.
 *
 * Zones are drawn on the map as polygons with custom names, colors,
 * categories, and primary/secondary use designations.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ZoneCategory =
  | 'habitation'
  | 'food_production'
  | 'livestock'
  | 'commons'
  | 'spiritual'
  | 'education'
  | 'retreat'
  | 'conservation'
  | 'water_retention'
  | 'infrastructure'
  | 'access'
  | 'buffer'
  | 'future_expansion';

export const ZONE_CATEGORY_CONFIG: Record<ZoneCategory, { label: string; color: string; icon: string }> = {
  habitation:       { label: 'Habitation',        color: '#8B6E4E', icon: '🏠' },
  food_production:  { label: 'Food Production',   color: '#4A7C3F', icon: '🌱' },
  livestock:        { label: 'Livestock',          color: '#7A6B3A', icon: '🐑' },
  commons:          { label: 'Commons',            color: '#5B8A72', icon: '🌳' },
  spiritual:        { label: 'Spiritual',          color: '#6B5B8A', icon: '🕌' },
  education:        { label: 'Education',          color: '#4A6B8A', icon: '📚' },
  retreat:          { label: 'Retreat / Guest',    color: '#8A6B5B', icon: '🏕' },
  conservation:     { label: 'Conservation',       color: '#2D6B4F', icon: '🌿' },
  water_retention:  { label: 'Water Retention',    color: '#3A7A9A', icon: '💧' },
  infrastructure:   { label: 'Infrastructure',     color: '#6B6B6B', icon: '⚡' },
  access:           { label: 'Access / Circulation', color: '#8A7B4A', icon: '🛤' },
  buffer:           { label: 'Buffer / Setback',   color: '#9B8A6A', icon: '◻' },
  future_expansion: { label: 'Future Expansion',   color: '#7A8A9A', icon: '📐' },
};

export interface LandZone {
  id: string;
  projectId: string;
  name: string;
  category: ZoneCategory;
  color: string;
  primaryUse: string;
  secondaryUse: string;
  notes: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  areaM2: number;
  createdAt: string;
  updatedAt: string;
}

interface ZoneState {
  zones: LandZone[];

  addZone: (zone: LandZone) => void;
  updateZone: (id: string, updates: Partial<LandZone>) => void;
  deleteZone: (id: string) => void;
  getProjectZones: (projectId: string) => LandZone[];
}

export const useZoneStore = create<ZoneState>()(
  persist(
    (set, get) => ({
      zones: [],

      addZone: (zone) => set((s) => ({ zones: [...s.zones, zone] })),

      updateZone: (id, updates) =>
        set((s) => ({
          zones: s.zones.map((z) =>
            z.id === id ? { ...z, ...updates, updatedAt: new Date().toISOString() } : z,
          ),
        })),

      deleteZone: (id) => set((s) => ({ zones: s.zones.filter((z) => z.id !== id) })),

      getProjectZones: (projectId) => get().zones.filter((z) => z.projectId === projectId),
    }),
    { name: 'ogden-zones', version: 1 },
  ),
);

// Hydrate from localStorage (Zustand v5)
useZoneStore.persist.rehydrate();

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ogdenZoneStore = useZoneStore;
}
