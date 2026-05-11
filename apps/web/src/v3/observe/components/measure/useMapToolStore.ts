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
  // Observe Module — Built Environment
  | 'observe.built-environment.building'
  | 'observe.built-environment.well'
  | 'observe.built-environment.septic'
  | 'observe.built-environment.power-line'
  | 'observe.built-environment.buried-utility'
  | 'observe.built-environment.fence'
  | 'observe.built-environment.gate'
  | 'observe.built-environment.driveway'
  // Observe Module — Built Environment (Phase 5.2.A: 23 additional registry
  // kinds, surfaced via the generic `BeV2ExistingTool`)
  | 'observe.built-environment.cabin'
  | 'observe.built-environment.yurt'
  | 'observe.built-environment.tent-glamping'
  | 'observe.built-environment.prayer-pavilion'
  | 'observe.built-environment.pavilion'
  | 'observe.built-environment.classroom'
  | 'observe.built-environment.bathhouse'
  | 'observe.built-environment.earthship'
  | 'observe.built-environment.workshop'
  | 'observe.built-environment.lookout'
  | 'observe.built-environment.barn'
  | 'observe.built-environment.greenhouse'
  | 'observe.built-environment.shed'
  | 'observe.built-environment.animal-shelter'
  | 'observe.built-environment.compost'
  | 'observe.built-environment.water-tank'
  | 'observe.built-environment.water-pump-house'
  | 'observe.built-environment.solar-array'
  | 'observe.built-environment.machinery-shed'
  | 'observe.built-environment.fuel-station'
  | 'observe.built-environment.equipment-yard'
  | 'observe.built-environment.fire-circle'
  | 'observe.built-environment.parking'
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
  // One tool per SectorType so each kind of wedge is its own toolbar
  // button (no in-popover Type dropdown).
  | 'observe.sectors-zones.sun-summer'
  | 'observe.sectors-zones.sun-winter'
  | 'observe.sectors-zones.wind-prevailing'
  | 'observe.sectors-zones.wind-storm'
  | 'observe.sectors-zones.fire'
  | 'observe.sectors-zones.noise'
  | 'observe.sectors-zones.wildlife'
  | 'observe.sectors-zones.view'
  | 'observe.sectors-zones.permaculture'
  // Observe Module 6 — SWOT Synthesis
  | 'observe.swot-synthesis.strength'
  | 'observe.swot-synthesis.weakness'
  | 'observe.swot-synthesis.opportunity'
  | 'observe.swot-synthesis.threat'
  // Plan Module 2 — Water Management (directed-graph nodes)
  | 'plan.water-management.catchment'
  | 'plan.water-management.storage'
  | 'plan.water-management.swale'
  | 'plan.water-management.sink'
  // Plan Module 3 — Zone & Circulation
  | 'plan.zone-circulation.zone'
  | 'plan.zone-circulation.path'
  // Plan Module 3 — Zone & Circulation (buffer rings, Tier B / B2)
  | 'plan.zone-circulation.buffer-ring'
  // Plan Module 5 — Plant Systems & Polyculture
  | 'plan.plant-systems.crop-area'
  | 'plan.plant-systems.guild'
  // Plan Module 6 — Soil Fertility & Closed-Loop
  | 'plan.soil-fertility.fertility-unit'
  // Plan Module 6 — Soil Fertility (flow connectors, Tier B / B3)
  | 'plan.soil-fertility.flow-connector'
  // Plan Module 4 — Livestock & Subdivision
  | 'plan.livestock.paddock'
  // Plan Module 4 — Livestock fence-line (Farm-Scholar 2026-05-10: strip-grazing
  // wire that the polygon Paddock tool cannot represent)
  | 'plan.livestock.fence-line'
  // Plan Module 7 — Broiler Product Map (post-farm-gate value chain)
  | 'plan.broiler-product-map.slaughter-point'
  | 'plan.broiler-product-map.cold-chain-unit'
  | 'plan.broiler-product-map.market-node'
  // Plan Module — Structures & Subsystems (Yeomans rank 5+6)
  | 'plan.structures-subsystems.structure'
  // Plan Module — Structures & Subsystems (utility runs, Tier B / B1)
  | 'plan.structures-subsystems.utility-run'
  // Plan Module — Principle Verification (annotation marker, Tier B / B5)
  | 'plan.principle-verification.note'
  // Plan Module — Principle Verification (monitoring transect, Tier B / B4)
  | 'plan.principle-verification.transect'
  // Act Module — Harvest log (point-on-existing-crop-area, no new geometry)
  | 'act.harvest.log-entry'
  // Act Module — Maintenance event log (click an irrigation feature)
  | 'act.maintain.log-event'
  // Act Module — Livestock move log (click a paddock)
  | 'act.livestock.log-move';

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
