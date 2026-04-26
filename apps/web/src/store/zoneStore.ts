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

/**
 * Invasive-species pressure — qualitative observation per zone.
 * Intentionally coarse (4 bands) so stewards can tag from a walk-through
 * without needing a formal survey. Mirrors the biological-activity vocab
 * used in `soilSampleStore`.
 */
export type InvasivePressure = 'none' | 'low' | 'medium' | 'high';

/**
 * Succession stage — where the vegetation community currently sits on
 * the bare-ground-to-climax gradient. Used to flag early-succession zones
 * that are regeneration candidates vs climax zones that should be left
 * alone. Drawn from standard old-field succession vocabulary.
 */
export type SuccessionStage = 'bare' | 'pioneer' | 'mid' | 'climax';

/**
 * Seasonality / phased-use tag — when during the year the zone is
 * actually in use. Captures the design distinction between a zone that
 * works year-round (e.g., a barn), one that's seasonal (e.g., a summer
 * camping area), and one that's intentionally temporary (e.g., an event
 * staging zone for a one-off gathering or a phased construction laydown).
 *
 * Spec: §8 `seasonal-temporary-phased-use-zones` (featureManifest).
 */
export type Seasonality =
  | 'year_round'
  | 'summer'
  | 'winter'
  | 'spring_fall'
  | 'temporary';

export const INVASIVE_PRESSURE_LABELS: Record<InvasivePressure, string> = {
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const INVASIVE_PRESSURE_COLORS: Record<InvasivePressure, string> = {
  none: '#6ba47a',
  low: '#d4c564',
  medium: '#c88b4a',
  high: '#a8574a',
};

export const SUCCESSION_STAGE_LABELS: Record<SuccessionStage, string> = {
  bare: 'Bare',
  pioneer: 'Pioneer',
  mid: 'Mid-succession',
  climax: 'Climax',
};

export const SUCCESSION_STAGE_COLORS: Record<SuccessionStage, string> = {
  bare: '#9c8b6e',
  pioneer: '#d4c564',
  mid: '#a8a06a',
  climax: '#6ba47a',
};

export const SEASONALITY_LABELS: Record<Seasonality, string> = {
  year_round: 'Year-round',
  summer: 'Summer only',
  winter: 'Winter only',
  spring_fall: 'Spring / Fall',
  temporary: 'Temporary / event',
};

/**
 * Season-tinted swatches: warm hues for summer, cool for winter, neutral
 * for year-round, soft green for shoulder seasons, dashed-purple feel
 * for temporary use. Picked to read distinctly from invasive/succession
 * palettes so the three rollups don't blur together.
 */
export const SEASONALITY_COLORS: Record<Seasonality, string> = {
  year_round: '#7e8a6f',
  summer: '#d68b4a',
  winter: '#5a87a8',
  spring_fall: '#9bb37a',
  temporary: '#a87fb8',
};

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
  /**
   * Ecological condition notes — optional per-zone tags captured by
   * stewards during walk-throughs. Drive the §7 EcologicalDashboard
   * rollup card and feed future regeneration-priority logic. Left
   * undefined on existing zones; no migration required because both
   * fields are optional.
   * Spec: §7 `invasive-succession-mapping` (featureManifest).
   */
  invasivePressure?: InvasivePressure | null;
  successionStage?: SuccessionStage | null;
  /**
   * Season / phased-use tag. Optional — undefined means the steward
   * hasn't made a call yet. No persist version bump because the field
   * is optional; existing zones load with `undefined`.
   * Spec: §8 `seasonal-temporary-phased-use-zones`.
   */
  seasonality?: Seasonality | null;
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
