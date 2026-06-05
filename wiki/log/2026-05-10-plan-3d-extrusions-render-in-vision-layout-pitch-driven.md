# 2026-05-10 — Plan 3D extrusions render in Vision Layout (pitch-driven)


Built the placed-element 3D path the `terrain3d` tab had been a
placeholder for since v3 landed. Operator brief: 3D should be visible
in the regular Vision Layout (not gated by a tab), and the 3D Terrain
tab should become a one-click camera preset.

Approach: MapLibre `fill-extrusion` over `designElementsStore`,
mounted **always** in the Vision/Phase canvases. Pitch decides whether
3D reads or not — top-down (pitch 0) the extrusions collapse visually
and the flat layer underneath does the work. The 3D Terrain tab now
mounts `Terrain3DController`, which eases pitch to 60°/bearing -20°
and sets terrain (MapTiler raster-DEM, exaggeration 1.4); switching
back to any other tab restores flat.

Files:

- `apps/web/src/v3/plan/canvas/elementHeights.ts` (new) — per-kind
  registry mapping ~14 kinds to `{ heightM, baseM?, footprintM }`.
  Lines and flat polygons (paddock, orchard, silvopasture,
  pasture-mix, turnaround, paths, swales, roads) excluded by design.
  Pond uses negative `baseM` so it reads as a depression. Documents
  `ElementModelMode = 'extrusion' | 'glb'` for a future GLB swap.
- `apps/web/src/v3/plan/canvas/layers/DesignElementExtrusionLayer.tsx`
  (new) — single `fill-extrusion` layer; polygons extrude as drawn,
  points inflate to a `footprintM`-sided square via local
  `squareAround()`. Inserted above the flat poly fill so flats
  remain legible top-down. Uses the shared `EMPTY_ELEMENTS` selector
  pattern.
- `apps/web/src/v3/plan/canvas/Terrain3DController.tsx` (new) —
  view==='terrain3d' camera preset. Reuses the `mapbox-dem` source
  name from `features/map/TerrainControls.tsx` so the two paths
  share a source if both happen to mount.
- `apps/web/src/v3/plan/canvas/VisionLayoutCanvas.tsx` — mounts the
  extrusion layer always; mounts `Terrain3DController` only when
  the 3D Terrain tab is active.
- `apps/web/src/v3/plan/canvas/PlanPhaseTabs.tsx` — doc comment only.

Verification: typecheck (`tsc --noEmit -p apps/web` with
`NODE_OPTIONS=--max-old-space-size=8192`) green; ESLint reported
0 errors on the touched files. Preview screenshot not captured this
round — to be done in a follow-up dev-server pass.

ADR: [`wiki/decisions/2026-05-10-atlas-plan-design-element-extrusions.md`](decisions/2026-05-10-atlas-plan-design-element-extrusions.md)

Process note: an earlier wiki ADR
(`2026-05-10-atlas-plan-terrain3d-design-element-extrusions.md`) was
written based on a fabricated session summary describing files that
did not exist. That file was deleted and the matching log entry
reverted before this real entry was written.
