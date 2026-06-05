# 2026-05-19 — B5.1 cover-crop & living-roots planning (scoped schema bump) + B5 wiki backfill


**Branch.** `feat/atlas-permaculture`. B5.1 ships the cover-crop &
living-roots dimension that B5 deferred — the **first B-series slice
to bump a persist version**. Scope of the exception is bounded and
named in the ADR: `cropStore` v2 → v3 + matching
`syncManifest.schemaVersion` on the `'ogden-crops'` blob, idempotent
additive migrate (legacy rows get `coverCropPlan: undefined`, v3 → v3
no-op), no other store touched, no new `PlanModule` member, no
`Record<PlanModule, _>` change, no sub-goal added, no spine
mutation.

Four parts, four commits, per-commit file-isolation verified via
`git diff-tree --no-commit-id --name-only -r <sha>`:

1. `6fc61a06` — `cropStore.ts` (new `CropCoverWindow` + optional
   `coverCropPlan?` on `CropArea`; extracted `migrateCropStore`
   named export; persist version 2 → 3) + `syncManifest.ts`
   (schemaVersion 2 → 3, scope + selector unchanged) +
   `cropStore.migrate.test.ts` (8 cases: v1 → v2 species rewrite,
   v1 → v2 field preservation, v2 → v3 legacy hydration,
   v2 → v3 plan preservation, v3 → v3 idempotency, v1 → v3 chain,
   empty/null/undefined blob, covenant lock self-test).
2. `00f18beb` — `coverCropCatalog.ts` (six entries: clover, comfrey,
   borage, yarrow, creeping_thyme, bugleweed — every entry cited
   to SARE *Managing Cover Crops Profitably (3rd ed.)*, Rodale
   *Cover Crops & Living Mulches*, USDA NRCS Plant Materials TN, or
   UC SAREP) + `livingRootMonthsFor` year-wrap helper +
   `coverCropEntryFor` + runtime catalog-integrity warning; 14
   colocated tests.
3. `e06e7524` — `livingRootsMath.ts` (`computeLivingRootsReport`
   returns `{overall, rows}`; per-area 12-month boolean OR-merge,
   area-weighted mean across **all** project areas — bare areas
   drag the score down, matches the parcel-level `regen-soil-cover`
   target; distinct species/roles dedup, clamped 0..100,
   zero-area exclusion; thin `computeLivingRootsCoveragePct`
   wrapper for the goal-tree forecast); 12 colocated tests.
4. `71c6ef64` — `LivingRootsCard.tsx` + `.module.css` (render-only,
   `{ projectId }`, hero with coveragePct pill green ≥ 70 / amber
   40–69 / red < 40, parcel counters, roles-present chips,
   per-area rows with 12-cell month strip, cap 8 + "+N more") +
   four wiring edits: two `MODULE_CARDS` appends in `types.ts`
   (`plant-systems` + `soil-fertility`, same `sectionId`
   `plan-living-roots`); lazy import + `'plan-living-roots'`
   switch arm in `PlanModuleSlideUp.tsx`; new
   `living-roots-coverage-pct` criterion (target 70 by Y3) added
   as **sibling** of `regen-soil-cover` under existing
   `soil-health` sub-goal in `goalTreeTemplates.ts`; one import +
   one `currentValues` entry in `CriteriaForecastTab.tsx` (uses
   the `allCropAreas` selector already imported there from B4).

**Catalog scope decision.** The plan contemplated ~8–12 cited
entries (winter rye, hairy vetch, buckwheat, daikon, crimson
clover, field pea, mustard, oats, …). `PLANT_CATALOG` only carries
`clover` from that conventional cover-crop list. Honoured the
**"catalog misses omitted, not stubbed"** rule (B4/B5 precedent):
shipped six PLANT_CATALOG-resolved entries from perennial /
herbaceous-understory species. The catalog grows organically as
`PLANT_CATALOG` expands. B5.2 candidates: backfill the
conventional cover-crop species into `PLANT_CATALOG`; cover-crop
seed-cost / labor rollup into `phasing-budgeting`; per-`CropArea`
`coverCropPlan` editor UI.

**Verification.** Targeted vitest 34/34 (`cropStore.migrate` 8 +
`coverCropCatalog` 14 + `livingRootsMath` 12), full web vitest
1395/1395 (clean addition over the post-B5 1358 baseline), `tsc
--noEmit` clean for new + edited B5.1 files, `vite build` exit 0,
covenant grep over `features/coverCrops/` + migration test clean
(only the documented negative declarations and the lock-test regex
itself match). Live preview not exercised — MapLibre/WebGL hang
risk, screenshot-honesty rule, no screenshot claimed; the pure-math
+ migration + tsc + criterion-forecast proof is the authoritative
gate (B-series precedent, as contemplated by step 9 of the
approved plan).

**Covenant posture.** "Coverage %" is strictly soil-vitality
(months of living roots per year, area-weighted across the parcel)
— never a financial or yield-as-return notion. Covenant lock
`/\b(riba|gharar|csra|salam|investor|financing|cost-of-capital)\b/i`
holds in all three new test files (strip `/* … */` doc-comments
before scanning).

**Wiki housekeeping.** Wiki tree was clean at session-close, so
this commit also **backfills** the index/log entries that B5
deferred (B5 shipped its ADR standalone because the wiki tree was
dirty at the time). Both B5 and B5.1 index entries land here; the
B5 log entry stays the prior session's record on disk and is now
discoverable through `wiki/index.md`.

**Forward queue.** B-series complete (B5.1 closes the only
Bd-decomposition dimension B5 had to defer). B5.2 candidates as
above; any C / D-series work is outside the permaculture branch.

ADR: [2026-05-19-atlas-b5-1-cover-crop-living-roots](decisions/2026-05-19-atlas-b5-1-cover-crop-living-roots.md).
