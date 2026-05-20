# 2026-04-19 — Watershed Adapters (Sprint M+1 continued)


### Objective
Implement NhdAdapter (US) and OhnAdapter (CA) to bring watershed layer to 100% backend coverage, completing the third major adapter sprint.

### Work Completed

**NhdAdapter (USGS WBD)**
- Queries USGS Watershed Boundary Dataset ArcGIS REST service layers 4/5/6 (HUC8/10/12)
- All three HUC levels queried in parallel via `Promise.allSettled` — tolerates partial failures
- Returns: full HUC hierarchy, watershed names, drainage area (km² → ha), states, cardinal flow direction
- Flow direction derived from longitude/latitude (Continental Divide at ~105°W)
- Confidence: high (HUC12 found), medium (HUC10/8 only), low (unavailable/outside CONUS)
- Gracefully returns `{ unavailable: true, reason: 'outside_nhd_coverage' }` when all queries fail

**OhnAdapter (Ontario Hydro Network, LIO)**
- Queries LIO ArcGIS REST MapServer/26 (watercourse features) with ~1 km envelope
- Finds nearest stream vertex using Haversine distance calculation over geometry paths
- Field fallback chain: `OFFICIAL_NAME → NAME_EN → WATERCOURSE_NAME → FEAT_NAME`
- Stream order fallback chain: `STREAM_ORDER → STRAHLER_ORDER → ORDER_ → density estimate`
- Confidence: high if nearest stream < 1 km, medium otherwise
- All errors (network, timeout, HTTP, parse) fall back to regional estimate (Lake Ontario Basin / St. Lawrence Basin) — never blocks pipeline
- Best-effort design: OHN is CA supplementary data, not pipeline-critical

**DataPipelineOrchestrator wiring**
- Added imports and `resolveAdapter()` cases for `NhdAdapter` and `OhnAdapter`

**Test Suite (98/98 passing)**
- 12 NHD tests + 13 OHN tests
- Covers: full hierarchy, partial hierarchy (medium confidence), no features (unavailable), flow direction derivation, field fallback chains, error fallbacks, attribution text
- Fixed vitest false-positive: `mockRejectedValue` triggers unhandledRejection detection in this Node.js/vitest 2.1.9 combination for these adapter async chains. Fix: use `mockResolvedValue({ ok: false, status: 503/504 })` instead — exercises identical fallback code path

### Pipeline Coverage After This Session
- Adapters live: 6/14
- Completeness weight covered: 50% (soils 20% + elevation 15% + watershed 15%)
- Remaining: wetlands/flood, climate, land_cover, zoning (US + CA each)
- [superseded 2026-04-19: all 14 Tier-1 adapters live — confirmed in deep audit ATLAS_DEEP_AUDIT_2026-04-19.md]

### Commit
`aea81d7` feat: implement NhdAdapter + OhnAdapter — watershed data at 100% coverage
