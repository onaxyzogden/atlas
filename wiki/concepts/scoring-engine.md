# Scoring Engine

## Summary
Client-side scoring engine that computes **7 weighted assessment dimensions + 2 formal classification systems** (9 total scoring functions, ~108 scoring components) from geospatial layer data. Each score is 0-100 with a confidence level (high/medium/low) based on data source quality. The two classification systems (FAO S1-N2, USDA LCC I-VIII) carry weight 0 — they appear in dashboards but don't affect the overall site score.

## How It Works
1. `computeAssessmentScores(layers, acreage)` receives cached layer data from `siteDataStore`
2. Each scoring function extracts sub-factors from relevant layers using `num()`, `str()`, `nested()` helpers
3. Sub-factors are scored via `comp(name, value, maxPossible, sourceLayer, confidence)` and collected into a `ScoreComponent[]` array
4. `buildResult(label, basePoints, components)` normalises raw points to 0-100, determines rating tier, and attaches the full breakdown
5. Confidence is the minimum confidence across all contributing data sources
6. `computeOverallScore()` computes the weighted average of the 7 weighted dimensions (FAO + USDA excluded at weight 0)
7. `evaluateAssessmentRules()` generates flags for risks, opportunities, limitations, and data gaps

## Dimensions

### 7 Weighted Assessment Dimensions
| Dimension | Weight | Key Factors | Layer Sources |
|-----------|--------|-------------|---------------|
| Water Resilience | 15% | Drainage class, flood zones, watershed position, PET, aridity index, rainwater harvesting, irrigation requirement | watershed, wetlands, soils, climate |
| Agricultural Suitability | 15% | pH, CEC, AWC, CaCO3, Ksat, bulk density, organic matter, drainage, slope, texture, GDD, hardiness zone | soils, climate, elevation |
| Regenerative Potential | 15% | Organic matter, biodiversity indicators, carbon sequestration capacity, soil health trends | soils, land_cover, climate |
| Buildability | 12% | Slope, flood risk, soil bearing capacity, terrain ruggedness, access grade | elevation, wetlands, soils |
| Habitat Sensitivity | 10% | Wetland proximity, endangered species habitat, riparian buffers, land cover type | wetlands, land_cover, watershed |
| Stewardship Readiness | 18% | Soil fertility, salinity penalty, erosion hazard, conservation practice potential | soils, elevation, climate |
| Design Complexity | 15% | Slope variability, terrain complexity, access constraints, zoning conflicts (inverted — high complexity reduces overall score) | elevation, soils, land_cover |

### 2 Formal Classification Systems (weight 0)
| Classification | Standard | Output | Key Factors |
|----------------|----------|--------|-------------|
| FAO Suitability | S1/S2/S3/N1/N2 | Rating string (e.g. "S1 — Highly Suitable") | pH, rooting depth, drainage, AWC, salinity, CEC, topography, thermal regime |
| USDA Land Capability | Class I-VIII + subclass | Rating string (e.g. "Class IIe — Suited to cultivation") | Slope, drainage, soil depth, texture, erosion hazard, salinity, climate, drought susceptibility |

## Sprint History
| Sprint | Components Added | Total After |
|--------|-----------------|-------------|
| Initial | 5 base dimensions (~65 components) | ~65 |
| Sprint B | pH, CEC, AWC, soil fertility, salinity penalty | ~75 |
| Sprint C | Koppen zone, GDD heat accumulation | ~77 |
| Sprint D | FAO S1-N2 (8 factors), USDA LCC (8 limitations) | ~93 |
| Sprint F | PET/aridity, irrigation requirement, rainwater harvesting, drainage density | ~97 |
| Sprint G | CaCO3, Ksat, bulk density, hardiness zone + pH bug fix (3 sites) | ~108 |

## Where It's Used
- `apps/web/src/lib/computeScores.ts` — main engine (all 9 scoring functions)
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
