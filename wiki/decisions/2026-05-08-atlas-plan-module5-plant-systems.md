# 2026-05-08 — Plan Module 5 (Plant Systems) map-first: Crop area polygon tool

## Context

Continuing the Plan map-first conversion sequence after Modules 2 + 3
(beachhead) and the Module 1 overlay-lens-not-draw decision. Module 5
(Plant Systems & Polyculture) carries native geometry — `CropArea`
already has a full `GeoJSON.Polygon` field — making it a clean fit for
the same draw-tool + inline-popover pattern.

## Decision

Ship a single map-first tool for v1: **Crop area polygon**
(`plan.plant-systems.crop-area`). The Guild tool is deferred.

### Architecture

- **Tool id** — `plan.plant-systems.crop-area` added to the
  `MapToolId` union; sits next to the existing `plan.water-management.*`
  and `plan.zone-circulation.*` ids.
- **`CropAreaTool.tsx`** — polygon mode via `useMapboxDrawTool`. On
  `draw.create` it generates an id (`crop-…`), computes `areaM2` via
  `turf.area`, picks anchor at `turf.centroid`, and writes a skeleton
  `CropArea` via `useCropStore.addCropArea` with sensible defaults
  (`type='orchard'`, `waterDemand='medium'`, `irrigationType='rain_fed'`,
  `phase='Phase 1'`, empty species). The popover patches four essential
  fields on Save (name / type / water demand / irrigation type);
  `onCancel` calls `deleteCropArea` so ESC truly rolls back.
- **`PlanDrawHost`** — new switch case mounts `CropAreaTool` when
  `activeTool === 'plan.plant-systems.crop-area'`.
- **`PlanDataLayers`** — extended to push crop polygons onto the
  same `plan-data-poly` source as zones, with a per-type fill colour
  keyed to a 10-entry `TYPE_COLOR` palette in the tool. The shared
  `plan-data-poly-fill` + `plan-data-poly-line` layers cover both.
- **`PlanTools` rail** — new `plant-systems` entry in `TOOL_GROUPS`
  with one button (Sprout glyph). The other six non-beachhead modules
  remain on `Open module` fallback.

### Trade-offs

- **Re-using `cropStore`** rather than creating a new lightweight
  store. The Plan slide-up's Plant Systems cards already CRUD the
  same store, so a just-drawn polygon shows up in the slide-up
  immediately and we don't fork persistence.
- **Guild deferred.** `Guild.centroidUv` is normalised parcel
  coordinates `[u, v] ∈ [0,1]²`, not `[lng, lat]`. Converting requires
  the parcel boundary box (which v3 doesn't currently feed into the
  Guild builder), and the `members: GuildMember[]` field carries
  per-member layer assignments that exceed the popover contract (2–4
  fields). The slide-up's `GuildSpatialBuilderCard` remains the
  canonical guild-authoring surface.
- **No `phase` field in the popover.** Phase tagging is a planning
  attribute spanning multiple crop areas; it belongs in the slide-up
  rather than at draw-time. Default is `'Phase 1'`.

## Out of scope (deferred)

- Guild map tool (centroidUv conversion + members capture).
- Per-crop popover field for `species: string[]` — typed string-list
  capture is unwieldy in an inline popover; species authoring stays in
  the slide-up.
- Vertex-edit / drag-reposition for crop polygons (uniform with the
  rest of the Plan map-first features).
- The Permanence Overlay lens for Module 1 (still waiting on Modules
  6–9 to populate the map).

## Verification

- `tsc --noEmit` (with `NODE_OPTIONS=--max-old-space-size=8192`) clean.
- Preview at `/v3/project/mtc/plan` (Current Land tab): Plant Systems
  section present in the rail under Livestock; clicking the Crop area
  button toggles `data-active='true'` and mounts the dock popover.
  Bento parity preserved.

## Next step

**Module 6 — Soil Fertility & Closed-Loop.** Two candidate tools:
fertility infra as points (compost bay, worm farm, biochar kiln) and
soil beds as polygons. Will extend the Permanence-Overlay coverage to
Yeomans rank 7.
