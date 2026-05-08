# Atlas Plan · Module 4 (Plants) — BUILD_FRESH per Permaculture Scholar verdict

**Date:** 2026-05-07
**Branch:** `feat/atlas-permaculture`
**Type:** decision · iteration step (Module 1 of 8 in plan-stage Scholar review)

## Context

Per the iteration plan (`let-s-make-the-module-iterative-seahorse.md`),
each of the 8 Plan-stage modules is being adjudicated by the
**Permaculture Scholar** NotebookLM
(id `5aa3dcf3-e1de-44ac-82b8-bad5e94e6c4b`) against its OGDEN Land
Operating System counterpart, with verdict `PORT_OGDEN | KEEP_ATLAS |
BUILD_FRESH`. Plants was chosen as the entry point because both the
Atlas implementation (3 cards) and the OGDEN prototype (4 pages) are
substantial, making the trade-off real.

## Scholar verdict

**BUILD_FRESH.** Neither Atlas's filter-list/anchor-composer/SVG-scrubber
trio nor OGDEN's Shannon-diversity / bloom-calendar pages serve a
working steward. The Scholar's grounding quotes:

- "Tree placement will follow the patterns of water flow and access
  and will be part of the long-term major infrastructure of our
  design sites." — Mollison, *Designers' Manual* ch.10 / OSU PDC,
  *Tree Influence on Watershed*
- "A Permaculture design system is strengthened by the number of
  connections between elements." — Holmgren P8 (Integrate rather
  than segregate)
- Shannon-diversity readouts and bloom calendars labelled
  "ecological theatre for working stewards" — explicitly omitted.

## Build-fresh sketch (executed)

Three cards under `apps/web/src/v3/plan/cards/plant-systems/`:

1. **`PlantDatabaseSiteMatchCard.tsx`** — Atlas's filter list, plus a
   per-row site-match score driven by hardiness-band overlap against
   `project.country`. Helper in `siteMatch.ts` (TODO marker to fold
   slope/aspect/precip from `siteDataStore` once Observe is reliably
   populated). Picks persist to `usePolycultureStore.species`.

2. **`GuildSpatialBuilderCard.tsx`** — anchor + members composer
   (preserved from Atlas) plus a 400×320 SVG parcel diagram with a
   click-to-place centroid marker and a generic downslope water-flow
   arrow. Centroid encoded into `Guild.notes` as
   `centroidUv:u,v` until the store schema gets a first-class field.

3. **`CanopySuccessionCard.tsx`** — six-layer cross-section (adds
   *Root zone* below OGDEN's surface-only set), discrete scenarios
   Year 1 / 5 / 10 / 20 / 30+, succession phases
   Establishment / Transition / Maturity, and a per-layer
   light-availability bar attenuated by cumulative cover above.

## Wiring

- `PlanModuleSlideUp.tsx` — three `lazy()` imports swapped to
  `./cards/plant-systems/*`; switch cases `plan-plant-database`,
  `plan-guild-builder`, `plan-canopy-simulator` re-routed.
- `PlanChecklistAside.tsx` — `plant-systems` WHY/HOW rewritten to
  cite Mollison ch.10 + OSU PDC and reference the new card flow.
- Atlas legacy cards at `features/plan/PlantDatabaseCard.tsx`,
  `GuildBuilderCard.tsx`, `CanopySimulatorCard.tsx` left in place
  (still imported by `V3PlanPage.tsx` and
  `features/dashboard/DashboardRouter.tsx`); consolidation is a
  follow-up ticket per `feedback_no_deletion.md`.

## Verification

- `npm run typecheck` — clean
- `npm run build` (`NODE_OPTIONS=--max-old-space-size=8192`) — exit 0,
  built in 52.74s

## Follow-ups

- ✅ **Extend `Guild` schema with first-class `centroidUv`** — landed
  2026-05-07. `Guild` interface in `polycultureStore.ts` gains optional
  `centroidUv?: [number, number]`. `GuildSpatialBuilderCard.commit()`
  now writes the field directly (dropping the `notes:"centroidUv:u,v"`
  encoding), and the saved-guild reader prefers `g.centroidUv` with a
  legacy notes-regex fallback so pre-migration entries still render on
  the parcel diagram. No persist-version bump (additive optional
  field; legacy rows untouched until next save).
- ✅ **True slope vector wired into `GuildSpatialBuilderCard`** — landed
  2026-05-07. Card now reads `useSiteData(project.id)` and pulls
  `predominant_aspect` + `mean_slope_deg` from the elevation layer
  summary. The water-flow arrow is rotated to the aspect bearing
  (compass→degrees lookup), the SVG label reads `water flow → SE ·
  4.2° slope`, and the prose above the diagram cites the live values.
  Falls back to the previous generic N→S arrow when the elevation
  layer hasn't been fetched yet (with a "fetch elevation in Observe"
  hint).
- ✅ **Macro-site context panel surfaces live precip + slope** —
  landed 2026-05-07. `PlantDatabaseSiteMatchCard`'s "Macro-site
  context (v1)" section reworked: the stale "country drives hardiness
  scoring" framing + TODO comment ("fold slope, aspect, precipitation
  rasters") replaced with three `statRow` lines surfacing the exact
  inputs the v2 score uses — hardiness band (country), annual
  precipitation (mm, climate layer), mean slope (°, elevation layer).
  Layers that haven't been observed yet read "not fetched — run an
  Observe site fetch" so the under-observation degradation is
  legible. Top caption documents the 0.55/0.30/0.15 weight split +
  drop-and-renormalise behaviour. Card-doc comment updated to match.
- ✅ **`siteMatch.ts` precip + slope refinement** — landed 2026-05-07.
  `scoreSiteMatch` is now a 3-axis weighted composite (hardiness 0.55,
  precipitation 0.30, slope 0.15 when all present; weights renormalise
  when an axis is missing). Precip match scores `waterNeeds` (low /
  med / high) against the climate layer's `annual_precip_mm` using
  generous heuristic bands (low: ≤700 mm ideal, ≤1000 acceptable; med:
  500–1400 ideal; high: ≥1000 ideal). Slope match scores `rootPattern`
  against the elevation layer's `mean_slope_deg` (flat: any pattern;
  steep: tap > fibrous > rhizome — Yeomans/Lawton observation that deep
  anchor-root woody perennials are a slope's first defence). The
  rationale string surfaces the *worst* axis so the steward sees what
  to act on. Per-axis scores are also returned in `factors` for future
  diagnostic UI. Backwards-compatible: `context` arg is optional, so
  any consumer that doesn't pass it gets pure hardiness scoring.
- Consolidate the legacy `features/plan/Plant*Card.tsx` away once
  `V3PlanPage.tsx` and `DashboardRouter.tsx` no longer reference them.
