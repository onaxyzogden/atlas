/**
 * Zone store — manages custom land-use zones with localStorage persistence.
 *
 * Zones are drawn on the map as polygons with custom names, colors,
 * categories, and primary/secondary use designations.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zone } from '../lib/tokens';

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
  habitation:       { label: 'Habitation',        color: zone.habitation, icon: '🏠' },
  food_production:  { label: 'Food Production',   color: zone.food_production, icon: '🌱' },
  livestock:        { label: 'Livestock',          color: zone.livestock, icon: '🐑' },
  commons:          { label: 'Commons',            color: zone.commons, icon: '🌳' },
  spiritual:        { label: 'Spiritual',          color: zone.spiritual, icon: '🕌' },
  education:        { label: 'Education',          color: zone.education, icon: '📚' },
  retreat:          { label: 'Retreat / Guest',    color: zone.retreat, icon: '🏕' },
  conservation:     { label: 'Conservation',       color: zone.conservation, icon: '🌿' },
  water_retention:  { label: 'Water Retention',    color: zone.water_retention, icon: '💧' },
  infrastructure:   { label: 'Infrastructure',     color: zone.infrastructure, icon: '⚡' },
  access:           { label: 'Access / Circulation', color: zone.access, icon: '🛤' },
  buffer:           { label: 'Buffer / Setback',   color: zone.buffer, icon: '◻' },
  future_expansion: { label: 'Future Expansion',   color: zone.future_expansion, icon: '📐' },
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
  /** Server-assigned UUID after backend sync (undefined = not yet synced) */
  serverId?: string;
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
    {
      name: 'ogden-zones',
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as { zones?: LandZone[] };
        if (version < 2 && Array.isArray(state.zones)) {
          // v1 → v2: add serverId field to all existing zones
          state.zones = state.zones.map((z) => ({ serverId: undefined, ...z }));
        }
        return state;
      },
    },
  ),
);

// Hydrate from localStorage (Zustand v5)
useZoneStore.persist.rehydrate();

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ogdenZoneStore = useZoneStore;
}
