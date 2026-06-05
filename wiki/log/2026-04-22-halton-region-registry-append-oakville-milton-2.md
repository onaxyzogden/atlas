# 2026-04-22 — Halton-region registry append (Oakville + Milton × 2)


Direct probe session targeting the Halton Region follow-ups flagged in the
earlier bundle. `MUNICIPAL_ZONING_REGISTRY` grew 5 → 8 entries:

- `oakville` — By-law 2014-014 layer 10 at `maps.oakville.ca/oakgis/...`.
  Fields: `ZONE`, `ZONE_DESC`, `CLASS`, `SP_DESC`.
- `milton-urban` — Urban By-law 016-2014 at
  `api.milton.ca/.../UrbanZoning_202512171429/MapServer/8`. Fields:
  `ZONECODE`, `ZONING`, `LABEL`.
- `milton-rural` — Rural By-law 144-2003 at
  `api.milton.ca/.../RuralZoning/MapServer/9`. Same field shape.
- **Halton Hills** documented as unavailable — no public ArcGIS REST
  endpoint after 5 distinct probe patterns; town publishes By-law 2010-0050
  only as static PDFs. Rural points there fall through to LIO + CLI (no
  regression). ADR follow-up section records the probe attempts.

Attribution string in `getAttributionText()` updated to list Oakville + Milton
urban + Milton rural alongside the prior 5 bylaws. 3 new tests landed in
`OntarioMunicipalAdapter.test.ts` covering: Oakville bbox resolution,
Milton-urban vs Milton-rural bbox partitioning, registry-key uniqueness, and
attribution coverage of the new municipalities. Full api suite 484 → 486
green. `tsc --noEmit` clean.

- `apps/api/src/services/pipeline/adapters/OntarioMunicipalAdapter.ts` —
  +3 registry entries, attribution extended.
- `apps/api/src/tests/OntarioMunicipalAdapter.test.ts` — bbox-count bumped
  `>=5` → `>=8`; 3 new invariant/coverage tests added.
- `wiki/decisions/2026-04-22-ontario-municipal-zoning-registry.md` — new
  "2026-04-22 addendum — Halton-region append" section with probe log.
