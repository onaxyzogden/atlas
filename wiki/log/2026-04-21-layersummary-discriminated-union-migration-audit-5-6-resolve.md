# 2026-04-21 — LayerSummary discriminated-union migration (audit §5.6 RESOLVED)


Executed the spawned follow-up task from the graphify rebuild. Closed latent
audit issue 5.6 by lifting `LayerSummary` into `@ogden/shared/scoring` as a
41-variant discriminated union keyed by `layerType`.

**Shipped.**
- `packages/shared/src/scoring/layerSummary.ts` — new ~470-line module with
  one `*Summary` interface per `LayerType`, a `LayerSummaryMap` record, the
  union `LayerSummary`, and boundary coercers `toNum` / `toStr` /
  `normalizeSummary` that drop `'Unknown'` / `'N/A'` / `''` / `'null'` /
  `'undefined'` to `null`. Numeric fields are `number | null` (never union
  with `string`). A small number of narrative-string fields
  (`wetlands_flood.riparian_buffer_m`, `wetlands_flood.regulated_area_pct`)
  are intentionally typed `number | string | null` because the upstream
  source sometimes returns narrative text like *"Contact local Conservation
  Authority"*; those are excluded from `NUMERIC_KEYS` so `toNum` doesn't
  stomp the text.
- `packages/shared/src/scoring/types.ts` — `MockLayerResult` is now a mapped
  type: `{ [K in LayerType]: BaseLayerFields & { layerType: K; summary:
  LayerSummaryMap[K] & Record<string, unknown> } }[LayerType]`. The
  `& Record<string, unknown>` intersection lets fetchers keep writing extra
  keys (e.g. cache-strip fields `_monthly_normals`, `_wind_rose`) without
  breaking the strict narrowing that consumers care about. Added
  `LayerResultFor<K>` helper alias.
- `apps/web/src/lib/layerFetcher.ts` — migrated ~15 sentinel-string literal
  sites across SSURGO soils, ECCC climate, USGS/OHN watershed, FEMA
  wetlands/flood, US + CA zoning fetchers. Every `'Unknown'` / `'N/A'`
  assigned to a numeric field now coerces to `null` at the fetch boundary.
  Climate `lastFrost` / `firstFrost` / `hardinessZone` narrowed with
  `as string | null` casts to match the variant shape.
- `apps/web/src/lib/mockLayerData.ts` — CA mock literals (line 59, 77, 81)
  now emit `null` instead of `'N/A'` for `depth_to_bedrock_m`, `huc_code`,
  `catchment_area_ha`.
- `apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx` — **deleted**
  the `formatPct` defensive guard (lines 79–84) and simplified both call
  sites to read `wetlands.wetland_pct.toFixed(1)` directly with an inline
  `!= null` null-fallback. `regulated_area_pct` still routes through a small
  `typeof === 'number'` branch because the field is a permitted union.
- `apps/web/src/tests/computeScores.test.ts:289` and
  `apps/web/src/tests/helpers/mockLayers.ts:24,47` — cast the generic
  test-fixture builders via `as MockLayerResult` to collapse the 44-variant
  mapped type into the needed shape (TS2590 "union too complex" without
  the cast).

**Not needed.** Phase 3 (retype scoring engine + rule engine) and Phase 4
(consumer fixes driven by TS errors) reached zero-error state without
additional edits. The existing `s()` / `num()` / `nested()` helpers in
`computeScores.ts` and the `getLayerSummary<T>()` generic in
`siteDataStore.ts` are structurally compatible with the new types because
the `& Record<string, unknown>` intersection preserves the "extra keys are
fine" escape hatch. All 12+ downstream consumer files (useSiteIntelligenceMetrics,
SiteIntelligencePanel, HydrologyRightPanel, TerrainAnalysisFlags, dashboard
pages) continued to compile. The plan budgeted up to ~50k tokens for
consumer fixes; actual delta was zero. The belt-and-braces helpers stay in
place as a defensive layer for any future field drift.

**Verification.**
- `tsc --noEmit` clean in `apps/web`, `apps/api`, `packages/shared` (all
  three required `NODE_OPTIONS=--max-old-space-size=8192`).
- `formatPct` grep returns zero hits across the web app.

**Audit closure.** `ATLAS_DEEP_AUDIT_2026-04-21.md` §5.6 marked **RESOLVED**
with a resolution paragraph citing the new module + boundary coercers +
files touched. ADR filed at
`wiki/decisions/2026-04-21-layer-summary-discriminated-union.md`.

### Files Changed
- `packages/shared/src/scoring/layerSummary.ts` (new, ~470 lines)
- `packages/shared/src/scoring/types.ts` (rewritten, ~40 lines)
- `packages/shared/src/scoring/index.ts` (+1 export)
- `apps/web/src/lib/layerFetcher.ts` (~15 literal sites, +1 import)
- `apps/web/src/lib/mockLayerData.ts` (3 sentinel → null)
- `apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx`
  (−`formatPct`, 2 call sites simplified)
- `apps/web/src/tests/computeScores.test.ts` (helper cast)
- `apps/web/src/tests/helpers/mockLayers.ts` (two helper casts)
- `apps/api/src/services/assessments/SiteAssessmentWriter.ts` — **unchanged**;
  its JSONB-to-MockLayerResult round-trip compiles under the new types
  without a `normalizeSummary` boundary call because the DB column is
  already `unknown`-cast at ingest. The coercer is exported for future use
  if we ever tighten the read path.
- `ATLAS_DEEP_AUDIT_2026-04-21.md` §5.6 → RESOLVED
- `wiki/log.md` (this entry)
- `wiki/decisions/2026-04-21-layer-summary-discriminated-union.md` (new ADR)
