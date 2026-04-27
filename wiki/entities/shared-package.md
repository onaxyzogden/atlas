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

## Utilities
- `lib/caseTransform.ts` — `toCamelCase()` for converting snake_case DB rows to camelCase

## Constants
- `constants/dataSources.ts` — ADAPTER_REGISTRY (7 layers x 2 countries = 14 adapters)
- `constants/flags.ts` — 8 feature flags (gated by env vars)

## Dependencies
Only `zod` — no runtime dependencies.

## Scoring subpath (`@ogden/shared/scoring`)
Subpath export; not re-exported from the main barrel to avoid a cycle with
`AssessmentFlag` from `schemas/assessment.schema.ts`.

| File | Purpose |
|------|---------|
| `computeScores.ts` | `computeAssessmentScores()` — consumed by web and API for identical scoring. `s()` / `num()` / `nested()` belt-and-braces helpers retained. |
| `layerSummary.ts` | **New 2026-04-21.** 41-variant discriminated-union `LayerSummary` keyed by `LayerType`; `LayerSummaryMap` record; `toNum` / `toStr` / `normalizeSummary` boundary coercers that drop `'Unknown'` / `'N/A'` / `''` sentinels to `null`. Closes audit §5.6. |
| `types.ts` | `MockLayerResult` — discriminated union `{ [K in LayerType]: BaseLayerFields & { layerType: K; summary: LayerSummaryMap[K] & Record<string, unknown> } }[LayerType]`. `LayerResultFor<K>` helper. |
| `hydrologyMetrics.ts` | Hydrology scoring submodule. |
| `petModel.ts` | FAO-56 Penman-Monteith + Blaney-Criddle PET dispatcher. |
| `rules/` | Rule engine (`ruleEngine.ts`, `assessmentRules.ts`). |

## Demand subpath (`@ogden/shared/demand`)
**Added 2026-04-27.** Separate entry point — not re-exported from the main
barrel. Source of truth for water + electricity demand coefficients used by
the hydrology engine and the energy/utility/planting dashboards. Decision:
[decisions/2026-04-27-demand-coefficient-tables.md](../decisions/2026-04-27-demand-coefficient-tables.md).

| File | Purpose |
|------|---------|
| `structureDemand.ts` | `STRUCTURE_WATER_GAL_PER_DAY` + `STRUCTURE_KWH_PER_DAY` by `StructureType`; `GREENHOUSE_*_PER_M2_DAY` per-m² rates; `getStructureWaterGalPerDay()` / `getStructureKwhPerDay()` apply `widthM × depthM` for greenhouses and `storiesCount` linearly for others. |
| `utilityDemand.ts` | `UTILITY_KWH_PER_DAY` by `UtilityType` (loads only — generation/storage/passive = 0); `getUtilityKwhPerDay()` honors steward-entered `demandKwhPerDay > 0` override, else falls back to default. |
| `cropDemand.ts` | Per-area-type × class table (`CROP_AREA_GAL_PER_M2_YR`) — orchard medium 110 ≠ market_garden medium 200; `CROP_AREA_TYPICAL_GAL_PER_M2_YR` typical fallback; `getCropAreaDemandGalPerM2Yr()` / `getCropAreaWaterGalYr()` helpers. |
| `rollup.ts` | `sumSiteDemand({ structures, utilities, cropAreas })` → `{ structureWaterGalPerDay, cropWaterGalYr, waterGalYr, electricityKwhPerDay, electricityKwhYr }`. Additive across all three entity sets. |

`hydrologyMetrics.ts` accepts optional `structures`/`utilities`/`cropAreas` on
`HydroInputs`; when any are present, irrigation demand uses the rollup.
When none are passed, the 22%-of-rainfall fallback remains for back-compat.

## Notes
- All schemas use strict Zod validation
- `WithConfidence` mixin applied to all analysis outputs
- Export from barrel `src/index.ts` — always add new schemas here
- The scoring subpath is a separate entry point (`./scoring`); consumers
  import from `@ogden/shared/scoring`, not the root.
- Same convention for `./demand` and `./manifest`.
