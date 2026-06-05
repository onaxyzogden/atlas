# 2026-05-13 — Adopt-from-map v2 (basemap-hide pipeline + ObserveLayout projectId fix)


**Closed.** Two-bug session on the Observe-stage "Adopt from map" tool.
Bug 1: the v1 adopt flow created the BE entity but the basemap kept
rendering its own extrusion underneath, producing z-fight and the
user-perceived "Save did nothing" symptom. Bug 2 (user-disclosed mid-
session): the fix only worked on real projects, not the sample route.

Bug 1 fix shipped as a property-based filter pipeline.
`ExistingMetadata.adoptedFromBasemapId` (new) captures the basemap tile
feature's `osm_id` at click time;
`apps/web/src/features/map/adoptedBasemapBuildings.ts` (new) splices a
`['!', ['in', ['get', 'osm_id'], ['literal', ids]]]` clause onto every
basemap building layer's filter, preserving each layer's pre-adoption
baseline via a per-map `WeakMap` cache. Idempotent; runs on mount,
`style.load`, and every BE V2 store change. Mounted via the new
`AdoptedBuildingsSync` component in v3 `ObserveLayout` and
`VisionLayoutCanvas`, plus a direct `useEffect` in legacy `MapCanvas`.
A prior v2.1 attempt that injected `promoteId` by `removeSource` +
`addSource` was rejected: MapLibre's `removeSource` throws when layers
reference the source, so the silent-try/catch left the source destroyed
and the basemap building still painted.

Bug 2 root cause: `ObserveLayout` was the only v3 layout that did *not*
normalise `params.projectId ?? 'mtc'`. On the sample route the raw
`undefined` threaded into `ObserveDrawHost` →
`AdoptBasemapBuildingTool` triggered the early-return guard, so the
entity was never created at all. Fix: added `const id =
params.projectId ?? 'mtc'` and swapped every store-aware child
(`MapToolbar`, `DesignToolRail`, `ObserveAnnotationLayers`, the
BE-layer block now mounted unconditionally, `ObserveDrawHost`,
`AnnotationSectorHandles`, `SelectionFloater`, `ExportButton`,
`ImportSiteIntelButton`, `AnnotationDetailPanel`) onto `id`. Navigation
guards and `useV3Project` continue to read raw `params.projectId`.

Auxiliary: `DesignElementExtrusionLayer` now prefers entity height
when set (so adopted buildings extrude at the basemap's
`render_height`) and gains click-to-inline-edit, since the 3D extrusion
intercepts clicks before the flat 2D fill underneath at pitched
cameras. `elementHeights.ts` registers `building` as a
`mode: 'extrusion'` kind with a 6 m single-storey fallback.

HMR clean across all touched files. Sample-route adopt-from-map flow
verified end-to-end. Full record:
[2026-05-13-atlas-adopt-from-map.md](decisions/2026-05-13-atlas-adopt-from-map.md).
