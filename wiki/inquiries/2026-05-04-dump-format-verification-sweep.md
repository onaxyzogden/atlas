# Dump-Format Verification Sweep — WDPA, NCED, ECCC ESG, IGRAC GGIS

**Date:** 2026-05-04
**Status:** Research note — operator-verifiable URLs documented; engineering pre-draft locked against best-knowledge defaults; differences captured at ingest time.
**Blocks:** 8.2-A.3 (IGRAC ingest), 8.2-B.2/3/4 (WDPA + NCED + ECCC adapters & ingests).

---

## Why this exists

Phase 8.2-A and 8.2-B engineering is gated on knowing each upstream's
**dump format, URL convention, schema columns, and refresh signal**.
The licence picture is already captured in
[`wiki/concepts/external-data-sources.md`](../concepts/external-data-sources.md);
this note is the format-and-fetch counterpart.

Approach: capture the publicly-documented spec for each, flag the
operator-verification clicks (download a sample, confirm column names
and file format), and pre-spec the ingest job against best-knowledge
defaults so the adapter and ingest code can be drafted in parallel
without waiting on a live download.

When the operator confirms the dump format, file the deltas back here
under a `## Confirmed (YYYY-MM-DD)` block per source, and update the
ingest job constants if anything differs from the assumed defaults.

---

## 1. WDPA — protectedplanet.net monthly dump (8.2-B.2)

**Canonical download URL.** <https://www.protectedplanet.net/en/thematic-areas/wdpa>
- Click "Download" → free account signup → email link → ZIP download.
- Latest URL pattern (best-knowledge, **operator verify**):
  `https://d1gam3xoknrgr2.cloudfront.net/current/WDPA_<MonthYYYY>_Public.zip`
  e.g. `WDPA_May2026_Public.zip`. UNEP-WCMC also publishes a
  shortlink: `https://wcmc.io/wdpa_current_release`.

**File format.** ZIP archive containing one of:
- Esri File Geodatabase (`.gdb` directory) — preferred; contains all three
  layers (`WDPA_poly_<MonthYYYY>`, `WDPA_point_<MonthYYYY>`,
  `WDPA_OECM_poly_<MonthYYYY>`).
- Shapefile bundle (`.shp` + `.dbf` + `.shx` + `.prj`) — alternative,
  one per layer.

**Schema (columns we need).** Best-knowledge from WDPA technical manual
v2:
| Column | Type | Atlas mapping |
|---|---|---|
| `WDPAID` | int64 | `source_record_id` (cast to text) |
| `WDPA_PID` | string | append to `source_record_id` for sub-features (`<WDPAID>:<WDPA_PID>`) |
| `NAME` | string | `designation_name` |
| `DESIG_ENG` | string | `designation_type` (English designation) |
| `IUCN_CAT` | string | persisted in `raw_attributes.iucn_cat` (renders as tier badge) |
| `STATUS` | string | filter to `STATUS = 'Established'` (drop Proposed/Not Reported) |
| `STATUS_YR` | int | `last_updated` (year-only; cast to date as `<year>-01-01`) |
| `MARINE` | string | filter — keep `MARINE = '0'` (terrestrial only for Atlas) |
| `ISO3` | string | persisted in `raw_attributes.iso3` for country filters |
| geometry | Polygon/MultiPolygon | `geom` (reproject to 4326 if needed; WDPA ships in 4326 already) |

**Ingest pattern (8.2-B.2).**
1. Cron job runs first of the month, 02:00 UTC.
2. HEAD request to current-release URL; if `Last-Modified` ≤ stored
   vintage timestamp, no-op.
3. Download ZIP → unzip to scratch dir → open `.gdb` with `gdal-async`
   (or `node-gdal-next`).
4. Stream features filtered to `STATUS = 'Established' AND MARINE = '0'`
   into `conservation_overlay_features` via UPSERT on
   `(source, source_record_id) = ('WDPA', '<WDPAID>:<WDPA_PID>')`.
5. After all features written, mark old `ingest_vintage` rows for this
   source as deleted in a single `DELETE WHERE source = 'WDPA' AND
   ingest_vintage <> $current_vintage` — atomic vintage swap.
6. Vintage stamp format: `'YYYY-MM'` (e.g. `'2026-05'`).

**Operator verification.**
- [ ] Sign up for the protectedplanet.net free account; record the
      account email here.
- [ ] Trigger a download of the current month's dump; confirm:
  - [ ] File extension: `.gdb` or `.shp`?
  - [ ] Total uncompressed size (~3-5 GB expected for `.gdb`).
  - [ ] Column names match the table above (especially `DESIG_ENG`
        vs. `DESIG_TYPE` — naming has churned across releases).
  - [ ] CRS is EPSG:4326 (no reprojection needed).
- [ ] Spot-check one polygon's WDPAID against
      <https://www.protectedplanet.net/<WDPAID>> to confirm the URL
      pattern for cross-linking from diagnosis reports.

---

## 2. NCED — National Conservation Easement Database (8.2-B.3)

**Canonical download URL.** <https://www.conservationeasement.us/downloads/>
- Quarterly bundle.
- Best-knowledge URL pattern (**operator verify**):
  `https://www.conservationeasement.us/downloads/NCED_<MonthYYYY>.zip`

**File format.** ZIP containing:
- Esri File Geodatabase (`NCED_Polygons.gdb`) — primary layer.
- Per-state shapefiles in some bundles — ignore; use the merged GDB.
- A CSV `NCED_Records.csv` with non-spatial attributes — usually
  redundant with GDB attributes.

**Schema (columns we need).** Best-knowledge:
| Column | Type | Atlas mapping |
|---|---|---|
| `nced_id` | string | `source_record_id` |
| `sitename` | string | `designation_name` |
| `easement_holder` | string | `attribution` (the originating land trust) |
| `easement_type` | string | `designation_type` (e.g. `Conservation Easement`, `Deed Restriction`) |
| `year` | int | `last_updated` (cast as `<year>-01-01`) |
| `source` | string | persisted in `raw_attributes.source` (per-record source agency, distinct from our outer `source = 'NCED'`) |
| `gis_acres` | float | persisted in `raw_attributes.gis_acres` |
| geometry | Polygon/MultiPolygon | `geom` |

**Ingest pattern (8.2-B.3).**
- Quarterly cron (1st of Jan/Apr/Jul/Oct, 03:00 UTC) — same shape as
  WDPA but no marine filter, no STATUS filter (NCED records are all
  recorded easements by definition).
- Upsert key `(source, source_record_id) = ('NCED', '<nced_id>')`.
- Vintage stamp: `'YYYY-Qn'` (e.g. `'2026-Q2'`).

**Licence verification (still open — 8.2-B.1 task).**
- [ ] Operator visits <https://www.conservationeasement.us/about/legal/>
      and captures the terms-of-use verbatim into the
      `external-data-sources.md` NCED section.
- [ ] Confirm whether attribution alone satisfies the licence for our
      derivative-summary use (`source: "NCED"` flag in diagnosis report).
- [ ] If terms forbid even research-tier ingest, escalate before
      8.2-B.3 engineering. (Unlikely — NCED is widely cited in
      academic + nonprofit work — but verify.)

**Operator verification.**
- [ ] Download the latest quarterly bundle; confirm:
  - [ ] File extension and bundle structure.
  - [ ] Column names match table above (NCED has churned column names
        across versions: `nced_id` vs `feature_id`, `easement_holder`
        vs `holder_name`).
  - [ ] CRS (likely EPSG:4326 or EPSG:4269 NAD83).
- [ ] Capture the per-record `source` enum so we know whether
      diagnosis reports need a per-trust attribution sub-line.

---

## 3. ECCC Ecological Gifts Program — static 2023 (8.2-B.4)

**Canonical download URL.** <https://open.canada.ca/data/en/dataset/82a48efa-1f72-4c3f-8169-72d31ec02b67>
*(operator verify the dataset slug on open.canada.ca; the
human-facing landing page is the ESG program page in
[`external-data-sources.md`](../concepts/external-data-sources.md)).*

**File format.** Best-knowledge from open.canada.ca conventions:
- Shapefile bundle (`.shp` + supporting files) **and**
- CSV with non-spatial attributes.
- Both in a single ZIP, English + French resource entries on the
  open.canada.ca page.

**Schema (columns we need).** Best-knowledge — **all subject to
operator verification**:
| Column | Type | Atlas mapping |
|---|---|---|
| `gift_id` | string | `source_record_id` |
| `recipient_org` | string | `attribution` |
| `recipient_type` | string | persisted in `raw_attributes.recipient_type` (e.g. `Land Trust`, `Municipality`, `Crown`) |
| `cert_year` | int | `last_updated` (cast as `<year>-12-31`) |
| `area_ha` | float | persisted in `raw_attributes.area_ha` |
| `province` | string | persisted in `raw_attributes.province` |
| geometry | Polygon/MultiPolygon | `geom` |

`designation_type` is constant: `'Ecological Gift'`.
`designation_name` falls back to `recipient_org` when the upstream
record has no per-gift name.

**Ingest pattern (8.2-B.4).**
- One-time import (no cron). Run once; mark as
  `ingest_vintage = '2023-static'`.
- Re-run only if ECCC publishes a refresh; tracked as a launch-gate
  follow-up in
  [`wiki/decisions/2026-05-04-tiered-conservation-overlay.md`](../decisions/2026-05-04-tiered-conservation-overlay.md).
- Upsert key `(source, source_record_id) = ('ECCC_ESG', '<gift_id>')`.
- Diagnosis-report copy for ECCC_ESG features must surface the static
  `vintage: 2023` honestly (per the tiered-overlay ADR §4).

**Operator verification.**
- [ ] Find the canonical open.canada.ca dataset slug for the ESG
      database (search "Ecological Gifts" on open.canada.ca; landing
      page links to the data resource page).
- [ ] Download the shapefile + CSV bundle; confirm:
  - [ ] Column names + units.
  - [ ] CRS (NAD83 likely; reproject to EPSG:4326 in ingest).
  - [ ] Total record count (expected: ~1,500-2,000 gifts as of 2023).

---

## 4. IGRAC GGIS — global wells dump (8.2-A.3)

**Canonical download URL.** <https://ggis.un-igrac.org/download> *(or
via portal: <https://www.un-igrac.org/global-groundwater-information-system-ggis>
→ "Data and downloads")*.

**Access pattern.** GGIS exposes well data via three paths
(operator should confirm which is the **bulk-dump** path vs. per-well API):
1. **WMS/WFS endpoint** — typically `https://ggis.un-igrac.org/geoserver/wfs`.
   Returns GeoJSON or GML on `getFeature` requests with `typeName=ggis:wells`
   (operator verify exact typeName). Pagination via `startIndex` + `count`.
2. **CSV bulk download** — per-country or global CSV with well-record
   attributes; size order ~50-200 MB for the global CSV.
3. **Shapefile bulk** — global wells shapefile; same shape as CSV plus
   geometry.

**Best-guess primary path: WFS pagination.** Lets us avoid the bulk
download and ingest as a streaming job; mirrors the per-country ingest
pattern that fits the IGRAC architecture (national agency contributions).

**Schema (columns we need).** Best-knowledge from IGRAC GGIS field
definitions:
| Column | Type | Atlas mapping (`groundwater_wells_global`) |
|---|---|---|
| `well_id` (or `gw_id`) | string | `station_id` |
| `country_iso3` | string | persisted in `raw_attributes.country` |
| geometry / lat+lon | Point | `geom` (build from lon, lat if not native geometry) |
| `gw_depth_m` (or `depth_to_water_m`) | float | `depth_m` |
| `obs_date` (or `last_measurement_date`) | date | `last_observation` |
| `data_provider` (or `agency`) | string | persisted in `raw_attributes.provider` |

**Ingest pattern (8.2-A.3).**
1. Quarterly cron (1st of Jan/Apr/Jul/Oct, 04:00 UTC).
2. WFS paginated `getFeature` requests, 1000 features per page; loop
   until empty page returned.
3. Stream features into `groundwater_wells_global` via UPSERT on
   `(source, station_id) = ('IGRAC GGIS', '<well_id>')`.
4. Vintage stamp format: `'YYYY-Qn'` (e.g. `'2026-Q2'`).
5. After all features written, atomic vintage swap (same pattern as
   WDPA): `DELETE WHERE source = 'IGRAC GGIS' AND ingest_vintage <>
   $current_vintage`.

**Operator verification.**
- [ ] Hit `https://ggis.un-igrac.org/geoserver/wfs?service=WFS&request=GetCapabilities`
      and confirm:
  - [ ] WFS endpoint is live (not auth-walled).
  - [ ] Wells layer name (`ggis:wells`? `ggis:groundwater_wells`? other?).
  - [ ] Output formats supported (GeoJSON preferred).
- [ ] Pull one feature via
      `?service=WFS&request=GetFeature&typeName=<wells_layer>&maxFeatures=1&outputFormat=application/json`
      and capture the actual schema field names; update the table
      above.
- [ ] Confirm the global record count (operator can read it from
      GetCapabilities `numberOfFeatures` or query
      `?resultType=hits&request=GetFeature&typeName=<wells_layer>`).

---

## Cross-cutting decisions locked here

- **Geometry CRS.** All four ingests reproject to EPSG:4326 if not
  already; consistent with `geom` column type on both
  `groundwater_wells_global` (migration 023) and
  `conservation_overlay_features` (migration 024).
- **Atomic vintage swap.** All four ingest jobs follow the same
  pattern: write new vintage rows alongside live vintage, then atomic
  `DELETE WHERE ingest_vintage <> $current_vintage`. Reads stay
  consistent throughout the swap because the new rows are just
  invisible until the delete completes.
- **Vintage format.** Monthly = `'YYYY-MM'`, quarterly = `'YYYY-Qn'`,
  static = `'<year>-static'`. Adapter renders these directly into
  diagnosis-report `ingest_vintage` field.
- **Honest staleness.** Diagnosis-report copy surfaces vintage per
  source. ECCC ESG's `2023-static` and IGRAC's quarterly drift are
  flagged explicitly; WDPA + NCED's monthly/quarterly cadences render
  silently.

---

## Filing operator answers

When each verification batch lands, append a `## Confirmed
(YYYY-MM-DD)` section per source and update:
- The schema table above (correct column names if drifted).
- The URL pattern (correct file extension, slug, etc.).
- [`wiki/concepts/external-data-sources.md`](../concepts/external-data-sources.md)
  per-source section.
- The ingest job constants in `apps/api/src/jobs/<source>-ingest.ts`
  (when those land).

If a verification surfaces a hard blocker (auth-walled endpoint,
licence-incompatible terms, missing geometry column), escalate to a
short ADR amendment before the ingest job is drafted.
