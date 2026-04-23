/**
 * `LayerSummary` — discriminated union of the `summary` payload that each
 * `MockLayerResult` carries, keyed by `layerType`.
 *
 * Historical context: `summary` was `Record<string, unknown>`, which let
 * `'Unknown'` / `'N/A'` string sentinels leak into fields that consumers
 * treated as numeric — triggering runtime crashes like
 * `wetland_pct.toFixed is not a function` (audit 2026-04-21 §5.6).
 *
 * Contract:
 *  - Numeric fields are `number | null` — never strings. `null` means the
 *    source did not supply a value. `'Unknown'` / `'N/A'` / empty string /
 *    non-finite numbers are coerced to `null` at the fetcher/adapter
 *    boundary via `normalizeSummary()`.
 *  - String fields are `string | null` with the same coercion.
 *  - Every field is optional (`?`) — source-coverage drift between US / CA
 *    / global adapters means not every variant surface carries every field.
 *
 * Consumers narrow via the discriminant: `if (layer.layerType === 'climate')`
 * → `layer.summary` is typed `ClimateSummary`.
 */

import type { LayerType } from '../constants/dataSources.js';

// ──────────────────────────────────────────────────────────────────────────
// Coercion helpers
// ──────────────────────────────────────────────────────────────────────────

const SENTINELS = new Set(['Unknown', 'N/A', 'unknown', 'n/a', '', 'null', 'undefined']);

/** Coerce a raw summary value to `number | null`.
 *  `'Unknown'`, `'N/A'`, empty/whitespace, undefined, NaN, Infinity → `null`.
 *  Valid finite numbers (including numeric strings) pass through. */
export function toNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (SENTINELS.has(trimmed)) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Coerce a raw summary value to `string | null`. Sentinels → `null`. */
export function toStr(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (SENTINELS.has(trimmed)) return null;
    return v;
  }
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return null;
}

// ──────────────────────────────────────────────────────────────────────────
// Per-variant summary shapes
// ──────────────────────────────────────────────────────────────────────────

export interface ElevationSummary {
  min_elevation_m?: number | null;
  max_elevation_m?: number | null;
  mean_elevation_m?: number | null;
  mean_slope_deg?: number | null;
  max_slope_deg?: number | null;
  predominant_aspect?: string | null;
  dem_resolution_m?: number | null;
  datum?: string | null;
  datum_offset_applied?: boolean;
  original_datum?: string | null;
  rasterUrl?: string | null;
  raster_tile?: unknown;
}

export interface SoilsSummary {
  predominant_texture?: string | null;
  soil_name?: string | null;
  drainage_class?: string | null;
  organic_matter_pct?: number | null;
  ph_range?: string | null;
  ph_value?: number | null;
  hydrologic_group?: string | null;
  farmland_class?: string | null;
  depth_to_bedrock_m?: number | null;
  taxonomic_order?: string | null;
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
  /** Canonical horizon coarse-fragment total from SSURGO `chfrags.fragvol_r`.
   *  Prefer this over `coarse_fragment_pct` when present — the latter is an
   *  aggregate of `chorizon.frag3to10_r + fraggt10_r` that misses fine gravel. */
  coarse_fragment_pct_chfrags?: number | null;
  /** Base saturation — preferred value; source method in `base_saturation_method`. */
  base_saturation_pct?: number | null;
  /** `sum_of_cations` (SSURGO `basesatall_r`) preferred for agricultural assessment;
   *  `nh4oac_ph7` (`basesat_r`) is the taxonomic-classification standard. */
  base_saturation_method?: 'sum_of_cations' | 'nh4oac_ph7' | null;
  texture_class?: string | null;
  fertility_index?: number | null;
  salinization_risk?: string | null;
}

export interface WatershedSummary {
  huc_code?: string | null;
  watershed_name?: string | null;
  nearest_stream_m?: number | null;
  stream_order?: number | null;
  catchment_area_ha?: number | null;
  flow_direction?: string | null;
}

export interface ClimateSummary {
  annual_precip_mm?: number | null;
  annual_temp_mean_c?: number | null;
  growing_season_days?: number | null;
  first_frost_date?: string | null;
  last_frost_date?: string | null;
  hardiness_zone?: string | null;
  koppen_classification?: string | null;
  koppen_label?: string | null;
  prevailing_wind?: string | null;
  annual_sunshine_hours?: number | null;
  freeze_thaw_cycles_per_year?: number | null;
  snow_months?: number | null;
  solar_radiation_kwh_m2_day?: number | null;
  solar_radiation_monthly?: Record<string, number> | number[] | null;
  wind_speed_ms?: number | null;
  relative_humidity_pct?: number | null;
  /** Monthly normals as emitted by NOAA/ECCC/NASA POWER adapters. */
  monthly_normals?: Array<{
    month: number; // 1-12
    precip_mm?: number | null;
    mean_max_c?: number | null;
    mean_min_c?: number | null;
  }> | null;
  _monthly_normals?: unknown;
  _wind_rose?: unknown;
}

export interface WetlandsFloodSummary {
  flood_zone?: string | null;
  flood_risk?: string | null;
  base_flood_elevation_ft?: number | null;
  static_bfe_ft?: number | null;
  fema_panel?: string | null;
  wetland_pct?: number | null;
  wetland_types?: string[];
  wetland_count?: number | null;
  wetland_area_ha?: number | null;
  /** Numeric buffer width in metres, or a narrative string when source only returns text. */
  riparian_buffer_m?: number | string | null;
  /** Percent of site within regulated area, or a narrative string describing regulation. */
  regulated_area_pct?: number | string | null;
  has_significant_wetland?: boolean;
  conservation_authority?: string | null;
}

export interface LandCoverSummary {
  primary_class?: string | null;
  nlcd_code?: number | null;
  aafc_code?: number | null;
  worldcover_code?: number | null;
  classes?: Record<string, number>;
  tree_canopy_pct?: number | null;
  cropland_pct?: number | null;
  urban_pct?: number | null;
  wetland_pct?: number | null;
  water_pct?: number | null;
  impervious_pct?: number | null;
}

export interface ZoningSummary {
  zoning_code?: string | null;
  zoning_description?: string | null;
  permitted_uses?: string[];
  conditional_uses?: string[];
  min_lot_size_ac?: number | null;
  front_setback_m?: number | null;
  side_setback_m?: number | null;
  rear_setback_m?: number | null;
  max_building_height_m?: number | null;
  max_lot_coverage_pct?: number | null;
  county_name?: string | null;
  overlay_districts?: string[];
  official_plan_designation?: string | null;
  municipality?: string | null;
  cli_class?: number | null;
  cli_subclass?: string | null;
  cli_capability?: string | null;
  cli_limitations?: string | null;
  is_agricultural?: boolean;
  // --- Municipal bylaw fields (southern-Ontario municipal registry) ---
  // Populated when the point falls inside a registry-covered municipality
  // (Toronto, Ottawa, Mississauga, Burlington, Barrie as of 2026-04-22).
  // Independent of LIO/CLI provincial fields above.
  municipal_zoning_code?: string | null;
  municipal_zoning_description?: string | null;
  municipal_zone_category?: string | null;
  municipal_bylaw_source?: string | null;
  registry_coverage?: boolean;
}

export interface InfrastructureSummary {
  road_nearest_km?: number | null;
  road_type?: string | null;
  power_substation_nearest_km?: number | null;
  hospital_nearest_km?: number | null;
  hospital_name?: string | null;
  water_supply_nearest_km?: number | null;
  market_nearest_km?: number | null;
  market_name?: string | null;
  protected_area_nearest_km?: number | null;
  protected_area_name?: string | null;
  protected_area_count?: number | null;
  poi_count?: number | null;
  utility_access?: string | null;
}

export interface GroundwaterSummary {
  groundwater_depth_m?: number | null;
  groundwater_depth_ft?: number | null;
  station_nearest_km?: number | null;
  station_name?: string | null;
  station_count?: number | null;
  measurement_date?: string | null;
  regime_class?: string | null;
  heuristic_note?: string | null;
}

export interface WaterQualitySummary {
  ph_value?: number | null;
  ph_date?: string | null;
  dissolved_oxygen_mg_l?: number | null;
  do_date?: string | null;
  nitrate_mg_l?: number | null;
  nitrate_date?: string | null;
  turbidity_ntu?: number | null;
  turbidity_date?: string | null;
  station_nearest_km?: number | null;
  station_name?: string | null;
  station_count?: number | null;
  orgname?: string | null;
  last_measured?: string | null;
}

export interface SuperfundSummary {
  nearest_site_km?: number | null;
  nearest_site_name?: string | null;
  nearest_site_status?: string | null;
  nearest_epa_id?: string | null;
  nearest_city?: string | null;
  sites_within_radius?: number | null;
  sites_within_5km?: number | null;
  sites_within_2km?: number | null;
  federal_site_id?: string | null;
  municipality?: string | null;
  recovery_percent?: number | null;
  contamination_risk?: string | null;
}

export interface UstLustSummary {
  nearest_site_km?: number | null;
  nearest_site_name?: string | null;
  status?: string | null;
  county_name?: string | null;
  epa_id?: string | null;
  sites_within_5km?: number | null;
}

export interface BrownfieldsSummary {
  nearest_site_km?: number | null;
  nearest_site_name?: string | null;
  status?: string | null;
  epa_id?: string | null;
  sites_within_5km?: number | null;
}

export interface LandfillsSummary {
  nearest_site_km?: number | null;
  nearest_site_name?: string | null;
  type?: string | null;
  county_name?: string | null;
  sites_within_radius?: number | null;
}

export interface MineHazardsSummary {
  nearest_site_km?: number | null;
  nearest_site_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  commodity?: string | null;
  usgs_id?: string | null;
}

export interface FudsSummary {
  nearest_site_km?: number | null;
  nearest_site_name?: string | null;
  status?: string | null;
  arm?: string | null;
  sites_within_5km?: number | null;
}

export interface ConservationEasementSummary {
  on_site?: boolean;
  nearest_easement_km?: number | null;
  nearest_easement_name?: string | null;
  org_name?: string | null;
  easement_type?: string | null;
  status?: string | null;
  easements_within_5km?: number | null;
  easements_within_25km?: number | null;
}

export interface HeritageSummary {
  on_site?: boolean;
  nearest_site_km?: number | null;
  nearest_site_name?: string | null;
  site_type?: string | null;
  listing_date?: string | null;
  sites_within_5km?: number | null;
  sites_within_25km?: number | null;
}

export interface AlrStatusSummary {
  on_site?: boolean;
  alr_class?: string | null;
  designation?: string | null;
  jurisdiction?: string | null;
  map_reference?: string | null;
}

export interface AquiferSummary {
  aquifer_name?: string | null;
  aquifer_type?: string | null;
  depth_range_m?: string | null;
  salinity_class?: string | null;
  transmissivity_m2_day?: number | null;
  storage_coefficient?: number | null;
  vulnerability_class?: string | null;
}

export interface WaterStressSummary {
  stress_class?: string | null;
  aridity_index?: number | null;
  water_depletion_rate_mm_year?: number | null;
  groundwater_trend?: string | null;
  surface_water_reliability?: string | null;
  drought_frequency_years?: number | null;
}

export interface SeasonalFloodingSummary {
  flood_probability_pct?: number | null;
  flood_return_period_years?: number | null;
  typical_months?: string[];
  max_depth_m?: number | null;
  inundation_area_ha?: number | null;
  velocity_m_s?: number | null;
}

export interface InvasiveSpeciesSummary {
  species_list?: string[];
  species_count?: number | null;
  nearest_species_km?: number | null;
  nearest_species_name?: string | null;
  habitat_risk?: string | null;
  treatment_programs?: string[];
}

export interface NativeSpeciesSummary {
  species_list?: string[];
  species_count?: number | null;
  nearest_species_km?: number | null;
  nearest_species_name?: string | null;
  conservation_status?: string | null;
}

export interface LandUseHistorySummary {
  primary_use_1900?: string | null;
  primary_use_1950?: string | null;
  primary_use_1980?: string | null;
  primary_use_current?: string | null;
  land_use_transitions?: string[];
  industrial_history?: string | null;
  agricultural_years?: number | null;
}

export interface MineralRightsSummary {
  mineral_owner?: string | null;
  mineral_ownership_pct?: number | null;
  minerals_present?: string[];
  active_claims?: number | null;
  claim_density?: string | null;
  nearest_claim_km?: number | null;
  royalty_status?: string | null;
  federal_lands_pct?: number | null;
}

export interface WaterRightsSummary {
  doctrine_class?: string | null;
  senior_rights_count?: number | null;
  junior_rights_count?: number | null;
  instream_rights?: boolean;
  appropriation_date?: string | null;
  water_source_type?: string | null;
  annual_volume_af?: number | null;
  priority_ranking?: number | null;
}

export interface CriticalHabitatSummary {
  on_site?: boolean;
  species_on_site?: number | null;
  species_nearby?: number | null;
  species_list?: string[];
  primary_species?: string | null;
  primary_status?: string | null;
  listing_date?: string | null;
}

export interface StormEventsSummary {
  state_code?: string | null;
  state_name?: string | null;
  county_fips?: string | null;
  disaster_count_10yr?: number | null;
  major_disaster_count?: number | null;
  latest_disaster_date?: string | null;
  latest_disaster_title?: string | null;
  latest_disaster_type?: string | null;
  type_breakdown?: string[];
  most_common_type?: string | null;
}

export interface CropValidationSummary {
  cdl_crop_code?: number | null;
  cdl_crop_name?: string | null;
  cdl_year?: number | null;
  land_use_class?: string | null;
  is_agricultural?: boolean;
  is_cropland?: boolean;
}

export interface AirQualitySummary {
  pm25_ug_m3?: number | null;
  ozone_ppb?: number | null;
  diesel_pm_ug_m3?: number | null;
  traffic_proximity?: number | null;
  pm25_national_pct?: number | null;
  aqi_class?: string | null;
}

export interface EarthquakeHazardSummary {
  pga_g?: number | null;
  ss_g?: number | null;
  s1_g?: number | null;
  sds_g?: number | null;
  sd1_g?: number | null;
  hazard_class?: string | null;
  site_class?: string | null;
  risk_category?: string | null;
}

export interface CensusDemographicsSummary {
  population?: number | null;
  pop_density_km2?: number | null;
  median_income_usd?: number | null;
  median_age?: number | null;
  rural_class?: string | null;
  tract_fips?: string | null;
  county_name?: string | null;
}

export interface ProximityDataSummary {
  masjid_nearest_km?: number | null;
  masjid_name?: string | null;
  farmers_market_km?: number | null;
  farmers_market_name?: string | null;
  nearest_town_km?: number | null;
  nearest_town_name?: string | null;
}

export interface SoilGridsGlobalSummary {
  soil_type?: string | null;
  clay_pct?: number | null;
  silt_pct?: number | null;
  sand_pct?: number | null;
  organic_carbon_pct?: number | null;
  texture_class?: string | null;
  ph_value?: number | null;
  cec_cmol_kg?: number | null;
}

export interface BiodiversitySummary {
  species_richness?: number | null;
  endemism_index?: number | null;
  iucn_threatened_count?: number | null;
  habitat_diversity?: number | null;
  primary_habitat_type?: string | null;
  protection_status?: string | null;
}

export interface GaezSuitabilitySummary {
  crop_suitability_class?: string | null;
  rainfall_adequacy?: string | null;
  temperature_suitability?: string | null;
  yield_potential_tons_ha?: number | null;
  constraint_factors?: string[];
  adaptation_measures?: string[];
}

export interface SoilPropertiesSummary {
  bulk_density?: number | null;
  porosity?: number | null;
  field_capacity?: number | null;
  wilting_point?: number | null;
  infiltration_rate_mm_hr?: number | null;
}

export interface MicroclimateSummary {
  heat_island_delta_c?: number | null;
  shelter_index?: number | null;
  frost_pocket_risk?: string | null;
  solar_exposure?: string | null;
}

export interface WatershedDerivedSummary {
  flow_accumulation?: number | null;
  twi_mean?: number | null;
  hydrologic_position?: string | null;
  contributing_area_ha?: number | null;
}

export interface SoilRegenerationSummary {
  carbonSequestration?: {
    totalCurrentSOC_tC?: number | null;
    totalPotentialSOC_tC?: number | null;
    totalAnnualSeq_tCyr?: number | null;
    meanSeqPotential?: number | null;
  };
  interventions?: Array<{ name: string; description: string; priority?: string }>;
  regenerationSequence?: string[];
  restorationPriority?: string | null;
}

// ──────────────────────────────────────────────────────────────────────────
// Map + union
// ──────────────────────────────────────────────────────────────────────────

export interface LayerSummaryMap {
  elevation: ElevationSummary;
  soils: SoilsSummary;
  watershed: WatershedSummary;
  wetlands_flood: WetlandsFloodSummary;
  land_cover: LandCoverSummary;
  climate: ClimateSummary;
  zoning: ZoningSummary;
  infrastructure: InfrastructureSummary;
  watershed_derived: WatershedDerivedSummary;
  microclimate: MicroclimateSummary;
  soil_regeneration: SoilRegenerationSummary;
  groundwater: GroundwaterSummary;
  water_quality: WaterQualitySummary;
  superfund: SuperfundSummary;
  critical_habitat: CriticalHabitatSummary;
  storm_events: StormEventsSummary;
  crop_validation: CropValidationSummary;
  air_quality: AirQualitySummary;
  earthquake_hazard: EarthquakeHazardSummary;
  census_demographics: CensusDemographicsSummary;
  proximity_data: ProximityDataSummary;
  soilgrids_global: SoilGridsGlobalSummary;
  biodiversity: BiodiversitySummary;
  ust_lust: UstLustSummary;
  brownfields: BrownfieldsSummary;
  landfills: LandfillsSummary;
  mine_hazards: MineHazardsSummary;
  fuds: FudsSummary;
  conservation_easement: ConservationEasementSummary;
  heritage: HeritageSummary;
  alr_status: AlrStatusSummary;
  aquifer: AquiferSummary;
  water_stress: WaterStressSummary;
  seasonal_flooding: SeasonalFloodingSummary;
  invasive_species: InvasiveSpeciesSummary;
  native_species: NativeSpeciesSummary;
  land_use_history: LandUseHistorySummary;
  mineral_rights: MineralRightsSummary;
  water_rights: WaterRightsSummary;
  gaez_suitability: GaezSuitabilitySummary;
  soil_properties: SoilPropertiesSummary;
}

/** Union of all per-variant summary shapes. */
export type LayerSummary = LayerSummaryMap[LayerType];

// ──────────────────────────────────────────────────────────────────────────
// Per-variant numeric/string field registry
// ──────────────────────────────────────────────────────────────────────────

/** Numeric fields for each variant — `normalizeSummary` runs `toNum` over these.
 *  Anything not listed is passed through unchanged. */
const NUMERIC_KEYS: Record<LayerType, readonly string[]> = {
  elevation: ['min_elevation_m', 'max_elevation_m', 'mean_elevation_m', 'mean_slope_deg', 'max_slope_deg', 'dem_resolution_m'],
  soils: ['organic_matter_pct', 'ph_value', 'depth_to_bedrock_m', 'cec_meq_100g', 'ec_ds_m', 'bulk_density_g_cm3', 'ksat_um_s', 'awc_cm_cm', 'rooting_depth_cm', 'clay_pct', 'silt_pct', 'sand_pct', 'caco3_pct', 'sodium_adsorption_ratio', 'kfact', 'coarse_fragment_pct', 'coarse_fragment_pct_chfrags', 'base_saturation_pct', 'fertility_index'],
  watershed: ['nearest_stream_m', 'stream_order', 'catchment_area_ha'],
  wetlands_flood: ['base_flood_elevation_ft', 'static_bfe_ft', 'wetland_pct', 'wetland_count', 'wetland_area_ha'],
  land_cover: ['nlcd_code', 'aafc_code', 'worldcover_code', 'tree_canopy_pct', 'cropland_pct', 'urban_pct', 'wetland_pct', 'water_pct', 'impervious_pct'],
  climate: ['annual_precip_mm', 'annual_temp_mean_c', 'growing_season_days', 'annual_sunshine_hours', 'freeze_thaw_cycles_per_year', 'snow_months', 'solar_radiation_kwh_m2_day', 'wind_speed_ms', 'relative_humidity_pct'],
  zoning: ['min_lot_size_ac', 'front_setback_m', 'side_setback_m', 'rear_setback_m', 'max_building_height_m', 'max_lot_coverage_pct', 'cli_class'],
  infrastructure: ['road_nearest_km', 'power_substation_nearest_km', 'hospital_nearest_km', 'water_supply_nearest_km', 'market_nearest_km', 'protected_area_nearest_km', 'protected_area_count', 'poi_count'],
  watershed_derived: ['flow_accumulation', 'twi_mean', 'contributing_area_ha'],
  microclimate: ['heat_island_delta_c', 'shelter_index'],
  soil_regeneration: [],
  groundwater: ['groundwater_depth_m', 'groundwater_depth_ft', 'station_nearest_km', 'station_count'],
  water_quality: ['ph_value', 'dissolved_oxygen_mg_l', 'nitrate_mg_l', 'turbidity_ntu', 'station_nearest_km', 'station_count'],
  superfund: ['nearest_site_km', 'sites_within_radius', 'sites_within_5km', 'sites_within_2km', 'recovery_percent'],
  critical_habitat: ['species_on_site', 'species_nearby'],
  storm_events: ['disaster_count_10yr', 'major_disaster_count'],
  crop_validation: ['cdl_crop_code', 'cdl_year'],
  air_quality: ['pm25_ug_m3', 'ozone_ppb', 'diesel_pm_ug_m3', 'traffic_proximity', 'pm25_national_pct'],
  earthquake_hazard: ['pga_g', 'ss_g', 's1_g', 'sds_g', 'sd1_g'],
  census_demographics: ['population', 'pop_density_km2', 'median_income_usd', 'median_age'],
  proximity_data: ['masjid_nearest_km', 'farmers_market_km', 'nearest_town_km'],
  soilgrids_global: ['clay_pct', 'silt_pct', 'sand_pct', 'organic_carbon_pct', 'ph_value', 'cec_cmol_kg'],
  biodiversity: ['species_richness', 'endemism_index', 'iucn_threatened_count', 'habitat_diversity'],
  ust_lust: ['nearest_site_km', 'sites_within_5km'],
  brownfields: ['nearest_site_km', 'sites_within_5km'],
  landfills: ['nearest_site_km', 'sites_within_radius'],
  mine_hazards: ['nearest_site_km', 'latitude', 'longitude'],
  fuds: ['nearest_site_km', 'sites_within_5km'],
  conservation_easement: ['nearest_easement_km', 'easements_within_5km', 'easements_within_25km'],
  heritage: ['nearest_site_km', 'sites_within_5km', 'sites_within_25km'],
  alr_status: [],
  aquifer: ['transmissivity_m2_day', 'storage_coefficient'],
  water_stress: ['aridity_index', 'water_depletion_rate_mm_year', 'drought_frequency_years'],
  seasonal_flooding: ['flood_probability_pct', 'flood_return_period_years', 'max_depth_m', 'inundation_area_ha', 'velocity_m_s'],
  invasive_species: ['species_count', 'nearest_species_km'],
  native_species: ['species_count', 'nearest_species_km'],
  land_use_history: ['agricultural_years'],
  mineral_rights: ['mineral_ownership_pct', 'active_claims', 'nearest_claim_km', 'federal_lands_pct'],
  water_rights: ['senior_rights_count', 'junior_rights_count', 'annual_volume_af', 'priority_ranking'],
  gaez_suitability: ['yield_potential_tons_ha'],
  soil_properties: ['bulk_density', 'porosity', 'field_capacity', 'wilting_point', 'infiltration_rate_mm_hr'],
};

/** String fields that may receive 'Unknown'/'N/A' sentinels — coerced to null. */
const STRING_KEYS_WITH_SENTINELS: Record<LayerType, readonly string[]> = {
  elevation: ['predominant_aspect', 'datum', 'original_datum'],
  soils: ['predominant_texture', 'soil_name', 'drainage_class', 'ph_range', 'hydrologic_group', 'farmland_class', 'taxonomic_order', 'texture_class', 'salinization_risk'],
  watershed: ['huc_code', 'watershed_name', 'flow_direction'],
  wetlands_flood: ['flood_zone', 'flood_risk', 'fema_panel', 'conservation_authority'],
  land_cover: ['primary_class'],
  climate: ['first_frost_date', 'last_frost_date', 'hardiness_zone', 'koppen_classification', 'koppen_label', 'prevailing_wind'],
  zoning: ['zoning_code', 'zoning_description', 'county_name', 'official_plan_designation', 'municipality', 'cli_subclass', 'cli_capability', 'cli_limitations'],
  infrastructure: ['road_type', 'hospital_name', 'market_name', 'protected_area_name', 'utility_access'],
  watershed_derived: ['hydrologic_position'],
  microclimate: ['frost_pocket_risk', 'solar_exposure'],
  soil_regeneration: ['restorationPriority'],
  groundwater: ['station_name', 'measurement_date', 'regime_class', 'heuristic_note'],
  water_quality: ['ph_date', 'do_date', 'nitrate_date', 'turbidity_date', 'station_name', 'orgname', 'last_measured'],
  superfund: ['nearest_site_name', 'nearest_site_status', 'nearest_epa_id', 'nearest_city', 'federal_site_id', 'municipality', 'contamination_risk'],
  critical_habitat: ['primary_species', 'primary_status', 'listing_date'],
  storm_events: ['state_code', 'state_name', 'county_fips', 'latest_disaster_date', 'latest_disaster_title', 'latest_disaster_type', 'most_common_type'],
  crop_validation: ['cdl_crop_name', 'land_use_class'],
  air_quality: ['aqi_class'],
  earthquake_hazard: ['hazard_class', 'site_class', 'risk_category'],
  census_demographics: ['rural_class', 'tract_fips', 'county_name'],
  proximity_data: ['masjid_name', 'farmers_market_name', 'nearest_town_name'],
  soilgrids_global: ['soil_type', 'texture_class'],
  biodiversity: ['primary_habitat_type', 'protection_status'],
  ust_lust: ['nearest_site_name', 'status', 'county_name', 'epa_id'],
  brownfields: ['nearest_site_name', 'status', 'epa_id'],
  landfills: ['nearest_site_name', 'type', 'county_name'],
  mine_hazards: ['nearest_site_name', 'commodity', 'usgs_id'],
  fuds: ['nearest_site_name', 'status', 'arm'],
  conservation_easement: ['nearest_easement_name', 'org_name', 'easement_type', 'status'],
  heritage: ['nearest_site_name', 'site_type', 'listing_date'],
  alr_status: ['alr_class', 'designation', 'jurisdiction', 'map_reference'],
  aquifer: ['aquifer_name', 'aquifer_type', 'depth_range_m', 'salinity_class', 'vulnerability_class'],
  water_stress: ['stress_class', 'groundwater_trend', 'surface_water_reliability'],
  seasonal_flooding: [],
  invasive_species: ['nearest_species_name', 'habitat_risk'],
  native_species: ['nearest_species_name', 'conservation_status'],
  land_use_history: ['primary_use_1900', 'primary_use_1950', 'primary_use_1980', 'primary_use_current', 'industrial_history'],
  mineral_rights: ['mineral_owner', 'claim_density', 'royalty_status'],
  water_rights: ['doctrine_class', 'appropriation_date', 'water_source_type'],
  gaez_suitability: ['crop_suitability_class', 'rainfall_adequacy', 'temperature_suitability'],
  soil_properties: [],
};

/**
 * Normalize a raw summary object produced by a fetcher/adapter into the
 * typed shape for its `layerType`. Runs `toNum` over every known numeric
 * field and `toStr` over every known sentinel-bearing string field. Any
 * other fields (arrays, records, booleans, internal `_*` cache fields)
 * pass through unchanged.
 *
 * This is the single chokepoint that enforces the discriminated-union
 * contract at the boundary between "raw fetcher output" and "typed
 * consumer input". Call it:
 *  - at the exit of `fetchAllLayersInternal` in `apps/web/src/lib/layerFetcher.ts`
 *  - in `generateMockLayers` in `apps/web/src/lib/mockLayerData.ts`
 *  - in `layerRowsToMockLayers` in `apps/api/src/services/assessments/SiteAssessmentWriter.ts`
 */
export function normalizeSummary<K extends LayerType>(
  layerType: K,
  raw: Record<string, unknown> | null | undefined,
): LayerSummaryMap[K] {
  const out: Record<string, unknown> = { ...(raw ?? {}) };
  for (const k of NUMERIC_KEYS[layerType]) {
    if (k in out) out[k] = toNum(out[k]);
  }
  for (const k of STRING_KEYS_WITH_SENTINELS[layerType]) {
    if (k in out) out[k] = toStr(out[k]);
  }
  return out as LayerSummaryMap[K];
}
