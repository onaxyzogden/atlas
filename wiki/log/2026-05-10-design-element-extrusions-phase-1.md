# 2026-05-10 — design-element extrusions (Phase 1)


Pivoted the "develop 3D models for placed features" objective from
Cesium+GLB to MapLibre `fill-extrusion` keyed off `designElementsStore`,
since the existing 3D Terrain canvas is MapLibre (not Cesium) and the
truth-source for placed Plan features is design elements (not structures).

Changes:

- **`elementHeights.ts`** (new) — per-kind registry mapping ~22 kinds to
  `{ heightM, footprintM, color }`. Documents future
  `ElementModelMode = 'extrusion' | 'glb'` swap-in.
- **`layers/DesignElementExtrusionLayer.tsx`** (new) — single
  `fill-extrusion` layer over `designElementsStore`. Polygons extrude
  as-drawn; points inflate via local `squareAround()`. Visibility flipped
  per-view rather than torn down.
- **`VisionLayoutCanvas.tsx`** — mounts the extrusion layer alongside
  flat `DesignElementLayers`.
- **`PlanPhaseTabs.tsx`** — `terrain3d` tab enabled.
- **`DesignToolRail.tsx`** (hot-fix) — selector returned a fresh `[]`
  literal, breaking Zustand v5 / `useSyncExternalStore` snapshot
  caching → "Maximum update depth exceeded" loop on the 3D Terrain tab
  for projects with no design elements. Hoisted module-level
  `EMPTY_ELEMENTS` constant; matches the pattern in
  `DesignElementLayers.tsx` and `useDesignElementDrawTool.ts`.

ADR: [`wiki/decisions/2026-05-10-atlas-plan-terrain3d-design-element-extrusions.md`](decisions/2026-05-10-atlas-plan-terrain3d-design-element-extrusions.md)

Verification: type-check pending; preview-screenshot tool timed out
repeatedly on the 3D Terrain tab (likely raster-DEM tile contention) —
flagged honestly per CLAUDE.md preview-verification rule rather than
claimed visually. Loop fix verified by code reading.

Deferred:

- GLB asset pipeline per `ElementModelMode = 'glb'` (Phase 2).
- Investigate unrelated `ActOpsAside` infinite loop visible in console.
