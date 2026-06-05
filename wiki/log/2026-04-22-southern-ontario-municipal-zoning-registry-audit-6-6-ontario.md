# 2026-04-22 — Southern-Ontario municipal zoning registry (audit §6 #6 Ontario-portion DONE)


Operator re-scoped audit #6 mid-session from "US parcels" to "Ontario first,
focus on Halton + GTA." `OntarioMunicipalAdapter` extended with a curated
`MUNICIPAL_ZONING_REGISTRY` of 5 verified southern-Ontario open-data ArcGIS
REST endpoints (Toronto, Ottawa, Mississauga, Burlington, Barrie). Bbox
pre-filter scopes candidate endpoints so 0 or 1 municipal queries fire per
point in practice.

- `apps/api/src/services/pipeline/adapters/OntarioMunicipalAdapter.ts` —
  added `MUNICIPAL_ZONING_REGISTRY`, `candidateMunicipalities`,
  `queryMunicipalEndpoint`, `fetchMunicipalZoning`; rewired
  `fetchForBoundary` as three-source parallel merge (municipal + LIO + CLI)
  with a new `high`/`medium`/`low` confidence ladder (`high` requires
  municipal-bylaw hit AND AAFC CLI hit). `OntarioZoningSummary` extended
  with 5 optional municipal-* fields.
- `packages/shared/src/scoring/layerSummary.ts` — `ZoningSummary` variant
  extended with the same 5 optional fields (`municipal_zoning_code`,
  `municipal_zoning_description`, `municipal_zone_category`,
  `municipal_bylaw_source`, `registry_coverage`).
- `apps/api/src/tests/OntarioMunicipalAdapter.test.ts` — existing 16 tests
  moved onto a rural Grey County centroid (outside all 5 registry bboxes)
  so the LIO+CLI focus is preserved. 9 new tests cover: municipal hit +
  CLI → `high`; municipal alone → `medium`; municipal empty fallback to
  LIO; municipal 503 does not throw; rural bypass; registry structural
  invariants; `candidateMunicipalities` bbox-filter correctness.

**Coverage.** 5 municipalities (Toronto / Ottawa / Mississauga / Burlington
/ Barrie) ship in this bundle. Halton Hills, Milton, Oakville, Hamilton,
Waterloo Region, Guelph, London, Kingston, Peel (Brampton / Caledon), York,
and Durham deferred to follow-up — adding each is a ~15-minute registry
append (probe root service, read layer schema, append entry with bbox and
attribution).

**Tests.** 25/25 green on the adapter spec (was 16). Full api suite
484/484 green (was 477). `tsc --noEmit` clean across api + shared.

ADR: [wiki/decisions/2026-04-22-ontario-municipal-zoning-registry.md](decisions/2026-04-22-ontario-municipal-zoning-registry.md).

Audit `ATLAS_DEEP_AUDIT_2026-04-21.md` §6 #6 marked as "Ontario portion
DONE; US portion still pending."
