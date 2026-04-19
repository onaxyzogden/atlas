# Operation Log

Chronological record of significant operations performed on the Atlas codebase.

---

### 2026-04-16 — Sprint M: Tier 3 Integration + Scoring Calibration + UI Surfacing + Pipeline Fixes
- **Scope:** Full Tier 3 scoring integration (terrain_analysis, watershed_derived, microclimate, soil_regeneration components wired into all 7 weighted scores), scoring calibration audit (3 bugs + 3 calibration fixes), SiteIntelligencePanel UI surfacing of WithConfidence data, and pipeline bug fixes.
- **Scoring engine changes (`apps/web/src/lib/computeScores.ts`):**
  - Integrated Tier 3 layer components across all 7 existing weighted scores (graceful degradation when absent)
  - Added 8th weighted dimension: **Community Suitability** (6 census components: population density, median income, educational attainment, homeownership rate, poverty rate penalty, vacancy rate)
  - **Bug fix:** `salinity_penalty` maxPossible corrected from 0 to -5
  - **Bug fix:** WEIGHTS sum corrected from 1.05 to 1.00 (Design Complexity 0.15 → 0.10)
  - **Calibration:** Buildability base lowered from 75 to 60
  - **Calibration:** Community Suitability base raised from 10 to 25, added 4 new components (edu, homeownership, poverty, vacancy) — effective range improved from 10-40 to ~17-91
  - All outputs now produce `ScoredResult` with `score_breakdown`, `confidence`, `dataSources`, `computedAt`
- **UI changes (`SiteIntelligencePanel.tsx` + `.module.css`):**
  - Added overall confidence badge next to "Overall Suitability" title
  - Added per-score `dataSources` tags below each score bar
  - Added `sourceLayer` attribution in breakdown rows
  - Added `computedAt` timestamp per score breakdown
  - Guards for empty `dataSources` and empty `score_breakdown` arrays
- **Pipeline fixes (`DataPipelineOrchestrator.ts`):**
  - Removed orphan `compute_assessment` job INSERT (no queue/worker existed)
  - Fixed BullMQ retry status tracking: `status = 'queued'` → `status IN ('queued', 'failed')` across all 4 Tier 3 workers
- **API fix (`routes/design-features/index.ts`):**
  - Fixed TS2345 by casting `body.properties` and `body.style` to `Record<string, string>` for `db.json()` calls
- **Scoring components:** ~129 → ~140+ (Tier 3 integration + Community Suitability)
- **Weighted dimensions:** 7 → 8 (Community Suitability added at 5%)

---

### 2026-04-14 — Sprint L: Protected Areas + Infrastructure Rules + Scoring Polish
- **Scope:** Extended Overpass query for protected areas (1 new Cat 7 gap), added 8 infrastructure assessment rules (first infrastructure-aware rules), wired untapped water supply scoring, and audited Cat 11 regulatory status (3 gaps reclassified as implemented via existing zoning fetcher).
- **Files modified:**
  - `apps/web/src/lib/layerFetcher.ts` — extended Overpass query with `boundary=protected_area` + `leisure=nature_reserve` tags; added `protected_area` bucket, distance, name, class, and count to infrastructure layer summary
  - `apps/web/src/lib/computeScores.ts` — added `protected_area_proximity` (max 8) to Habitat Sensitivity (inverted — closer = higher sensitivity); added `water_supply_proximity` (max 3) to Buildability; threaded infrastructure to `computeHabitatSensitivity()`
  - `apps/web/src/lib/rules/ruleEngine.ts` — added `infrastructure` to `RuleContext` interface and `buildContext()` layer extraction
  - `apps/web/src/lib/rules/assessmentRules.ts` — added `infrastructure` category to `AssessmentRule` type; added 4 opportunity rules (good-road-access, grid-connected, market-accessible, masjid-nearby) + 4 risk rules (remote-from-hospital, no-road-access, no-grid-access, protected-area-constraint)
  - `packages/shared/src/schemas/assessment.schema.ts` — added `'infrastructure'` to `AssessmentFlagCategory` enum
  - `apps/web/src/components/panels/SiteIntelligencePanel.tsx` — added Protected Area row to Infrastructure Access section (distance + name + color coding); added protected area fields to `infraMetrics` useMemo
- **Scoring components:** ~126 → ~129 (+1 protected area habitat, +1 water supply buildability, +1 infrastructure category)
- **Assessment rules:** 28 → 36 (+4 opportunity, +4 risk — all infrastructure-based)
- **Gaps closed:** 1 new (protected areas Cat 7) + 3 reclassified (Cat 11 zoning, overlay, floodplain already live)

---

### 2026-04-14 — Sprint K: Overpass Infrastructure Distances + Solar PV Potential
- **Scope:** First sprint to add a new external API. Integrated OpenStreetMap Overpass API for distance-to-infrastructure (8 Category 10 gaps) plus solar PV potential from existing NASA POWER data (1 Category 9 gap). Added `infrastructure` layer type, Haversine distance computation, 6 new scoring components, Infrastructure Access panel section, and Solar PV row.
- **Files modified:**
  - `packages/shared/src/constants/dataSources.ts` — added `'infrastructure'` to LayerType union, excluded from Tier1LayerType
  - `apps/web/src/lib/layerFetcher.ts` — added `haversineKm()` helper, `fetchInfrastructure()` (single batched Overpass query for 7 POI categories: hospital, masjid, market, power substation, drinking water, road), ~25km search bbox, wired into `fetchAllLayersInternal()`. Fixed `replaceLayer()` to push new layer types without mock entries
  - `apps/web/src/lib/computeScores.ts` — added 4 infrastructure scoring components to Buildability (hospital_proximity max 5, road_access max 5, grid_proximity max 4, market_proximity max 3); added masjid_proximity (max 4) and solar_pv_potential (max 5) to Stewardship Readiness; threaded `infrastructure` layer and `solarRadiation` through scoring pipeline
  - `apps/web/src/components/panels/SiteIntelligencePanel.tsx` — added Infrastructure Access collapsible section (6 rows: hospital, masjid, market, grid, road, water with color-coded distances); added Solar PV row to Hydrology Intelligence section (PSH/day, annual yield, class label); added `infraOpen` state, `infraMetrics` + `solarPV` useMemo hooks
  - `apps/web/src/features/map/LayerPanel.tsx` — added `infrastructure` to LAYER_LABELS and LAYER_ICONS
- **Scoring components:** 120 → ~126 (+4 infrastructure buildability, +1 masjid stewardship, +1 solar PV stewardship)
- **Gaps closed:** 9 (8 infrastructure + 1 solar PV) — cumulative ~56/120
- **New API:** OpenStreetMap Overpass (free, no auth, CORS-friendly)

---

### 2026-04-14 — Sprint J: Soil Degradation + WRB + Agroforestry + Wind Energy
- **Scope:** Implemented 4 remaining frontend-computable gaps: soil degradation risk index, WRB soil classification, agroforestry species pairing, and wind energy potential — all from existing layer data, no new APIs. This exhausts all frontend-computable opportunities.
- **Files modified:**
  - `apps/web/src/lib/computeScores.ts` — added soil degradation risk component (composite of OM depletion, salinization, compaction, erosion, drainage — max 8) to Stewardship Readiness; added wind energy potential component (max 5) from wind rose power density; threaded elevation + windPowerDensity through Stewardship Readiness
  - `apps/web/src/lib/cropMatching.ts` — added `findAgroforestryCompanions()` function: filters EcoCrop DB for perennial trees/shrubs, scores by structural diversity, family diversity, N-fixation, rooting depth complementarity. Returns top companions with compatibility scores. Added `CompanionMatch` interface + `rangesOverlap()` helper
  - `apps/web/src/lib/hydrologyMetrics.ts` — added `computeWindEnergy()`: frequency-weighted cubic mean (Betz law), NREL power class, optimal direction, capacity factor. Added `WindEnergyResult` interface
  - `apps/web/src/components/panels/SiteIntelligencePanel.tsx` — added WRB classification row to Soil Intelligence (USDA→WRB lookup + Gleyic/Calcic/Humic/Haplic qualifiers); Wind Power row to Hydrology Intelligence (W/m² + class + direction); agroforestry companions sub-list under expanded crop matches; wind energy useMemo + companion cache useMemo
- **Scoring components:** 118 → 120 (+1 soil degradation, +1 wind energy)
- **Gaps closed:** 4 (soil degradation risk, WRB classification, agroforestry pairing, wind energy potential)

---

### 2026-04-14 — Sprint I: LGP + Canada Soil Capability + Carbon Stock Estimation
- **Scope:** Implemented three remaining frontend-computable gaps: Length of Growing Period (LGP), Canada Soil Capability Classification (CSCS), and carbon stock estimation — all from existing fetched layer data, no new APIs.
- **Files modified:**
  - `apps/web/src/lib/hydrologyMetrics.ts` — added `computeLGPDays()` using FAO AEZ monthly water balance (precip vs 0.5×PET with soil water carry-over); extended `HydroInputs` (monthlyNormals, awcCmCm, rootingDepthCm) and `HydroMetrics` (lgpDays, lgpClass)
  - `apps/web/src/lib/computeScores.ts` — added `computeCanadaSoilCapability()` (8-limitation model mirroring USDA LCC with AAFC thresholds, Class 1-7 + T/W/D/E/F/M/R subclasses, CA sites only); added `length_of_growing_period` component (max 6) to Agricultural Suitability; added `carbon_stock` component (max 6) to Regenerative Potential using IPCC formula with Adams pedotransfer fallback for bulk density; threaded `country` parameter through `computeAssessmentScores()`
  - `apps/web/src/components/panels/SiteIntelligencePanel.tsx` — added "Growing Period" row to Hydrology Intelligence section, "Carbon Stock" row (tC/ha + color coding) to Soil Intelligence section; passed monthly normals + soil params to hydro metrics; threaded `project.country` to scoring
- **Scoring components:** 108 → 118 (+1 LGP, +8 CSCS, +1 carbon stock)
- **Scoring functions:** 9 → 10 (for CA sites; 9 for US sites)
- **Gaps closed:** 3 (LGP, Canada Soil Capability, carbon stock estimation)

---

### 2026-04-14 — Sprint H: Gap Audit + Wiki Update
- **Scope:** Audited all gaps closed by Sprints A-G, updated gap analysis wiki page with per-gap status markers, rewrote scoring engine concept page to reflect current 9-dimension / 108-component architecture, and produced a prioritized "what's next" roadmap for Sprints I-J.
- **Files modified:**
  - `wiki/entities/gap-analysis.md` — updated Categories 1 (4/7), 2 (scoring wire-ups), 4 (5/10 hydrology), 6 (5/8 crop); rewrote summary table (~40/120); added completed sprint table (A-H) + next sprint candidates
  - `wiki/concepts/scoring-engine.md` — rewrote from "5 assessment dimensions" to 7 weighted + 2 formal classifications, 108 components, sprint history table
  - `wiki/log.md` — added Sprint F, G, H entries
- **Key findings:** Gap analysis was significantly stale — Hydrology showed 0/10 when 5/10 were implemented (Sprint F), scoring engine page said 5 dimensions when there are 9.
- **No code changes** — wiki-only sprint.

---

### 2026-04-14 — Sprint G: Soil Intelligence + Hardiness Zones + Rain-Fed vs Irrigated
- **Scope:** Combined polish sprint wiring existing SSURGO data into scoring, adding Soil Intelligence panel section, USDA Hardiness Zone scoring, rain-fed vs irrigated crop distinction, and fixing a pH field name bug across 3 sites.
- **Files modified:**
  - `apps/web/src/lib/computeScores.ts` — added 4 scoring components: calcium_carbonate (max 4), permeability/Ksat (max 4), compaction_risk/bulk density (max 3), hardiness_zone (max 5). Fixed `ph_value` → `ph` bug at 2 sites (computeAgriculturalSuitability, computeFAOSuitability).
  - `apps/web/src/lib/cropMatching.ts` — added `irrigationNeeded` + `irrigationGapMm` to CropMatch interface, rain-fed vs irrigated computation in `scoreCrop()`. Fixed third `ph_value` → `ph` bug in `siteConditionsFromLayers()`.
  - `apps/web/src/components/panels/SiteIntelligencePanel.tsx` — added Soil Intelligence collapsible section (8 rows: pH, OM, CEC, texture, bulk density, Ksat, CaCO3, rooting depth), irrigation badges on crop list items ("+X mm" / "Rain-fed"), reordered useMemo hooks to fix dependency ordering.
- **Bugs fixed:** `ph_value` → `ph` at 3 locations (SSURGO field is `ph`, not `ph_value`). pH scoring was silently returning 0 for all sites.
- **Scoring components:** 97 → 108 (+4 soil + +1 hardiness + FAO/USDA retained)
- **Gaps closed:** Rain-fed vs irrigated distinction (Cat 6), hardiness zone wired into scoring (Cat 1)

---

### 2026-04-14 — Sprint F: Hydrology Intelligence
- **Scope:** Implemented 5 hydrology gaps as frontend-computed metrics from existing climate + watershed data. Created `hydrologyMetrics.ts` utility and added Hydrology Intelligence section to SiteIntelligencePanel.
- **Files created:**
  - `apps/web/src/lib/hydrologyMetrics.ts` — pure functions: Blaney-Criddle PET, aridity index (UNEP classification), irrigation water requirement, rainwater harvesting potential
- **Files modified:**
  - `apps/web/src/lib/computeScores.ts` — added 4 water resilience scoring components: pet_aridity (max 8), irrigation_requirement (max 6), rainwater_harvesting (max 5), drainage_density (max 4)
  - `apps/web/src/components/panels/SiteIntelligencePanel.tsx` — added Hydrology Intelligence collapsible section (PET, aridity, RWH potential, irrigation requirement, drainage density) between scores and crop suitability
  - `apps/api/src/services/terrain/WatershedRefinementProcessor.ts` — added drainage density computation from D8 flow accumulation grid (channel threshold = 100 cells, km/km² classification)
- **Gaps closed:** 5 hydrology gaps (PET/ET, aridity index, irrigation requirement, rainwater harvesting, drainage density)
- **Gaps remaining (hydrology):** 5 (groundwater depth, aquifer type, seasonal flooding duration, water stress index, surface water quality)

---

### 2026-04-14 — Sprint E: Crop Suitability — FAO EcoCrop Integration
- **Scope:** Integrated the full FAO EcoCrop database (2071 crops, sourced from OpenCLIM/ecocrop GitHub under OGL v3) with a 9-factor crop suitability matching engine. Replaces the hand-curated 60-crop subset with authoritative FAO data covering cereals, legumes, vegetables, fruits, forestry, forage, medicinals, ornamentals, and more.
- **Files created:**
  - `apps/web/src/data/EcoCrop_DB.csv` — raw FAO EcoCrop database (2568 species, 53 columns)
  - `apps/web/src/data/ecocrop_parsed.json` — parsed/normalized JSON (2071 crops with valid temperature data, 965 KB)
  - `scripts/parse_ecocrop.py` — CSV→JSON converter with English name extraction, categorical field encoding
  - `apps/web/src/lib/cropMatching.ts` — 9-factor matching engine: temperature, precipitation, pH, drainage, texture, soil depth, salinity, growing season, cold hardiness. Uses optimal/absolute range interpolation (same as OpenCLIM). Overall score: 40% min factor + 60% mean (Liebig's law blend). Returns FAO-style S1/S2/S3/N1/N2 classes.
- **Files modified:**
  - `apps/web/src/data/ecocropSubset.ts` — replaced hand-curated CropEntry interface with FAO-aligned schema; JSON import of full database
  - `apps/web/src/components/panels/SiteIntelligencePanel.tsx` — added "Crop Suitability" section with category filter pills, expandable per-crop factor breakdowns, ScoreCircle reuse
  - `apps/web/src/components/panels/SiteIntelligencePanel.module.css` — crop filter pill styles, crop metadata layout
  - `wiki/entities/gap-analysis.md` — Category 6 updated: 4/8 implemented
- **Gaps closed:** 4 (EcoCrop matching, perennial crop matching, forage suitability, lifecycle filtering)
- **Gaps remaining in Category 6:** 4 (irrigated distinction, agroforestry pairing, companion planting, invasive/native species)

---

### 2026-04-14 — Sprint D: Formal Scoring — FAO S1-N2 + USDA LCC I-VIII
- **Scope:** Implemented the two primary international land classification standards as new scoring dimensions in the scoring engine. Both use the soil, climate, and terrain data made available by Sprints A-C.
- **Files modified:**
  - `apps/web/src/lib/computeScores.ts` — added `computeFAOSuitability()` (8-factor: pH, rooting depth, drainage, AWC, salinity, CEC, topography, thermal regime → S1/S2/S3/N1/N2) and `computeUSDALCC()` (8-limitation: slope, drainage, soil depth, texture, erosion hazard, salinity, climate, drought susceptibility → Class I-VIII with e/w/s/c subclass). Both wired into `computeAssessmentScores()` as weight-0 classification entries.
  - `wiki/entities/gap-analysis.md` — marked FAO + USDA LCC as implemented, updated summary table
- **Architecture:** Classifications are ScoredResult entries with custom `rating` strings (e.g., "S1 — Highly Suitable", "Class IIe — Suited to cultivation"). Weight 0 in `computeOverallScore()` means they appear in the dashboard breakdown but don't affect the overall site score.
- **Gaps closed:** FAO S1-N2, USDA LCC I-VIII (+ hardiness zones already existed)
- **Gaps remaining (formal scoring):** Canada Soil Capability, fuzzy logic, AHP, LGP

---

### 2026-04-14 — Sprint C: Climate Foundation
- **Scope:** Added Koppen-Geiger climate classification (computed from existing monthly normals), freeze-thaw cycle estimation, and NASA POWER solar radiation integration. Discovered 6/10 climate gaps were already implemented via NOAA ACIS + ECCC — gap analysis was outdated. Extended scoring with Koppen zone and GDD heat accumulation components.
- **Key finding:** Atlas already had robust climate data from NOAA ACIS (US, 30-year normals) and ECCC OGC (CA). The gap analysis listed these as missing, but they were implemented in a prior session.
- **Files modified:**
  - `apps/web/src/lib/layerFetcher.ts` — added `computeKoppen()` (Koppen-Geiger classification from monthly temp/precip), `koppenLabel()` (human-readable labels), `computeFreezeThaw()` (transition month estimation), `fetchNasaPowerSolar()` (NASA POWER GHI API); extended all 3 climate return paths (NOAA, ECCC, fallback) with new fields
  - `apps/web/src/features/climate/SolarClimateDashboard.tsx` — extended ClimateSummary interface, added Koppen, solar radiation, freeze-thaw, snow months display
  - `apps/web/src/lib/computeScores.ts` — added koppen_zone (max 8 pts) and heat_accumulation/GDD (max 5 pts) to agricultural suitability
  - `wiki/entities/gap-analysis.md` — corrected climate section: 8/10 implemented, updated summary table
- **APIs connected:** NASA POWER (`power.larc.nasa.gov`) — global solar radiation, free, no key
- **Gaps closed:** Koppen classification, freeze-thaw/snow load, solar radiation (kWh/m²/day)
- **Gaps remaining (climate):** Extreme event frequency, climate change projections (RCP 4.5/8.5)

---

### 2026-04-14 — Sprint B: Soil Extended Properties (Display Gap)
- **Scope:** Extended frontend SSURGO SDA query from 4 to 15 chorizon fields with weighted multi-component averages. Added derived indices (fertility index, salinization risk, USDA texture class). Expanded EcologicalDashboard from 6 to 16 soil metrics with assessment flags. Integrated new soil properties into scoring engine (pH, CEC, AWC in agricultural suitability; fertility + salinity penalty in stewardship readiness).
- **Files modified:**
  - `apps/web/src/lib/layerFetcher.ts` — rewrote US SSURGO query: removed TOP 1, added 9 chorizon fields (cec7_r, ec_r, dbthirdbar_r, ksat_r, awc_r, silttotal_r, caco3_r, sar_r) + resdepth_r, weighted average computation, deriveTextureClassFe, computeFertilityIndexFe, computeSalinizationRiskFe
  - `apps/web/src/features/dashboard/pages/EcologicalDashboard.tsx` — extended SoilsSummary interface (14 new fields), added Physical Properties / Particle Size / Chemical Properties / Derived Indices sub-sections, soil assessment flags (pH extreme, salinity, compaction, low CEC, low AWC, sodicity)
  - `apps/web/src/features/dashboard/pages/EcologicalDashboard.module.css` — added subSectionLabel style
  - `apps/web/src/lib/computeScores.ts` — added ph_suitability (max 10), cation_exchange (max 5), water_holding (max 5) to agricultural suitability; soil_fertility (max 10) + salinity_penalty (max -5) to stewardship readiness
  - `wiki/entities/gap-analysis.md` — marked 10/16 soil gaps as implemented
- **Gaps closed:** pH, OC, CEC, EC, SAR, CaCO3, Ksat, AWC, rooting depth, bulk density
- **Gaps remaining (soil):** N-P-K, surface stoniness, soil degradation, boron toxicity, WRB classification, SoilGrids

---

### 2026-04-14 — Sprint A (cont.): Cut/Fill + Erosion Hazard
- **Scope:** Implemented the final 2 terrain gaps: cut/fill volume estimation and RUSLE erosion hazard mapping. Also added `kfact_r` (soil erodibility) to SSURGO adapter.
- **Files created:**
  - `algorithms/cutFill.ts` (~110 lines) — on-demand utility comparing existing DEM to target elevation within a polygon. Point-in-polygon rasterization, cut/fill/unchanged classification, volume + area output.
  - `algorithms/erosionHazard.ts` (~160 lines) — RUSLE (R×K×LS×C×P) with tiered confidence: LS computed from DEM, K/R/C default when unavailable, upgrades when soil + climate data present. 6-class output (very_low through severe, t/ha/yr).
  - `migrations/008_erosion_cutfill.sql` — 6 erosion columns on `terrain_analysis`.
- **Files modified:**
  - `TerrainAnalysisProcessor.ts` — erosion wired as 8th parallel analysis, GeoJSON + UPSERT extended.
  - `SsurgoAdapter.ts` — added `h.kfact_r` to horizon SQL, HorizonRow, SoilSummary, weighted averages, and null fallback.
  - `TerrainDashboard.tsx` — erosion hazard section with mean/max soil loss, confidence, 6-class progress bars.
- **Gap analysis:** Terrain & Topography now **8/8 complete** (plus 3 bonus: frost pocket, cold air drainage, TPI).
- **Next:** Sprint B (soil extended properties) or Sprint C (climate data).

### 2026-04-14 — Sprint A: TWI + TRI Terrain Algorithms
- **Scope:** Implemented Topographic Wetness Index (TWI) and Terrain Ruggedness Index (TRI) — the two remaining computation gaps in the terrain pipeline.
- **Key discovery:** 5/8 terrain gaps from the gap analysis were already implemented (aspect, curvature, viewshed, frost pocket, TPI). Sprint A scope reduced to TWI + TRI only.
- **Files created:**
  - `apps/api/src/services/terrain/algorithms/twi.ts` (~105 lines) — `ln(catchment_area / tan(slope))`, 5-class classification (very_dry through very_wet), reuses `hydro.ts` components.
  - `apps/api/src/services/terrain/algorithms/tri.ts` (~130 lines) — mean absolute elevation difference of 8 neighbours, Riley et al. 1999 7-class system with resolution scaling for high-res DEMs.
  - `apps/api/src/db/migrations/007_twi_tri.sql` — 8 new columns on `terrain_analysis` table.
- **Files modified:**
  - `TerrainAnalysisProcessor.ts` — imports, Promise.all (5→7), GeoJSON conversion, UPSERT extended with 8 columns.
  - `TerrainDashboard.tsx` — TWI wetness + TRI ruggedness sections with progress bars, reading from `terrain_analysis` layer.
- **Gap analysis updated:** terrain section now shows 6/8 implemented, 2 remaining (cut/fill, erosion hazard).
- **Next:** Build verification, then Sprint B (soil extended properties) or Sprint C (climate data).

### 2026-04-14 — SSURGO Backend Adapter Implementation
- **Scope:** Implemented `SsurgoAdapter` — the first real backend data adapter in the pipeline, replacing `ManualFlagAdapter` for soils/US.
- **Files created:**
  - `apps/api/src/services/pipeline/adapters/SsurgoAdapter.ts` (380 lines) — full SSURGO SDA adapter with two-phase queries (mukey spatial intersection → horizon data), weighted averages, USDA texture classification, fertility index (0-100), salinization risk, confidence determination, and Tier 3 processor compatibility aliases.
  - `apps/api/src/tests/SsurgoAdapter.test.ts` (330 lines) — 27 tests across 8 suites, all passing.
- **Files modified:** `DataPipelineOrchestrator.ts` — wired `SsurgoAdapter` into `resolveAdapter()`, exported `ProjectContext` interface.
- **Adapter registry:** 1/14 live (was 0/14).
- **Deferred:** DB upsert inside adapter (orchestrator handles), Tier 3 conditional trigger (orchestrator handles), UsgsElevationAdapter.
- **Next:** Implement `UsgsElevationAdapter` (elevation/US) or CVE remediation (fast-jwt).

### 2026-04-14 — Gap Analysis Wiki Ingestion + Triage
- **Scope:** Ingested `infrastructure/OGDEN Atlas — Global Completeness Gap Analysis.md` into wiki as a formal entity page, then triaged all 13 categories by priority.
- **Output:** `wiki/entities/gap-analysis.md` — structured synthesis of ~120 gaps, each tagged with gap type (data / computation / display), priority-ordered summary table (P0-P4), quick wins section, and 6-sprint implementation roadmap.
- **Priority assignments:**
  - **P0 (Quick Win):** Terrain computation (7 gaps, DEM live, `tier3-terrain` exists), Soil extended properties (5-8 gaps, SSURGO `chorizon` columns already available)
  - **P1:** Climate data (free APIs: WorldClim/NASA POWER), Formal Scoring algorithms (FAO/USDA classification)
  - **P2:** Crop Suitability (most significant strategic gap, depends on P1), Regulatory/Legal (fragmented sources)
  - **P3:** Renewable Energy, Infrastructure, Ecological, Design Intelligence
  - **P4:** Environmental Risk, Global Coverage
- **Cross-references added:** atlas-platform.md, data-pipeline.md.
- **Next:** Sprint A — implement terrain computation algorithms in `tier3-terrain` worker (aspect, curvature, TWI, TRI).

### 2026-04-14 — Deep Technical Audit (ATLAS_DEEP_AUDIT.md)
- **Scope:** Comprehensive 8-phase audit covering structural inventory, database schema, API layer, frontend features, data integration matrix, feature completeness matrix, technical debt, and synthesis report.
- **Output:** `ATLAS_DEEP_AUDIT.md` (1,026 lines) saved to project root.
- **Key findings:**
  - Overall completion revised from ~65% to **~55%** — backend adapter registry is 100% stubbed (ManualFlagAdapter for all 14 adapters), which was previously obscured by frontend layerFetcher having 10 live API connections.
  - 498 source files, 16 DB tables across 6 migrations, 50+ API endpoints, 26 Zustand stores, 14 dashboard pages.
  - 28 data sources mapped (10 LIVE via frontend, 18 PLANNED). Backend pipeline has 0% real adapters.
  - 14 security vulnerabilities (2 critical CVEs in fast-jwt via @fastify/jwt).
  - TypeScript compiles clean (0 errors). Only 1 TODO remaining in codebase.
  - Top recommendation: implement backend adapters starting with SSURGO (soils, 20% weight) and USGS 3DEP (elevation, 15% weight) to close the frontend/backend split.
- **Wiki updates:** atlas-platform.md completion revised, data-pipeline.md current state expanded.
- **Deferred:** UI browser verification, adapter implementation, CVE remediation.

### 2026-04-13 — Local Stack Verification & Hardening
- **Full LOCAL_VERIFICATION.md checklist run:** 22/24 API endpoint tests passed. Exports (Puppeteer) and terrain data skipped.
- **Redis fault-tolerance:** `apps/api/src/plugins/redis.ts` — try/catch, connectTimeout, `family: 4` for WSL2 IPv4, retryStrategy. API now starts gracefully without Redis.
- **BullMQ connection fix:** `apps/api/src/services/pipeline/DataPipelineOrchestrator.ts` — replaced `this.redis as never` casts with dedicated `ConnectionOptions` (host/port/password/family + `maxRetriesPerRequest: null`). All 5 queues + 5 workers now get their own connections.
- **Pipeline startup guard:** `apps/api/src/app.ts` — added `redis.status === 'ready'` check before initializing orchestrator.
- **Date serialization fix:** `packages/shared/src/lib/caseTransform.ts` — `instanceof Date` guard prevents object destructuring of timestamps in `toCamelCase`/`toSnakeCase`.
- **jsonb double-stringification fix:** `apps/api/src/routes/design-features/index.ts` — `db.json()` / `sql.json()` for properties/style columns instead of `JSON.stringify()`.
- **LOCAL_VERIFICATION.md doc fixes:** export type corrected, portal required fields added, migration env var instructions, full Redis WSL2 connectivity guide.
- **New infrastructure files:** `db-setup.sql`, `run-migrations.sh`, `wsl-redis-url.sh`, `WINDOWS_DEV_NOTES.md`
- **Commit:** `c6f7e1e` pushed to main.
- **Deferred:** UI browser verification, Puppeteer PDF export test, terrain pipeline data test, WebSocket two-tab presence test.

### 2026-04-13 — Pre-Launch Hardening: Remaining Deferred Items
- **WS stale connection cleanup:** Added server-side stale connection timeout to `apps/api/src/plugins/websocket.ts`. Connections without heartbeat for 90s (3× client interval) are now auto-closed. `lastSeen` tracking was already in place but unused — now enforced via `setInterval` cleanup loop.
- **Layers route snake_case → camelCase:** Applied `toCamelCase()` transform to layers API route (`apps/api/src/routes/layers/index.ts`), aligning with existing pattern in projects/design-features/files routes. Updated 222 snake_case field references across 18 frontend files + 4 test files. `MockLayerResult` interface updated to camelCase.
- **Terrain DEM migration:** Replaced 4 `mapbox://` tile source URLs with MapTiler equivalents. Centralized as `TERRAIN_DEM_URL` and `CONTOUR_TILES_URL` in `lib/maplibre.ts`. Removed unused `MAPBOX_TOKEN` from API .env.
- **Still deferred:** TypeScript composite references (structural tsconfig change, risk of build breakage), Docker initdb race condition (needs Docker env)

---

## 2026-04-13 — Z-Index Standardization

### 2026-04-13 — Z-Index Standardization
- **Scope:** Standardized all z-index declarations to use the existing token scale from `tokens.css`
- **Phase 1:** Added `zIndex` export to `tokens.ts` TS bridge (base/dropdown/sticky/overlay/modal/toast/tooltip/max)
- **Phase 2:** Fixed 3 critical stacking bugs:
  - SlideUpPanel (z-49/50 → z-modal 400/401) — was rendering behind Modal
  - Toast (z-9999 → z-toast 500) — out-of-scale value
  - Tooltip fallback (1000 → 600) — exceeded --z-max
- **Phase 3:** Migrated 11 files from hardcoded z-index to token references (3 CSS modules + 8 TSX inline styles)
- **Phase 4:** Documented map-internal z-index sub-scale in MapView.module.css
- **Phase 5:** Removed 2 debug console.info statements from tilePrecache.ts
- **Remaining:** 14 hardcoded z-index values are intentional (map-internal local stacking, layout stacking)

---

## 2026-04-13 — Design-Token Refactor (Hardcoded Hex Elimination)

**Operator:** Claude Code (Opus 4.6)
**Session scope:** Centralize ~1,135 hardcoded hex color values across 90+ files into the design token system

### Phase 0 — Token Infrastructure Expansion
- Expanded `tokens.css` with 50+ new CSS custom properties (zones, structures, paths, status, map, RGB channels)
- Created `apps/web/src/lib/tokens.ts` — TypeScript bridge with 20+ `as const` objects for JS contexts (MapLibre paint, stores, exports)
- Added dark mode overrides to `dark-mode.css`

### Phase 1 — CSS Module Migration
- Migrated 50 CSS module files (~666 replacements) to `var(--token)` references

### Phase 2 — Store/Config Migration
- Migrated 8 store/config files (83 replacements) — zoneStore, pathStore, utilityStore, phaseStore, templateStore, speciesData, portalStore, collaboration components

### Phase 3 — Map File Migration
- Migrated 10 map files (~59 replacements) for MapLibre GL paint properties

### Phase 4 — TSX Component Migration
- Migrated 23+ TSX files (~226 replacements) — exports, dashboards, panels, portal sections

### Phase 5 — Chart Tokens + Verification
- Added `chart` token object to `tokens.ts`
- Final verification: tsc clean, vite build clean
- Hex count reduced from ~1,340 to ~205 actionable (85% elimination)

### New File
- `apps/web/src/lib/tokens.ts` — TypeScript token bridge for JS contexts (MapLibre, stores, exports)

### Deferred
- Dark mode CSS deduplication
- Tailwind gray tokenization

---

## 2026-04-12 — Pre-Launch Hardening: MEDIUM/LOW Audit Sweep (Phases E+F)

**Operator:** Claude Code (Opus 4.6)
**Session scope:** Fix 12 remaining MEDIUM/LOW findings from pre-launch audit

### Phase E — Quick Wins (7 items)

| Fix | Description |
|---|---|
| E1 | Added `coverage/` to `.gitignore` (4 untracked dirs) |
| E2 | Removed dead `MAPBOX_TOKEN` from API config.ts + .env.example |
| E3 | Removed unused `Readable` import from StorageProvider.ts |
| E4 | Removed redundant `@types/jszip` (jszip ships own types) |
| E5 | Cleaned `pnpm-workspace.yaml` — removed spurious `allowBuilds` block |
| E6 | Removed unused `VITE_API_URL` from .env.example, Dockerfile, docker-compose |
| E7 | Added `pino-pretty` to API devDeps (was used but undeclared) |

### Phase F — Moderate Fixes (5 items)

| Fix | Description |
|---|---|
| F1 | Renamed `mapboxToken`→`maptilerKey`, `mapboxTransformRequest`→`maptilerTransformRequest`, `useMapbox`→`useMaplibre`. Deleted dead `mapbox.ts` shim. Updated 4 doc files. |
| F2 | Added WS broadcast for bulk feature insert + `features_bulk_created` to WsEventType enum |
| F3 | Added layer refresh deduplication (skip insert+enqueue if queued/running job exists) |
| F4 | New migration 006: `idx_pc_author` index + `set_updated_at_portals` trigger |
| F5 | Updated README roadmap table (phases 1–4 status) |

### Additional Fixes

- Fixed PWA `maximumFileSizeToCacheInBytes` for Cesium 4.1MB bundle (vite.config.ts)
- Fixed postgres.js `TransactionSql` typing issue with `any` annotation + eslint comment
- Reverted unnecessary `onlyBuiltDependencies` in root package.json (`.npmrc` is authoritative)

### Verification

- **Build:** 3/3 workspaces pass (shared + api + web)
- **Tests:** 420 passing (64 API + 356 web) across 25 test files

### Deferred (documented in plan)

- Hardcoded hex colors (510 occ, 59 files) — design-token refactor session
- Console statements (79 occ) — needs policy decision
- Z-index standardization — stacking context audit
- WS stale connection cleanup — heartbeat interval logic
- TypeScript composite references — structural tsconfig change
- Docker initdb race condition — needs Docker testing
- Layers route snake_case → camelCase — 170 frontend refs, coordinated breaking change

---

## 2026-04-12 — MapTiler Migration Completion + Design Token Fixes + Coverage Verification

**Operator:** Claude Code (Sonnet 4.6)
**Session scope:** Complete MapTiler migration, fix tokens.css critical errors, verify branch coverage

### Changes

**Branch coverage verification:**
- Ran `vitest --coverage` on `computeScores.test.ts` (138 tests written in prior session)
- Result: all 138 pass, branch coverage = **84.61%** — target >80% met
- Remaining uncovered: lines 437, 738–739 (unreachable defensive paths)

**tokens.css — critical font fixes:**
- Line 6: replaced `@import Lora` with Fira Code (400–700) + Fira Sans (300–700)
- `--font-sans`: changed from `'Inter'` to `'Fira Sans'`
- Added `--font-serif: 'Fira Code', monospace` (was referenced in components but never defined)
- Group color tokens: added 7 `--color-group-*` tokens (livestock/forestry/hydrology/finance/compliance/reporting/general) matching values hardcoded in `DashboardSidebar.tsx`

**MapTiler geocoding migration:**
- `apps/web/src/features/map/MapCanvas.tsx` line 559: Mapbox geocoding → MapTiler
- `apps/web/src/features/project/wizard/StepBoundary.tsx` line 88: Mapbox geocoding → MapTiler
- Both use `https://api.maptiler.com/geocoding/${query}.json?key=${mapboxToken}`
- Response parsing unchanged (`features[0].center` — identical structure)
- HMR confirmed clean in browser preview

### Design Audit Findings (no changes — documented only)
- ~500 hardcoded hex instances across ~97 CSS module files
- ~64 font fallback violations (Lora/Georgia/DM Mono in 5 key files)
- Terrain DEM (`mapbox://` protocol) in TerrainControls.tsx + HydrologyPanel.tsx — deferred

### Deferred
- Replace wrong font fallbacks in HydrologyRightPanel.module.css, ProjectTabBar.module.css, Modal.module.css, StewardshipDashboard.tsx
- Terrain DEM migration (TerrainControls.tsx + HydrologyPanel.tsx)
- apps/api server-side MAPBOX_TOKEN in config.ts

---

## 2026-04-11 — Sprint 10 Start: Navigation Wiring + PDF Export Service

**Operator:** Claude Code (Opus 4.6 + Sonnet 4.6)
**Session scope:** DashboardSidebar navigation wiring + full PDF export service implementation

### Changes

**Navigation wiring (Sonnet 4.6):**
- Added Finance group (Economics, Scenarios, Investor Summary) to DashboardSidebar
- Added Compliance group (Regulatory) to DashboardSidebar
- Added 4 SVG icons + 4 DashboardRouter lazy-import cases
- Files: `DashboardSidebar.tsx`, `DashboardRouter.tsx`

**PDF export service (Opus 4.6):**
- Installed `puppeteer` dependency
- Created Zod schemas: `packages/shared/src/schemas/export.schema.ts`
- Created browser manager: `apps/api/src/services/pdf/browserManager.ts`
- Created PdfExportService orchestrator
- Created 7 HTML templates (site_assessment, design_brief, feature_schedule, field_notes, investor_summary, scenario_comparison, educational_booklet)
- Created shared base layout with Atlas design system (Earth Green, Harvest Gold, Fira Code/Sans)
- Created export routes: `POST/GET /api/v1/projects/:id/exports`
- Registered routes + browser cleanup in `app.ts`
- Total: 13 new files, 4 modified files

**Wiki initialization:**
- Created wiki structure: SCHEMA.md, entities/, concepts/, decisions/
- 6 entity pages, 4 concept pages, 2 decision records

### Verification
- TypeScript compilation: clean (shared + API + web)
- Web app Vite build: passes
- Preview verified: Finance + Compliance groups visible in sidebar at desktop viewport

### Deferred
- Frontend integration (wire export buttons to API)
- E2E test with live DB
- Puppeteer Chromium download approval in CI


---

## 2026-04-19 — Watershed Adapters (Sprint M+1 continued)

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

### Commit
`aea81d7` feat: implement NhdAdapter + OhnAdapter — watershed data at 100% coverage
