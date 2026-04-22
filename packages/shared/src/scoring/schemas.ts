/**
 * Runtime validators for the 4 Tier-1 ecological layer summaries.
 *
 * These schemas mirror the compile-time types in `./types.ts` and guard the
 * API's DB-boundary adapter (apps/api/src/services/assessments/
 * SiteAssessmentWriter.ts → layerRowsToMockLayers) against stale jsonb rows
 * that predate the null-over-'N/A' normalization. Without them, a persisted
 * row from before 2026-04-21 can still put strings like 'N/A' / 'Unknown'
 * into slots consumers read as `number`, defeating the typed union.
 *
 * Failure mode is lenient-and-logged: per-field `.catch(null)` coerces bad
 * values to null so the scorer's null-tolerant codepaths take over, and the
 * caller is expected to log the coercion for telemetry. The layer is never
 * dropped — partial data still scores better than no data.
 *
 * Unknown/extra keys pass through (`.passthrough()`) because the rule engine
 * reads dynamic keys off every layer.
 */

import { z } from 'zod';
import type { LayerType } from '../constants/dataSources.js';
import type {
  ClimateSummary,
  ElevationSummary,
  SoilsSummary,
  WetlandsFloodSummary,
} from './types.js';

/** A number-or-null slot that coerces invalid inputs (strings like 'N/A') to null. */
const numOrNull = z.number().nullable().catch(null);
/** A string-or-null slot. `'Unknown'` / `''` stay as-is — they're narrative. */
const strOrNull = z.string().nullable().catch(null);
const boolOrNull = z.boolean().nullable().catch(null);

export const elevationSummarySchema = z
  .object({
    min_elevation_m: numOrNull,
    max_elevation_m: numOrNull,
    mean_elevation_m: numOrNull,
    mean_slope_deg: numOrNull,
    max_slope_deg: numOrNull,
    predominant_aspect: strOrNull,
    dem_resolution_m: numOrNull.optional(),
    datum: strOrNull.optional(),
    datum_offset_applied: numOrNull.optional(),
    original_datum: strOrNull.optional(),
    rasterUrl: strOrNull.optional(),
    raster_tile: z.unknown().optional(),
  })
  .passthrough();

export const soilsSummarySchema = z
  .object({
    predominant_texture: strOrNull,
    soil_name: strOrNull.optional(),
    drainage_class: strOrNull,
    organic_matter_pct: numOrNull,
    ph_range: strOrNull,
    ph_value: numOrNull.optional(),
    hydrologic_group: strOrNull,
    farmland_class: strOrNull,
    depth_to_bedrock_m: numOrNull,
    taxonomic_order: strOrNull.optional(),
    cec_meq_100g: numOrNull.optional(),
    ec_ds_m: numOrNull.optional(),
    bulk_density_g_cm3: numOrNull.optional(),
    ksat_um_s: numOrNull.optional(),
    awc_cm_cm: numOrNull.optional(),
    rooting_depth_cm: numOrNull.optional(),
    clay_pct: numOrNull.optional(),
    silt_pct: numOrNull.optional(),
    sand_pct: numOrNull.optional(),
    caco3_pct: numOrNull.optional(),
    sodium_adsorption_ratio: numOrNull.optional(),
    kfact: numOrNull.optional(),
    coarse_fragment_pct: numOrNull.optional(),
    texture_class: strOrNull.optional(),
    fertility_index: numOrNull.optional(),
    salinization_risk: strOrNull.optional(),
    component_count: numOrNull.optional(),
  })
  .passthrough();

export const climateSummarySchema = z
  .object({
    annual_precip_mm: numOrNull,
    annual_temp_mean_c: numOrNull,
    temp_min_coldest_month_c: numOrNull.optional(),
    temp_max_warmest_month_c: numOrNull.optional(),
    growing_season_days: numOrNull,
    first_frost_date: strOrNull.optional(),
    last_frost_date: strOrNull.optional(),
    hardiness_zone: strOrNull,
    growing_degree_days_base10c: numOrNull.optional(),
    prevailing_wind: strOrNull,
    annual_sunshine_hours: numOrNull,
    noaa_station: strOrNull.optional(),
    noaa_station_distance_km: numOrNull.optional(),
    koppen_classification: strOrNull,
    koppen_label: strOrNull,
    freeze_thaw_cycles_per_year: numOrNull,
    snow_months: numOrNull,
    solar_radiation_kwh_m2_day: numOrNull,
    solar_radiation_monthly: z.array(z.number()).nullable().catch(null),
  })
  .passthrough();

export const wetlandsFloodSummarySchema = z
  .object({
    flood_zone: strOrNull,
    flood_risk: strOrNull,
    base_flood_elevation_ft: numOrNull.optional(),
    static_bfe_ft: numOrNull.optional(),
    fema_panel: strOrNull.optional(),
    wetland_pct: numOrNull,
    wetland_types: z.array(z.string()).catch([]),
    wetland_count: numOrNull.optional(),
    wetland_area_ha: numOrNull.optional(),
    has_significant_wetland: boolOrNull.optional(),
    riparian_buffer_m: numOrNull,
    riparian_buffer_note: strOrNull.optional(),
    regulated_area_pct: strOrNull,
    conservation_authority: strOrNull.optional(),
  })
  .passthrough();

export type ValidationIssue = {
  path: (string | number)[];
  message: string;
  received?: unknown;
};

export type ValidationResult<T> =
  | { ok: true; summary: T; coercions: ValidationIssue[] }
  | { ok: false; issues: ValidationIssue[] };

/**
 * Validate a raw DB `summary_data` jsonb blob against the schema for its
 * layerType. Returns the coerced summary + a list of fields that were
 * coerced from an invalid value to `null` (so the caller can log telemetry).
 *
 * For layer types without a typed schema (the 36 remaining variants), the
 * raw input is passed through unchanged with no coercions reported.
 */
export function validateLayerSummary(
  layerType: LayerType,
  raw: unknown,
): ValidationResult<Record<string, unknown>> {
  const input = (raw ?? {}) as Record<string, unknown>;

  switch (layerType) {
    case 'elevation':
      return runSchema<ElevationSummary>(elevationSummarySchema, input);
    case 'soils':
      return runSchema<SoilsSummary>(soilsSummarySchema, input);
    case 'climate':
      return runSchema<ClimateSummary>(climateSummarySchema, input);
    case 'wetlands_flood':
      return runSchema<WetlandsFloodSummary>(wetlandsFloodSummarySchema, input);
    default:
      return { ok: true, summary: input, coercions: [] };
  }
}

function runSchema<T>(
  schema: z.ZodType<unknown>,
  input: Record<string, unknown>,
): ValidationResult<T> {
  const parsed = schema.parse(input) as Record<string, unknown>;
  const coercions = diffCoercions(input, parsed);
  return { ok: true, summary: parsed as unknown as T, coercions };
}

/**
 * Walk the top-level keys present in the input that the schema knows about.
 * Any field that went from non-null/non-matching in `raw` to `null` in
 * `parsed` is reported as a coercion — i.e., a stale jsonb value the
 * runtime rejected. Extra keys the schema doesn't recognise are ignored
 * (passthrough).
 */
function diffCoercions(
  raw: Record<string, unknown>,
  parsed: Record<string, unknown>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const key of Object.keys(parsed)) {
    const before = raw[key];
    const after = parsed[key];
    if (before !== undefined && before !== null && after === null) {
      issues.push({
        path: [key],
        message: `coerced to null (value did not match schema)`,
        received: before,
      });
    }
  }
  return issues;
}
