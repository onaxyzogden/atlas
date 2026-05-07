import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Map-tool ids — single source of truth for the active drawing/measure tool.
 *
 * Two families:
 *   - measure tools (overlays/basemap/distance/elevation/area/boundary) —
 *     legacy ids without prefix.
 *   - OBSERVE module tools (Phase 4) — prefixed `observe.<module>.<tool>`
 *     so they coexist with measure tools in one flat enum.
 *
 * One-tool-at-a-time semantics: setActiveTool(x) clears any previously
 * active tool, regardless of family.
 */
export type MapToolId =
  | 'overlays'
  | 'basemap'
  | 'distance'
  | 'elevation-point'
  | 'elevation-path'
  | 'area'
  | 'boundary'
  // Observe Module 1 — Human Context
  | 'observe.human-context.neighbour-pin'
  | 'observe.human-context.steward'
  | 'observe.human-context.access-road'
  // Observe Module 2 — Macroclimate & Hazards
  | 'observe.macroclimate-hazards.frost-pocket'
  | 'observe.macroclimate-hazards.hazard-zone'
  // Observe Module 3 — Topography
  | 'observe.topography.contour-line'
  | 'observe.topography.high-point'
  | 'observe.topography.drainage-line'
  // Observe Module 4 — Earth/Water/Ecology
  | 'observe.earth-water-ecology.watercourse'
  | 'observe.earth-water-ecology.soil-sample'
  | 'observe.earth-water-ecology.ecology-zone'
  // Observe Module 5 — Sectors & Zones
  | 'observe.sectors-zones.sun-wind-wedge'
  | 'observe.sectors-zones.permaculture'
  // Observe Module 6 — SWOT Synthesis
  | 'observe.swot-synthesis.strength'
  | 'observe.swot-synthesis.weakness'
  | 'observe.swot-synthesis.opportunity'
  | 'observe.swot-synthesis.threat';

export interface MapToolState {
  activeTool: MapToolId | null;
  setActiveTool: (tool: MapToolId | null) => void;
}

export const useMapToolStore = create<MapToolState>((set) => ({
  activeTool: null,
  setActiveTool: (tool) => set({ activeTool: tool }),
}));

export type BasemapKey =
  | 'topographic'
  | 'satellite'
  | 'hybrid'
  | 'street'
  | 'terrain';

export const BASEMAP_OPTIONS: { key: BasemapKey; label: string }[] = [
  { key: 'topographic', label: 'Topographic' },
  { key: 'terrain', label: 'Terrain' },
  { key: 'satellite', label: 'Satellite' },
  { key: 'hybrid', label: 'Hybrid' },
  { key: 'street', label: 'Street' },
];

export interface BasemapState {
  basemap: BasemapKey;
  setBasemap: (key: BasemapKey) => void;
}

export const useBasemapStore = create<BasemapState>()(
  persist(
    (set) => ({
      basemap: 'topographic',
      setBasemap: (key) => set({ basemap: key }),
    }),
    { name: 'ogden-atlas-basemap' },
  ),
);
