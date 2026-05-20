# 2026-05-13 — Plan tree spacing snap (canopy ring + placement validation)


**Closed.** Follow-up to 2026-05-12 continuous-point placement. Per-kind
`defaultSpacingM` on `DesignElementSpec` (oak 10 m, pine 6 m, apple 5 m,
shrub 2 m) drives a translucent cursor-following ring rendered via a
single ephemeral `preview-tree-spacing` source on the map. Ring colour
(estate-green `#7fa05a` / fired-clay `#8a4f3a`) tracks `feature-state.valid`
swapped per mousemove. Click-time validation rejects placements outside
the parcel boundary or within `defaultSpacingM` of an existing same-
`category` point design element; rejection emits a `plan:tree-rejected`
window CustomEvent that a new `TreeRejectionToast` (mounted once in
`PlanLayout`) surfaces as a 1.5 s pill near the bottom of the canvas.
`parcelBoundary` threaded from `useV3Project().location.boundary` down
both Current (`PlanDrawHost` → `PlanDesignElementHost`) and Vision
(`VisionLayoutCanvas` → `DesignElementDrawHost`) draw paths. Touched
files all clean under `tsc --noEmit`; one pre-existing `Geometry` width
error in `DesignElementLayers.tsx:433` (around `translateByDelta`) is
unrelated and unfixed. Browser-canvas verification still blocked by the
preview environment's synthetic-event limitation noted in the prior
ADR — manual end-to-end pass deferred to user. Cross-kind asymmetric
spacing (small shrub blocked by an oak's larger drip line) deliberately
deferred to v2; v1 uses the active kind's spacing only. Polygon-fill /
row stamp / grid stamp also deferred — `defaultSpacingM` is the
foundation those would build on. Full record:
[wiki/decisions/2026-05-13-atlas-plan-tree-spacing-snap.md](decisions/2026-05-13-atlas-plan-tree-spacing-snap.md).
