# ADR — SSURGO chfrags canonical coarse fragments + basesat disambiguation

**Date:** 2026-04-21 (late)
**Status:** Accepted
**Context:** Audit H5 #4 (ATLAS_DEEP_AUDIT_2026-04-21.md)

## Context

The SSURGO pipeline previously estimated surface-horizon coarse-fragment
volume by summing two columns on `chorizon`: `frag3to10_r + fraggt10_r`. This
misses fine gravel (2–3 mm) and, more importantly, diverges from the canonical
NRCS horizon-total held on the `chfrags` child table as `SUM(fragvol_r)` per
`chkey`. Scoring (Sprint BB coarse-fragment penalty in
`computeScores.ts:697`) was therefore running on an undercounted value.

The adapter also carried `basesat_r` without flagging which extractant it
came from. `basesat_r` is NH4OAc at pH 7 (taxonomic classification input);
`basesatall_r` is sum-of-cations (what agronomic nutrient-retention
assessment actually wants). Silently preferring one over the other without a
discriminant is a footgun.

## Decision

1. **Canonical coarse fragments from `chfrags`.** New soft-fail query joins
   `component` → `chorizon` (surface only, `hzdept_r = 0`, major component
   flag) → `chfrags`, groups by component, `SUM(fragvol_r)`, then
   component-weights by `comppct_r`. Exposed as
   `SoilsSummary.coarse_fragment_pct_chfrags`. The legacy
   `coarse_fragment_pct` field is preserved for back-compat and as a fallback
   when the chfrags query fails (SDA occasionally rate-limits or table is
   empty for a polygon).

2. **Scoring prefers chfrags.** `computeScores.ts:697` reads
   `coarse_fragment_pct_chfrags` first and falls back to the legacy field
   only when the canonical value is absent.

3. **Base saturation disambiguation.** Both `basesat_r` and `basesatall_r`
   flow through the horizon query and component-weighted averaging. The
   summary exposes a single agronomic `base_saturation_pct` (preferring
   `basesatall_r`) and a discriminant `base_saturation_method` of
   `'sum_of_cations' | 'nh4oac_ph7' | null` so downstream consumers can
   label the value correctly.

4. **Soft-fail on the chfrags query.** It lives inside a try/catch that logs
   a warn and sets the field to `null`; the main horizon fetch still
   succeeds. This matches the existing pattern for the corestrictions +
   profile queries and keeps a single chfrags outage from cratering the
   whole SSURGO pull.

## Consequences

- Coarse-fragment scores for US sites will shift; expect agronomic
  suitability to drop slightly on stony/gravelly map units that previously
  under-reported due to the 2–3 mm fine-gravel gap.
- `base_saturation_method` is now a required discriminant for any consumer
  making agronomic claims on base saturation — silently mixing the two is no
  longer possible.
- CA (SLC) path is unaffected; these fields remain `null` there.
- The legacy `coarse_fragment_pct` field stays in the schema indefinitely
  for CA + chfrags-fallback cases; it is not deprecated.

## Files

- `apps/api/src/services/pipeline/adapters/SsurgoAdapter.ts` — chfrags
  query block, weighted merge, basesat fields, summary literal.
- `packages/shared/src/scoring/layerSummary.ts` — `SoilsSummary`
  +`coarse_fragment_pct_chfrags` +`base_saturation_pct`
  +`base_saturation_method`; `NUMERIC_KEYS.soils` +2.
- `packages/shared/src/scoring/computeScores.ts:697` — Sprint BB scoring
  hook prefers the chfrags value.
- `apps/web/src/hooks/useSiteIntelligenceMetrics.ts` — fallback chain +
  basesat surfacing.
- `apps/web/src/components/panels/sections/SoilIntelligenceSection.tsx` —
  `SoilMetrics` interface extended.
- `apps/api/src/tests/SsurgoAdapter.test.ts` — 3 new tests (chfrags
  weighting, chfrags SDA-failure fallback, nh4oac_ph7 fallback).

## Verification

- `pnpm --filter @ogden/api test` → 29/29 green (SsurgoAdapter.test.ts).
- `pnpm --filter @ogden/shared test` → 58/58 green.
- `apps/api` + `apps/web` `tsc --noEmit` → clean.
