# ADR — IGRAC GGIS Global Groundwater Fallback (Phase 8.2-A)

**Date:** 2026-05-04
**Status:** Accepted
**Supersedes (in part):** [`2026-05-02-global-groundwater-esg-sources-scoping.md`](2026-05-02-global-groundwater-esg-sources-scoping.md) D1 (recommendation locked).
**Scope:** New `apps/api/src/services/pipeline/adapters/IgracGroundwaterAdapter.ts`,
quarterly refresh job under `apps/api/src/jobs/`, ingest schema in
`packages/shared/src/schemas/groundwater.ts`, pipeline registry update,
client-side `apps/web/src/lib/layerFetcher.ts` fallback fall-through.

---

## Context

Today the offline-mode groundwater layer in `layerFetcher.ts` carries
US (NWIS) and Ontario (PGMN) coverage only; outside that footprint the
client returns `null` and Module 4 renders `Groundwater —`. The
[scoping ADR D1](2026-05-02-global-groundwater-esg-sources-scoping.md#d1-groundwater--coverage-strategy)
weighed four options and recommended **curated IGRAC GGIS as the
global fallback, status-quo Tier-1 for US/CA**. Three external-data
verifications were captured in
[`wiki/concepts/external-data-sources.md`](../concepts/external-data-sources.md):

1. CC-BY vs. CC-BY-NC discrepancy in the scoping ADR re GGIS terms.
2. Whether our processed `groundwater_depth_m` summary counts as a
   derivative work under their licence.
3. National-agency-paced refresh — diagnosis reports for non-US/CA
   parcels will carry a `dataDate` that may be 1-3 years stale.

## Decision

Lock the scoping ADR's D1 recommendation and ship 8.2-A under the
**R&D-phase posture**: research-tier use of GGIS is in scope now;
the commercial-licence question is a launch-readiness gate, tracked
separately on
[`wiki/inquiries/2026-05-04-igrac-ggis-licence-clarification.md`](../inquiries/2026-05-04-igrac-ggis-licence-clarification.md)
and **not blocking** this ADR.

1. **`IgracGroundwaterAdapter` (server-side).** Mirrors the
   `DataSourceAdapter` contract from
   [`2026-04-21-nwis-groundwater-adapter.md`](2026-04-21-nwis-groundwater-adapter.md).
   Reads from a locally-ingested PostGIS table populated by the
   refresh job — not from the GGIS portal at request time. This
   keeps the request path within Atlas's own infra and avoids
   coupling diagnosis SLA to IGRAC availability.
2. **Quarterly ingest job.** Pulls the GGIS well-record dump,
   normalises to the existing groundwater schema (`station_id`,
   `lat`, `lon`, `depth_m`, `last_observation`), writes to
   `groundwater_wells_global` with `source: "IGRAC GGIS"` and
   `ingest_vintage: <quarter>`. Source-vintage stamp is required so
   diagnosis-report copy can surface staleness honestly.
3. **Pipeline fall-through.** Tier-1 registry: NWIS for US, PGMN for
   ON, IGRAC elsewhere. NWIS/PGMN keep priority where their
   freshness matters (ag-permit cycles cite groundwater within the
   year); IGRAC fills the global gap with caveat copy.
4. **Diagnosis-report copy.** When the IGRAC adapter is the source,
   the report's groundwater section carries:
   - Attribution: "Source: IGRAC Global Groundwater Information
     System (GGIS)."
   - Vintage caveat: "Data reflects national-agency reporting as of
     `<ingest_vintage>`. May lag current conditions by 1-3 years."
   - Provenance tier: `medium` (vs. `high` for NWIS/PGMN).

## Consequences

**Positive.**
- Closes the ~70% global groundwater gap with one adapter and one
  refresh job.
- Diagnosis reports stop silently rendering `Groundwater —` for
  non-NA parcels.
- Single ingest path; brittleness profile lower than per-country
  REST adapter expansion.

**Negative.**
- Freshness ceiling is national-agency-paced. Caveat copy is the
  honest mitigation; users with hard-freshness requirements still
  need a primary-source check.
- Storage footprint grows by the GGIS dump size (~1M wells; ~150-
  300 MB depending on attribute selection).

**Neutral.**
- Commercial-use question deferred to launch gate. Doc trail in
  [`wiki/inquiries/2026-05-04-igrac-ggis-licence-clarification.md`](../inquiries/2026-05-04-igrac-ggis-licence-clarification.md);
  send before opening paid diagnosis reports to external clients.

## Implementation slicing

1. **8.2-A.1 — Schema + ingest skeleton.** Migration adding
   `groundwater_wells_global`; ingest script parses the GGIS dump
   format and lands one quarter of data into staging.
2. **8.2-A.2 — Adapter + pipeline registration.** New
   `IgracGroundwaterAdapter` implementing `DataSourceAdapter`;
   registry update in `apps/api/src/services/pipeline/registry.ts`
   to route non-US/CA parcels through it.
3. **8.2-A.3 — Quarterly job + caveat copy.** Cron job under
   `apps/api/src/jobs/`; diagnosis-report template strings updated.
4. **8.2-A.4 — Client-side fall-through.** `layerFetcher.ts`
   non-US/CA branch falls through to the server-side IGRAC path
   instead of returning `null`.

## Open follow-ups (non-blocking)

- **Launch-gate inquiry.** Send IGRAC email; file the reply in the
  inquiry doc; revisit licence stance before paid-diagnosis launch.
- **Per-country adapter ceiling.** If launch-tier customers in a
  specific country need higher freshness than IGRAC's quarterly
  cadence, evaluate a per-country adapter (UK BGS, AU BoM, EU EGDI)
  scoped to *that* market. Out of scope for 8.2-A.

## References

- Scoping ADR: [`2026-05-02-global-groundwater-esg-sources-scoping.md`](2026-05-02-global-groundwater-esg-sources-scoping.md)
- External-data reference: [`wiki/concepts/external-data-sources.md`](../concepts/external-data-sources.md)
- Outbound inquiry: [`wiki/inquiries/2026-05-04-igrac-ggis-licence-clarification.md`](../inquiries/2026-05-04-igrac-ggis-licence-clarification.md)
- Adapter pattern: [`2026-04-21-nwis-groundwater-adapter.md`](2026-04-21-nwis-groundwater-adapter.md)
- Plan: `.claude/plans/few-concerns-shiny-quokka.md` Phase 8.2
