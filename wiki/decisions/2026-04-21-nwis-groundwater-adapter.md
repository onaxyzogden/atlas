# ADR — NwisGroundwaterAdapter + PgmnGroundwaterAdapter

**Date:** 2026-04-21 (late-late²)
**Status:** Accepted
**Context:** Audit H5 #7 (ATLAS_DEEP_AUDIT_2026-04-21.md)

## Context

Groundwater depth was previously fetched **client-side only** from
`apps/web/src/lib/layerFetcher.ts::fetchUSGSNWIS` (US) and
`fetchPgmnGroundwater` (CA). The `groundwater` layerType was explicitly
excluded from `Tier1LayerType` and `ADAPTER_REGISTRY`, so the server pipeline
never fetched it. Consequences:

- No caching — every site-intelligence panel load hit USGS/LIO directly.
- No DB persistence — `site_assessments` rows never carried groundwater data.
- No retry/backoff semantics beyond the ad-hoc `fetchWithRetry` in
  layerFetcher.
- Client-side network call to slow or rate-limiting endpoints blocked panel
  paint.

## Decision

Lift both adapters server-side under the existing `DataSourceAdapter` contract
and promote `groundwater` to a Tier-1 layer.

1. **NwisGroundwaterAdapter (US)** — ports the NWIS gwlevels query with the
   same bbox (0.5°), 1-year window, `parameterCd=72019`, `siteType=GW`.
   Improvements vs. the web version:
   - HTTP 404 is treated as empty (NWIS returns 404 when there are zero
     matching sites — surfacing that as an HTTP error is noise).
   - Empty result returns a low-confidence placeholder with
     `station_count: 0` and a `heuristic_note`, rather than throwing.
   - Non-404 HTTP errors throw `ADAPTER_HTTP_ERROR` (pipeline-standard).
   - Abort-controller timeout (15 s) matches other adapters.

2. **PgmnGroundwaterAdapter (CA)** — ports the LIO PGMN fetch. Same
   three-layer fallback (`LIO_Open08/30`, `LIO_Open08/22`, `LIO_Open05/0`)
   because LIO schema is unstable across releases. Falls back to
   unavailable placeholder rather than throwing, matching the NWIS
   adapter's behavior.

3. **Tier-1 promotion.** Removed `'groundwater'` from the `Tier1LayerType`
   Exclude list in `packages/shared/src/constants/dataSources.ts`; added a
   registry entry:
   ```ts
   groundwater: {
     US: { adapter: 'NwisGroundwaterAdapter', source: 'usgs_nwis' },
     CA: { adapter: 'PgmnGroundwaterAdapter', source: 'ontario_pgmn' },
   }
   ```
   `DATA_COMPLETENESS_WEIGHTS.groundwater` stays at `0.04` (already defined),
   so completeness math is unchanged. `REQUIRED_TIER1` in
   `DataPipelineOrchestrator` continues to gate only the canonical 6 layers
   (`elevation, soils, watershed, wetlands_flood, land_cover, climate`) —
   a groundwater failure does not block Tier-3 fan-out.

4. **Web-side fallback retained.** `fetchUSGSNWIS` /
   `fetchPgmnGroundwater` in `layerFetcher.ts` stay in place for the
   client-only preview path (when the Tier-1 pipeline hasn't run against
   a boundary yet). Annotated with a comment pointing at the canonical
   server adapters. A follow-up sprint will migrate the client to hit a
   cached API endpoint and delete the duplication.

## Consequences

- US/CA projects that complete Tier-1 get persisted groundwater data in
  `site_assessments.summary_data` and the pipeline's layer cache.
- Site-intelligence panel loads no longer issue two outbound calls to
  USGS/LIO directly — the cache hit is served from the API.
- `groundwater` becomes a regular Tier-1 layer in the `LAYER_TYPES.map`
  fetch loop — if USGS is down, the layer fails gracefully (low-confidence
  result) rather than blocking the whole pipeline run.
- Non-US/non-CA sites fall through to the existing latitude heuristic in
  layerFetcher (not yet lifted — scope limited to audit H5 #7).

## Files

**New**
- `apps/api/src/services/pipeline/adapters/NwisGroundwaterAdapter.ts`
- `apps/api/src/services/pipeline/adapters/PgmnGroundwaterAdapter.ts`
- `apps/api/src/tests/NwisGroundwaterAdapter.test.ts` (7 tests)
- `apps/api/src/tests/PgmnGroundwaterAdapter.test.ts` (6 tests)

**Modified**
- `packages/shared/src/constants/dataSources.ts` — Exclude list + registry.
- `apps/api/src/services/pipeline/DataPipelineOrchestrator.ts` — imports +
  `resolveAdapter` dispatch.
- `apps/web/src/lib/layerFetcher.ts` — annotation comment only.

## Verification

- `pnpm --filter @ogden/api test` → 474/474 green.
- `pnpm --filter @ogden/shared test` → 58/58 green.
- `apps/web` + `apps/api` `tsc --noEmit` → clean.
