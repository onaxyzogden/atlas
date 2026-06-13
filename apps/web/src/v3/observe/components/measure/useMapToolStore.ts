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
  // Adopt a building footprint that the basemap already renders as a 3D
  // extrusion (OpenMapTiles `building` source-layer). One click on the map
  // captures the footprint polygon + `render_height` as a `state: 'existing'`
  // V2 entity and opens the inline edit form for labeling.
  | 'observe.built-environment.adopt-basemap'
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
  | 'observe.topography.erosion-flag'
  | 'observe.topography.runoff-path'
  // Observe Module 4 — Earth/Water/Ecology
  | 'observe.earth-water-ecology.watercourse'
  // Adopt a basemap water feature (OpenMapTiles `water` polygons +
  // `waterway` lines) into the project. Polygon hits create a `Waterbody`;
  // line hits create a `Watercourse`. Mirrors the BE adopt-basemap idiom.
  | 'observe.earth-water-ecology.adopt-water'
  | 'observe.earth-water-ecology.soil-sample'
  | 'observe.earth-water-ecology.vegetation'
  | 'observe.earth-water-ecology.pasture'
  | 'observe.earth-water-ecology.conventional-crop'
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
  // Plan Module 2 — Water Management. Template-literal so kinds ported
  // from elementCatalog (spring, 2026-05-11) flow through without growing
  // the union. Existing per-domain ids: catchment, storage, swale, sink.
  | `plan.water-management.${string}`
  // Plan Module 3 — Zone & Circulation. Template-literal: zone, path,
  // buffer-ring (Tier B / B2), plus elementCatalog ports (road, bridge).
  | `plan.zone-circulation.${string}`
  // Plan Module — Machinery & Equipment (turnaround ported 2026-05-11
  // from elementCatalog; machinery-shed/equipment-yard/fuel-station live
  // under structures-subsystems via the BE registry).
  | `plan.machinery.${string}`
  // Plan Module 5 — Plant Systems & Polyculture. Template-literal type so
  // new plant-system polygon tools (orchard / silvopasture / pasture-mix
  // ported from elementCatalog 2026-05-11, plus any future kinds) flow
  // through without growing the union. Mirrors the BE prefix below.
  | `plan.plant-systems.${string}`
  // Plan Module 6 — Soil Fertility & Closed-Loop
  | 'plan.soil-fertility.fertility-unit'
  // Plan Module 6 — Soil Fertility (flow connectors, Tier B / B3)
  | 'plan.soil-fertility.flow-connector'
  // Plan Module 4 — Livestock & Subdivision
  | 'plan.livestock.paddock'
  // Plan Module 4 — Livestock fence-line (Farm-Scholar 2026-05-10: strip-grazing
  // wire that the polygon Paddock tool cannot represent)
  | 'plan.livestock.fence-line'
  // Plan Module 4 — Livestock > Product Chain (post-farm-gate value chain
  // folded into Livestock 2026-05-10: slaughter → cold chain → market)
  | 'plan.livestock.slaughter-point'
  | 'plan.livestock.cold-chain-unit'
  | 'plan.livestock.market-node'
  // Plan Module 4 — Livestock > Schedule move (in-card create flow for
  //  `ScheduledLivestockMove` plans; mirrors the Act-stage `LivestockMoveTool`
  //  but writes to `scheduledLivestockMoveStore`)
  | 'plan.livestock.schedule-move'
  // Plan Module — Structures & Subsystems (Yeomans rank 5+6)
  | 'plan.structures-subsystems.structure'
  // Plan Module — Structures & Subsystems (utility runs, Tier B / B1)
  | 'plan.structures-subsystems.utility-run'
  // Plan Module — Structures & Subsystems (typed utility points, C4 — reaches
  // the C2 utilityStore promotion; offers the 11 non-BE utility types)
  | 'plan.structures-subsystems.utility-point'
  // Plan Module — Built Environment (registry-driven, all 31 BE kinds with
  // `state: 'proposed'`). Mirrors Observe's BE rail. Pattern keeps the
  // strict-literal surface small while letting the kind registry grow:
  // dispatched in PlanDrawHost via prefix-match → BeV2ExistingTool.
  | `plan.structures-subsystems.be.${string}`
  // Plan Module — Habitat Allocation (A2). Template-literal so the 7
  // habitat-feature kinds added 2026-05-21 (owl-box / raptor-perch /
  // nest-box / brush-pile / snag / insectary-strip / wetland-edge) flow
  // through without growing the union. Dispatch in PlanDesignElementHost
  // via `useToolIdToElementKind` switch.
  | `plan.habitat-allocation.${string}`
  // Plan Module — Principle Verification (annotation marker, Tier B / B5)
  | 'plan.principle-verification.note'
  // Plan Module — Principle Verification (monitoring transect, Tier B / B4)
  | 'plan.principle-verification.transect'
  // Act Module — Harvest log (point-on-existing-crop-area, no new geometry)
  | 'act.harvest.log-entry'
  // Act Module — Maintenance event log (click an irrigation feature)
  | 'act.maintain.log-event'
  // Act Module — Livestock move log (click a paddock)
  | 'act.livestock.log-move'
  // Act Module — s2-ecology-c1 vegetation survey (draw community polygon)
  | 'act.ecology.veg-survey'
  // Act Module — s2-terrain-c2 slope survey (one draw tool per slope class;
  // the armed tool encodes which class the next polygon joins)
  | 'act.terrain.slope-flat'
  | 'act.terrain.slope-gentle'
  | 'act.terrain.slope-moderate'
  | 'act.terrain.slope-steep'
  | 'act.terrain.slope-vsteep'
  | 'act.terrain.slope-extreme';

export interface MapToolState {
  activeTool: MapToolId | null;
  setActiveTool: (tool: MapToolId | null) => void;
  /**
   * Magnet toggle (Phase 4): whether vertex/edge snapping is armed for draw
   * tools. Default on. Read live at snap-application time (`snapDrawModes`
   * `applySnap` + the continuous-point `snap` helper) so flipping it mid-draw
   * takes effect on the next pointer event without re-arming the active tool.
   * One central gate rather than threading `snap: snapEnabled` through ~40
   * call sites — behaviour-equivalent and live-toggleable.
   */
  snapEnabled: boolean;
  setSnapEnabled: (enabled: boolean) => void;
}

export const useMapToolStore = create<MapToolState>((set) => ({
  activeTool: null,
  setActiveTool: (tool) => set({ activeTool: tool }),
  snapEnabled: true,
  setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
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
