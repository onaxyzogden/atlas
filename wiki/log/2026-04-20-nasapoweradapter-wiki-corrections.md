# 2026-04-20 — NasaPowerAdapter + Wiki Corrections


### Objective
Land NASA POWER climatology enrichment (#2 leverage item from 2026-04-19 deep audit) and clear wiki drift flagged in the same audit.

### Work Completed

**NASA POWER enrichment layer (new)**
- `apps/api/src/services/pipeline/adapters/nasaPowerFetch.ts` — shared helper `fetchNasaPowerSummary(lat, lng)` returning `{ solar_radiation_kwh_m2_day, wind_speed_ms, relative_humidity_pct, confidence, source_api }`. Keyless, 10 s timeout, single 5xx retry, silent-skip on failure (returns `null`). Unit conversion: ALLSKY_SFC_SW_DWN MJ/m²/day ÷ 3.6 → kWh/m²/day.
- `apps/api/src/services/pipeline/adapters/NasaPowerAdapter.ts` — standalone `DataSourceAdapter` class wrapping the helper. Not yet registered in `ADAPTER_REGISTRY` (see note below), but independently testable and ready for future global use.
- `NoaaClimateAdapter` + `EcccClimateAdapter` — both gained a post-fetch merge step that calls `fetchNasaPowerSummary` and layers solar/wind/humidity onto their existing `ClimateNormals`/`CanadaClimateNormals`. Merge is strictly additive, wrapped in try/catch, never disrupts the parent fetch on NASA POWER failure.
- Interface extensions (local per adapter): four optional fields — `solar_radiation_kwh_m2_day`, `wind_speed_ms`, `relative_humidity_pct`, `nasa_power_source`.

**Consumer side (unchanged, but now live)**
- `apps/web/src/lib/computeScores.ts:294, 1343–1347` already reads `solar_radiation_kwh_m2_day` from the climate layer. The field was previously absent, so `solar_pv_potential` scored 0 pts for every site. NASA POWER now populates it → immediate score-surface lift on the next pipeline run.

**Tests**
- `apps/api/src/tests/NasaPowerAdapter.test.ts` — 13 tests covering unit conversion, silent-skip on network failure, 5xx retry then give up, fill-value (-999) handling, query-string assembly, and the adapter wrapper. All green.
- Existing `NoaaClimateAdapter` + `EcccClimateAdapter` tests (17 + 18) still pass — the added merge step is tolerant of un-mocked NASA POWER fetch (silent-skip path).

**Wiki corrections**
- `wiki/entities/web-app.md:25` — "18 Zustand stores" → "26 Zustand stores" (actual count, confirmed in audit Phase D).
- `wiki/log.md:1229, 1266` — appended `[superseded 2026-04-19: all 14 Tier-1 adapters live]` notes in place (did not rewrite history).

### Plan pivot (documented at execution time)
The approved plan called for registering `NasaPowerAdapter` in `ADAPTER_REGISTRY` as the climate fallback for unmapped countries. At execution time, `packages/shared/src/constants/dataSources.ts` showed `ADAPTER_REGISTRY: Record<Tier1LayerType, Record<Country, AdapterConfig>>` with `Country = 'US' | 'CA'` only — there is no fallback slot in the type system. Extending the `Country` type cascades into every adapter's registry entry, Zod project schemas, and DB enums — out of scope for this sprint. Pivot: keep `NasaPowerAdapter` as a standalone class (independently tested, ready to register once the country-type expands) and integrate via the shared helper that Noaa/Eccc consume. Net effect unchanged: every climate pipeline run now includes NASA POWER data. The standalone registration is deferred to whichever sprint extends international country support.

### Verification
- `tsc --noEmit` — clean, zero errors.
- `vitest run NasaPowerAdapter NoaaClimateAdapter EcccClimateAdapter` — 48/48 tests pass (13 new + 17 + 18).

### Deferred
- FAO56 Penman-Monteith PET upgrade — follow-up. NASA POWER now provides the wind + humidity inputs; `apps/web/src/lib/hydrologyMetrics.ts:359` needs a conditional Penman branch when those fields are populated. Blaney-Criddle remains the default otherwise.
- NREL PVWatts integration — also deferred; NASA POWER solar is sufficient to activate the Sprint-K scoring consumer.
- `NasaPowerAdapter` registry registration — blocked on `Country` type extension.

### Files Changed
- `apps/api/src/services/pipeline/adapters/nasaPowerFetch.ts` (new, 139 lines)
- `apps/api/src/services/pipeline/adapters/NasaPowerAdapter.ts` (new, 90 lines)
- `apps/api/src/services/pipeline/adapters/NoaaClimateAdapter.ts` (modified: +4 optional fields, +14-line merge step, +1 import)
- `apps/api/src/services/pipeline/adapters/EcccClimateAdapter.ts` (modified: +4 optional fields, +14-line merge step, +1 import)
- `apps/api/src/tests/NasaPowerAdapter.test.ts` (new, 13 tests)
- `wiki/entities/web-app.md` (1 line correction)
- `wiki/log.md` (2 supersede notes)
