# 2026-04-30 — V3 Phase 5.1 + 5.2 scoping ADRs


### Done

Drafted two scoping ADRs for the remaining Phase 5 deliverables so the implementing sessions can execute against fixed architectural decisions rather than re-deciding fundamentals mid-stream. Both ADRs converge on the same map runtime — reuse the `DiagnoseMap` render-prop pattern that shipped with Phase 5.3, *not* the heavier v2 `MapCanvas` (which carries `@mapbox/mapbox-gl-draw` + the `LeftToolSpine` / `DomainFloatingToolbar` weight). Status is **Proposed** on both — implementation gated on review.

**5.1 DesignPage live canvas** (~1,200 LOC across 4 PRs):
- New `DesignMap.tsx` mirroring `DiagnoseMap` — no MapboxDraw runtime in v3.
- Reuse v2 stores (zone / structure / path / utility / livestock / crop / waterSystems) — no v3 shadow store, no sync layer. v3 placements are immediately visible to v2 surfaces, which matches the v3 cutover direction.
- Deterministic single-pass snap at 8 px screen radius: boundary edge → structure corner → path centerline. No grid snap.
- Live `computeAssessmentScores` recompute throttled to 250 ms via `requestIdleCallback`, keyed off `(count, lastMutationMs)` per store. New `DesignScoreCallout` strip surfaces *score-delta* vs. pre-design baseline (designers want regression feedback, not the verdict ring).
- Overlay chips wired to `MAP_STYLES` swap + `siteData.layers` watershed/wetlands + `CONTOUR_TILES_URL` + soils legend.
- Defers drag-edit/vertex-edit (Phase 5.1.x), multi-select, score-aware undo.

**5.2 OperatePage field map** (~830 LOC across 4 PRs):
- New `OperateMap.tsx` mirroring `DiagnoseMap`.
- Schema change: promote `FieldFlag.x/y` (0–100 pseudo-coords) → `position: [lng, lat]`. Adds `source` (store + refId) and `observedAt`. MTC fixture migrates by hand.
- New `useFieldFlags(projectId)` hook derives flags from `useLivestockStore` paddocks (rotation-age tone) + `useWaterSystemsStore` storage (sensor-tier tone) + weather-alert layers, unioned with brief fallbacks for `fence`/`team` until those stores ship.
- Single MapLibre symbol layer with kind-driven icons + tone-driven `icon-color`. 60 s `visibilityState`-gated polling for sensor flags.
- "Log Observation" wires today against existing `useObservationStore`; "Create Field Task" stays disabled with tooltip until Phase 6.4 ships `useFieldTaskStore`.
- Defers `fence`/`team` stores, low-zoom pin clustering, SSE/WebSocket streaming, replay-history slider.

### Risks accepted
- Both ADRs commit to reusing the `DiagnoseMap` pattern. If Diagnose ever needs to fork to a different runtime, Design and Operate would inherit the lift; mitigation is the render-prop child API which keeps the surface coupling small.
- Bundle delta: two more MapLibre instance mounts. Style cache is shared, and the router unmounts on navigate, so peak is one instance not three.

ADRs:
- [`wiki/decisions/2026-04-30-v3-design-canvas-scoping.md`](decisions/2026-04-30-v3-design-canvas-scoping.md) (proposed)
- [`wiki/decisions/2026-04-30-v3-operate-field-map-scoping.md`](decisions/2026-04-30-v3-operate-field-map-scoping.md) (proposed)

These unblock Phase 6.2 ("Fix on Map" → MapView fly-to depends on 5.1) and Phase 6.4 ("Create Field Task" — wires through the OperateMap from 5.2).
