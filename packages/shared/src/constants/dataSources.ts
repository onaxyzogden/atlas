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
  | 'soil_regeneration';

/** Tier 1 layer types fetched from external adapters. */
export type Tier1LayerType = Exclude<LayerType, 'infrastructure' | 'watershed_derived' | 'microclimate' | 'soil_regeneration'>;

export interface AdapterConfig {
  adapter: string;
  source: string;
}

export const ADAPTER_REGISTRY: Record<Tier1LayerType, Record<Country, AdapterConfig>> = {
  elevation: {
    US: { adapter: 'UsgsElevationAdapter', source: 'usgs_3dep' },
    CA: { adapter: 'NrcanHrdemAdapter', source: 'nrcan_hrdem' },
  },
  soils: {
    US: { adapter: 'SsurgoAdapter', source: 'ssurgo' },
    CA: { adapter: 'OmafraCanSisAdapter', source: 'omafra_cansis' },
  },
  watershed: {
    US: { adapter: 'NhdAdapter', source: 'nhd' },
    CA: { adapter: 'OhnAdapter', source: 'ontario_hydro_network' },
  },
  wetlands_flood: {
    US: { adapter: 'NwiFemaAdapter', source: 'nwi_fema_nfhl' },
    CA: { adapter: 'ConservationAuthorityAdapter', source: 'conservation_authority' },
  },
  land_cover: {
    US: { adapter: 'NlcdAdapter', source: 'nlcd' },
    CA: { adapter: 'AafcLandCoverAdapter', source: 'aafc_annual_crop' },
  },
  climate: {
    US: { adapter: 'NoaaClimateAdapter', source: 'noaa_normals' },
    CA: { adapter: 'EcccClimateAdapter', source: 'eccc_normals' },
  },
  zoning: {
    US: { adapter: 'UsCountyGisAdapter', source: 'county_gis' },
    CA: { adapter: 'OntarioMunicipalAdapter', source: 'ontario_municipal_gis' },
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
};
