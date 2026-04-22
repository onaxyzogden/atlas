# Shared Package
**Type:** package
**Status:** active
**Path:** `packages/shared/`

## Purpose
Zod schemas, type utilities, and constants shared between API and web app. Single source of truth for data validation at every boundary.

## Schemas
| File | Key Exports |
|------|-------------|
| `project.schema.ts` | Country, ProjectType, ProjectStatus, CreateProjectInput, ProjectSummary |
| `assessment.schema.ts` | AssessmentFlag, ScoreCard (extends WithConfidence), SiteAssessment, AIOutput |
| `layer.schema.ts` | FetchStatus, LayerResponse (geojson/raster/wms/summary union) |
| `designFeature.schema.ts` | DesignFeatureType, CreateDesignFeatureInput, DesignFeatureSummary |
| `confidence.schema.ts` | ConfidenceLevel (high/medium/low), WithConfidence mixin |
| `spiritual.schema.ts` | SpiritualZoneType (9 types), QiblaResult |
| `file.schema.ts` | FileType, ProcessingStatus, ProjectFile, FILE_SIZE_LIMITS |
| `export.schema.ts` | ExportType (7 types), CreateExportInput, FinancialPayload, ScenarioPayload, FieldNotesPayload |
| `api.schema.ts` | Common API response types |

## Scoring (subpath `@ogden/shared/scoring`)
- `scoring/types.ts` — `MockLayerResult` is a **discriminated union** keyed on `layerType` (mapped over `LayerType`). The 4 Tier-1 ecological layers (`elevation`, `soils`, `climate`, `wetlands_flood`) have fully-typed summary interfaces (`ElevationSummary`, `SoilsSummary`, `ClimateSummary`, `WetlandsFloodSummary`); the remaining 36 `LayerType` variants fall back to `Record<string, unknown>`. Every typed interface includes `[key: string]: unknown` so the rule engine's dynamic reads stay compilable. Numeric slots are `number | null` — fetchers must write `null` (never `'N/A'` / `'Unknown'`). See [decisions/2026-04-21-scoring-type-contract.md](../decisions/2026-04-21-scoring-type-contract.md).
- `scoring/schemas.ts` — zod schemas mirroring the 4 typed summaries + `validateLayerSummary(layerType, raw)` dispatcher. Per-field `.catch(null)` coerces invalid values to null; `.passthrough()` preserves unknown keys; unmigrated layer types pass through untouched. Consumed by `apps/api/src/services/assessments/SiteAssessmentWriter.ts` as the DB-boundary validator.
- `scoring/computeScores.ts`, `scoring/rules/*`, `scoring/hydrologyMetrics.ts`, `scoring/petModel.ts` — unified scoring engine (web + API share one implementation).

## Utilities
- `lib/caseTransform.ts` — `toCamelCase()` for converting snake_case DB rows to camelCase

## Constants
- `constants/dataSources.ts` — ADAPTER_REGISTRY (7 layers x 2 countries = 14 adapters)
- `constants/flags.ts` — 8 feature flags (gated by env vars)

## Dependencies
Only `zod` — no runtime dependencies.

## Notes
- All schemas use strict Zod validation
- `WithConfidence` mixin applied to all analysis outputs
- Export from barrel `src/index.ts` — always add new schemas here
