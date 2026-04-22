/**
 * Scoring-module shared types.
 *
 * `MockLayerResult` is the input shape consumed by computeAssessmentScores
 * and the rule engine. The name is historical: the shape originated in the
 * web app's mockLayerData.ts but is also the adapter target for API callers
 * that read real `project_layers` rows (apps/api/src/services/assessments/
 * SiteAssessmentWriter.ts → layerRowsToMockLayers).
 *
 * Keeping the type here decouples scoring from web's mock fixtures.
 *
 * The `summary` field is a discriminated union keyed on `layerType`. For the
 * four Tier-1 ecological layers (elevation / soils / climate / wetlands_flood)
 * the shape is fully typed: fetchers MUST write `null` — not the strings
 * 'N/A' / 'Unknown' / 'Estimated' — into numeric slots, so dashboards can
 * guard once on `x == null` without defensive parseFloat gymnastics.
 *
 * Remaining layer types fall back to `Record<string, unknown>` and can be
 * tightened incrementally without breaking this contract.
 */

import type { LayerType } from '../constants/dataSources.js';

/** Raster tile payload emitted by high-resolution elevation fetchers. */
export interface RasterTile {
  width: number;
  height: number;
  bbox: [number, number, number, number];
  resolution_m: number;
  noDataValue: number;
  data: number[];
}

export interface ElevationSummary {
  /** Rule engine reads dynamic keys from every layer; keep a fallback to unknown. */
  [key: string]: unknown;
  min_elevation_m: number | null;
  max_elevation_m: number | null;
  mean_elevation_m: number | null;
  mean_slope_deg: number | null;
  max_slope_deg: number | null;
  predominant_aspect: string | null;
  dem_resolution_m?: number | null;
  datum?: string | null;
  datum_offset_applied?: number | null;
  original_datum?: string | null;
  rasterUrl?: string | null;
  raster_tile?: RasterTile | null;
}

export interface SoilsSummary {
  [key: string]: unknown;
  predominant_texture: string | null;
  soil_name?: string | null;
  drainage_class: string | null;
  organic_matter_pct: number | null;
  /** Narrative pH range (e.g. "6.0 - 7.0"). Numeric value lives in `ph_value`. */
  ph_range: string | null;
  ph_value?: number | null;
  hydrologic_group: string | null;
  farmland_class: string | null;
  depth_to_bedrock_m: number | null;
  taxonomic_order?: string | null;
  // Sprint B — extended properties, all nullable
  cec_meq_100g?: number | null;
  ec_ds_m?: number | null;
  bulk_density_g_cm3?: number | null;
  ksat_um_s?: number | null;
  awc_cm_cm?: number | null;
  rooting_depth_cm?: number | null;
  clay_pct?: number | null;
  silt_pct?: number | null;
  sand_pct?: number | null;
  caco3_pct?: number | null;
  sodium_adsorption_ratio?: number | null;
  kfact?: number | null;
  coarse_fragment_pct?: number | null;
  /** Base saturation % by NH4OAc pH 7.0 method (SSURGO `basesat_r`). Pairs with `cec_meq_100g` which uses the same pH 7 extraction. */
  base_saturation_pct?: number | null;
  texture_class?: string | null;
  fertility_index?: number | null;
  salinization_risk?: string | null;
  component_count?: number | null;
}

export interface ClimateMonthlyNormal {
  month: number;
  mean_max_c: number | null;
  mean_min_c: number | null;
  precip_mm: number;
}

export interface ClimateSummary {
  [key: string]: unknown;
  annual_precip_mm: number | null;
  annual_temp_mean_c: number | null;
  temp_min_coldest_month_c?: number | null;
  temp_max_warmest_month_c?: number | null;
  growing_season_days: number | null;
  first_frost_date?: string | null;
  last_frost_date?: string | null;
  hardiness_zone: string | null;
  growing_degree_days_base10c?: number | null;
  prevailing_wind: string | null;
  annual_sunshine_hours: number | null;
  noaa_station?: string | null;
  noaa_station_distance_km?: number | null;
  koppen_classification: string | null;
  koppen_label: string | null;
  freeze_thaw_cycles_per_year: number | null;
  snow_months: number | null;
  solar_radiation_kwh_m2_day: number | null;
  solar_radiation_monthly: number[] | null;
  /** Opaque payload stashed for downstream consumers (ET/PET, wind rose viz). */
  _monthly_normals?: unknown;
  _wind_rose?: unknown;
}

export interface WetlandsFloodSummary {
  [key: string]: unknown;
  flood_zone: string | null;
  flood_risk: string | null;
  base_flood_elevation_ft?: number | null;
  static_bfe_ft?: number | null;
  fema_panel?: string | null;
  wetland_pct: number | null;
  wetland_types: string[];
  wetland_count?: number | null;
  wetland_area_ha?: number | null;
  has_significant_wetland?: boolean | null;
  /** Numeric buffer width (metres). Narrative overrides go in `riparian_buffer_note`. */
  riparian_buffer_m: number | null;
  riparian_buffer_note?: string | null;
  /** Narrative regulated-area status (e.g. "Yes — SFHA restrictions apply"). */
  regulated_area_pct: string | null;
  conservation_authority?: string | null;
}

export interface WatershedSummary {
  [key: string]: unknown;
  huc_code: string | null;
  watershed_name: string | null;
  /** Numeric metres to nearest stream. Narrative overrides (e.g. "Estimated") live in `nearest_stream_note`. */
  nearest_stream_m: number | null;
  nearest_stream_note?: string | null;
  stream_order: number | null;
  catchment_area_ha: number | null;
  flow_direction: string | null;
}

export interface LandCoverSummary {
  [key: string]: unknown;
  primary_class: string | null;
  /** Per-label percentage distribution summing to ~100. */
  classes: Record<string, number> | null;
  tree_canopy_pct: number | null;
  impervious_pct: number | null;
  // Optional per-adapter extras (WorldCover derives all five; NLCD/AAFC a subset).
  cropland_pct?: number | null;
  urban_pct?: number | null;
  wetland_pct?: number | null;
  water_pct?: number | null;
  sample_count?: number | null;
  nlcd_code?: number | null;
  aafc_code?: number | null;
  worldcover_code?: number | null;
}

/** Map of layer types with a fully-typed summary shape. */
export interface TypedLayerSummary {
  elevation: ElevationSummary;
  soils: SoilsSummary;
  climate: ClimateSummary;
  wetlands_flood: WetlandsFloodSummary;
  watershed: WatershedSummary;
  land_cover: LandCoverSummary;
}

/** Summary shape for an arbitrary LayerType — typed where we know it, `Record<string, unknown>` otherwise. */
export type LayerSummaryFor<K extends LayerType> =
  K extends keyof TypedLayerSummary ? TypedLayerSummary[K] : Record<string, unknown>;

interface MockLayerResultBase {
  fetchStatus: 'complete' | 'pending' | 'failed' | 'unavailable';
  confidence: 'high' | 'medium' | 'low';
  dataDate: string;
  sourceApi: string;
  attribution: string;
}

/**
 * Discriminated union on `layerType`. Narrowing via `layer.layerType === 'wetlands_flood'`
 * gives callers a fully-typed `summary`. Unmigrated types retain `Record<string, unknown>`.
 */
export type MockLayerResult = {
  [K in LayerType]: MockLayerResultBase & {
    layerType: K;
    summary: LayerSummaryFor<K>;
  }
}[LayerType];
