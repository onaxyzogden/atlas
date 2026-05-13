# 2026-05-13 — Plan: temporal slider (succession & maturity) v1

## Context

The 2026-04-28 Permaculture Scholar review
([temporal-slider modeling ADR](2026-04-28-temporal-slider-succession-modeling.md))
flagged Holmgren P9 (*Use small and slow solutions*) as fully missing
because Atlas's canvas was **temporally flat**: a 2 ft oak sapling
rendered identically to a 60 ft mature canopy. Without a time axis the
canvas is a snapshot tool, not a design tool. Recs #3 / #4 / #6 had
already shipped under the right-rail readout-card pattern; this is
P0 Rec #2.

## Decision

Ship a v1 temporal slider tied to a single ephemeral year cursor
(1..50, default 5) that scales placed vegetation point trees **on
both** Current 2D (MapLibre `circle-radius` via feature-state) and
Vision 3D (deck.gl `ScenegraphLayer` per-instance scale). A
forward-overlap evaluator runs each scrub tick and surfaces conflict
pairs through both:

1. an on-canvas fired-clay (`#8a4f3a`) stroke ring on each tree dot
   that participates in an overlap within the next 5 years from the
   cursor, and
2. a new `TemporalCoherenceCard` lazy-mounted under the Plant Systems
   module, listing every conflict pair with year-of-overlap.

A `designHorizonYears` field (default 20) on `ProjectMetadata` lets a
steward pin a per-project planning horizon; the slider's "↺ Year N"
chip snaps the cursor to that horizon.

## Implementation

### New shared package subpath
- `packages/shared/src/succession/`
  - `speciesData.ts` — seed `GrowthCurve` table for the four placed
    vegetation kinds (oak-tree, pine-tree, apple-tree, shrub) plus
    `GENERIC_GROWTH_CURVES` fallback. USDA NRCS Plant Guide
    composites; conservative.
  - `growthCurves.ts` — `canopyAtAge`, `canopyFromCurve`,
    `matureCanopyM`, `resolveGrowthCurve`. Linear interp between
    bracketing samples; clamp to the mature plateau above
    `matureAtYears`. Pure, allocation-free per call.
  - `__tests__/growthCurves.test.ts` — 8 specs (clamp, interp,
    monotonicity, generic fallback).
  - `index.ts` barrel + re-export from `packages/shared/src/index.ts`.

### Apps/web
- `v3/plan/canvas/temporalScrubStore.ts` — single Zustand atom
  mirroring `useStampModeStore`. Ephemeral; resets on reload.
- `v3/plan/canvas/TemporalScrubSlider.tsx` — bottom-centre canvas
  chrome (`bottom: 92`, between `PlanStampToast` and `StampModePicker`).
  Renders always; tick labels at 1/5/15/30/50; "↺ Year N" snap chip.
- `v3/plan/cards/plant-systems/temporalCoherenceMath.ts` —
  `findOverlaps` (O(N²); fine at permaculture scale) and
  `overlappingIds`. Pure, vitest-covered (4 specs).
- `v3/plan/cards/plant-systems/TemporalCoherenceCard.tsx` — readout.
  Lists "Apple A ↔ Apple B · Year 14 · separation 6 m, combined
  6.4 m". "Set Year N as default" writes through to
  `metadata.designHorizonYears`.
- `v3/plan/canvas/layers/DesignElementLayers.tsx` — replace hardcoded
  `circle-radius` with `coalesce(['feature-state', 'canopyR'], 6)`;
  new effect projects each vegetation centre + a `radiusM`-offset
  destination through `map.project` to derive pixel radius and writes
  `{ canopyR, overlap5y }` per id. Re-runs on year change, on
  zoom/pan (`moveend`/`zoomend`), on element changes, and after the
  selection effect (which does a wholesale `removeFeatureState`).
  rAF-throttled.
- `v3/builtEnvironment/layers/DesignElementScenegraphLayer.tsx` —
  `entityToPlaced` takes `currentYear`; for `spec.category ===
  'vegetation'`, derive `mul = canopyAtAge / matureCanopy` instead of
  the `e.proposed?.scaleMul` path. BE entities keep the existing
  `scaleMul` behaviour.
- `v3/plan/PlanModuleSlideUp.tsx` — lazy import + `'plan-temporal-coherence'`
  switch case.
- `v3/plan/types.ts` — Plant-systems module manifest gains "Canopy
  maturity" entry.
- `v3/plan/PlanLayout.tsx` — mount `<TemporalScrubSlider />` between
  `PlanStampToast` and `StampModePicker`.
- `store/projectStore.ts` — `DEFAULT_DESIGN_HORIZON_YEARS = 20` +
  `getDesignHorizon(project)` accessor (mirrors `getZoneThresholds`).
- `packages/shared/src/schemas/project.schema.ts` — `ProjectMetadata`
  gains `designHorizonYears: z.number().int().min(1).max(50)
  .optional()`. No migration; reads canonical default through
  `getDesignHorizon`.

## Out of scope (deferred)

- Per-tree planted-year override (all trees assumed planted at Year 0
  for v1).
- Hedgerow / linear vegetation scaling.
- `temporalCoherenceScore` / `successionScore` engine wiring.
- Cast shadow polygons.
- Microclimate transition events on the timeline.
- Needs & Yields temporal modulation.
- Browser end-to-end automated test (synthetic events don't reach
  MapLibre; manual smoke per the plan's verification steps).

## Verification

- `packages/shared`: `npx vitest run src/succession` → 8/8 pass.
- `apps/web`: `npx vitest run temporalCoherenceMath` → 4/4 pass.
- `apps/web` tsc: type-clean except the pre-existing
  `DesignElementLayers.tsx` `Geometry`-width error (unchanged).

## References

- Plan: `C:\Users\MY OWN AXIS\.claude\plans\ensure-side-panels-load-clever-hejlsberg.md`
- Source ADR: [2026-04-28 temporal-slider succession modeling](2026-04-28-temporal-slider-succession-modeling.md)
- Polygon-fill stamp ADR (predecessor): [2026-05-13 plan polygon-fill stamp](2026-05-13-atlas-plan-polygon-fill-stamp.md)
