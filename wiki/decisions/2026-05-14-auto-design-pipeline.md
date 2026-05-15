# 2026-05-14 — Observe-driven auto-design pipeline

**Status:** Accepted (Phase 1 in progress)
**Branch:** `feat/atlas-permaculture`
**Owner:** Yousef
**Plan:** `~/.claude/plans/how-feasible-is-it-atomic-sutherland.md`

## Context

Atlas needed a way for a steward to map current land conditions in Observe
(land-use zones, succession, invasive pressure, **ground cover**, permaculture
rings) and then have OLOS deterministically generate (a) design features
placed into the zones whose conditions match each intervention, and (b) a
sequenced Act-calendar plan anchored to a user-selected start date.

The earlier "draw a polygon → declare livestock intent → generate children"
proposal (see `stages/research-polygon-intent-livestock-draft.md`) is
superseded. The pivot is from *single-polygon intent* to *whole-site,
condition-driven auto-design*.

## Decision

1. **Extend `LandZone` with an optional `groundCover` field** rather than
   create a parallel ground-cover store. `groundCover` is orthogonal to
   `successionStage` (the bare→climax community axis): two zones at
   `pioneer` can differ between `bare-soil` vs `sparse-grasses` vs `sand`.
   Vocabulary: `barren | bare-soil | sparse-grasses | thriving-grasses |
   sand | rocky | forest | wetland`.

2. **Extend `Intervention` with `zoneAffinity` + `geometryTemplate`**, both
   optional. Affinity is declarative scoring data, not code, so per-row
   tuning never requires a code change. Geometry templates dispatch to
   pure stampers.

3. **Geometry templates** — six values cover every catalog row:
   - `tile-strip` — equal-area strips along zone's longest edge (paddocks)
   - `contour-line` — contour-following line clipped to zone (swales,
     keyline track)
   - `edge-line` — line traced along zone perimeter (perimeter fence,
     windbreak)
   - `bbox-rect` — clean rectangle inside zone (orchard, kitchen garden)
   - `centroid-point` — single point at zone centroid (coop, tank, solar)
   - `fill-polygon` — intervention occupies whole zone (food forest, pond,
     cover-crop rebuild, coppice block, pasture renovation)

4. **Affinity scoring** — allocator scores each candidate zone by how many
   `preferred*` lists it matches. Ties broken by zone area (largest first).
   `avoidedCategories` is a hard veto.

5. **Determinism** — `seedrandom(projectId + generationId)` threads through
   allocator + stampers. Same inputs → identical output. "Regenerate"
   only re-runs when an input changes.

## Catalog table (auto-design fields)

| Intervention | `geometryTemplate` | `preferredCategories` | Notes |
|---|---|---|---|
| parcel-assessment | — (process only) | — | No geometry output |
| keyline-access-track | contour-line | access, food_production, livestock | ring 2-4 |
| swale-system | contour-line | food_production, conservation, water_retention, livestock | ring 2-5 |
| earthen-pond | fill-polygon | water_retention, conservation | prefers wetland / bare-soil |
| roof-catchment-tanks | centroid-point | habitation, infrastructure | ring 0-1 |
| cover-crop-rebuild | fill-polygon | food_production, livestock | bare/pioneer + bare-soil/barren |
| compost-system | centroid-point | infrastructure, food_production | ring 1-2 |
| kitchen-garden | bbox-rect | food_production, habitation | ring 1 |
| food-forest | fill-polygon | food_production, commons | pioneer/mid, ring 2-3 |
| poultry-coop | centroid-point | livestock, food_production | ring 2 |
| small-ruminant-paddock | tile-strip | livestock | thriving/sparse grasses, ring 3-4 |
| permanent-perimeter-fence | edge-line | livestock | — |
| cattle-rotational-grazing | tile-strip | livestock | thriving/sparse grasses, ring 3-4 |
| paddock-water-network | centroid-point | livestock | — |
| livestock-shelter-windbreak | edge-line | livestock, buffer | — |
| pasture-renovation-overseed | fill-polygon | livestock | sparse/thriving + bare/pioneer |
| coppice-woodlot | fill-polygon | conservation, commons, buffer, food_production | ring 3-5 |
| solar-pv | centroid-point | habitation, infrastructure | ring 0-1 |
| orchard-block | bbox-rect | food_production | pioneer/mid, ring 2-3 |
| value-add-kitchen | centroid-point | habitation, infrastructure | ring 0-1 |

## Consequences

- New affinity fields are **optional** — sequencer behavior on existing
  fixtures is unchanged. Tested via the `sequencingEngine` regression
  suite (Phase 1 gate).
- `groundCover` is **optional** on `LandZone` — no zone-store persist
  version bump needed; existing zones load with `groundCover: undefined`.
- The catalog table above is the seed; per-row tuning is a one-line edit
  in `interventionCatalog.ts`, no code change.
- Pure-function pipeline (`zoneAllocator` → `stampGeometry` →
  `runAutoDesign`) lands in Phase 2 of the plan with full test coverage
  before any UI surface.

## Files touched (Phase 1)

- `apps/web/src/store/zoneStore.ts` — added `GroundCoverState`,
  `GROUND_COVER_LABELS`, `GROUND_COVER_COLORS`, optional `groundCover` on
  `LandZone`.
- `apps/web/src/v3/plan/data/goalCompassTypes.ts` — added
  `GeometryTemplate`, `ZoneAffinity`, optional fields on `Intervention`.
- `apps/web/src/v3/plan/data/interventionCatalog.ts` — populated all 19
  building-block rows.
- `apps/web/src/v3/plan/engine/goalCompass/observePrefill.ts` — derive
  `currentLandCover` from aggregated `groundCover` where present.

## Deferred

Phase 2+: pure-function pipeline, draft state, Observe paint tool, Plan
"Generate site design" UI, DraftReviewBar — see the plan file for the
full phase breakdown.
