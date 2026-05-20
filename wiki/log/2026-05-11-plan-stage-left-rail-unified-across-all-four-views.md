# 2026-05-11 — Plan-stage left rail unified across all four views


**Motive.** Plan stage rendered two different left rails: `PlanTools`
(module-driven) on Current Land, and `DesignElementPalette`
(categorised element catalog) on Vision / Year 1 / Year 5 / 3D
Terrain. Drawing the same conceptual feature meant learning two
different UIs; the Vision-canvas palette also held nine
elementCatalog kinds with no PlanTools counterpart.

**Change.** Phase 1 wired `PlanTools` on every Plan view and added
three Yeomans grazing polygons (orchard, silvopasture, pasture-mix)
to its Plant Systems group. A new `useToolIdToElementKind` bridge
translates `useMapToolStore.activeTool` into an `elementCatalog`
kind so a draw armed from PlanTools on the Current canvas persists
to `designElementsStore` (the same store the Vision canvas writes
into) — one source of truth across views with on-canvas acreage
labels via the shared `DesignElementLayers` mount.

Phase 2 ported the remaining nine elementCatalog kinds into
PlanTools (Spring under Water; Road + Bridge under Zones; Turnaround
as a new Machinery group; Oak / Pine / Apple / Shrub / Hedgerow
under Plant Systems). `MapToolId`'s water/zone/machinery/plant-systems
unions are now template-literal so future ports don't grow the type.
`PlanDrawHost` dispatches the twelve elementCatalog-backed tool ids
through the renamed-generic `PlanDesignElementHost`.

Phase 2 also widened the Current-view label pass in `PlanDataLayers`
to stamp `acresLabel` on Zone, Crop area, Paddock, Catchment polygon,
and Buffer ring (setback) props. The shared symbol layer's
`text-field` now appends "— X.X ac" when present, so polygons that
carry meaningful area read at a glance (e.g., "Zone A — 1.7 ac")
without disturbing point-feature labels.

**Skipped (redundant)** Pond (covered by Storage), Swale (already
present). Equipment-yard stays under Built Environment via the BE
registry.

**Verification.** `tsc` clean for touched files (only the
pre-existing `DesignElementScenegraphLayer.tsx(152,24)` error
remains, unrelated to this work). DOM accessibility-tree snapshot
of `/v3/project/mtc/plan/livestock` confirms all 9 ported tools
surface in their target groups, and the new `machinery` group
renders with Turnaround.

**Files.** `apps/web/src/v3/plan/PlanTools.tsx`,
`apps/web/src/v3/observe/components/measure/useMapToolStore.ts`,
`apps/web/src/v3/plan/canvas/useToolIdToElementKind.ts` (new),
`apps/web/src/v3/plan/draw/PlanDrawHost.tsx`,
`apps/web/src/v3/plan/draw/tools/PlanDesignElementHost.tsx` (new),
`apps/web/src/v3/plan/draw/tools/PlantSystemsDesignElementHost.tsx`
(new, retained per no-deletion rule),
`apps/web/src/v3/plan/layers/PlanDataLayers.tsx`.
