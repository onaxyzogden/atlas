# 2026-05-04 — External-data-sources reference doc (Phase 8 deferred-slice prep)


Of the four remaining Phase 8 deferred items, three (8.1, 8.2-A, 8.2-B) are
gated on external-data ingest infrastructure that can't honestly be set up
in a single session, and one (8.4) is hard-blocked because the OBSERVE/SWOT
substrate doesn't exist on this branch. Rather than scaffold empty adapters
and call them "implementations" (the failure mode from this morning's
fabricated compaction summary), wrote the small piece that *is* shippable:
the licensing + attribution + refresh-cadence reference for every external
source the deferred slices touch, in one place.

[`wiki/concepts/external-data-sources.md`](concepts/external-data-sources.md)
covers ESA WorldCover, USGS NLCD, AAFC ACI, Theobald HM (with verification
note on canonical raster source), IGRAC GGIS (with the unresolved
CC-BY-vs-CC-BY-NC contradiction in the scoping ADR flagged explicitly),
WDPA (CC-BY-NC + offline-bundle exclusion path), NCED, ECCC Ecological
Gifts. Each entry has attribution string + URL + open question carried
from its source ADR. Verification checklist at the bottom enumerates the
six unresolved items that block any of these from entering an accepted ADR.

The next ingest session opens with this doc instead of re-deriving licence
terms from the scoping ADRs.
