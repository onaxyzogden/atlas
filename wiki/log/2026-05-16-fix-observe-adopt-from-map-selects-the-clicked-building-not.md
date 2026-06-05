# 2026-05-16 — fix(observe): adopt-from-map selects the clicked building, not an already-adopted one


Adopting a 3D basemap building often bound the inline form to a
*different, already-adopted* entity (visible only after Save). Browser
investigation disproved the original "unstable feature id" theory: the
MapTiler OpenMapTiles `building` source returns **tile-batched
MultiPolygons** (200–317 unrelated footprints under one tile-local id),
so the old `coordinates[0]` shortcut captured an arbitrary building and
the feature-id dedup collided.

Fix (scope: **selection only**, per user decision): `pickClickedPolygon`
picks the click-containing sub-polygon (nearest-centroid fallback under
pitch); dedup re-keyed to durable geometry (centroid ≤ 2 m **and**
relative area ≤ 0.05). The per-building basemap-hide goal was **dropped**
— impossible against a tile-batched source (no `osm_id`/`promoteId`;
filters & feature-state are per-feature-id → all-or-none per tile).
`adoptedBasemapBuildings.ts` reduced to `findBuildingLayerIds` +
documented no-ops; both map hosts compile unchanged. ADR:
`wiki/decisions/2026-05-16-atlas-adopt-building-geometry-keyed-selection.md`.

Verified: `typecheck` exit 0 (×2); `vite build` exit 0 (54 s).
Deterministic Node replay — 201-sub-polygon batched input: old
`coordinates[0]` → 6431 m² (wrong), new → 197 m² containing the click
(= target). Dedup epsilon: same-building re-click (0.45 m jitter)
matches; 8 m-away building → new entity; tiny near-centroid kiosk →
rejected by area guard. Test stub entity removed from persisted store.

Live click-through not exercisable: in the headless Chrome-extension
context the MapTiler vector style never settles (`map.loaded()` stays
false), so basemap buildings are not queryable — documented
environmental limit, not a defect.

**Incidental.** `src/v3/plan/draw/tools/ZoneSeedAnchorTool.tsx`
(untracked permaculture work) had a broken Toast import depth
(`../../../` → `../../../../`) that blanked the dev server; fixed in
passing to unblock verification (not in the tracked diff).

**Deferred.** Two distinct buildings < 2 m apart with ~equal area
remain a documented dedup ambiguity.
