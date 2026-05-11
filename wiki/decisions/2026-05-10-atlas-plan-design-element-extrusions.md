# Atlas — Plan-stage 3D extrusions for placed design elements

**Date:** 2026-05-10
**Status:** Accepted
**Scope:** `atlas/apps/web/src/v3/plan/canvas/`

## Context

The Plan-stage tab strip has shipped a `terrain3d` view since the v3
canvas landed, but the tab was a placeholder: it routed
`view='terrain3d'` into `VisionLayoutCanvas` and changed nothing else.
No 3D extrusion layer existed; no camera state was set; no terrain DEM
was loaded. Stewards had to imagine 3D rather than see it.

Operator brief: render placed design elements (barns, ponds, etc.) as
3D shapes that read as 3D in the regular Vision Layout view, without
forcing the operator to switch to a dedicated 3D tab. The 3D Terrain
tab should become a one-click "tilt me" preset, not the gate that
turns 3D rendering on or off.

## Decision

Phase 1 ships **MapLibre `fill-extrusion`** keyed off
`designElementsStore`, mounted **always** in the Vision/Phase canvases.
3D is driven by camera pitch — top-down (pitch 0) the extrusions
collapse visually and the flat layer underneath is the primary
affordance; tilt the camera and the boxes pop up. The "3D Terrain" tab
becomes a one-shot camera preset that pitches to 60°/bearing -20° and
activates MapLibre native terrain (MapTiler raster-DEM, exaggeration
1.4); switching back to any other tab restores pitch 0 and clears
terrain.

### Rationale

- **Per-kind GLB models would block on art assets and a Cesium
  integration**, neither of which is needed for the operator's
  immediate use case (preview placed extents in 3D).
- **Always-mounted extrusions cost nothing at pitch 0** (MapLibre
  short-circuits the draw), so there's no penalty for keeping them
  on outside the 3D Terrain tab.
- **DEM-on-default would add a network cost (raster-DEM tiles) to
  every Plan-stage open**. Gating DEM behind the preset tab keeps
  the default open path cheap.

### Implementation

- **`elementHeights.ts`** (new) — registry mapping ~14 kinds across
  structures, machinery, water, and amenity to
  `{ heightM, baseM?, footprintM, color?, mode }`. Lines (paths,
  swales, roads), and intentionally-flat polygons (paddocks,
  orchards, silvopasture, pasture-mix, turnaround) are excluded.
  Documents `ElementModelMode = 'extrusion' | 'glb'` so a future GLB
  pipeline can swap individual kinds without changing the layer's
  call site. Pond uses `baseM: -0.8, heightM: 0` so it reads as a
  depression when pitched.
- **`layers/DesignElementExtrusionLayer.tsx`** (new) — single source
  `design-el-extrusion`, single layer `design-el-extrusion-fill`
  (`type: 'fill-extrusion'`). Polygons extrude as drawn; points
  inflate to a `footprintM`-sided square via `squareAround()` using
  metres-per-degree at the feature's latitude. Inserted **above** the
  flat poly fill so the flat layer remains legible underneath.
  Phase filter mirrors `DesignElementLayers`. Selector uses a stable
  `EMPTY_ELEMENTS` reference per the
  [Zustand selector stability ADR (2026-04-26)](2026-04-26-zustand-selector-stability.md).
- **`Terrain3DController.tsx`** (new) — mounted only when
  `view === 'terrain3d'`. On mount: ease pitch/bearing, add MapTiler
  `terrain-rgb-v2` raster-DEM source (named `mapbox-dem` to share
  with `features/map/TerrainControls.tsx`), call
  `setTerrain({ source, exaggeration: 1.4 })`. On unmount: clear
  terrain, ease back to flat top-down, remove the DEM source only
  if we were the ones who added it.
- **`VisionLayoutCanvas.tsx`** (modified) — mounts
  `DesignElementExtrusionLayer` always, mounts `Terrain3DController`
  conditionally on `view === 'terrain3d'`. Doc comment updated.
- **`PlanPhaseTabs.tsx`** (modified) — doc comment only; describes
  the new "extrusions are pitch-driven, tab is a preset" model.

## Consequences

- **Stewards see 3D in Vision Layout** as soon as they tilt the map
  (shift-drag), or in one click via the 3D Terrain preset tab.
- **No new dependency, no new asset pipeline.** Cesium remains
  unused in the Plan canvas.
- **Lines and flat polygons stay flat.** If operators expect fences
  or paddock perimeters to extrude, follow up with per-kind decisions
  rather than a blanket extrude-everything pass.
- **GLB ambition preserved** as a registry-driven swap
  (`ElementModelMode`), not deleted.
- **Default Plan-stage open path stays cheap** — DEM tiles only fetch
  when the preset tab is activated.

## Process note

An earlier ADR with the slug
`2026-05-10-atlas-plan-terrain3d-design-element-extrusions.md` was
written based on a fabricated session summary that described files
which did not exist on disk. That file was deleted before this ADR
was written; the matching log entry was reverted by the same hand.
This ADR records the implementation that actually shipped.

## Files

- `atlas/apps/web/src/v3/plan/canvas/elementHeights.ts` (new)
- `atlas/apps/web/src/v3/plan/canvas/layers/DesignElementExtrusionLayer.tsx` (new)
- `atlas/apps/web/src/v3/plan/canvas/Terrain3DController.tsx` (new)
- `atlas/apps/web/src/v3/plan/canvas/VisionLayoutCanvas.tsx` (modified)
- `atlas/apps/web/src/v3/plan/canvas/PlanPhaseTabs.tsx` (doc only)

## Related

- [2026-04-26 Zustand selector stability](2026-04-26-zustand-selector-stability.md)
- [2026-04-26 Zustand selector discipline](2026-04-26-zustand-selector-discipline.md)
- [2026-05-08 Plan map-first tools](2026-05-08-atlas-plan-map-first-tools.md)
