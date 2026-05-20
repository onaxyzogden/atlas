# ADR — Atlas B5.1: Cover-Crop & Living-Roots Planning

**Date:** 2026-05-19
**Branch:** `feat/atlas-permaculture`
**Sub-project:** B5.1 (deferred slice from B5 — resolves the only
Bd-decomposition dimension B5 could not ship under the strictly
additive A-series posture)
**Status:** Accepted — shipped in commits `6fc61a06`, `00f18beb`,
`e06e7524`, `71c6ef64`
**Related:** [[2026-05-19-atlas-b5-beneficial-organism-habitat]],
[[2026-05-18-atlas-bd-subproject-decomposition]],
[[2026-04-28-atlas-permaculture-alignment-recs]]

---

## Context

B5 closed the B-series for every Bd-decomposition dimension **except
one**: cover-crop & living-roots planning. That slice was deferred
to its own brainstorm → spec → plan cycle because `CropArea`
(`apps/web/src/store/cropStore.ts:14-59`) carried no
seasonal/rotation/cover-crop fields — it could not ship under the
strictly-additive-no-schema-bump posture that B2.1, B3.1, B4, and
B5 all held.

B5.1 **is** that slice. It picks up the Gabe Brown / SARE *Managing
Cover Crops Profitably* framing already alluded to in B2.1's
`SoilBuildingPlanCard` prose ("cover-crop with deep-rooted nitrogen
fixers"), but turns it into structured data: a steward marks a row-
crop / market-garden / orchard understory parcel with one or more
**cover-crop windows** (species + month range), and a new audit
projects the parcel's annual **living-roots %** toward the existing
`regen-soil-cover` outcome target.

This is the **first B-series slice to touch the persist-versioned
schema**. The covenant shift is deliberate, scoped to **one**
persist-version bump (`cropStore` v2 → v3) + its matching
`syncManifest` entry, and explicitly named in this ADR.

## Decision

Ship B5.1 as **four additive parts** (one schema bump scoped to a
single store, mirroring the B2.1/B3.1/B4/B5 template otherwise):

1. **`CropArea` schema extension + persist v2→v3 migrate.**
   New `CropCoverWindow` interface (`speciesId`, `startMonth`,
   `endMonth`, six-role enum: `green_manure` / `living_mulch` /
   `winter_cover` / `scavenger` / `smother` / `biofumigant`); new
   optional `coverCropPlan?: CropCoverWindow[]` field on
   `CropArea`. Persist version bumped 2 → 3 with an extracted
   `migrateCropStore(persisted, version)` exported function. The
   v2 → v3 leg defaults `coverCropPlan` to `undefined` on legacy
   rows (additive, idempotent on already-v3 rows). The existing
   v1 → v2 species-id rewrite leg is preserved.
   `syncManifest.blob('ogden-crops', useCropStore,
   'projectId-tagged', 2, …)` → `…, 3, …` — scope, selector, and
   temporal flag unchanged.

2. **Static cited cover-crop catalog**
   (`apps/web/src/features/coverCrops/coverCropCatalog.ts`):
   six entries (clover, comfrey, borage, yarrow, creeping_thyme,
   bugleweed) — every entry cites SARE *Managing Cover Crops
   Profitably (3rd ed.)*, Rodale *Cover Crops & Living Mulches*,
   USDA NRCS Plant Materials Technical Notes, or UC SAREP
   cover-crop database. Helpers: `coverCropEntryFor(speciesId)`
   and `livingRootMonthsFor({startMonth, endMonth})` (year-wrap
   safe). Runtime catalog-integrity warning if any `speciesId`
   does not resolve in `PLANT_CATALOG`.

3. **Pure living-roots math**
   (`apps/web/src/features/coverCrops/livingRootsMath.ts`):
   `computeLivingRootsReport({projectId, cropAreas})` returns
   `{overall, rows}`. Per-area: OR-merge each `coverCropPlan[i]`
   via `livingRootMonthsFor` into a 12-month boolean vector,
   `coveragePct = months / 12 * 100`. Overall: **area-weighted
   mean across ALL project areas** (bare areas drag the score
   down — intentional, matches the parcel-level
   `regen-soil-cover` outcome target), distinct species / roles
   dedup, clamped 0..100, zero-area exclusion to avoid
   divide-by-zero. Thin wrapper `computeLivingRootsCoveragePct`
   for the goal-tree forecast.

4. **Render-only `LivingRootsCard`** + cross-registration into
   **both** `MODULE_CARDS['plant-systems']` and
   `MODULE_CARDS['soil-fertility']` (one card, one sectionId
   `'plan-living-roots'`, two surfacing tabs — B4/B5 precedent).
   New criterion `living-roots-coverage-pct` (target 70 by Y3)
   added as a **sibling** of `regen-soil-cover` under the
   existing `'soil-health'` sub-goal, wired through
   `CriteriaForecastTab` using the `allCropAreas` selector
   already imported there from B4.

## Posture — scoped schema-bump exception

B5.1 deliberately steps out of the strictly-additive-no-schema-bump
posture held by B2.1, B3.1, B4, and B5. The exception is bounded:

- **One persist-version bump** (`cropStore` v2 → v3) +
  the matching `syncManifest.schemaVersion` bump. **No other
  store touched, no other version moved.**
- **Idempotent additive migrate** — only adds an optional field
  on legacy rows; renames/removes nothing. v3 → v3 is a no-op.
- **No new `PlanModule` union member** — therefore the
  `never`-guarded 6-touchpoint contract is **not** triggered.
- **No new sub-goal**, no `Record<PlanModule, _>` change,
  no spine mutation, no DB migration, no API endpoint.
- Cross-registration is two `MODULE_CARDS` append-only pushes
  (B4/B5 precedent).
- "Coverage %" is strictly soil-vitality (months of living roots
  per year, area-weighted) — never a financial or
  yield-as-return notion. Covenant lock
  `/\b(riba|gharar|csra|salam|investor|financing|cost-of-capital)\b/i`
  holds in all three new test files (strip `/* … */`
  doc-comments before scanning).

## Scope decisions

- **Catalog size constrained by `PLANT_CATALOG`.** The plan
  contemplated ~8–12 cited entries (winter rye, hairy vetch,
  buckwheat, daikon, crimson clover, field pea, mustard, oats,
  etc.). `PLANT_CATALOG` only carries `clover` from that
  conventional cover-crop list — the rest do not have plant-
  catalog rows yet. Honoured the "**catalog misses omitted, not
  stubbed**" rule (B4/B5 precedent): shipped six PLANT_CATALOG-
  resolved entries drawn from perennial / herbaceous-understory
  species (clover, comfrey, borage, yarrow, creeping_thyme,
  bugleweed). The catalog grows organically as `PLANT_CATALOG`
  expands. A B5.2 follow-up to backfill conventional
  cover-crop species into `PLANT_CATALOG` is implied.
- **`coverCropPlan` editor UI deferred.** B5.1 ships the schema
  + read surface so programmatic / seeded plans light up the
  audit immediately. A per-`CropArea` row editor is scoped
  separately.
- **Cover-crop seed-cost / labor budget rollup into
  `phasing-budgeting` deferred** (B5.2 candidate). That is a
  budgeting-side ask, not a soil-vitality audit.
- **No new `EcologicalFunction` tags** added to PLANT_CATALOG
  (e.g. `cover_crop`, `living_mulch`). The B5.1 catalog is an
  *external* mapping that augments — never mutates — the plant
  catalog (B5 precedent: `beneficialFunctionCatalog` does the
  same).

## Files

**New (7):**
- `apps/web/src/features/coverCrops/coverCropCatalog.ts`
- `apps/web/src/features/coverCrops/__tests__/coverCropCatalog.test.ts`
- `apps/web/src/features/coverCrops/livingRootsMath.ts`
- `apps/web/src/features/coverCrops/__tests__/livingRootsMath.test.ts`
- `apps/web/src/features/coverCrops/LivingRootsCard.tsx`
- `apps/web/src/features/coverCrops/LivingRootsCard.module.css`
- `apps/web/src/store/__tests__/cropStore.migrate.test.ts`

**Edited (6, additive hunks):**
- `apps/web/src/store/cropStore.ts` — `CropCoverWindow` +
  optional `coverCropPlan?`; extracted `migrateCropStore`
  named export; persist version 2 → 3.
- `apps/web/src/lib/syncManifest.ts` — `schemaVersion` 2 → 3
  on the `'ogden-crops'` blob entry; scope + selector
  unchanged.
- `apps/web/src/v3/plan/types.ts` — two `MODULE_CARDS` pushes
  (`'plant-systems'` and `'soil-fertility'` — same
  `sectionId`).
- `apps/web/src/v3/plan/PlanModuleSlideUp.tsx` — lazy import
  + switch arm for `'plan-living-roots'`.
- `apps/web/src/v3/plan/data/goalTreeTemplates.ts` — one
  criterion entry under `soil-health` (`target: 70`,
  `deadlineYear: 3`).
- `apps/web/src/v3/plan/cards/goal-compass/CriteriaForecastTab.tsx`
  — one import + one `currentValues` entry.

## Verification

- **Targeted vitest:** `cropStore.migrate` (8) +
  `coverCropCatalog` (14) + `livingRootsMath` (12) — 34/34
  green.
- **Full web vitest:** 1395/1395 tests green (no regression
  vs the post-B5 baseline of 1358 — new tests add cleanly).
- **Typecheck:** `tsc --noEmit` clean for the new + edited
  B5.1 files. `packages/shared` tsc exit 0.
- **Vite build:** exit 0.
- **Covenant grep** over `apps/web/src/features/coverCrops/`
  and the migration test finds only the negative declarations
  in the doc comments, the test descriptions, and the
  lock-test regex itself.
- **Per-commit isolation audit** (`git diff-tree
  --no-commit-id --name-only -r <sha>`):
  - `6fc61a06` → only `cropStore.ts`, `syncManifest.ts`,
    `cropStore.migrate.test.ts` (the scoped schema bump).
  - `00f18beb` → only the catalog + its test.
  - `e06e7524` → only the math module + its test.
  - `71c6ef64` → only the card + CSS + four wiring edits.
  No DB migration, no API endpoint, no `Record<PlanModule, _>`
  change, no new `PlanModule` union member, no new sub-goal,
  no spine mutation.
- **Migration test coverage:** v1 → v2 species rewrite,
  v1 → v2 field preservation, v2 → v3 legacy hydration
  (`coverCropPlan === undefined`), v2 → v3 preservation of
  set plans, v3 → v3 idempotency, v1 → v3 chain, empty /
  null / undefined persisted blob, covenant lock self-test.
- **Live preview:** not exercised — the known MapLibre/WebGL
  hang may recur; per the screenshot-honesty rule, no
  screenshot claimed. Pure-math tests + migration test + tsc
  + criterion forecast wiring are the authoritative proof
  (B-series precedent, as contemplated by step 9 of the
  approved plan).

## Consequences

- **B-series complete (fully).** The B5 ADR's deferred
  cover-crop & living-roots dimension is now resolved. Forward
  queue: B5.2 (cover-crop seed-cost rollup into
  `phasing-budgeting`; `PLANT_CATALOG` backfill of conventional
  cover-crop species; `coverCropPlan` per-area editor UI), and
  any C / D-series work outside the permaculture branch.
- The `'soil-health'` sub-goal now carries three criteria —
  `regen-soil-om` (organic matter %), `regen-soil-cover`
  (cover-crop / mulch outcome %), and
  `living-roots-coverage-pct` (design-time projection of
  year-round living-root months). They are complementary
  dimensions and meant to be read alongside each other.
- The `LivingRootsCard` is the **fourth** Plan card
  cross-registered into two modules under one `sectionId`
  (after `SilvopastureIntegrationCard` and
  `BeneficialHabitatCard`); the pattern is now the de facto
  house style for cross-cutting audits.
- The covenant-bounded schema-bump posture established here
  (one store, one persist version, one syncManifest line,
  idempotent additive migrate, no `PlanModule` mutation) is
  the template any future schema-bumping B-series slice
  should follow.

## Notes (session-close)

`wiki/index.md` and `wiki/log.md` were **clean** at session
close (no out-of-band edits) — this ADR commits together with
the matching `wiki/index.md` decision entry and `wiki/log.md`
session line. The B5 ADR's deferred index / log entries are
also added in the same commit (B5 shipped standalone because
the wiki tree was dirty at the time; this commit closes that
housekeeping debt as a bonus).
