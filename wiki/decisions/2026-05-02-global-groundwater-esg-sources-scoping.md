# ADR: Global Groundwater + ESG Source Heuristics — Scoping

**Date:** 2026-05-02
**Status:** Proposed (scoping — not yet accepted)
**Scope:** `apps/web/src/lib/layerFetcher.ts`
(Sprint BG groundwater fallback ~line 4641, Sprint BH ESG fallback
~line 4691, Sprint BR mineral/state-registry fallback ~line 8271),
server-side adapters under
`apps/api/src/services/pipeline/adapters/{NwisGroundwaterAdapter,
PgmnGroundwaterAdapter}.ts`, downstream Module 4 + diagnosis-report
consumers.

---

## Context

`layerFetcher.ts` is the offline-mode / preview-mode layer fetch path.
For three layer types it carries explicit "no free global REST API
exists" comments and falls back to either heuristics or country-branched
calls:

1. **Groundwater** — server has `NwisGroundwaterAdapter` (US, USGS NWIS)
   and `PgmnGroundwaterAdapter` (Ontario, LIO PGMN). Offline path
   replicates these as best-effort. Outside US + Ontario the Tier-1
   pipeline silently degrades; the client-side fetcher returns `null`
   and Module 4 renders `Groundwater —`.
2. **Ecological Gifts Program / ESG conservation overlays** —
   no free global feed. Canadian ECCC publishes a static dataset
   (last refresh 2023); US has fragmented state-level registries
   (only ~30 states expose REST). Layer currently surfaces a mixed
   bag whose `confidence` rolls down to `low` outside known coverage.
3. **Mineral estate / mining claims** — BLM federal layer covers
   CONUS only (`apps/web/src/lib/layerFetcher.ts:8267`); state
   registries are scraped opportunistically with field-name fallback
   chains. Outside US: `null`.

These three are the largest remaining gaps in the layer-fetcher
audit. None block scoring (they're advisory-only) but each
silently degrades to "no data" rather than "no coverage", which
muddies the confidence story end users see in the diagnosis report.

Phase 8.2 of `.claude/plans/few-concerns-shiny-quokka.md` calls for
*"either source data, ship a curated dataset, or document the
heuristic as permanent."* This ADR scopes that decision.

## Decision space

### D1. Groundwater — coverage strategy

| Option | Coverage | Cost | Confidence | Maintenance |
|---|---|---|---|---|
| Stay status-quo (US NWIS + Ontario PGMN, `null` elsewhere) | ~30% of target market | Low | High where covered | None |
| Curated global well dataset (one-time ingest, e.g. IGRAC GGIS) | ~80% | Med (one-time ETL) | Med | Quarterly refresh |
| Per-country adapter expansion (UK BGS, AU BoM, EU EGDI) | ~60% | High (5+ adapters) | High | Per-source breakage |
| Document as permanent gap; surface "no coverage" UX | 100% honest | Zero | N/A | None |

**Tradeoffs.**
- Curated IGRAC GGIS is the only realistic global path. Their
  groundwater monitoring database aggregates ~1M wells globally
  under a CC-BY licence. Single ingest into PostGIS, one adapter,
  one fallback line. Loses real-time freshness — IGRAC refreshes on
  national-agency cadence (months to years per country).
- Per-country adapter expansion buys freshness but each new adapter
  is a separate maintenance contract — three of the five sources
  audited break per quarter on field-name churn (already observed
  with PGMN's LIO schema instability).
- Documenting as permanent makes the silent degradation explicit —
  but doesn't actually expand coverage.

**Recommendation:** **Curated IGRAC + status-quo Tier-1** for US/CA.
IGRAC becomes the offline-path global fallback; US/CA continue using
their live adapters because the freshness gap matters more in those
two markets (ag-permit cycles cite groundwater within the year).

### D2. ESG / conservation overlay — data shape

The current "Ecological Gifts" surface is ambiguously scoped: it
mixes legally-protected easements, voluntary stewardship covenants,
and registered conservation gifts under a single layer. Three routes:

1. **Narrow to legally-protected only** (WDPA — World Database on
   Protected Areas). Global, monthly refresh, CC-BY-NC. Loses
   voluntary easement signal.
2. **Tiered overlay** — WDPA primary, ECCC ESG layer for CA, NCED
   (National Conservation Easement Database) for US. Three sources,
   one display layer with provenance per-feature.
3. **Document as US/CA-only and constrain phase gating.** Layer is
   only useful in the two markets we actually support today;
   non-NA projects render "not applicable" rather than "no data".

**Recommendation:** **Tiered overlay (option 2).** WDPA gives the
global floor; NCED + ECCC ESG add the voluntary easement detail
where stewards need it. Provenance per-feature avoids the current
mixed-confidence display problem.

### D3. Mineral estate / mining claims — scoping

State-by-state registry scraping has the worst maintenance profile
of the three (field-name fallback chains in `layerFetcher.ts:8285`
already document the schema churn). Two paths:

1. **Freeze state coverage at audit-set** (the ~12 states already
   wired) and document non-coverage explicitly per state.
2. **Drop state-registry layer entirely**, keep federal BLM only.
   State-level mineral disclosure becomes a manual due-diligence
   step in the legal-checklist surface, not a pipeline output.

**Recommendation:** **Drop state registries (option 2).** The
maintenance burden outpaces signal value — federal BLM covers the
CONUS public-land use case; state private-mineral severance is a
legal-research question that should leave the pipeline anyway.

## Consequences

**Positive.**
- IGRAC ingest closes the ~70% global groundwater gap with one
  adapter and one quarterly refresh job.
- WDPA gives a defensible global conservation-overlay floor; tiered
  detail lights up where the data exists.
- Dropping state mining registries removes ~400 LOC of brittle
  scrape logic and ~12 maintenance contracts from the layer-fetcher
  surface.

**Negative.**
- IGRAC freshness is national-agency-paced — diagnosis reports for
  non-US/CA projects will carry a `dataDate` that may be 1-3 years
  stale. Caveat copy must surface this honestly.
- WDPA's CC-BY-NC clause prevents redistribution under our default
  licence — projects that export full geospatial bundles need a
  separate "WDPA tile excluded" path for commercial-export licences.

**Neutral.**
- Phase 8.2 ships in three independent slices; none gate any other
  Phase 8 work.

## Implementation slicing

1. **8.2-A** — D1: IGRAC adapter + ingest. Server-side
   `IgracGroundwaterAdapter` with quarterly refresh job; client
   fallback unchanged for US/CA, falls through to IGRAC elsewhere.
2. **8.2-B** — D2: WDPA + NCED + ECCC ESG tiered overlay. New
   `apps/api/src/services/pipeline/adapters/{Wdpa,Nced}Adapter.ts`;
   per-feature provenance in `summary_data`.
3. **8.2-C** — D3: drop state mining registry scrape. Federal BLM
   stays. `legal-checklist` surface gains a "state mineral severance
   research" task entry referencing the dropped layer.
4. **8.2-D** — Diagnosis report copy + caveat updates across all
   three layers; export-bundle WDPA exclusion path.

## Open questions

- **IGRAC licence for derivative works.** CC-BY-NC for the source
  database — does our processed `groundwater_depth_m` summary
  count as derivative under their terms? Confirm with IGRAC
  legal before ingest.
- **WDPA tile bundling.** UNEP-WCMC explicitly forbids
  redistribution; we'd need to fetch tiles at view time rather
  than ingesting them. Is on-demand acceptable for the diagnosis-
  report use case (where the report is consumed offline)?
- **Audit-set freeze for state registries.** Drop entirely or
  freeze the ~12 currently-wired states as legacy? Frozen state
  layers carry an "as-of audit date" stamp and never refresh —
  cleaner than scraping but still misleading after 6 months.

## References

- IGRAC Global Groundwater Information System:
  <https://www.un-igrac.org/global-groundwater-information-system-ggis>
- WDPA: <https://www.protectedplanet.net>
- NCED: <https://www.conservationeasement.us>
- ECCC Ecological Gifts Program:
  <https://www.canada.ca/en/environment-climate-change/services/environmental-funding/ecological-gifts-program.html>
- Existing adapters:
  - `apps/api/src/services/pipeline/adapters/NwisGroundwaterAdapter.ts`
  - `apps/api/src/services/pipeline/adapters/PgmnGroundwaterAdapter.ts`
- Plan entry: `.claude/plans/few-concerns-shiny-quokka.md` Phase 8.2
- Related ADRs:
  - `2026-04-21-tier1-pipeline-canonical-adapters.md` — original
    server-side adapter pattern these new adapters extend.
  - `2026-05-02-raster-pollinator-corridor-scoping.md` — same
    scoping-ADR-then-accepted-ADR-per-slice cadence.
