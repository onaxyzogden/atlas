# External Data Sources — Phase 8 Reference

## Summary

Attribution, licensing, and refresh-cadence reference for the
external geospatial datasets Phase 8 work depends on. Compiled so
the next ingest session does not re-derive the licence terms or
re-discover the open questions baked into the scoping ADRs.

Scope: only sources named in the three Phase 8 scoping ADRs that
remain partially or fully deferred —
[`raster-pollinator-corridor-scoping`](../decisions/2026-05-02-raster-pollinator-corridor-scoping.md),
[`global-groundwater-esg-sources-scoping`](../decisions/2026-05-02-global-groundwater-esg-sources-scoping.md).
Existing live adapters (NWIS, PGMN, BLM, BC MTO) are not duplicated
here — they're documented in their service files.

---

## Land cover (Phase 8.1-A — pollinator corridor)

### ESA WorldCover

- **Use.** Global fallback for the pollinator-corridor land-cover
  layer where parcels fall outside North America.
- **Coverage.** Global at 10 m resolution, 11 classes.
- **Vintage.** 2020 v100 + 2021 v200 published; annual cadence on
  ESA's roadmap but not contractually guaranteed.
- **Licence.** CC-BY 4.0 — attribution required; redistribution and
  derivative works permitted.
- **Attribution string.** "© ESA WorldCover project / Contains
  modified Copernicus Sentinel data (2020, 2021) processed by ESA
  WorldCover consortium."
- **URL.** <https://esa-worldcover.org>
- **Vintage mixing — resolved 2026-05-04.** Per-source `dataDate`
  surfaced per feature in `summary_data.dataSources` and the
  diagnosis-report footnote — no ecoregion-level `dataDateMin`
  constraint. Pollinator opportunity is an advisory layer, not part
  of `computeScores.ts`; vintage drift between WorldCover (2021) and
  ACI (annual) is honest disclosure rather than a coverage gate.

### USGS NLCD

- **Use.** US primary land-cover source for pollinator-corridor work
  (per 8.1-A hybrid recommendation).
- **Coverage.** US 50 states + Puerto Rico at 30 m, Anderson Level 2
  (16 classes).
- **Vintage.** Latest CONUS release 2021; cadence 2-3 years.
- **Licence.** US public domain — no attribution legally required, but
  citation is conventional.
- **Citation form.** "Dewitz, J., and U.S. Geological Survey, 2023,
  National Land Cover Database (NLCD) 2021 Products."
- **URL.** <https://www.usgs.gov/centers/eros/science/national-land-cover-database>

### AAFC Annual Crop Inventory (ACI)

- **Use.** Canada primary land-cover source for pollinator-corridor
  work. Preserves the agricultural class detail that WorldCover
  collapses into a single "Cropland" class — material to the
  pollinator-supportive vs. -limiting weighting.
- **Coverage.** Canada at 30 m, ~70 classes including crop-by-crop
  detail.
- **Vintage.** Annual since 1985.
- **Licence.** Open Government Licence — Canada (OGL-Canada 2.0).
  Attribution required; redistribution and derivative works permitted.
- **Attribution string.** "Contains information licensed under the
  Open Government Licence – Canada. Source: Agriculture and
  Agri-Food Canada, Annual Crop Inventory."
- **URL.** <https://open.canada.ca/data/en/dataset/ba2645d5-4458-414d-b196-6303ac06c1c9>

---

## Friction surface (Phase 8.1-B — pollinator corridor, optional)

### Theobald human-modification gradient

- **Use.** P2 enhancement on top of the class-table friction model
  recommended in 8.1 D3. Not part of the first accepted slice; the
  initial friction surface derives from the existing
  `POLLINATOR_SUPPORTIVE_WEIGHTS` /
  `POLLINATOR_LIMITING_WEIGHTS` tables.
- **Form.** Continuous 0-1 anthropogenic-modification index;
  per-pixel friction = `1 + α · HM`.
- **Citation correction (resolved 2026-05-04).** The scoping ADR's
  "Theobald (2014)" citation matches the 2010 Springer paper
  "Estimating natural landscape changes from 1992 to 2030 in
  conterminous US," DOI `10.1007/s10980-010-9484-z`. A second
  Theobald paper, "A general model to quantify ecological integrity
  for landscape assessments and US application" (DOI
  `10.1007/s10980-013-9941-6`, 2013), introduces the formal HM model.
  Either paper is citation-acceptable; we should pick the 2013 paper
  for the model attribution since that's where the gradient is
  derived.
- **Canonical raster source (resolved 2026-05-04).** The current
  reference dataset is **Kennedy, Oakleaf & Theobald 2020 — "Earth
  transformed: detailed mapping of global human modification from
  1990 to 2017,"** *Earth System Science Data* 12, 1953
  (<https://essd.copernicus.org/articles/12/1953/2020/>). The global
  HMI raster is available on figshare
  (<https://figshare.com/articles/dataset/Global_Human_Modification/7283087>);
  a North-America extract is hosted on Data Basin
  (<https://databasin.org/datasets/110a8b7e238444e2ad95b7c17e889b66/>).
  Maintained by Conservation Science Partners (CSP).
- **Licence.** Per the ESSD 2020 paper publication (Copernicus,
  CC-BY 4.0). figshare dataset metadata should be confirmed at
  ingest time, but the headline paper is open-access CC-BY 4.0.
  Compatible with Atlas's commercial use given attribution.
- **Taxon-specific friction — resolved 2026-05-04.** Out of scope
  for Phase 8.1; deferred to P2. The first accepted slice ships a
  universal class-table friction model. Taxon-specific friction
  (honeybee / native bee / butterfly per Sponsler & Johnson 2017)
  rides on as a follow-on ADR if/when stakeholder review of the
  universal corridor surfaces a gap the universal model can't close.

---

## Groundwater (Phase 8.2-A)

### IGRAC Global Groundwater Information System (GGIS)

- **Use.** Global offline-path groundwater fallback — replaces the
  client-side `null` returned today outside US (NWIS) + Ontario (PGMN)
  coverage. Tier-1 live adapters stay for US/CA because diagnosis
  freshness matters there.
- **Coverage.** ~1M wells globally, aggregated from national agencies.
- **Vintage.** National-agency-paced — months to years per country.
  Diagnosis reports for non-US/CA projects will carry a `dataDate`
  that may be 1-3 years stale; caveat copy must surface this.
- **Licence — UNRESOLVED CONTRADICTION IN SOURCE ADR.** The
  scoping ADR's context section describes IGRAC as "CC-BY"; its
  open-questions section describes the same dataset as "CC-BY-NC."
  These are not interchangeable — CC-BY-NC blocks our default
  commercial-redistribution licence and forces an export-bundle
  exclusion path for paid Atlas exports.
  **Verification needed before ingest:** confirm the actual licence
  on the GGIS portal terms-of-use and whether our processed
  `groundwater_depth_m` summary counts as derivative under their terms.
  The accepted 8.2-A ADR cannot land until this is settled.
- **URL.** <https://www.un-igrac.org/global-groundwater-information-system-ggis>

---

## Conservation overlays (Phase 8.2-B)

### WDPA — World Database on Protected Areas

- **Use.** Global floor for the conservation-overlay layer (per 8.2-B
  D2 tiered recommendation). NCED + ECCC ESG add voluntary-easement
  detail on top.
- **Coverage.** Global, monthly refresh.
- **Steward.** UNEP-WCMC.
- **Licence (clarified 2026-05-04).** UNEP-WCMC's terms-of-use are
  **stricter than CC-BY-NC** as the scoping ADR characterised. Per
  <https://www.unep-wcmc.org/en/policies/database-terms-and-conditions>:
  **commercial use of WDPA Materials *or any work derived from them*
  requires prior written permission from UNEP-WCMC.** A derivative
  summary value (e.g. "parcel intersects WDPA polygon: yes/no") in a
  paid Atlas diagnosis report is therefore not covered by the default
  free-use terms. The "ingest + exclude raw tiles from export"
  workaround proposed in the scoping ADR does **not** resolve this —
  the derived intersection result is itself a derivative work.
- **Commercial-licence path.** UNEP-WCMC offers a separate commercial
  licence — applications go to `business-support@unep-wcmc.org`.
  Cost / turnaround unknown; needs a parallel outbound inquiry
  ([`wiki/inquiries/2026-05-04-wdpa-unep-wcmc-commercial-licence.md`](../inquiries/2026-05-04-wdpa-unep-wcmc-commercial-licence.md)).
- **Implication for 8.2-B D2 — phased.**
  - **R&D phase (now → launch).** Atlas is pre-launch and not yet
    transacting commercially. WDPA's research/non-commercial terms
    cover the current development workload — ingest, derive, render
    in internal preview surfaces with attribution. 8.2-B can land on
    WDPA + NCED + ECCC as the scoping ADR proposed.
  - **Launch gate.** Before Atlas opens paid diagnosis reports to
    external clients, resolve the commercial-use question. Three live
    paths:
    1. Negotiate a commercial licence with UNEP-WCMC (open inquiry —
       [`wiki/inquiries/2026-05-04-wdpa-unep-wcmc-commercial-licence.md`](../inquiries/2026-05-04-wdpa-unep-wcmc-commercial-licence.md)).
    2. Drop WDPA at launch; restrict the conservation overlay to
       NCED (US) + ECCC ESG (CA) — coverage shrinks to NA-only.
    3. Two-tier render: WDPA in free preview, NCED + ECCC only in
       paid bundles.
  - The launch-gate decision is **not** a Phase 8.2-B blocker — it's
    a launch-readiness sprint item. Track it on the launch checklist,
    not the 8.2-B ADR.
- **Attribution string.** "© UNEP-WCMC and IUCN (2024), The World
  Database on Protected Areas (WDPA)" — date stamp updates monthly
  with the release vintage actually in use.
- **URL.** <https://www.protectedplanet.net>

### NCED — National Conservation Easement Database

- **Use.** US voluntary-easement detail in the 8.2-B tiered overlay.
- **Coverage.** US, easement-record level. Refresh cadence varies
  by reporting easement holder.
- **Licence.** Per NCED terms-of-use — not yet captured in the
  scoping ADR. **Verification needed before ingest.**
- **URL.** <https://www.conservationeasement.us>

### ECCC Ecological Gifts Program

- **Use.** Canada voluntary-easement detail in the 8.2-B tiered
  overlay.
- **Coverage.** Canada, gift-record level.
- **Vintage.** Static dataset — last refresh 2023 (per the
  groundwater-ESG scoping ADR's context section). Diagnosis reports
  must surface this honestly; this is not a live feed.
- **Licence.** Open Government Licence — Canada (OGL-Canada 2.0,
  same as AAFC ACI). Attribution required; redistribution and
  derivative works permitted.
- **URL.** <https://www.canada.ca/en/environment-climate-change/services/environmental-funding/ecological-gifts-program.html>

---

## Dump-format verification sweep

Engineering for 8.2-A.3 (IGRAC ingest), 8.2-B.2 (WDPA), 8.2-B.3 (NCED),
and 8.2-B.4 (ECCC ESG static import) is gated on knowing each
upstream's dump format, URL convention, schema columns, and refresh
signal. Best-knowledge defaults + operator verification clicks are
captured in
[`wiki/inquiries/2026-05-04-dump-format-verification-sweep.md`](../inquiries/2026-05-04-dump-format-verification-sweep.md).
Adapter and ingest code can be drafted against the assumed defaults
in parallel; deltas land back in the inquiry note when the operator
confirms the live dumps.

## Verification checklist (before any of these become accepted ADRs)

- [ ] **IGRAC licence.** CC-BY vs. CC-BY-NC discrepancy in the
  scoping ADR resolved against GGIS portal terms. Derivative-summary
  status confirmed. **Outbound inquiry drafted —
  [`wiki/inquiries/2026-05-04-igrac-ggis-licence-clarification.md`](../inquiries/2026-05-04-igrac-ggis-licence-clarification.md).**
- [x] **WDPA bundling — resolved for R&D phase 2026-05-04.**
  UNEP-WCMC terms permit research/non-commercial use with
  attribution; Atlas is pre-launch, so 8.2-B can ship with WDPA
  included as the scoping ADR proposed. **Launch gate (deferred to
  launch-readiness, not 8.2-B):** commercial-licence inquiry drafted
  for `business-support@unep-wcmc.org` —
  [`wiki/inquiries/2026-05-04-wdpa-unep-wcmc-commercial-licence.md`](../inquiries/2026-05-04-wdpa-unep-wcmc-commercial-licence.md).
  Send before opening paid diagnosis reports to external clients.
- [ ] **NCED licence.** Terms-of-use captured in this doc.
- [ ] **WDPA dump format.** Verify `.gdb` URL pattern + column-name
      stability per
      [dump-format sweep](../inquiries/2026-05-04-dump-format-verification-sweep.md#1-wdpa--protectedplanetnet-monthly-dump-82-b2).
- [ ] **NCED dump format.** Verify quarterly bundle URL + GDB column
      names per
      [dump-format sweep](../inquiries/2026-05-04-dump-format-verification-sweep.md#2-nced--national-conservation-easement-database-82-b3).
- [ ] **ECCC ESG dump format.** Resolve open.canada.ca dataset slug +
      verify shapefile schema per
      [dump-format sweep](../inquiries/2026-05-04-dump-format-verification-sweep.md#3-eccc-ecological-gifts-program--static-2023-82-b4).
- [ ] **IGRAC GGIS dump format.** Confirm WFS layer name + paginated
      query path per
      [dump-format sweep](../inquiries/2026-05-04-dump-format-verification-sweep.md#4-igrac-ggis--global-wells-dump-82-a3).
- [x] **Theobald HM raster source — resolved 2026-05-04.** Canonical
  raster is Kennedy, Oakleaf & Theobald 2020, ESSD 12, 1953
  (CC-BY 4.0). figshare + Data Basin links captured in the friction-
  surface section above. Citation correction (2010/2013 vs the
  scoping ADR's "2014") also captured.
- [x] **Pollinator friction granularity — resolved 2026-05-04.**
  Universal class-table friction in 8.1; taxon-specific deferred
  to P2 follow-on.
- [x] **Buffered polygonization — resolved 2026-05-04.** Default
  2 km buffer (mid-range native bee foraging). Locked as a named
  constant in `corridorFriction.ts`; configurable in a later ADR
  if stakeholder review surfaces a need.

---

## References

- ADRs:
  - [`2026-05-02-raster-pollinator-corridor-scoping`](../decisions/2026-05-02-raster-pollinator-corridor-scoping.md)
    — D1 (land-cover hybrid), D3 (friction model), open questions
    on Theobald + buffered polygonize.
  - [`2026-05-02-global-groundwater-esg-sources-scoping`](../decisions/2026-05-02-global-groundwater-esg-sources-scoping.md)
    — D1 (IGRAC), D2 (WDPA + NCED + ECCC), open questions on IGRAC
    licence + WDPA bundling.
- Existing live adapters (not duplicated above):
  - USGS NWIS — `apps/api/src/services/pipeline/adapters/NwisGroundwaterAdapter.ts`
  - LIO PGMN — `apps/api/src/services/pipeline/adapters/PgmnGroundwaterAdapter.ts`
  - Federal BLM, BC MTO — retained branches in `apps/web/src/lib/layerFetcher.ts:fetchMineralRightsComposite`.
- Adjacent papers referenced but not ingested:
  - Sponsler, D.B. & Johnson, R.M. (2017) "Mechanistic modeling of
    pesticide exposure: The missing keystone of honey bee toxicology."
    *Environmental Toxicology and Chemistry* 36(4) — relevant to
    taxon-specific friction.
