# 2026-05-10 — Phase 4.5 closeout: BE point layer ids in drag allowlist


Final Phase 4.5 piece. The dispatch tables in
`annotationGeometryRegistry.ts` already covered the 8 BE kinds (logged
below), but `AnnotationDragHandler.tsx`'s `POINT_LAYER_IDS` allowlist
still didn't list the BE point layer ids registered by
`ObserveAnnotationLayers`. Pointer-down on a well or gate therefore
never engaged drag — the gate filtered the feature out before
reaching the dispatch table. Added `'observe-anno-be-wells'` and
`'observe-anno-be-gates'` to the allowlist (+5 LOC).

Vertex edit needed no parallel patch — `AnnotationVertexEditHandler`
gates on `LINESTRING_KINDS.has(kind)` / `POLYGON_KINDS.has(kind)`
from the selection store, not on layer ids, so the four BE line kinds
and two BE polygon kinds engage automatically now that they're in
those sets.

Tsc note: `apps/web` tsc currently has unrelated breakage from a
sibling commit (`411d88d feat(plan): inline-edit Septics + Power
lines from Plan stage`) — duplicate `buildBuriedUtilityEditSchema` /
`buildFenceEditSchema` / `buildGateEditSchema` /
`buildDrivewayEditSchema` blocks in `inlineEditSchemas.ts`, plus
`broiler-product-map` PlanModule missing from three records. Phase
4.5's surface (one-file change in `AnnotationDragHandler.tsx`) is
clean; pre-existing breakage flagged for separate cleanup. Adapter
vitest still 16/16 green.
