# 2026-05-07 — Plan · Vision-Layout canvas + design-element palette


**Branch:** `feat/atlas-permaculture` · **Type:** feature

Added a new spatial-design surface to the Plan stage to address the
practitioner-facing UI gap surfaced by a reference image (categorised
palette, top temporal tabs, right tool rail, floating basemap card).

- **New top tabs** (`PlanPhaseTabs`): `Current Land · Vision Layout · Year 1 ·
  Year 5 · 3D Terrain` (terrain disabled v1). Year tabs filter the canvas by
  Yeomans Scale of Permanence index.
- **New left palette** (`DesignElementPalette`) — 5 Yeomans-ordered
  categories (Grazing, Structures, Water, Access, Amenity) with search and a
  disabled "Upload Custom Element" placeholder.
- **New right tool rail** (`DesignToolRail`) — Select/Pan/Draw/Duplicate
  placeholders + working Zoom +/−, Layers placeholder.
- **New bottom-left card** (`BaseMapCard`) — basemap dropdown + overlay
  toggles, reusing `useBasemapStore` and `useMatrixTogglesStore` so Observe
  and Plan stay in sync.
- **New persisted store** (`useDesignElementsStore`) — per-project list of
  design elements (geometry, kind, phase, label, acreage). Distinct from
  `siteAnnotationsStore` to preserve the diagnose-before-design ordering.
- **New rendering layer** (`DesignElementLayers`) — MapLibre poly/line/point
  + label sources, filtered by active PlanView's Yeomans cap.
- **Reused** `useMapboxDrawTool` via a thin `useDesignElementDrawTool`
  wrapper that writes to the design store, computes acres via turf, and
  auto-labels polygons (A, B, …).
- `PlanLayout.tsx` now swaps `leftRail` / `canvas` / `bottomTray` based on
  `activeView`. Module bar hidden on the canvas surface.
- Type-check (`tsc --noEmit`) green.

ADR: [2026-05-07-plan-vision-layout-canvas](decisions/2026-05-07-plan-vision-layout-canvas.md).
