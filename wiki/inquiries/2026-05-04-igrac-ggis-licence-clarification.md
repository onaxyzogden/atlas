# Outbound Inquiry: IGRAC GGIS Licence Clarification

**Date:** 2026-05-04
**Status:** Drafted — pending operator send. **R&D-phase note
(2026-05-04):** Atlas is pre-launch; this inquiry is a launch-gate,
not a 8.2-A ship blocker. Send before opening paid diagnosis reports
to external clients.
**Recipient:** IGRAC general contact (verify address before sending —
candidate: `info@un-igrac.org` per <https://www.un-igrac.org/contact>)
**Subject line:** Licensing clarification — derivative-summary use of
GGIS well data in a commercial geospatial platform

**Blocks:** 8.2-A accepted ADR (IGRAC global groundwater fallback).
See [`wiki/concepts/external-data-sources.md`](../concepts/external-data-sources.md)
and [`wiki/decisions/2026-05-02-global-groundwater-esg-sources-scoping.md`](../decisions/2026-05-02-global-groundwater-esg-sources-scoping.md)
D1.

**Why this exists.** The 8.2 scoping ADR's context section
characterises GGIS as "CC-BY"; its open-questions section
characterises the same dataset as "CC-BY-NC." The two are not
interchangeable for our use case — CC-BY-NC blocks our default
commercial-export licence and forces an export-bundle exclusion path.
The accepted 8.2-A ADR cannot land until the actual terms are
confirmed in writing.

---

## Email draft

> **Subject:** Licensing clarification — derivative-summary use of
> GGIS well data in a commercial geospatial platform
>
> Hello,
>
> I'm writing on behalf of OGDEN Atlas, a regenerative-agriculture
> geospatial intelligence platform serving land-stewardship clients in
> North America and (increasingly) globally. Our diagnosis reports
> include a per-parcel "groundwater context" section, and IGRAC's
> Global Groundwater Information System (GGIS) is the only realistic
> source we've found for the global coverage outside USGS NWIS (US)
> and Ontario PGMN (Canada).
>
> Before we ingest GGIS into our pipeline, I want to confirm two
> things directly with you so we cite and use the data correctly.
>
> **1. Source licence.** Public materials we've seen describe the
> aggregated GGIS database as CC-BY in some places and CC-BY-NC in
> others. Could you confirm which licence applies to the well-record
> dataset itself, and point us at the canonical terms-of-use page?
>
> **2. Derivative-summary status.** Our pipeline does not redistribute
> GGIS records. For each project parcel, we sample nearby wells and
> emit a single derived summary value — typically a
> `groundwater_depth_m` figure with provenance metadata — into a
> diagnosis report we sell to our clients. Two scenarios I'd like to
> get clear:
>
> - Is the derived summary value (one number per parcel, with
>   `source: "IGRAC GGIS"` attribution) considered a derivative work
>   under your terms?
> - If our clients export their diagnosis report as a PDF or
>   geospatial bundle, does the embedded summary value need to be
>   stripped from commercial-export bundles, or does attribution
>   alone satisfy the licence?
>
> If GGIS is CC-BY-NC and our derivative-summary use is restricted
> commercially, we'd appreciate any guidance on whether IGRAC offers
> a separate commercial-redistribution licence we could apply for.
>
> Happy to share more about how we'd attribute the data and what the
> downstream report looks like — just let me know.
>
> Thanks for your time,
>
> [Operator name]
> OGDEN Atlas
> [Contact info]

---

## Expected reply categories + Atlas response

| IGRAC reply | Atlas response | Unblocks |
|---|---|---|
| **CC-BY, derivative summary OK** | Land 8.2-A as proposed; one ingest job, attribution string in diagnosis-report footer. | Full 8.2-A ship. |
| **CC-BY-NC, derivative summary blocked commercially** | Two paths: (a) drop IGRAC, document permanent global gap; (b) negotiate commercial licence with IGRAC. | Decision needed before 8.2-A ship. |
| **CC-BY-NC, but derivative summary OK with attribution** | Land 8.2-A; add commercial-export bundle exclusion path for the raw GGIS feature data we never carried in the first place; attribution required. | Full 8.2-A ship + small export-path note. |
| **Different terms entirely** | Re-derive scoping ADR D1 against actual terms before any code lands. | Re-scope. |

## Filing the answer

When the reply arrives, paste the relevant text into this file under
a new "## Reply (YYYY-MM-DD)" section, then update the verification
checklist in [`wiki/concepts/external-data-sources.md`](../concepts/external-data-sources.md)
and the status header on
[`2026-05-02-global-groundwater-esg-sources-scoping.md`](../decisions/2026-05-02-global-groundwater-esg-sources-scoping.md)
D1.
