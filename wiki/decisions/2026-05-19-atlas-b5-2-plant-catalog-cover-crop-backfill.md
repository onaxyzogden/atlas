# ADR — Atlas B5.2: PLANT_CATALOG cover-crop backfill + coverCropCatalog expansion

**Date:** 2026-05-19
**Branch:** `feat/atlas-permaculture`
**Sub-project:** B5.2 (closes the B5.1 ADR's catalog-growth open
thread — adds the eight conventional cover-crop species B5.1 had
to omit-not-stub because `PLANT_CATALOG` lacked them)
**Status:** Accepted — shipped in commits `9432962f`, `b95c9e71`
**Related:** [[2026-05-19-atlas-b5-1-cover-crop-living-roots]],
[[2026-05-19-atlas-b5-beneficial-organism-habitat]]

---

## Context

B5.1 shipped the cover-crop & living-roots audit infrastructure
(`CropArea.coverCropPlan?` + persist v2→v3 migrate, six-entry
`coverCropCatalog.ts`, `computeLivingRootsReport`,
`LivingRootsCard` cross-registered into `plant-systems` +
`soil-fertility`, `living-roots-coverage-pct` criterion under
`soil-health`). The B5.1 ADR closed with an explicit
catalog-scope constraint:

> The plan contemplated ~8–12 cited entries (winter rye, hairy
> vetch, buckwheat, daikon, crimson clover, field pea, mustard,
> oats). `PLANT_CATALOG` only carries `clover` from that
> conventional cover-crop list. Honoured the "catalog misses
> omitted, not stubbed" rule — shipped six PLANT_CATALOG-
> resolved entries from perennial / herbaceous-understory
> species. The catalog grows organically as `PLANT_CATALOG`
> expands.

B5.2 **is** that growth. With the eight conventional cover crops
in `PLANT_CATALOG`, the cover-crop catalog grows from 6 → 14
entries and the living-roots audit lights up for the species an
actual market-garden / row-crop / orchard-understory steward
would seed. Without B5.2 the B5.1 audit was symbolically
complete but practically thin.

## Decision

Ship B5.2 as **two data-only additive parts** (no schema, no
persist bump, no `PlanModule` mutation, no new card, no consumer
touched):

1. **`PLANT_CATALOG` backfill** (`apps/web/src/data/plantCatalog.ts`)
   — append eight entries:

   | id | latinName | layer | ecologicalFunction |
   |---|---|---|---|
   | `winter_rye` | Secale cereale | herbaceous | `dynamic_accumulator` |
   | `hairy_vetch` | Vicia villosa | ground_cover | `n_fixer`, `pollinator` |
   | `buckwheat` | Fagopyrum esculentum | herbaceous | `pollinator`, `dynamic_accumulator` |
   | `tillage_radish` | Raphanus sativus var. longipinnatus | herbaceous | `dynamic_accumulator` |
   | `crimson_clover` | Trifolium incarnatum | ground_cover | `n_fixer`, `pollinator` |
   | `field_pea` | Pisum sativum subsp. arvense | herbaceous | `n_fixer` |
   | `white_mustard` | Sinapis alba | herbaceous | `pollinator` |
   | `oats` | Avena sativa | herbaceous | `fodder` |

   **A-axis only** — layering / guild / canopy fields (`layer`,
   `matureHeightM`, `matureWidthM`, `hardinessZones`,
   `lightNeeds`, `waterNeeds`, `rootDepthM`, `rootPattern`,
   `ecologicalFunction`). `category` deliberately **omitted** —
   the existing `PlantCategory` union is
   `'tree' | 'shrub' | 'vine' | 'ground_cover'` and the eight
   annuals do not cleanly fit; the field is optional on the
   site-match B-axis filter. Extending the union would force
   every B-axis consumer to handle a new value, breaking the
   data-only posture.

2. **`COVER_CROP_CATALOG` expansion**
   (`apps/web/src/features/coverCrops/coverCropCatalog.ts`) —
   append one B5.1-shape `CoverCropEntry` row per new species,
   covering all six cover-crop roles
   (`winter_cover`/`scavenger`/`smother` × `green_manure` ×
   `biofumigant`) and every season (spring/summer/fall/winter):

   | speciesId | roles | livingRootSeasons | window |
   |---|---|---|---|
   | `winter_rye` | winter_cover, scavenger, smother | fall, winter, spring | [9, 10] |
   | `hairy_vetch` | winter_cover, green_manure | fall, winter, spring | [8, 10] |
   | `buckwheat` | smother, green_manure | summer | [5, 7] |
   | `tillage_radish` | scavenger, biofumigant | fall | [8, 9] |
   | `crimson_clover` | winter_cover, green_manure | fall, winter, spring | [8, 9] |
   | `field_pea` | green_manure | spring | [3, 4] |
   | `white_mustard` | biofumigant, smother, scavenger | summer, fall | [4, 8] |
   | `oats` | winter_cover, smother | fall | [8, 9] |

   Every entry carries `rationale` + `citation` (SARE *Managing
   Cover Crops Profitably (3rd ed.)*, USDA NRCS Plant Guide / PM
   Tech Notes, UC SAREP cover-crop database).

## Posture — strictly-additive, no-schema-bump restored

B5.1 was the one-time exception. B5.2 carries:

- **No schema move**, no persist bump, no `syncManifest` edit.
- **No union extension** — `EcologicalFunction`, `CanopyLayer`,
  `PlantCategory` all untouched (B5.1 ADR named "no new
  `EcologicalFunction` tags" as a non-goal; this slice honours
  that — every new `PLANT_CATALOG` entry's
  `ecologicalFunction` field uses only existing union members).
- **No new `PlanModule` member**, no `Record<PlanModule, _>`
  change, no spine mutation.
- **No consumer touched.** `coverCropCatalog.test.ts` and
  `plantCatalog.test.ts` pick up the new rows automatically via
  existing iteration; `LivingRootsCard`, `livingRootsMath`, and
  `CriteriaForecastTab` light up for the new species with zero
  edits.
- Cross-registration unchanged (zero new mount points).

**Covenant lock** (`/\b(riba|gharar|csra|salam|investor|financing|cost-of-capital)\b/i`)
holds — rationale + citation strings are agronomic only. "Yield"
language is deliberately avoided in the cover-crop rationales
(these are soil-vitality species, not cash-yield species — N
fixation framed as "fixes 90–200 kg N/ha", not "yields N").

## Scope decisions

- **Catalog size capped at the eight species the B5.1 plan
  named.** The plan named winter rye, hairy vetch, buckwheat,
  daikon, crimson clover, field pea, mustard, oats. All eight
  shipped; further additions (rapeseed, sorghum-sudangrass,
  cowpea, sunn hemp, etc.) wait for the next steward request.
- **`category` field omitted on the eight new entries.** Forces
  the B-axis site-match filter to ignore them — they only
  surface through the A-axis layering selector (`layer:
  herbaceous` or `ground_cover`). Extending `PlantCategory`
  with `'annual'` or `'herbaceous'` would touch every B-axis
  consumer and break the data-only posture; deferred.
- **No new test files.** `plantCatalog.test.ts` already
  enforces no-duplicate-id / snake_case /
  `CATALOG_BY_ID` round-trip on every catalog entry;
  `coverCropCatalog.test.ts` already enforces every
  `speciesId` resolves in `PLANT_CATALOG`, non-empty fields,
  `plantingMonthWindow` in 1..12, covenant lock. New rows get
  this coverage on append — **the
  `coverCropCatalog.ts` "every speciesId resolves in
  PLANT_CATALOG" test ratchets the two parts together**: any
  drift between the new B5.1 catalog entries and the new
  `PLANT_CATALOG` rows fails the test loudly.

**Out of scope (explicitly deferred):**
- **Per-`CropArea` `coverCropPlan` editor UI.** B5.1 shipped
  schema + read surface, B5.2 ships data, the editor is the
  next B5.2.x slice.
- **Cover-crop seed-cost / labor rollup into
  `phasing-budgeting`.** Budgeting-side ask, separate slice.
- **Extending `EcologicalFunction` with `cover_crop` /
  `living_mulch` / `green_manure`.** The B5.1 external-catalog
  augmentation pattern still holds — the role taxonomy lives
  on `CoverCropEntry.roles`, not on `PLANT_CATALOG`.
- **`PlantCategory` extension** for annuals.

## Files

**Edited (2, additive append-only hunks):**
- [apps/web/src/data/plantCatalog.ts](apps/web/src/data/plantCatalog.ts)
  — 8 new entries (~39 lines added).
- [apps/web/src/features/coverCrops/coverCropCatalog.ts](apps/web/src/features/coverCrops/coverCropCatalog.ts)
  — 8 new `CoverCropEntry` rows (~82 lines added).

**New:** *(none — data-only slice)*

**Reuse, do not modify:**
- `EcologicalFunction` / `CanopyLayer` / `PlantCategory` unions.
- `coverCropCatalog.test.ts`, `plantCatalog.test.ts`.
- `LivingRootsCard.tsx`, `livingRootsMath.ts`,
  `CriteriaForecastTab.tsx`.

## Verification

- **Targeted vitest:** `plantCatalog` (10) + `coverCropCatalog`
  (14) + `livingRootsMath` (12) — 36/36 green. The
  `coverCropCatalog` "every speciesId resolves in
  PLANT_CATALOG" test confirms all 14 entries (6 from B5.1 + 8
  from B5.2) resolve.
- **Full web vitest:** 1395/1395 tests green (no regression vs
  the post-B5.1 baseline — no new test files added; the new
  rows are absorbed by existing iteration tests).
- **Typecheck:** `tsc --noEmit` clean for both edited files.
- **Vite build:** exit 0 (40.27 s).
- **Covenant grep** over the two edited files finds only the
  pre-existing negative declaration in the
  `coverCropCatalog.ts` doc comment (line 13–14) and nothing in
  `plantCatalog.ts`. PASS.
- **Per-commit isolation audit** (`git diff-tree`):
  - `9432962f` → only `plantCatalog.ts` (Part 1).
  - `b95c9e71` → only `coverCropCatalog.ts` (Part 2).
  No store, no schema, no `PlanModule`, no spine, no test files.
- **Branch divergence:** `git rev-list --left-right --count
  HEAD...@{u}` = `3 0` (the 3 are this session's B5.1 wiki
  commit + the two B5.2 commits — no rebase needed; no push
  per standing rule).
- **Live preview:** not exercised — `LivingRootsCard` sits
  behind the `plant-systems` or `soil-fertility` Plan slide-up;
  the known MapLibre/WebGL hang may recur; per the
  screenshot-honesty rule, no screenshot claimed. Pure-data
  tests + tsc + integrity tests are the authoritative proof
  (B-series precedent).

## Consequences

- **B5.1 ADR's catalog-growth open thread is closed.** The
  cover-crop catalog is now stewardable-grade for conventional
  row-crop / market-garden / orchard-understory systems — the
  six perennial / herbaceous-understory species B5.1 shipped
  remain the right answer for living-mulch year-round coverage
  in established orchards; the eight new annual species are the
  right answer for between-cash-crop rotational windows.
- The `living-roots-coverage-pct` criterion's projection now
  reflects realistic windows: a `winter_rye` October–March
  window + a `buckwheat` June–August window gives 9/12 months
  of living roots = 75% coverage, comfortably above the
  `target: 70` deadline-Y3 bar.
- **B-series forward queue narrows to two B5.2.x candidates:**
  per-`CropArea` `coverCropPlan` editor UI; cover-crop seed-cost
  / labor rollup into `phasing-budgeting`. Both warrant their
  own brainstorm → spec → plan cycles.
- The strictly-additive-no-schema-bump posture is restored as
  the B-series default; the B5.1 schema-bump exception remains
  the documented one-time deviation.

## Notes (session-close)

Wiki tree was clean at session-close. ADR + `wiki/index.md`
decision entry + `wiki/log.md` session line all commit together
in a single follow-up `docs(wiki)` commit (B5.1 precedent).
