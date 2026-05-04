# Outbound Inquiry: WDPA Commercial Licence (UNEP-WCMC)

**Date:** 2026-05-04
**Status:** Drafted — pending operator send. **R&D-phase note
(2026-05-04):** Atlas is pre-launch; this inquiry is a launch-gate,
not a 8.2-B ship blocker. Send before opening paid diagnosis reports
to external clients.
**Recipient:** UNEP-WCMC Business Support — `business-support@unep-wcmc.org`
**Subject line:** Commercial licence enquiry — WDPA derivative-summary
use in OGDEN Atlas

**Blocks:** 8.2-B accepted ADR (WDPA + NCED + ECCC tiered conservation
overlay). See
[`wiki/concepts/external-data-sources.md`](../concepts/external-data-sources.md)
WDPA section and
[`wiki/decisions/2026-05-02-global-groundwater-esg-sources-scoping.md`](../decisions/2026-05-02-global-groundwater-esg-sources-scoping.md)
D2.

**Why this exists.** UNEP-WCMC terms-of-use require prior written
permission for **any commercial use of WDPA Materials *or any work
derived from them***. Atlas is a paid product, and our diagnosis
report's "conservation context" surface emits a derived
parcel-intersects-WDPA-polygon value — which is derivative use under
the published terms. The 8.2-B scoping ADR's "ingest + exclude raw
tiles from export" workaround does not satisfy this; the derived
intersection result is itself derivative. We need either a commercial
licence or to drop WDPA from the tiered overlay and ship NCED + ECCC
ESG only (NA-only coverage).

---

## Email draft

> **Subject:** Commercial licence enquiry — WDPA derivative-summary
> use in OGDEN Atlas
>
> Hello UNEP-WCMC Business Support team,
>
> I'm writing to ask about a commercial licence for the World Database
> on Protected Areas (WDPA). I run OGDEN Atlas, a regenerative-
> agriculture geospatial intelligence platform serving land-stewardship
> clients in North America and (increasingly) globally.
>
> **Use case.** Each project parcel in our pipeline runs through a
> "conservation context" check. We'd like to use WDPA as the global
> floor, paired with NCED (US) and ECCC's Ecological Gifts Program
> (CA) for voluntary-easement detail. The output we'd embed in a
> client-facing diagnosis report is a *derived summary* — typically
> "parcel intersects N protected areas," "nearest IUCN Cat-X site at
> distance D km," with WDPA attribution and the canonical citation.
> We would not redistribute WDPA tiles or polygons themselves; the
> client's report carries derived values only.
>
> **Why I'm writing.** I've read the database terms-of-use and
> understand commercial use of WDPA Materials *or any work derived
> from them* requires prior written permission. Could you tell me:
>
> 1. Whether the derivative-summary use described above is what your
>    commercial licence is intended to cover, or whether a different
>    arrangement applies for this scale of use.
> 2. The licensing fee structure and any tier breakpoints that depend
>    on revenue, customer count, or geographic scope.
> 3. The expected turnaround from application to signed licence — so
>    we can plan accordingly on the engineering side.
> 4. Whether non-commercial *preview* use of WDPA (e.g. on a free
>    public marketing surface, with attribution, no derivative export)
>    would fall under the standard free-use terms or also require a
>    commercial licence given Atlas's overall paid-product context.
>
> Happy to share more about Atlas — our scale, attribution approach,
> and the exact summary fields we'd derive — if it helps your
> assessment.
>
> Thank you for your time. I look forward to hearing from you.
>
> [Operator name]
> OGDEN Atlas
> [Contact info]

---

## Expected reply categories + Atlas response

| UNEP-WCMC reply | Atlas response | Unblocks |
|---|---|---|
| **Commercial licence offered, fee + scope acceptable** | Land 8.2-B as the scoping ADR proposed (WDPA global floor + NCED + ECCC tiered detail). Add licence record + attribution string to diagnosis-report footer. | Full 8.2-B ship. |
| **Commercial licence offered, fee out-of-budget** | Re-scope 8.2-B D2 to drop WDPA; ship NCED + ECCC only (NA-only conservation overlay). Document non-NA gap as permanent. | 8.2-B ship at narrower scope. |
| **Free preview use OK, commercial export blocked** | Two-tier rendering: WDPA in free preview surface; paid diagnosis-report bundle uses NCED + ECCC only. | Full 8.2-B ship at split scope. |
| **No reply / long delay** | Default to NA-only re-scope so 8.2-B isn't blocked indefinitely. Re-open if/when licence comes through. | 8.2-B ship at narrower scope. |

## Filing the answer

When the reply arrives, paste the relevant text into this file under
a new "## Reply (YYYY-MM-DD)" section, then update the verification
checklist in [`wiki/concepts/external-data-sources.md`](../concepts/external-data-sources.md)
and revisit
[`2026-05-02-global-groundwater-esg-sources-scoping.md`](../decisions/2026-05-02-global-groundwater-esg-sources-scoping.md)
D2 with the resolution.
