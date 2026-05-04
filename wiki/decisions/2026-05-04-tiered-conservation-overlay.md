# ADR — Tiered Conservation Overlay: WDPA + NCED + ECCC ESG (Phase 8.2-B)

**Date:** 2026-05-04
**Status:** Accepted
**Supersedes (in part):** [`2026-05-02-global-groundwater-esg-sources-scoping.md`](2026-05-02-global-groundwater-esg-sources-scoping.md) D2 (recommendation locked).
**Scope:** New `apps/api/src/services/pipeline/adapters/{WdpaAdapter,
NcedAdapter,EcccEsgAdapter}.ts`, ingest jobs, conservation overlay
schema additions, `apps/web/src/lib/layerFetcher.ts` fall-through,
diagnosis-report copy.

---

## Context

The current "Ecological Gifts" surface mixes legally-protected
easements, voluntary stewardship covenants, and registered
conservation gifts under one ambiguous layer. The
[scoping ADR D2](2026-05-02-global-groundwater-esg-sources-scoping.md#d2-esg--conservation-overlay--data-shape)
weighed three options and recommended a **tiered overlay**: WDPA
(global floor) + NCED (US easement detail) + ECCC ESG (CA gift
detail), each surfaced with per-feature provenance.

External-data verification ([`wiki/concepts/external-data-sources.md`](../concepts/external-data-sources.md)):

- **WDPA terms.** UNEP-WCMC requires prior written permission for
  commercial use of WDPA Materials *or any work derived from them*.
  Atlas is in R&D phase, so research-tier use is in scope now;
  commercial-use clearance is a launch gate, tracked separately on
  [`wiki/inquiries/2026-05-04-wdpa-unep-wcmc-commercial-licence.md`](../inquiries/2026-05-04-wdpa-unep-wcmc-commercial-licence.md).
- **ECCC ESG.** OGL-Canada 2.0; static dataset (last refresh 2023);
  caveat copy must surface vintage honestly.
- **NCED.** Terms-of-use not yet captured. Verification before
  ingest is a 8.2-B.1 task.

## Decision

Lock the scoping ADR's D2 recommendation and ship 8.2-B under the
**R&D-phase posture**: WDPA included as the global floor for current
development; commercial-use clearance is a launch-readiness gate,
**not blocking** this ADR.

1. **Three adapters, one display layer with per-feature provenance.**
   Each feature returned by the conservation-overlay endpoint
   carries `source: "WDPA" | "NCED" | "ECCC_ESG"`,
   `designation_type`, and `last_updated`. Module 4 + diagnosis
   report render mixed-source overlays without confidence collapse,
   because each feature is independently scored.
2. **Coverage tiering.**
   - **Global.** WDPA — legally-protected areas only (IUCN
     categories I-VI + national designations). Monthly ingest from
     the protectedplanet.net dump.
   - **US.** NCED — voluntary easements layered on top of WDPA.
     Quarterly refresh; fall back to WDPA-only where NCED is empty.
   - **CA.** ECCC ESG — voluntary ecological gifts layered on top
     of WDPA. Static-import-once with a `vintage: 2023` stamp;
     diagnosis-report copy surfaces the staleness explicitly.
3. **Display order.** When a parcel intersects features from
   multiple sources, the overlay renders all of them — voluntary
   easements aren't a substitute for legal designation, and the
   client's stewardship story may need to acknowledge both.
4. **Diagnosis-report copy.** Each source carries its own
   attribution + provenance line:
   - WDPA: "© UNEP-WCMC and IUCN, World Database on Protected
     Areas (`<ingest_vintage>`)."
   - NCED: per-record source attribution; cite NCED as aggregator.
   - ECCC ESG: "Contains information licensed under the Open
     Government Licence — Canada. Source: ECCC Ecological Gifts
     Program (vintage: 2023)."

## Consequences

**Positive.**
- Conservation-overlay layer becomes principled: legal designation
  vs. voluntary easement is no longer collapsed into one
  mixed-confidence rendering.
- Adding NCED + ECCC at low marginal cost — both are aggregator
  datasets, not per-source REST APIs.
- WDPA's monthly cadence is fast enough that diagnosis reports can
  reflect new designations without operator intervention.

**Negative.**
- Three adapters to maintain instead of one. Mitigation: all three
  feed one display surface, so per-feature schema churn is the only
  real maintenance cost (sources don't add new fields often).
- ECCC ESG vintage is 2023; diagnosis-report copy must be honest
  that this isn't a live feed. Re-evaluate if ECCC publishes a
  refresh.

**Neutral.**
- WDPA commercial-use question is a launch gate, not a 8.2-B
  blocker. R&D-phase use is covered by research-tier terms.

## Implementation slicing

1. **8.2-B.1 — NCED licence check + schema.** Verify NCED
   terms-of-use, capture in
   [`wiki/concepts/external-data-sources.md`](../concepts/external-data-sources.md).
   Migration adding `conservation_overlay_features` with
   `source`, `designation_type`, `last_updated`, `geometry`.
2. **8.2-B.2 — WDPA adapter + monthly ingest.** New
   `WdpaAdapter`; monthly cron ingesting the protectedplanet.net
   dump. Tag features with `source: "WDPA"` and licence-vintage
   metadata.
3. **8.2-B.3 — NCED adapter + quarterly ingest.** New
   `NcedAdapter`; quarterly ingest from NCED's published bundle.
4. **8.2-B.4 — ECCC ESG static import.** One-time import of the
   2023 dump; tag with `vintage: 2023`. No refresh job needed
   until ECCC publishes an update.
5. **8.2-B.5 — Pipeline + diagnosis-report integration.**
   Conservation-overlay endpoint returns per-feature provenance;
   diagnosis-report template strings updated with per-source
   attribution + caveat copy.

## Open follow-ups (non-blocking)

- **Launch-gate WDPA inquiry.** Send UNEP-WCMC business-support
  email; file reply in the inquiry doc; lock licence posture before
  paid-diagnosis launch.
- **NCED licence capture (8.2-B.1).** Block 8.2-B.2 only if NCED's
  terms forbid even research-tier ingest — unlikely, but verify.
- **ECCC ESG refresh signal.** Watch for a new ECCC publication;
  swap the static import for a refresh job when one lands.

## References

- Scoping ADR: [`2026-05-02-global-groundwater-esg-sources-scoping.md`](2026-05-02-global-groundwater-esg-sources-scoping.md)
- External-data reference: [`wiki/concepts/external-data-sources.md`](../concepts/external-data-sources.md)
- Outbound inquiry: [`wiki/inquiries/2026-05-04-wdpa-unep-wcmc-commercial-licence.md`](../inquiries/2026-05-04-wdpa-unep-wcmc-commercial-licence.md)
- Adapter pattern: [`2026-04-21-nwis-groundwater-adapter.md`](2026-04-21-nwis-groundwater-adapter.md)
- Plan: `.claude/plans/few-concerns-shiny-quokka.md` Phase 8.2
