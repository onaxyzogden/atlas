# Scoring Engine

## Summary
Client-side scoring engine that computes 5 assessment dimensions (0-100 each) from geospatial layer data. Each score carries a confidence level (high/medium/low) based on data source quality.

## How It Works
1. `computeAssessmentScores(layers, acreage)` receives cached layer data from `siteDataStore`
2. Each dimension has sub-factors extracted from relevant layers
3. Sub-factor scores are weighted and combined into dimension scores
4. Confidence is the minimum confidence across contributing data sources
5. Flags are generated for risks, opportunities, limitations, and data gaps

## Dimensions
| Dimension | Key Factors | Layer Sources |
|-----------|-------------|---------------|
| Overall | Weighted average of all dimensions | All |
| Suitability | Soil quality, drainage, slope, terrain | soils, elevation |
| Buildability | Slope, flood risk, soil bearing capacity | elevation, wetlands |
| Water Resilience | Drainage class, flood zones, watershed position | watershed, wetlands, soils |
| Agricultural Potential | Soil organic matter, growing season, drainage | soils, climate, land_cover |

## Where It's Used
- `apps/web/src/lib/computeScores.ts` — main engine
- `SiteIntelligencePanel` — displays scores and breakdowns
- `DecisionSupportPanel` — uses scores for feasibility analysis
- `RegulatoryPanel` — uses flags for compliance assessment
- PDF templates (site_assessment, educational_booklet) — renders scores as gauges

## Constraints
- WithConfidence mixin on all outputs — never present a score without confidence
- AnalysisGuardrails class validates confidence levels and enforces caveats
- "No false certainty" principle — low-confidence scores trigger data gap flags
- `computeVisionFit(projectType, scores)` maps scores to project-type-specific recommendations
