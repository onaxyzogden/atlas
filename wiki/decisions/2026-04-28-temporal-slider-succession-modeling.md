# ADR: Temporal slider for succession & maturity modelling

**Date:** 2026-04-28
**Status:** proposed
**Scope:** `apps/web/src/features/map/`, `packages/shared/src/succession/` (new), scoring engine

## Context

The 2026-04-28 [Permaculture Alignment](../concepts/permaculture-alignment.md)
review (Permaculture Scholar conversation
`48a34396-5525-4a57-9884-108d93b1872f`) flagged Holmgren's principle 9
**Small & Slow Solutions** as fully missing, and principles 4 (Self-regulation
& feedback) and 12 (Respond to change) as partial. The common root cause:
Atlas's canvas is **temporally flat** — every drawn element is rendered as
if it exists at maturity, instantly. A 2-foot oak sapling drawn today and a
60-foot canopy tree are visually and computationally indistinguishable.

The Scholar's source basis: *Permaculture Trees in Temperate Climates*,
*Permaculture Trees in the Tropics*, *Permaculture Trees in the Drylands*,
*Trees in the Permaculture Landscape*, *Permaculture Design for Food*, *Where
to From Here?*, and the PDC Week 8-10 succession material.

The Scholar's specific framing: "Permaculture plays the long game, and
failing to plan for a tree's 50-year maturity often results in trees being
cut down because they eventually cause problems." This isn't a niche concern
— it's why permaculture exists. Without temporal modelling, Atlas is a
**snapshot tool**, not a **design tool**.

## Decision

Add a **temporal axis** to the design canvas: a Year-1-to-Year-50 slider
that scales drawn entities according to species-specific maturity curves
and reveals downstream effects (overlapping canopies, shifting microclimates,
shade competition, succession transitions).

### Module layout

```
packages/shared/src/succession/
  growthCurves.ts     # speciesGrowthCurve(speciesId, ageYears) -> { canopyM, heightM, rootZoneM }
  speciesData.ts      # canonical maturity data per species (initial seed: ~50 NA temperate species)
  shading.ts          # cast shadow polygons given canopy + solar aspect + day-of-year
  succession.ts       # transition rules: pioneer -> mid-succession -> climax
  index.ts
```

Mirrors the `@ogden/shared/demand` and `@ogden/shared/relationships`
subpath pattern. Exposed as `@ogden/shared/succession`.

### Growth curves

Per-species table sourced from existing forestry datasets — start with
USDA NRCS Plant Guide records for the most commonly placed species
(apple, pear, peach, walnut, oak, maple, willow, locust, hazelnut, mulberry,
chestnut, pawpaw, persimmon, asimina, juneberry, elderberry, redbud,
sycamore, hickory, beech, birch). Schema:

```ts
type GrowthCurve = {
  speciesId: string
  // Cubic interpolation between sample points
  samples: Array<{ ageYears: number; canopyM: number; heightM: number; rootZoneM: number }>
  matureAtYears: number   // age at which growth saturates
  successionStage: 'pioneer' | 'mid' | 'climax'
  expectedLifespanYears: number
}
```

For unmodeled species, fall back to a generic curve keyed by the entity's
`growthClass` ("fast/medium/slow") metadata that already exists on
`PlantingArea` records.

### Canvas surface

- **Timeline slider** in the canvas chrome: scrub from Year 1 to Year 50
  (default Year 5, current "design horizon" assumption made explicit).
- **Live geometry**: every tree, shrub, hedgerow, and orchard scales its
  rendered radius based on `speciesGrowthCurve(species, currentYear)`.
- **Shadow overlay** (optional toggle): cast shadow polygons for the current
  year's canopy size against the existing solar-aspect data, surfacing future
  shade competition for sun-loving understory.
- **Conflict flags**: when two canopies will overlap by year N, surface a
  warning at year `N - 5` so the user can plan the thinning.
- **Microclimate transitions**: link to existing microclimate data — when
  enough biomass accumulates, surface a "microclimate shift" event marker
  on the timeline.

### Engine wiring

Two new scoring sub-dimensions under the existing **Ecological** axis:

1. **`temporalCoherenceScore`** — penalises designs where peak canopy
   competition happens within the first 5 years (overplanted), or where
   no canopy reaches maturity within the design horizon (underplanted).
2. **`successionScore`** — rewards designs that include pioneer +
   mid-succession + climax species in proportions appropriate to the
   site's stage (e.g., a degraded site needs more pioneers).

### Acceptance criterion

The user can scrub a slider from Year 1 to Year 50; the canvas
automatically scales plant canopies based on maturity data; future overlapping
boundaries, shade impacts, and microclimate shifts are visible. The
right-rail "Site Assessment" panel shows the current scrubbed year alongside
the design-horizon year, and `temporalCoherenceScore` updates live as the
user adjusts placement at any year.

End-to-end test: place an apple tree (matures ~15y, canopy 6m) and a walnut
(matures ~25y, canopy 14m) 8m apart. At Year 5, no overlap. At Year 15,
flag should fire because Year-20 projected canopies overlap.

## Alternatives considered

- **Single "design year" project setting** — pick one year (e.g., Year 10)
  and render everything at that year. **Rejected**: defeats the principle.
  The whole point is to *see* the trajectory, not pick one frame.
- **Animated playback only** — no slider, just a play button. **Rejected**:
  scrubbing is a different cognitive mode than watching; designers need
  pause-and-inspect at arbitrary years.
- **Defer succession scoring to v2** — ship just the geometry slider first.
  **Accepted as phasing**: ship the slider + geometry in phase 1; add
  `successionScore` in phase 2 once species data is broader.

## Consequences

- **New shared subpath** `@ogden/shared/succession` with seeded species
  data.
- **Two new scoring sub-dimensions** under Ecological — bumps component
  count beyond ~140; [Scoring Engine](../concepts/scoring-engine.md) page
  to be updated.
- **Project state**: add `currentScrubYear: number` to ephemeral UI store
  (not persisted); add `designHorizonYears: number` to project metadata
  (default 20, persisted) — single migration column on `projects`.
- **Performance**: live canopy re-rendering on scrub. Use throttled
  re-projection (60ms) and only recompute geometry for visible bounds.
- **Species data quality**: begin with conservative ~50-species seed,
  citation-tagged. Out-of-catalog species use the generic growth-class
  fallback. Track gaps in [Gap Analysis](../entities/gap-analysis.md).
- **Composability with rec #1 (Needs & Yields)**: a tree's outputs/inputs
  may change over time (a young apple isn't producing fruit yet). Phase 2
  links the temporal slider to relationship strength so
  `integrationScore` reflects temporal reality, not just placement.

## Verification

- Unit tests: growth curve monotonicity (canopy doesn't shrink), shadow
  geometry against known sun positions, succession-stage assignment.
- Integration: snapshot test of canopy bounds at Year 5 / 15 / 30 for a
  reference orchard fixture.
- E2E: scrub slider, assert canvas SVG geometry updates within 100ms;
  assert `temporalCoherenceScore` updates in right rail.

## Source citations

- *Permaculture Trees in Temperate Climates*, *...Tropics*, *...Drylands*,
  *Trees in the Permaculture Landscape* — establishes that tree placement
  is fundamentally a multi-decade decision and that mature canopy is the
  design unit, not sapling spacing.
- *Permaculture Design for Food*, *Where to From Here?* — succession-stage
  thinking and the long-game framing.
- PDC Weeks 8-10 — succession curriculum.
