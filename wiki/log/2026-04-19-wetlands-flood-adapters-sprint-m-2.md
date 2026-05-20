# 2026-04-19 — Wetlands/Flood Adapters (Sprint M+2)


### Objective
Implement NwiFemaAdapter (US) and ConservationAuthorityAdapter (CA) for wetlands_flood layer, bringing pipeline to 65% completeness weight coverage.

### Work Completed

**NwiFemaAdapter (FEMA NFHL + USFWS NWI)**
- FEMA NFHL Layer 6 (S_FLD_HAZ_AR): centroid point intersect → flood zone code + SFHA flag
- FEMA flood zones: AE/AH/AO/A/A99/AR/VE/V/V1-30 = SFHA; X500/B = moderate; X/C = minimal; D = undetermined
- NWI Layer 0: ~500 m envelope intersect → wetland polygon features
- NWI system code extraction (P/E/R/L/M), forested (FO) + emergent (EM) detection
- Combined regulatory flags: `regulated` (sfha OR wetlands), `requires_permits` (sfha OR forested/emergent wetland)
- Confidence: high (both sources), medium (one source), low (neither)
- Returns `{ unavailable: true, reason: 'outside_nwi_fema_coverage' }` when both fail

**ConservationAuthorityAdapter (Ontario LIO)**
- LIO_Open02/MapServer/1 (OWES Wetlands): ~500 m envelope → wetland type, PSW/PROVINCIAL flag detection
- LIO_Open04/MapServer/3 (CA Regulated Areas): centroid point → regulation name, CA name
- PSW detection: checks `EVALUATION_STATUS` AND `PSW_EVAL` fields INDEPENDENTLY (important: `??` would miss empty-string EVALUATION_STATUS — fixed during test)
- CA name resolution: LIO `AUTHORITY_NAME` takes precedence, falls back to `CONSERVATION_AUTHORITY_REGISTRY` lookup by `conservationAuthId`
- Flood risk estimate derived from lat/lng for Ontario sub-regions (Lake Erie/Ontario basin, etc.)
- Both-failed or both-error → regional estimate with `confidence: 'low'`

### Bug Fixed During Test Writing
PSW detection used `attrs['EVALUATION_STATUS'] ?? attrs['PSW_EVAL']` — this misses `PSW_EVAL` when `EVALUATION_STATUS` is an empty string `''` (not null/undefined). Fixed to check both fields independently via two separate `String(...)` calls.

### Pipeline Coverage After This Session
- Adapters live: 8/14
- Completeness weight covered: 65% (soils 20% + elevation 15% + watershed 15% + wetlands 15%)
- Remaining: climate (10%), land_cover (10%), zoning (15%) — US + CA each
- [superseded 2026-04-19: all 14 Tier-1 adapters live — confirmed in deep audit ATLAS_DEEP_AUDIT_2026-04-19.md]

### Commits
`5b776a2` feat: implement NwiFemaAdapter + ConservationAuthorityAdapter — wetlands/flood at 100% coverage
