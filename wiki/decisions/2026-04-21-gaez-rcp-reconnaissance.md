# 2026-04-21 — GAEZ RCP futures reconnaissance + scenario as a first-class dimension

**Status:** Accepted (reconnaissance + plumbing landed; ingest deferred to Sprint CD+1, picker UI to Sprint CD+2)
**Sprint:** CD
**Context source:** Wiki (entities/api.md, entities/web-app.md, decisions/2026-04-20-gaez-self-hosting.md)

---

## Context

Baseline GAEZ (1981-2010 current-climate, 47/48 crop keys populated) has been
shipping across Sprints BY through CC — point queries, full crop ranking UI,
map-side suitability overlay, yield-gradient mode, hover readout, and JWT
auth on the raster byte stream. Operators have asked next for RCP futures
("what does maize look like in this parcel under RCP8.5 2041-2070?") so they
can show a baseline-vs-future delta in site reports.

Before committing RCP bytes to disk (FAO publishes thousands of rasters
across 4 RCPs × 6 GCMs × 3 periods), two prerequisites had to land:

1. **Enumerate FAO's tuple space.** We had no authoritative list of which
   (RCP, GCM, period) combinations exist, how many rasters each carries,
   or whether input-level coverage matches baseline.
2. **Give the schema a scenario dimension.** Sprint CB's manifest, service,
   and routes all hardcoded the baseline implicitly — a later RCP run would
   have needed code changes in four files. Fixing this now keeps Sprint CD+1
   a pure ops task.

## Decision

Sprint CD ships reconnaissance + backend-only scenario plumbing. **No RCP
bytes are ingested, no frontend UI is added this sprint.** Sprint CD+1 will
ingest a selected tuple subset against the new schema; Sprint CD+2 will add
the picker UI and baseline-vs-future delta display.

### Scenario ID naming convention

Format: `<emissions>_<startYear>_<endYear>[_<gcm>]`. Regex
`^[a-z0-9_]{1,64}$` (validated server-side as the path-traversal guard on
`/raster/:scenario/...`).

Examples:

- `baseline_1981_2010` — the current-climate default, matches Sprint CB shape
- `baseline_1961_1990_cruts32` / `baseline_1971_2000_cruts32` — FAO historical
- `rcp85_2041_2070_ensemble` — mid-century RCP8.5 across the 6-GCM ensemble
- `rcp45_2041_2070_hadgem2_es` — single-GCM slice

The format is future-proofed for IPCC AR6 SSPs (`ssp126_2041_2070_…`) by
keeping the emissions prefix open-vocabulary.

### Enumeration method

A single-shot TypeScript reconnaissance script, `apps/api/scripts/enumerate-gaez-futures.ts`,
talks to FAO's ArcGIS ImageServer at
`https://gaez-services.fao.org/server/rest/services/res05/ImageServer`.
Strategy:

1. `/query?returnDistinctValues=true&outFields=rcp,model,year,sub_theme_name`
   to get the coarse tuple space (~80 distinct combinations after filtering
   Theme 4 sub-themes).
2. Per-scenario paginated `/query` calls (page size 1000, FAO cap) refine the
   raster count and compute a per-scenario completeness check against our
   96-cell target grid (12 priority crops × 4 management regimes × 2
   variables, matching Sprint BY).

Output: `apps/api/data/gaez/futures-inventory.json` (machine-readable) and
`apps/api/data/gaez/futures-inventory.md` (human-readable table).

### Results summary

**74 non-baseline scenarios enumerated.**

- **72 RCP futures:** 4 RCPs (2.6 / 4.5 / 6.0 / 8.5) × 6 GCMs (ENSEMBLE,
  GFDL-ESM2M, HadGEM2-ES, IPSL-CM5A-LR, MIROC-ESM-CHEM, NorESM1-M) × 3
  periods (2011-2040 / 2041-2070 / 2071-2100).
- **2 historical baselines** on the CRUTS32 observational dataset:
  1961-1990 and 1971-2000.

**Every future scenario shows 12 crop gaps against our 96-cell target grid.**
Root cause: FAO only publishes the "High" input-level raster series for RCP
futures — the "Low" series exists for baseline but not for futures. Our
`completeness.gaps` count reflects the missing Low cells; it is a FAO
publishing decision, not a reconnaissance defect. Sprint CD+1 will target
the High-input subset explicitly.

### Backward compatibility

The service-layer cascade
`entry.scenario ?? manifest.climate_scenario ?? 'baseline_1981_2010'` means:

- Pre-Sprint-CD manifests (no per-entry `scenario` field, no top-level
  `climate_scenario`) continue to resolve — every entry implicitly gets
  `baseline_1981_2010`.
- Sprint CB/CC-era manifests that set `climate_scenario` at the top level
  still work — every entry inherits that value.
- Mixed manifests (baseline + RCP entries side by side) work after
  Sprint CD+1 ingest, because the per-entry `scenario` overrides the
  manifest top-level when present.

Baseline-only deployments are unaffected by this sprint.

## Recommended Sprint CD+1 MVP tuple subset

**TBD — operator reviews `apps/api/data/gaez/futures-inventory.md` and
selects before Sprint CD+1 kickoff.** A reasonable default: RCP8.5 + RCP4.5
× 2041-2070 × ENSEMBLE GCM × all 12 priority crops × rainfed + irrigated ×
High input (≈96 rasters total, ~1 GB pre-COG), pending confirmation against
the inventory. Ensemble GCM is the operator-readable default; single-GCM
slices can be added later as operator demand surfaces.

## Consequences

### Positive

- RCP ingest is now a pure ops task: pick tuples from the inventory, run
  the reuse-ready `download-gaez.ts --filter <rcp_scenario>` (needs trivial
  extension), run `convert-gaez-to-cog.ts --scenario <id>`, drop the
  regenerated manifest. No API / route / frontend code changes required.
- The scenario dimension is now available to any future layer that carries
  a climate/projection axis (e.g. an eventual SSP family, or a CMIP6
  downscaled overlay).
- Reconnaissance artifact is version-controlled and reviewable before any
  bytes land.

### Negative

- One hardcoded `baseline_1981_2010` in `apps/web/src/features/map/GaezOverlay.tsx`'s
  `rasterUrl()` until Sprint CD+2 ships the picker UI. Flagged with a
  `TODO(sprint-cd+2)` marker in source.
- The `/raster/:crop/...` → `/raster/:scenario/:crop/...` route change is a
  breaking shape change; exactly one caller (the hardcoded overlay URL
  above) needed retrofitting. External consumers (none today) would break.

## References

- [FAO GAEZ RCP futures inventory (human-readable)](../../apps/api/data/gaez/futures-inventory.md)
- [Enumeration script](../../apps/api/scripts/enumerate-gaez-futures.ts)
- [2026-04-20 GAEZ self-hosting decision](2026-04-20-gaez-self-hosting.md) — parent ADR this one extends
