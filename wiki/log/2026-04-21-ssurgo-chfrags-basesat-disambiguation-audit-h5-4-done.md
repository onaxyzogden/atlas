# 2026-04-21 — SSURGO chfrags + basesat disambiguation (audit H5 #4 DONE)


Closed the last outstanding H5 leverage item. `SsurgoAdapter.ts` now queries the
`chfrags` child table with `SUM(fragvol_r)` per major-component surface horizon
and component-weighted by `comppct_r` to produce a canonical
`coarse_fragment_pct_chfrags`. The legacy `frag3to10_r + fraggt10_r` field stays
as back-compat; `computeScores.ts:697` prefers the chfrags value when present.
Base saturation disambiguated: both `basesat_r` (NH4OAc pH 7, taxonomic) and
`basesatall_r` (sum-of-cations, agronomic) are now carried; summary exposes a
single `base_saturation_pct` preferring `basesatall_r` with a
`base_saturation_method: 'sum_of_cations' | 'nh4oac_ph7' | null` discriminant.

**Touched.** `SsurgoAdapter.ts` (+chfrags query, +basesat fields, +weighted
merge — soft-fail try/catch matches the existing profile/restriction pattern),
`packages/shared/src/scoring/layerSummary.ts` (`SoilsSummary` +3 optional
fields, `NUMERIC_KEYS.soils` +2), `computeScores.ts:697` (Sprint BB
coarse-fragment hook), `useSiteIntelligenceMetrics.ts` (prefer-chfrags fallback
chain + basesat surfacing), `SoilIntelligenceSection.tsx` (UI interface
extended), `SsurgoAdapter.test.ts` (+3 tests: chfrags weighting, chfrags
fallback on SDA failure, nh4oac_ph7 fallback when `basesatall_r` missing).
Tests 29/29 green in api; 58/58 green in shared; web + api tsc clean.

ADR: [wiki/decisions/2026-04-21-ssurgo-chfrags-basesat.md](decisions/2026-04-21-ssurgo-chfrags-basesat.md).
