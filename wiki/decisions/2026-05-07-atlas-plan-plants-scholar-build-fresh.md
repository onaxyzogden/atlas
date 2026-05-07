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

- Extend `Guild` schema with first-class `centroidUv: [u, v]`; migrate
  `notes`-encoded values.
- Pull true slope vector + water-flow raster from `siteDataStore` into
  `siteMatch.ts` and `GuildSpatialBuilderCard.tsx`.
- Consolidate the legacy `features/plan/Plant*Card.tsx` away once
  `V3PlanPage.tsx` and `DashboardRouter.tsx` no longer reference them.
