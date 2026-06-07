# 2026-06-02 -- Food-forest adoption: 2 tested formula modules + 5 primary catalogues

**Branch:** `feat/atlas-permaculture`
**Plan:** "Adopt Food-Forest Formulas & Catalogues into v3" (6 phases, approved 2026-06-02).
**Commits (in order):**
- `0063b316` -- tested canopy & guild analytics formula modules (Phase 1)
- `7c8933fb` -- enrich Canopy Simulator with grounded food-forest metrics (Phase 2)
- `ddba6470` -- surface formula-driven guild analytics in Guild Builder (Phase 3)
- `9cac88a8` -- Homestead / Family Land primary catalogue (Phase 4)
- `48a62cd7` -- Education / Demonstration Land primary catalogue, 22 obj (Phase 5.1)
- `d72f7849` -- Conservation / Rewilding primary catalogue, 30 obj (Phase 5.2)
- `862076f1` -- Market Garden primary catalogue, 24 obj (Phase 5.3)
- `ce9b00ba` -- Off-Grid Resilience / Remote Settlement primary catalogue, 27 obj (Phase 5.4)

## Context

The operator asked to adopt "a lot of work done for the food forest aspect of OLOS
including formulas and drawing tools" into v3. Investigation reframed this: the prior
`OGDEN Land Operating System` app's Canopy Simulator / Guild Builder pages were
**static mockups** (hardcoded numbers, no live math), and v3 already had functional,
mounted equivalents (`CanopySuccessionCard`, `GuildSpatialBuilderCard`) plus drawing
tools that **exceed** the prior app. So the genuine, high-value adoption was: (A) turn
the mockups' *intended* metrics into real, tested pure formula modules feeding the
live cards; (B) encode the 5 still-unencoded `.docx` objective catalogues. Drawing
tools were **not** re-ported (v3's already surpass the source).

## What shipped

**Phase 1-3 -- Formulas (apps/web).** Two pure, documented, unit-tested modules:
`features/forest/canopyMetricsMath.ts` (productivity-by-layer, biomass distribution,
species richness, canopy closure %, understory light %, structural/Shannon diversity,
productivity index -- reusing `PLANT_CATALOG` + `FOOD_FOREST_LAYERS`) and
`features/agroforestry/guildAnalyticsMath.ts` (Shannon, functional coverage %,
resilience, water balance %, nutrient-cycling signal, compatibility -- delegating to
`guildIntegrityMath`). No hardcoded mock numbers; all metrics derived and labelled as
design-time estimates. The live Canopy Simulator and Guild Builder cards were enriched
to render these formula-driven panels (year-reactive), theme-tokened for dark/light.

**Phase 4-5 -- Five primary catalogues (packages/shared).** Each transcribed verbatim
from its operator `.docx` via `obj`/`ck`/`dg` helpers, mapped Tier 0-6 -> Stratum
S1-S7, `const PRIMARY = '<typeid>' as const`, every objective `source:'primary'` +
`sourceTypeId:PRIMARY`, decision-group partitions authored under the 2026-05-31
extended override:
- **Homestead** (`homestead.ts`, HMS-, 15 primary; taxonomy id `homestead`).
- **Education / Demonstration Land** (`education.ts`, EDU-, 22 primary; `education`).
- **Conservation / Rewilding** (`conservation.ts`, CON-, 30 primary; `conservation`).
- **Market Garden** (`marketGarden.ts`, MGD-, 24 primary; `market_garden`).
- **Off-Grid Resilience / Remote Settlement** (`offGrid.ts`, OFG-, 27 primary;
  `off_grid`). 46 total with the universal-19.

Each wired into `catalogues/index.ts` with the now-**five**-edit pattern (import,
re-export, `getPrimaryCatalogue` arm, `ALL_CATALOGUE_OBJECTIVES` union, header comment).
With these, **11 of 12 selectable primaries carry an encoded layer**; only Nursery as a
*primary* remains universal-only (its catalogue is secondary-only).

## Covenant (Amanah Gate)

- **Market Garden** surfaces **CSA** (Community Supported Agriculture) as a produce
  channel. Per the operator ruling 2026-06-02 ([[feedback-csa-in-catalogues]]),
  encoded **verbatim** AND flagged with an **Amanah `scopeNotes`** on MGD-S1.4 +
  MGD-S1.6: any CSA arrangement must avoid *bayʿ mā laysa ʿindak* (produce sold as
  delivered / membership-benefit framing, not advance purchase of an undelivered
  harvest). This carries the CSRA-prohibition caution ([[fiqh-csra-erased-2026-05-04]])
  forward to generic OLOS catalogues without altering verbatim fidelity.
- **Homestead / Education / Conservation / Off-Grid** carry **no riba/gharar surface**
  -- no advance-sale or financing instrument. Off-Grid is life-safety resilience
  systems only (water/energy/shelter/food/communications/emergency). Clean.

## Source design/hard gates preserved (verbatim, via scopeNotes)

- **Off-Grid OFG-S1.4** -- independence targets are design gates; all S4-S5 systems
  sized against them.
- **Off-Grid OFG-S4.7 / OFG-S7.4 / OFG-S7.6** -- HARD GATES: no permanent habitation
  before water (potable), energy (critical loads), shelter (thermal), and emergency
  communications all pass **independent** go/no-go tests; residents trained first.
- **Off-Grid OFG-S6.4** -- noted **Principle 9 exception**: adaptive management placed
  in Tier 5 (life-safety monitoring + adaptation inseparable; season-tied review).

## Verification

`@ogden/shared` typecheck (8GB `tsc --noEmit`) EXIT 0; **897 vitest tests pass**;
`@ogden/shared` lint EXIT 0. `@ogden/web` typecheck EXIT 0; **web production build
green** (`tsc && vite build`, `built in 43.5s`, PWA + 766 precache entries). The web
`postbuild` (`pnpm prerender:showcase`) fails only because bare `pnpm` is not on PATH
(we invoke via `corepack pnpm`) -- an environment quirk, not a code defect; the
compile+bundle that matters passed. Preview: `/v3/components` library renders cleanly
against the new shared build (screenshot captured). The enriched **CanopySuccessionCard**
was preview-verified via a temporary `/v3/components` mount (9-species orphan-pick seed
filling all 7 niches, project id `debug-canopy`) to avoid the screenshot-hang-prone
map-bearing Plan path ([[project_screenshot_hang]]): all formula panels render with
derived (non-mock) values -- canopy closure 48%, understory light 52%, niches 7/7,
ecological functions 8/9, productivity index 79/100, shade ~5.8 h/day at Year 10 -- in
**both light and dark** themes (tokens adapt). The temporary mount + seeded picks were
reverted/cleared after capture (git clean). The enriched **GuildSpatialBuilderCard**
sits on the map-bearing Plan path and was verified during its own Phase 3 session, not
re-shot here. Each phase
committed as its own slice after a `git fetch` + divergence check, staging only the
slice's files per [[feedback-commit-immediately-on-rebased-branches]]; foreign WIP from
parallel sessions left untouched per [[feedback-no-deletion]]. ASCII-only copy.

## Known gap (deferred)

The 5 newer primary catalogues (HMS/EDU/CON/MGD/OFG) are **not** in the `ALL_AUTHORED`
arrays of `catalogues.test.ts` or `shortTitle.test.ts`, so they are guarded only by
TypeScript compile-time enforcement (the `obj()` helper + `PlanStratumObjective` type),
not by the runtime conformance rubric (ref format, 5-15 checklist bound, gate+handoff
presence, shortTitle derivation). This gap predates this session (it began when
Homestead/Education/Conservation were fanned out) and is **not closed here** because
doing so also requires extending the `OBJECTIVE_REF` regex
(`/^(U|RF|RES|EV|AG|WELL|SILV|ORCH|NRS)-S[1-7]\.\d+$/`) to add `HMS|EDU|CON|MGD|OFG` --
an undiscussed change touching the prior phases' verification posture. Recommended
follow-on: a dedicated slice that adds the 5 primaries to both `ALL_AUTHORED` arrays
and widens the regex, then confirms the rubric passes for all of them.

## State after

Food-forest adoption **complete**: formulas + 2 enriched cards + 5 catalogues all
build/test/lint clean and committed. Encoded primary layers: Regenerative-Farm,
Ecovillage, Agritourism, Wellness, Silvopasture, Orchard, Homestead, Education,
Conservation, Market Garden, Off-Grid (11). Encoded secondaries: Residential, Wellness,
Nursery, Silvopasture, Orchard. Nursery-as-primary remains universal-only. Silvo/Orchard
universal-augmentation patches + secondary layers still pending operator source files
([[log/2026-05-30-atlas-silvo-orchard-catalogue]]).
