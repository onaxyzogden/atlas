# 2026-04-21 — NwisGroundwaterAdapter + PgmnGroundwaterAdapter (audit H5 #7 DONE)


Server-side lift of the previously client-only groundwater fetch. Two new
pipeline adapters implement the `DataSourceAdapter` contract:

- `apps/api/src/services/pipeline/adapters/NwisGroundwaterAdapter.ts` — US,
  queries `waterservices.usgs.gov/nwis/gwlevels/?parameterCd=72019&siteType=GW`
  within a 0.5° bbox and 1-year window; picks the nearest well by haversine.
  Treats HTTP 404 as empty (NWIS returns 404 for zero matching sites). Returns
  a low-confidence `station_count: 0` result when no wells have usable
  measurements rather than throwing.
- `apps/api/src/services/pipeline/adapters/PgmnGroundwaterAdapter.ts` — CA,
  Ontario PGMN via three LIO_OPEN_DATA MapServer layers (schema is unstable
  across LIO releases; all three are tried in order). Handles
  attribute-only, geometry-only, and mixed LIO feature shapes.

`groundwater` promoted out of the `Tier1LayerType` Exclude list in
`packages/shared/src/constants/dataSources.ts` and registered in
`ADAPTER_REGISTRY`. `DATA_COMPLETENESS_WEIGHTS.groundwater` was already `0.04`
so the completeness math is unchanged; `REQUIRED_TIER1` in the orchestrator
only gates the canonical 6 layers so a groundwater failure will not block
Tier-3 fan-out.

Web-side `fetchUSGSNWIS` / `fetchPgmnGroundwater` in
`apps/web/src/lib/layerFetcher.ts` retained as fallback for client-only
previews; annotated with a comment pointing at the canonical adapters.

**Tests.** 13 new (7 NWIS + 6 PGMN); full API suite 474/474 green; shared
58/58; tsc clean both apps.

ADR: [wiki/decisions/2026-04-21-nwis-groundwater-adapter.md](decisions/2026-04-21-nwis-groundwater-adapter.md).
