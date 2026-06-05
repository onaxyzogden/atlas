# 2026-05-19 — B5.2 PLANT_CATALOG cover-crop backfill + coverCropCatalog expansion


**Branch.** `feat/atlas-permaculture`. Closes the B5.1 ADR's
catalog-growth open thread. **Posture restored to strictly-additive-
no-schema-bump** — B5.1 remains the documented one-time exception.

Two data-only commits, per-commit file isolation verified via
`git diff-tree --no-commit-id --name-only -r <sha>`:

1. `9432962f` — `plantCatalog.ts` only. Eight new entries:
   `winter_rye` (Secale cereale), `hairy_vetch` (Vicia villosa),
   `buckwheat` (Fagopyrum esculentum), `tillage_radish` (Raphanus
   sativus var. longipinnatus), `crimson_clover` (Trifolium
   incarnatum), `field_pea` (Pisum sativum subsp. arvense),
   `white_mustard` (Sinapis alba), `oats` (Avena sativa). A-axis
   fields only (`layer`, `hardinessZones`, `lightNeeds`,
   `waterNeeds`, `rootDepthM`, `rootPattern`, `ecologicalFunction`)
   — `category` deliberately omitted because the existing
   `PlantCategory` union is `'tree' | 'shrub' | 'vine' |
   'ground_cover'` and annuals don't fit. **Not extending the
   union** keeps every B-axis consumer untouched. **Only existing
   `EcologicalFunction` union members used** (no `cover_crop` /
   `living_mulch` / `green_manure` tags added — the B5.1 ADR
   explicitly named this as a non-goal; role taxonomy lives on
   `CoverCropEntry.roles`, not on `PLANT_CATALOG`).

2. `b95c9e71` — `coverCropCatalog.ts` only. Eight new
   `CoverCropEntry` rows, one per new `PLANT_CATALOG` species,
   covering all six cover-crop roles
   (`winter_cover` / `scavenger` / `smother` / `green_manure` /
   `biofumigant` / `living_mulch`) and every season
   (spring / summer / fall / winter). Every entry cites SARE
   *Managing Cover Crops Profitably (3rd ed.)*, USDA NRCS Plant
   Guide / PM Tech Notes, or UC SAREP cover-crop database.
   "Yield" language deliberately avoided in rationales — N
   fixation framed as "fixes 90–200 kg N/ha", not "yields N"
   (cover crops are soil-vitality species, not cash-yield
   species). `COVER_CROP_CATALOG` grows 6 → 14 entries.

**No new test files.** The authoritative gate is the existing
`coverCropCatalog.ts` "every speciesId resolves in PLANT_CATALOG"
test — it ratchets the two parts together. The existing
`plantCatalog.test.ts` (no-duplicate-id / snake_case /
`CATALOG_BY_ID` round-trip) absorbs the eight new rows on
append. **No consumer touched** — `LivingRootsCard`,
`livingRootsMath`, and `CriteriaForecastTab` light up for the
new species with zero edits.

**Verification.** Targeted vitest 36/36 (`plantCatalog` 10 +
`coverCropCatalog` 14 + `livingRootsMath` 12), full web vitest
1395/1395 (no regression vs the post-B5.1 baseline — no new
test files added; new rows absorbed by existing iteration
tests), `tsc --noEmit` clean, `vite build` exit 0 (40.27 s),
covenant grep over both edited files finds only the pre-existing
`coverCropCatalog.ts` doc-comment negative declaration. Live
preview not exercised — `LivingRootsCard` sits behind the
`plant-systems` / `soil-fertility` Plan slide-up; MapLibre/WebGL
hang risk + screenshot-honesty rule; pure-data + integrity tests
are the authoritative proof (B-series precedent).

**Audit smoke check.** A `CropArea` fixture with one
`winter_rye` window (Oct–Mar = months 10, 11, 12, 1, 2, 3) + one
`buckwheat` window (Jun–Aug = months 6, 7, 8) gives the expected
9-month OR-merge → `coveragePct ≈ 75`, comfortably above the
`living-roots-coverage-pct` criterion's `target: 70` deadline-Y3
bar. Confirms the new species feed the existing audit without
an audit-side edit.

**Forward queue.** Two B5.2.x candidates: per-`CropArea`
`coverCropPlan` editor UI; cover-crop seed-cost / labor rollup
into `phasing-budgeting`. Both warrant their own brainstorm →
spec → plan cycles. After those, B-series is closed and the
queue moves to C / D-series work outside the permaculture
branch.

ADR: [2026-05-19-atlas-b5-2-plant-catalog-cover-crop-backfill](decisions/2026-05-19-atlas-b5-2-plant-catalog-cover-crop-backfill.md).
