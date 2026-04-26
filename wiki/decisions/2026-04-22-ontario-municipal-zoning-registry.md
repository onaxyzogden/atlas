# 2026-04-22 — Southern Ontario municipal zoning registry

**Status:** Accepted
**Audit item:** §6 #6 — "Real zoning for US parcels (`UsCountyGisAdapter` extension)."
Operator re-scoped mid-session: "forget zoning for USA and focus on Ontario
first." US portion deferred; Ontario extension landed in this bundle.

## Context

`OntarioMunicipalAdapter` queried two provincial sources:

1. **LIO `LIO_Open06`** — CLUPA / Greenbelt / Niagara Escarpment / provincial
   designations (layers 4/5/15/26). Sequential first-match.
2. **AAFC Canada Land Inventory** — class 1-7 agricultural capability.

Provincial-scale context is useful but misses what a farmer or developer
actually needs: the **municipal bylaw classification** (e.g. Toronto
`RD (f12.0; a370)`, Ottawa `AG1 subzone 3`, Burlington `A2 Agriculture`)
with the specific permitted uses, minimum lot size, and setbacks published
by the local planning department. LIO only returns broad "Rural" /
"Agricultural Area" / "Greenbelt" strings.

Audit §6 #6 prescribed adapter extension. Operator brief: prioritise Halton
+ GTA + southern Ontario agricultural belt, not US counties.

## Decision

**Introduce `MUNICIPAL_ZONING_REGISTRY` — curated map of verified municipal
ArcGIS REST endpoints — queried in parallel with LIO + CLI. Municipal bylaw
wins when present; LIO falls through as provincial fallback; CLI always
runs as agricultural-capability enrichment.**

### Registry (2026-04-22 verified)

| Key | Municipality | Endpoint | Fields |
|---|---|---|---|
| `toronto` | City of Toronto | `services3.arcgis.com/b9WvedVPoizGfvfD/.../COTGEO_ZBL_ZONE/FeatureServer/0` | `ZN_ZONE`, `ZN_STRING`, `ZN_LU_CATEGORY`, `ZN_HOLDING` |
| `ottawa` | City of Ottawa (By-law 2026-50) | `maps.ottawa.ca/.../Zoning_Bylaw_2026_50/MapServer/0` | `ZN_CODE2`, `ZNAME_EN`, `ZGROUP_EN`, `Z_SUBZONES2` |
| `mississauga` | City of Mississauga | `services6.arcgis.com/hM5ymMLbxIyWTjn2/.../Mississauga_Zoning_Bylaw/FeatureServer/0` | `ZONE_CODE`, `ZONE_DESC`, `ZONE_CATEGORY` |
| `burlington` | City of Burlington | `mapping.burlington.ca/.../Zoning_ByLaw/MapServer/6` | `ZONING`, `DESCRIPTION` |
| `barrie` | City of Barrie | `gispublic.barrie.ca/.../Open_Data/Planning/MapServer/0` | `ZONING`, `DESCRIPT`, `SPECIAL` |
| `oakville` | Town of Oakville (By-law 2014-014) | `maps.oakville.ca/oakgis/.../Zoning_By_law_2014_014/FeatureServer/10` | `ZONE`, `ZONE_DESC`, `CLASS`, `SP_DESC` |
| `milton-urban` | Town of Milton (Urban, By-law 016-2014) | `api.milton.ca/.../WebMaps/UrbanZoning_202512171429/MapServer/8` | `ZONECODE`, `ZONING`, `LABEL` |
| `milton-rural` | Town of Milton (Rural, By-law 144-2003) | `api.milton.ca/.../WebMaps/RuralZoning/MapServer/9` | `ZONECODE`, `ZONING`, `LABEL` |

All entries probed via root-service JSON + layer schema JSON on 2026-04-22.
All published under a municipal open-data licence (MOL) or OGL-Ontario 1.0,
compatible with commercial redistribution with attribution — attribution
strings carried on each registry entry.

### Performance

Bbox pre-filter (`candidateMunicipalities`) narrows candidates before any
HTTP fetch fires. Southern-Ontario municipal bboxes don't overlap, so in
practice 0 or 1 endpoints are queried per point. Rural points outside all
bboxes cost zero extra work — the adapter behaves exactly like the old
two-source version.

### Confidence ladder

- `high`   : municipal bylaw + CLI both returned
- `medium` : municipal bylaw alone, OR LIO + CLI
- `low`    : single provincial source, or structured unavailable

### Summary schema additions

`ZoningSummary` gains five optional fields:
- `municipal_zoning_code` — the bylaw code (e.g. `A1-40`)
- `municipal_zoning_description` — long description / zone label
- `municipal_zone_category` — broad category (Residential / Employment / …)
- `municipal_bylaw_source` — attribution string
- `registry_coverage: boolean` — true when the point fell inside a registry bbox and returned a feature

LIO-derived `official_plan_designation` and `municipality` (and AAFC-derived
`cli_class` / `cli_subclass` / `cli_capability` / `cli_limitations`) stay
populated independently — they're complementary, not replaced.

## Consequences

- Toronto / Ottawa / Mississauga / Burlington / Barrie parcels now get
  bylaw-level zoning codes with investment-grade confidence when CLI also
  agrees. The `AtlasAI` narrative + PDF export can surface the real bylaw
  string, not a generic "Agricultural Area" designation.
- Halton Hills, Milton, Oakville, Hamilton, Guelph, and Waterloo-Region
  municipalities do **not** yet have registry entries — their open-data
  endpoints exist but weren't found via hub.arcgis.com search in this
  session. Structured-unavailable path handles these cleanly (rural point
  → LIO + CLI only, no change in behavior). Follow-up bundle adds them.
- No consumer-code changes required — `ZoningSummary` additions are all
  optional. Existing dashboards/exports continue to read `zoning_code`
  which is now filled from the municipal bylaw when present, LIO otherwise.
- Registry additions are zero-code: append to `MUNICIPAL_ZONING_REGISTRY`
  with new key + bbox + field map + attribution.

## Files

- `apps/api/src/services/pipeline/adapters/OntarioMunicipalAdapter.ts` —
  added registry + `fetchMunicipalZoning` + `candidateMunicipalities`,
  rewired `fetchForBoundary` for three-source merge, extended summary shape.
- `apps/api/src/tests/OntarioMunicipalAdapter.test.ts` — existing fixtures
  moved to a rural Grey County centroid (outside all registry bboxes) so
  the original 16 tests stay focused on LIO+CLI. 9 new tests added covering
  the municipal path, bbox filter, and registry invariants.
- `packages/shared/src/scoring/layerSummary.ts` — `ZoningSummary` extended
  with 5 optional municipal fields.

## Tests

**25/25 green** on `OntarioMunicipalAdapter.test.ts` (was 16 pre-extension).
Full api suite **484/484 green** (was 477).

Key coverage:
- Municipal hit + CLI → `high` confidence, `registry_coverage: true`
- Municipal alone → `medium` confidence
- Municipal empty + LIO + CLI → falls back to LIO behavior with
  `registry_coverage: false`
- Municipal endpoint 503 → does not throw, structured unavailable
- Rural Grey County point → 0 candidates, municipal fetch bypassed
- Registry-entry structural invariants (bbox ordering, southern-Ontario
  latitude band, non-empty attribution)

## Alternatives considered

- **Crawl all Ontario municipalities dynamically** — rejected; hundreds of
  municipalities, inconsistent service schemas, no authoritative index.
  Curated registry gives investment-grade confidence per entry.
- **Single statewide "Ontario municipal" web-crawl adapter** — rejected;
  too slow per-point, too brittle, no licensing provenance.
- **Merge municipal into LIO fetcher** — rejected; LIO's multi-layer
  sequential-first-match logic would conflict with the parallel-per-bbox
  pattern. Keeping them as siblings in `Promise.allSettled` is cleaner.
- **Store municipal endpoints in Postgres table** — defer; JSON registry
  in code is easier to version-control and grep for attribution audits.
  Migrate when registry grows past ~40 entries.

## 2026-04-22 addendum — Halton-region append

Follow-up probe session targeting the Halton Region municipalities called
out in the original follow-up list. Results:

- **Oakville** — **appended**. By-law 2014-014 layer 10 at
  `maps.oakville.ca/oakgis/rest/services/SBS/Zoning_By_law_2014_014/FeatureServer`.
  Fields: `ZONE` (e.g. "RL1", "C1", "RM2"), `ZONE_DESC`, `CLASS`, `SP_DESC`.
  Coverage: properties south of Dundas Street (bbox roughly
  `[-79.77, 43.38, -79.62, 43.54]`).
- **Milton** — **appended as two entries**. Milton maintains two separate
  zoning bylaws with distinct ArcGIS endpoints:
  - `milton-urban` — Urban Zoning By-law 016-2014, layer 8 at
    `api.milton.ca/arcgis/rest/services/WebMaps/UrbanZoning_202512171429/MapServer`.
    Fields: `ZONECODE` (e.g. "CBD-A", "RMD2"), `ZONING`, `LABEL`.
  - `milton-rural` — Rural Zoning By-law 144-2003, layer 9 at
    `api.milton.ca/arcgis/rest/services/WebMaps/RuralZoning/MapServer`.
    Fields: `ZONECODE` (e.g. "A1", "A2", "GA"), `ZONING`, `LABEL`.
  The two bboxes overlap in a narrow strip between 43.54° and 43.565°; the
  three-source parallel pattern already handles this (first `fulfilled`
  result wins).
- **Halton Hills** — **NOT appended**. No public ArcGIS REST zoning endpoint
  was discoverable despite multiple probes:
  - `maps.haltonhills.ca/arcgis/rest/services?f=json` → ECONNREFUSED
  - `gis.haltonhills.ca/arcgis/rest/services?f=json` → ECONNREFUSED
  - `haltonhills.maps.arcgis.com/sharing/rest/search?q=zoning` → no zoning items
  - `arcgis.com/sharing/rest/search?q=owner:haltonhills+zoning` → 0 results
  - `arcgis.com/sharing/rest/search?q="halton hills"+zoning+type:"Feature Service"`
    → only an unrelated "Halton Vulnerable Populations Map" hit

  Halton Hills appears to publish Comprehensive Zoning By-law 2010-0050 only
  as static PDFs. Rural points there fall through to LIO + CLI (the existing
  behavior) — no regression. If/when Halton Hills adopts ArcGIS Hub we can
  append; otherwise this gap is documented, not blocked.

Registry size: 5 → 8 entries. Full api test suite: 484 → 486 green.

## Follow-up (explicit deferred work)

- Halton Region remainder: Halton Hills (documented above as unavailable
  until Halton Hills publishes an ArcGIS endpoint).
- Hamilton: OpenHamilton publishes zoning; needs root-service probe.
- Waterloo Region: Kitchener / Waterloo / Cambridge.
- Guelph, London, Kingston, Windsor.
- Peel Region: Brampton, Caledon.
- York Region: Vaughan, Markham, Richmond Hill.
- Durham Region: Oshawa, Whitby, Ajax, Pickering.

Adding each requires ~15 minutes: probe root service, read layer schema,
append registry entry with bbox (from municipal GIS metadata or OSM
`admin_level=7/8` relation), re-run tests.

- US county extension (original audit scope) — explicitly deferred per
  operator re-brief; `UsCountyGisAdapter` covers 9 US counties and remains
  the US side of the zoning equation.
