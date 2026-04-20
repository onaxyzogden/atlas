# Scoring Engine

## Summary
Client-side scoring engine that computes **8 weighted assessment dimensions + 2-3 formal classification systems** (10-11 total scoring functions, ~153 scoring components as of Sprint W) from geospatial layer data. Each score is 0-100 with a confidence level (high/medium/low) based on data source quality. The two classification systems (FAO S1-N2, USDA LCC I-VIII) carry weight 0 — they appear in dashboards but don't affect the overall site score. All scored outputs use the `ScoredResult` type with full `score_breakdown` arrays and `WithConfidence` fields (`confidence`, `dataSources`, `computedAt`).

## How It Works
1. `computeAssessmentScores(layers, acreage)` receives cached layer data from `siteDataStore`
2. Each scoring function extracts sub-factors from relevant layers using `num()`, `str()`, `nested()` helpers
3. Sub-factors are scored via `comp(name, value, maxPossible, sourceLayer, confidence)` and collected into a `ScoreComponent[]` array
4. `buildResult(label, basePoints, components)` normalises raw points to 0-100, determines rating tier, and attaches the full breakdown
5. Confidence is the minimum confidence across all contributing data sources
6. `computeOverallScore()` computes the weighted average of the 7 weighted dimensions (FAO + USDA excluded at weight 0)
7. `evaluateAssessmentRules()` generates flags for risks, opportunities, limitations, and data gaps

## Dimensions

### 8 Weighted Assessment Dimensions
| Dimension | Weight | Key Factors | Layer Sources |
|-----------|--------|-------------|---------------|
| Water Resilience | 15% | Drainage class, flood zones, watershed position, PET, aridity index, rainwater harvesting, irrigation requirement, watershed flow accumulation, detention zones, moisture zones | watershed, wetlands, soils, climate, watershed_derived (T3), microclimate (T3) |
| Agricultural Suitability | 15% | pH, CEC, AWC, CaCO3, Ksat, bulk density, organic matter, drainage, slope, texture, GDD, hardiness zone, sun traps, frost risk, wind shelter | soils, climate, elevation, microclimate (T3) |
| Regenerative Potential | 15% | Organic matter, biodiversity indicators, carbon sequestration capacity, soil health trends, restoration priority, intervention suitability | soils, land_cover, climate, soil_regeneration (T3) |
| Buildability | 12% | Slope, flood risk, soil bearing capacity, terrain ruggedness, access grade, hospital/road/grid/market proximity, terrain curvature, TPI flat areas, viewshed openness | elevation, wetlands, soils, infrastructure, terrain_analysis (T3) |
| Habitat Sensitivity | 10% | Wetland proximity, endangered species habitat, riparian buffers, land cover type, protected area proximity, cold air drainage, disturbed land, moisture zones | wetlands, land_cover, watershed, infrastructure, terrain_analysis (T3), soil_regeneration (T3), microclimate (T3) |
| Stewardship Readiness | 18% | Soil fertility, salinity penalty, erosion hazard, conservation practice potential, masjid proximity, solar PV, wind energy, soil regeneration readiness, regeneration sequence, outdoor comfort | soils, elevation, climate, infrastructure, soil_regeneration (T3), microclimate (T3) |
| Community Suitability | 5% | Population density, median income, educational attainment, homeownership rate, poverty rate, vacancy rate | census_demographics |
| Design Complexity | 10% | Slope variability, terrain complexity, access constraints, zoning conflicts, TPI heterogeneity, curvature complexity (inverted — high complexity reduces overall score) | elevation, soils, land_cover, terrain_analysis (T3) |

> **Weight corrections (Sprint M):** Design Complexity reduced from 15% to 10%, Community Suitability added at 5%. Total weights sum to exactly 1.00.

### 2-3 Formal Classification Systems (weight 0)
| Classification | Standard | Output | Key Factors | Availability |
|----------------|----------|--------|-------------|-------------|
| FAO Suitability | S1/S2/S3/N1/N2 | Rating string (e.g. "S1 — Highly Suitable") | pH, rooting depth, drainage, AWC, salinity, CEC, topography, thermal regime | All sites |
| USDA Land Capability | Class I-VIII + subclass | Rating string (e.g. "Class IIe — Suited to cultivation") | Slope, drainage, soil depth, texture, erosion hazard, salinity, climate, drought susceptibility | All sites |
| Canada Soil Capability | Class 1-7 + subclass (T/W/D/E/F/M/R) | Rating string (e.g. "Class 2W — Minor limitations, wetness") | Same 8 limitations as USDA LCC with AAFC thresholds | CA sites only |

## Sprint History
| Sprint | Components Added | Total After |
|--------|-----------------|-------------|
| Initial | 5 base dimensions (~65 components) | ~65 |
| Sprint B | pH, CEC, AWC, soil fertility, salinity penalty | ~75 |
| Sprint C | Koppen zone, GDD heat accumulation | ~77 |
| Sprint D | FAO S1-N2 (8 factors), USDA LCC (8 limitations) | ~93 |
| Sprint F | PET/aridity, irrigation requirement, rainwater harvesting, drainage density | ~97 |
| Sprint G | CaCO3, Ksat, bulk density, hardiness zone + pH bug fix (3 sites) | ~108 |
| Sprint I | LGP (agri suitability), carbon stock (regenerative potential), Canada Soil Capability (8 limitations, CA only) | ~118 |
| Sprint J | Soil degradation risk (stewardship), wind energy potential (stewardship) | ~120 |
| Sprint K | Hospital/road/grid/market proximity (buildability), masjid proximity (stewardship), solar PV potential (stewardship) | ~126 |
| Sprint L | Protected area proximity (habitat), water supply proximity (buildability) + 8 infrastructure assessment rules | ~129 |
| Sprint M | Tier 3 integration (terrain_analysis, watershed_derived, microclimate, soil_regeneration components across all 7 scores), Community Suitability new dimension (6 census components), groundwater depth (Water Resilience), water quality pH (Water Resilience), calibration fixes (WEIGHTS sum→1.00, Buildability base 75→60, salinity maxPossible fix), WithConfidence on all outputs | ~143 |
| Sprint O | Superfund proximity penalty (buildability), critical habitat flag penalty (habitat sensitivity) | ~145 |
| Sprint P | Storm events exposure (buildability), crop validation (agricultural suitability + biomass seed) | ~147 |
| Sprint Q | Biomass energy potential (stewardship, from CDL + soils), micro-hydro potential (stewardship, from catchment + elevation) | ~149 |
| Sprint R | Carbon sequestration rate (regenerative potential — IPCC Tier 1: forest pool + wetland pool + soil pool) | ~150 |
| Sprint T | Air quality index (stewardship — EPA EJSCREEN PM2.5/ozone/toxics) | ~151 |
| Sprint U | Seismic hazard penalty (buildability — USGS Design Maps PGA) | ~152 |
| Sprint V | Census demographics wired to Community Suitability (population density, income, education, homeownership, poverty, vacancy) | ~152 |
| Sprint W | Proximity data (additional OSM-derived distances, supplements infrastructure layer) | ~153 |

## Where It's Used
- `apps/web/src/lib/computeScores.ts` — main engine (10-11 scoring functions: 8 weighted + 2-3 classification)
- `apps/web/src/lib/cropMatching.ts` — crop suitability scoring (9-factor EcoCrop matching, rain-fed vs irrigated)
- `apps/web/src/lib/hydrologyMetrics.ts` — hydrology metric computation (PET, aridity, RWH, irrigation)
- `SiteIntelligencePanel` — displays scores, breakdowns, Hydrology Intelligence, Soil Intelligence, and crop list
- `DecisionSupportPanel` — uses scores for feasibility analysis
- `RegulatoryPanel` — uses flags for compliance assessment
- PDF templates (site_assessment, educational_booklet) — renders scores as gauges

## Constraints
- WithConfidence mixin on all outputs — never present a score without confidence
- AnalysisGuardrails class validates confidence levels and enforces caveats
- "No false certainty" principle — low-confidence scores trigger data gap flags
- `computeVisionFit(projectType, scores)` maps scores to project-type-specific recommendations
- Graceful degradation: absent Tier 3 data contributes 0 points (not inflation)
