import type { Country } from '../schemas/project.schema.js';

export type LayerType =
  | 'elevation'
  | 'soils'
  | 'watershed'
  | 'wetlands_flood'
  | 'land_cover'
  | 'climate'
  | 'zoning'
  | 'infrastructure'
  | 'watershed_derived'
  | 'microclimate'
  | 'soil_regeneration'
  | 'pollinator_opportunity'
  | 'groundwater'
  | 'water_quality'
  | 'superfund'
  | 'critical_habitat'
  | 'storm_events'
  | 'crop_validation'
  | 'air_quality'
  | 'earthquake_hazard'
  | 'census_demographics'
  | 'proximity_data'
  | 'soilgrids_global'
  | 'biodiversity'
  | 'ust_lust'
  | 'brownfields'
  | 'landfills'
  | 'mine_hazards'
  | 'fuds'
  | 'conservation_easement'
  | 'heritage'
  | 'alr_status'
  | 'aquifer'
  | 'water_stress'
  | 'seasonal_flooding'
  | 'invasive_species'
  | 'native_species'
  | 'land_use_history'
  | 'mineral_rights'
  | 'water_rights'
  | 'gaez_suitability'
  | 'soil_properties';

/** Tier 1 layer types fetched from external adapters. */
export type Tier1LayerType = Exclude<LayerType, 'infrastructure' | 'watershed_derived' | 'microclimate' | 'soil_regeneration' | 'pollinator_opportunity' | 'water_quality' | 'superfund' | 'critical_habitat' | 'storm_events' | 'crop_validation' | 'air_quality' | 'earthquake_hazard' | 'census_demographics' | 'proximity_data' | 'soilgrids_global' | 'biodiversity' | 'ust_lust' | 'brownfields' | 'landfills' | 'mine_hazards' | 'fuds' | 'conservation_easement' | 'heritage' | 'alr_status' | 'aquifer' | 'water_stress' | 'seasonal_flooding' | 'invasive_species' | 'native_species' | 'land_use_history' | 'mineral_rights' | 'water_rights' | 'gaez_suitability' | 'soil_properties'>;

export interface AdapterConfig {
  adapter: string;
  source: string;
}

// NOTE: `Partial<Record<Country, AdapterConfig>>` intentionally — not every
// layer has an INTL adapter yet. `resolveAdapter()` in the orchestrator uses
// optional chaining and falls back to `ManualFlagAdapter` for missing combos,
// so leaving an INTL slot undefined is a supported state, not a gap.
export const ADAPTER_REGISTRY: Record<Tier1LayerType, Partial<Record<Country, AdapterConfig>>> = {
  elevation: {
    US: { adapter: 'UsgsElevationAdapter', source: 'usgs_3dep' },
    CA: { adapter: 'NrcanHrdemAdapter', source: 'nrcan_hrdem' },
    // INTL: pending SRTM/ALOS adapter
  },
  soils: {
    US: { adapter: 'SsurgoAdapter', source: 'ssurgo' },
    CA: { adapter: 'OmafraCanSisAdapter', source: 'omafra_cansis' },
    // INTL: pending SoilGrids 250m global adapter
  },
  watershed: {
    US: { adapter: 'NhdAdapter', source: 'nhd' },
    CA: { adapter: 'OhnAdapter', source: 'ontario_hydro_network' },
    // INTL: pending HydroSHEDS / HydroRIVERS adapter
  },
  wetlands_flood: {
    US: { adapter: 'NwiFemaAdapter', source: 'nwi_fema_nfhl' },
    CA: { adapter: 'ConservationAuthorityAdapter', source: 'conservation_authority' },
    // INTL: pending GloRiC / GIEMS adapter
  },
  land_cover: {
    US: { adapter: 'NlcdAdapter', source: 'nlcd' },
    CA: { adapter: 'AafcLandCoverAdapter', source: 'aafc_annual_crop' },
    // INTL: pending ESA WorldCover 10m adapter
  },
  climate: {
    US: { adapter: 'NoaaClimateAdapter', source: 'noaa_normals' },
    CA: { adapter: 'EcccClimateAdapter', source: 'eccc_normals' },
    // NasaPower is globally valid (grid-interpolated). Registered 2026-04-22
    // to unlock non-US/non-CA projects. US/CA still prefer station-based
    // NOAA/ECCC primaries and only use fetchNasaPowerSummary as enrichment.
    INTL: { adapter: 'NasaPowerAdapter', source: 'nasa_power' },
  },
  zoning: {
    US: { adapter: 'UsCountyGisAdapter', source: 'county_gis' },
    CA: { adapter: 'OntarioMunicipalAdapter', source: 'ontario_municipal_gis' },
    // INTL: no global zoning source — ManualFlagAdapter fallback documented.
  },
  groundwater: {
    US: { adapter: 'NwisGroundwaterAdapter', source: 'usgs_nwis' },
    CA: { adapter: 'PgmnGroundwaterAdapter', source: 'ontario_pgmn' },
    // Global fallback registered 2026-05-04 per ADR
    // 2026-05-04-igrac-global-groundwater-fallback. Reads from local PostGIS
    // table populated by quarterly ingest job; medium-confidence reflecting
    // national-agency reporting cadence (1-3 year vintage drift).
    INTL: { adapter: 'IgracGroundwaterAdapter', source: 'igrac_ggis' },
  },
};

// Conservation Authority registry (Ontario)
// Keys are Ontario census division codes
export interface ConservationAuthorityInfo {
  name: string;
  shortCode: string;
  endpoint: string | null; // null = ManualFlagAdapter
}

export const CONSERVATION_AUTHORITY_REGISTRY: Record<string, ConservationAuthorityInfo> = {
  '3520': {
    name: 'Conservation Halton',
    shortCode: 'CH',
    endpoint: 'https://maps.conservationhalton.ca/arcgis/rest/services',
  },
  '3521': {
    name: 'Credit Valley Conservation',
    shortCode: 'CVC',
    endpoint: 'https://maps.creditvalleyca.ca/arcgis/rest/services',
  },
  '3518': {
    name: 'Toronto and Region Conservation Authority',
    shortCode: 'TRCA',
    endpoint: 'https://maps.trca.ca/arcgis/rest/services',
  },
  // Additional CAs added progressively
};

export const LAYER_TYPES = Object.keys(ADAPTER_REGISTRY) as Tier1LayerType[];

export const DATA_COMPLETENESS_WEIGHTS: Partial<Record<LayerType, number>> = {
  soils: 0.20,
  elevation: 0.15,
  watershed: 0.15,
  wetlands_flood: 0.15,
  zoning: 0.15,
  land_cover: 0.10,
  climate: 0.10,
  // Derived layers do not contribute to Tier 1 completeness
  // Sprint M: direct-fetch layers (US-only federal APIs)
  groundwater: 0.04,
  water_quality: 0.04,
  // Sprint O: environmental risk + ecological layers
  superfund: 0.03,
  critical_habitat: 0.03,
  // Sprint P: climate resilience + crop validation
  storm_events: 0.03,
  crop_validation: 0.03,
  // Sprint T: air quality (EPA EJSCREEN)
  air_quality: 0.03,
  // Sprint U: seismic hazard (USGS Design Maps)
  earthquake_hazard: 0.03,
  // Sprint V: census demographics (US Census Bureau ACS)
  census_demographics: 0.02,
  // Sprint W: proximity data (OSM Overpass)
  proximity_data: 0.02,
};
