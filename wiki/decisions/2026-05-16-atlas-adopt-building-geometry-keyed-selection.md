# Adopt-from-map: geometry-keyed selection; drop per-building basemap hide

**Date:** 2026-05-16
**Status:** Accepted
**Area:** Observe → Built Environment → Adopt-from-map

## Problem

Arming "Adopt from map" and clicking a 3D basemap building frequently
adopted / re-opened a *different, already-adopted* building. The mismatch
was invisible until Save (the inline form anchors at the click point
regardless of which entity it binds to).

## Root cause (corrected by browser investigation)

The original plan assumed the bug was an unstable basemap **feature id**.
Live investigation against the running map disproved a deeper assumption:
the MapTiler OpenMapTiles `building` source does **not** deliver one
feature per building. `queryRenderedFeatures` returns a **tile-batched
MultiPolygon** bundling *hundreds* of unrelated footprints (200–317
observed) under a single tile-local feature id. The old
`coordinates[0]` shortcut therefore captured an arbitrary footprint
(empirically a ~6400 m² blob for a clicked ~200 m² building), and the
feature-id dedup collided across unrelated buildings.

## Decision

1. **Selection** — replace `toSinglePolygon` with `pickClickedPolygon`:
   return the sub-polygon that contains the click point; on miss (tall
   buildings under pitch put the ground `lngLat` outside the roof
   footprint) fall back to the sub-polygon whose centroid is nearest.
   Deterministic, so re-clicks yield the same ring.
2. **Dedup identity** — key on durable footprint geometry, not the
   basemap feature id: centroid distance ≤ 2.0 m **and** relative area
   ≤ 0.05. Both required (distance absorbs MVT quantisation jitter;
   the area guard rejects a small footprint sitting near a large
   building's centroid — the original collision class).
3. **Drop the per-building basemap-hide goal.** Per-building hiding via
   paint filters or `feature-state` is impossible against a tile-batched
   source (both are keyed per feature id → all-or-none per tile; no
   `osm_id`, no `promoteId` to split). `adoptedBasemapBuildings.ts` is
   reduced to `findBuildingLayerIds` + documented no-ops
   (`syncAdoptedHidings` / `wireAdoptedHidings` / `ensureBuildingPromoteId`)
   so the two map hosts compile unchanged. The adopted entity renders its
   own extrusion on top; the basemap building remains underneath
   (accepted visual trade-off).

## Verification

- `npm run typecheck` exit 0 (×2); `vite build` exit 0 (built in 54 s).
  (`npm run build`'s bare `tsc` OOMs — known repo issue; the 8 GB-heap
  `typecheck` script is authoritative.)
- Deterministic Node replay of a 201-sub-polygon batched MultiPolygon:
  old `coordinates[0]` → 6431 m² (wrong building); new
  `pickClickedPolygon` → 197 m² and contains the click (= target).
- Deterministic dedup epsilon check: same building re-click (0.45 m
  jitter) → matches existing; building 8 m away → new entity; tiny
  kiosk near the large centroid → rejected by the area guard.
- Live browser click-through could not be exercised: in the headless
  Chrome-extension context the MapTiler vector style never settles
  (`map.loaded() === false` persistently), so no basemap buildings are
  queryable. Documented environmental limitation, not a code defect.

## Known limitation

Two distinct buildings < 2 m apart with ~equal area remain ambiguous to
the dedup. Acceptable; documented.

## Incidental

`src/v3/plan/draw/tools/ZoneSeedAnchorTool.tsx` (untracked
permaculture-branch work) had a broken `Toast` import depth
(`../../../` → should be `../../../../`) that wedged the whole dev
server (blank screen). Fixed in passing to unblock verification; not
part of the tracked diff for this fix.
