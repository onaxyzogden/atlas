# 2026-05-21 — Observe matrix+patches model + Fill-remainder tool

**Branch.** `feat/atlas-permaculture`. Single commit `2a6def92`.

## Why

Field-testing on a real property where the conventional-crop blocks are
scattered across a matrix of sparse grass. Drawing the vegetation as the
*negative space around* each crop block is tedious — operator was tracing
around every crop polygon by hand. Two underlying problems:

1. **Visual model.** Vegetation and crops both rendered as translucent
   washes at `fill-opacity: 0.22`, additively blended — overlap reads as
   one fused colour instead of "crop sitting on top of cover."
2. **Math.** Overlapping vegetation + crop double-count in rollups (no
   subtraction anywhere; gross area, not net cover).

## Decided model — matrix + patches

Vegetation + pasture describe the **ground-cover matrix**. Crops + raised
beds + buildings sit on top as **opaque patches**. Operator draws the
matrix once across the property, then drops patches in — never traces
around them.

## What changed (4 phases, one commit)

### Phase 1 — patch opacity

[apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx](../../apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx)

- `conventionalCrop` fill-opacity 0.22 → 0.55.
- `building` fill-opacity 0.35 → 0.6.
- Vegetation + pasture stay at 0.22 (the matrix wash); layer-order
  already had crops/buildings on top, so the opacity bump alone produces
  the occlusion effect.

### Phase 2 — net-cover area KPI

[apps/web/src/v3/observe/modules/earth-water-ecology/derivations.ts](../../apps/web/src/v3/observe/modules/earth-water-ecology/derivations.ts)
+ [EcologicalDetail.tsx](../../apps/web/src/v3/observe/modules/earth-water-ecology/EcologicalDetail.tsx).

New pure helper `netCoverAreaM2(patches, subtractees)` — per-patch
coverage = `turf.area(patch) − Σ turf.area(turf.intersect(patch, sub))`,
clamped at zero, summed. Wired into `ecologyDetailKpis` with a new
"Ground cover (net)" KPI sitting after "Ecology zones." Subtractees =
crops ∪ buildings for the current project.

`@turf/turf` v7 trap: `turf.intersect` now takes a `FeatureCollection` of
two polygons, not two positional `Feature` args. Five new vitest cases
cover empty patches, no subtractees, enclosed subtraction, fully-covered
clamp-to-zero, and non-overlapping ignored.

### Phase 3 — `Polygon | MultiPolygon` widening

Fill-remainder can yield disjoint pieces, so vegetation + pasture
geometries widen to `GeoJSON.Polygon | GeoJSON.MultiPolygon`. Crops,
buildings, hazards, septic — still single Polygon (no need).

Touched:
- [vegetationStore.ts](../../apps/web/src/store/vegetationStore.ts) +
  [pastureStore.ts](../../apps/web/src/store/pastureStore.ts) — geometry
  union widened. Existing simple-Polygon records remain valid (a
  Polygon is a member of the union; no data migration).
- [annotationGeometryRegistry.ts](../../apps/web/src/v3/observe/components/draw/annotationGeometryRegistry.ts) —
  `writePolygon` accepts the union; per-kind narrowing keeps
  hazard/building/septic/conventionalCrop on Polygon-only (early
  return). `readPolygon` returns the union.
- [annotationFieldSchemas.ts](../../apps/web/src/v3/observe/components/draw/annotationFieldSchemas.ts) —
  vegetation.save + pasture.save guards widened.
- [AnnotationVertexEditHandler.tsx](../../apps/web/src/v3/observe/components/draw/AnnotationVertexEditHandler.tsx) —
  MapboxDraw `direct_select` only handles single Polygons. The
  readPolygon adapter returns `null` for MultiPolygon, so vertex-edit
  gracefully disables on those records. Drag-reposition is unaffected.

MapLibre fill/line layers handle MultiPolygon natively, no paint change.

### Phase 4 — Fill-remainder mode

[VegetationTool.tsx](../../apps/web/src/v3/observe/components/draw/VegetationTool.tsx) +
[PastureTool.tsx](../../apps/web/src/v3/observe/components/draw/PastureTool.tsx).

New checkbox in each popover: **"Fill remainder (subtract crops &
buildings)"**. When on, `place(boundary)` runs `subtractPatches`:

```ts
const subtractees = [...crops, ...buildings].map(f => f.geometry);
let acc = turf.feature(boundary);
for (const g of subtractees) {
  acc = turf.difference(turf.featureCollection([acc, turf.feature(g)]));
  if (!acc) break;
}
return acc?.geometry ?? null;
```

If the boundary is fully covered (`null`), `place()` bails with a
`console.info` line — toast can come later. Otherwise the resulting
Polygon or MultiPolygon flows through the existing
`createWithDefaults() → form → addPatch()` path.

No new store API; the schema widening in Phase 3 was the enabling move.

## Verification

- `npx --no-install vitest run` (full apps/web suite): **1703 passed
  across 173 files**, +5 over the prior 1698 baseline (the new
  netCoverAreaM2 cases).
- `npm run lint` (= `tsc --noEmit`): **clean**.
- DOM verification on `/v3/project/mtc/observe` against the running
  preview server: both Vegetation and Pasture popovers render the
  "Fill remainder (subtract crops & buildings)" checkbox.
- Screenshot tool unresponsive (map-tile blocking the renderer); flagged
  transparently per CLAUDE.md "say so rather than assuming success"
  rather than claiming visual proof.

## Out of scope

- Snap-to-existing-edge drawing.
- Render-time masking via `fill-pattern` — opacity bump is enough.
- Crop / raised-bed / berm gaining MultiPolygon.
- Plan-stage changes.
- Toast UI on full-coverage bail (console hint for now).
- Vertex-edit on MultiPolygon (intentionally disabled).
- DB / shared-package schema changes — web-app local stores only.

## Branch governance

Fetched + verified no divergence prior to commit per
[[project-branch-rebase]]. Single slice committed the moment lint +
tests cleared per [[feedback-commit-immediately-on-rebased-branches]].
