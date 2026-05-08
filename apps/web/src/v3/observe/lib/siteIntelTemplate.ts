/**
 * siteIntelTemplate — JSON template builder for the Site Intelligence import
 * flow. The template is a self-describing form: download → fill in offline →
 * upload back. The shape is derived from `LayerSummaryMap` in
 * `@ogden/shared/scoring/layerSummary` so we have a single source of truth.
 *
 * Scope (per plan): the 8 Tier 1 layer types only — elevation, soils,
 * watershed, wetlands_flood, land_cover, climate, zoning, groundwater — plus
 * a top-level `projectNotes` block for the human-knowable LocalProject fields.
 *
 * The output is a plain JSON-serialisable object. No React, no Zod here —
 * validation lives in `siteIntelTemplate.schema.ts`.
 */

import type { LocalProject } from '../../../store/projectStore.js';

export const SCHEMA_VERSION = 1;

export type Tier1ImportLayerType =
  | 'elevation'
  | 'soils'
  | 'watershed'
  | 'wetlands_flood'
  | 'land_cover'
  | 'climate'
  | 'zoning'
  | 'groundwater';

export const TIER1_IMPORT_LAYERS: readonly Tier1ImportLayerType[] = [
  'elevation',
  'soils',
  'watershed',
  'wetlands_flood',
  'land_cover',
  'climate',
  'zoning',
  'groundwater',
];

/** A field spec drives both the empty-template scaffolding and the human-
 *  readable hint that ships next to the value (as a `__hint_<key>` sibling
 *  in the JSON). Only the subset of summary fields that a human can
 *  reasonably fill from desk research / lab results / local knowledge is
 *  exposed — computed-only blobs (e.g. `_wind_rose`) are skipped. */
export interface FieldSpec {
  key: string;
  type: 'number' | 'string' | 'string[]' | 'boolean';
  hint: string;
}

export const LAYER_TEMPLATE_FIELDS: Record<Tier1ImportLayerType, readonly FieldSpec[]> = {
  elevation: [
    { key: 'min_elevation_m', type: 'number', hint: 'Minimum elevation across the parcel, metres above sea level.' },
    { key: 'max_elevation_m', type: 'number', hint: 'Maximum elevation across the parcel, metres above sea level.' },
    { key: 'mean_elevation_m', type: 'number', hint: 'Mean elevation across the parcel, metres above sea level.' },
    { key: 'mean_slope_deg', type: 'number', hint: 'Mean slope of the parcel in degrees.' },
    { key: 'max_slope_deg', type: 'number', hint: 'Steepest slope on the parcel in degrees.' },
    { key: 'predominant_aspect', type: 'string', hint: 'Predominant compass aspect, e.g. "south", "south-east".' },
    { key: 'dem_resolution_m', type: 'number', hint: 'Resolution of the DEM you measured from, metres.' },
    { key: 'datum', type: 'string', hint: 'Vertical datum, e.g. "NAVD88", "CGVD2013".' },
  ],
  soils: [
    { key: 'predominant_texture', type: 'string', hint: 'e.g. "loam", "silty clay loam".' },
    { key: 'soil_name', type: 'string', hint: 'Soil series / mapped name from a survey or sampling.' },
    { key: 'drainage_class', type: 'string', hint: 'e.g. "well drained", "moderately well drained", "poorly drained".' },
    { key: 'organic_matter_pct', type: 'number', hint: 'Soil organic matter, percent (0–100).' },
    { key: 'ph_value', type: 'number', hint: 'Soil pH (typically 4.0–9.0).' },
    { key: 'hydrologic_group', type: 'string', hint: 'NRCS hydrologic group: A, B, C, D.' },
    { key: 'farmland_class', type: 'string', hint: 'e.g. "Prime farmland", "Farmland of statewide importance".' },
    { key: 'depth_to_bedrock_m', type: 'number', hint: 'Depth to bedrock, metres.' },
    { key: 'taxonomic_order', type: 'string', hint: 'Soil taxonomic order, e.g. "Mollisols".' },
    { key: 'cec_meq_100g', type: 'number', hint: 'Cation exchange capacity, meq/100g.' },
    { key: 'clay_pct', type: 'number', hint: 'Clay fraction, percent.' },
    { key: 'silt_pct', type: 'number', hint: 'Silt fraction, percent.' },
    { key: 'sand_pct', type: 'number', hint: 'Sand fraction, percent.' },
    { key: 'rooting_depth_cm', type: 'number', hint: 'Effective rooting depth, centimetres.' },
  ],
  watershed: [
    { key: 'huc_code', type: 'string', hint: 'HUC code (8/10/12 digit) or local watershed identifier.' },
    { key: 'watershed_name', type: 'string', hint: 'Name of the containing watershed.' },
    { key: 'nearest_stream_m', type: 'number', hint: 'Distance to the nearest stream, metres.' },
    { key: 'stream_order', type: 'number', hint: 'Strahler stream order of the nearest stream.' },
    { key: 'catchment_area_ha', type: 'number', hint: 'Upstream catchment area, hectares.' },
    { key: 'flow_direction', type: 'string', hint: 'Predominant flow direction, e.g. "south-west".' },
  ],
  wetlands_flood: [
    { key: 'flood_zone', type: 'string', hint: 'Regulatory flood zone, e.g. "X", "AE", "100-year".' },
    { key: 'flood_risk', type: 'string', hint: 'Free-text risk assessment, e.g. "low", "moderate", "high".' },
    { key: 'base_flood_elevation_ft', type: 'number', hint: 'Base flood elevation, feet.' },
    { key: 'wetland_pct', type: 'number', hint: 'Percent of parcel classified as wetland.' },
    { key: 'wetland_count', type: 'number', hint: 'Count of distinct wetland polygons on/adjacent to parcel.' },
    { key: 'wetland_area_ha', type: 'number', hint: 'Total wetland area on the parcel, hectares.' },
    { key: 'wetland_types', type: 'string[]', hint: 'Wetland classes present, e.g. ["PEM", "PSS"].' },
    { key: 'conservation_authority', type: 'string', hint: 'Regulating conservation authority / agency, if any.' },
  ],
  land_cover: [
    { key: 'primary_class', type: 'string', hint: 'Primary land-cover class, e.g. "deciduous forest", "row crop".' },
    { key: 'tree_canopy_pct', type: 'number', hint: 'Tree canopy cover, percent.' },
    { key: 'cropland_pct', type: 'number', hint: 'Cropland, percent.' },
    { key: 'urban_pct', type: 'number', hint: 'Urban / built-up, percent.' },
    { key: 'wetland_pct', type: 'number', hint: 'Wetland cover, percent.' },
    { key: 'water_pct', type: 'number', hint: 'Open water, percent.' },
    { key: 'impervious_pct', type: 'number', hint: 'Impervious surface, percent.' },
  ],
  climate: [
    { key: 'annual_precip_mm', type: 'number', hint: 'Mean annual precipitation, millimetres.' },
    { key: 'annual_temp_mean_c', type: 'number', hint: 'Mean annual air temperature, degrees Celsius.' },
    { key: 'growing_season_days', type: 'number', hint: 'Length of growing season, days.' },
    { key: 'first_frost_date', type: 'string', hint: 'Average first-frost date (MM-DD or descriptive).' },
    { key: 'last_frost_date', type: 'string', hint: 'Average last-frost date (MM-DD or descriptive).' },
    { key: 'hardiness_zone', type: 'string', hint: 'USDA / Canadian hardiness zone, e.g. "5b".' },
    { key: 'koppen_classification', type: 'string', hint: 'Koppen-Geiger classification, e.g. "Dfb".' },
    { key: 'prevailing_wind', type: 'string', hint: 'Prevailing wind direction, e.g. "west".' },
    { key: 'wind_speed_ms', type: 'number', hint: 'Mean wind speed, metres per second.' },
    { key: 'annual_sunshine_hours', type: 'number', hint: 'Annual sunshine hours.' },
    { key: 'solar_radiation_kwh_m2_day', type: 'number', hint: 'Mean daily solar radiation, kWh/m^2/day.' },
    { key: 'relative_humidity_pct', type: 'number', hint: 'Mean relative humidity, percent.' },
  ],
  zoning: [
    { key: 'zoning_code', type: 'string', hint: 'Local zoning code, e.g. "A1", "RR".' },
    { key: 'zoning_description', type: 'string', hint: 'Plain-language description of the zoning designation.' },
    { key: 'permitted_uses', type: 'string[]', hint: 'List of permitted uses.' },
    { key: 'conditional_uses', type: 'string[]', hint: 'List of conditional / special-permit uses.' },
    { key: 'min_lot_size_ac', type: 'number', hint: 'Minimum lot size, acres.' },
    { key: 'front_setback_m', type: 'number', hint: 'Required front setback, metres.' },
    { key: 'side_setback_m', type: 'number', hint: 'Required side setback, metres.' },
    { key: 'rear_setback_m', type: 'number', hint: 'Required rear setback, metres.' },
    { key: 'max_building_height_m', type: 'number', hint: 'Max building height, metres.' },
    { key: 'max_lot_coverage_pct', type: 'number', hint: 'Max lot coverage, percent.' },
    { key: 'municipality', type: 'string', hint: 'Municipality / jurisdiction.' },
    { key: 'official_plan_designation', type: 'string', hint: 'Official plan / general plan designation.' },
    { key: 'is_agricultural', type: 'boolean', hint: 'true if zoned agricultural; false otherwise.' },
  ],
  groundwater: [
    { key: 'groundwater_depth_m', type: 'number', hint: 'Static water table depth, metres below surface.' },
    { key: 'groundwater_depth_ft', type: 'number', hint: 'Static water table depth, feet below surface.' },
    { key: 'station_name', type: 'string', hint: 'Reference well / monitoring station name.' },
    { key: 'station_nearest_km', type: 'number', hint: 'Distance to nearest monitoring station, kilometres.' },
    { key: 'measurement_date', type: 'string', hint: 'Date of measurement (YYYY-MM-DD).' },
    { key: 'regime_class', type: 'string', hint: 'Aquifer regime, e.g. "confined", "unconfined".' },
    { key: 'heuristic_note', type: 'string', hint: 'Free-text note about the source / method.' },
  ],
};

export const PROJECT_NOTE_KEYS = [
  'address',
  'acreage',
  'ownerNotes',
  'zoningNotes',
  'accessNotes',
  'waterRightsNotes',
  'visionStatement',
] as const;

export type ProjectNoteKey = (typeof PROJECT_NOTE_KEYS)[number];

export interface TemplateLayerEntry {
  include: boolean;
  confidence: 'high' | 'medium' | 'low';
  dataDate: string | null;
  attribution: string;
  summary: Record<string, unknown>;
}

export interface SiteIntelTemplate {
  __meta: {
    schemaVersion: number;
    projectId: string;
    projectName: string;
    country: string;
    units: 'metric' | 'imperial';
    generatedAt: string;
  };
  __instructions: string[];
  projectNotes: Record<ProjectNoteKey, string | number | null>;
  layers: Record<Tier1ImportLayerType, TemplateLayerEntry>;
}

function defaultSummary(layer: Tier1ImportLayerType): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const spec of LAYER_TEMPLATE_FIELDS[layer]) {
    out[`__hint_${spec.key}`] = spec.hint;
    out[spec.key] = spec.type === 'string[]' ? [] : null;
  }
  return out;
}

export function buildTemplate(project: LocalProject, now: Date = new Date()): SiteIntelTemplate {
  const projectNotes: Record<ProjectNoteKey, string | number | null> = {
    address: project.address,
    acreage: project.acreage,
    ownerNotes: project.ownerNotes,
    zoningNotes: project.zoningNotes,
    accessNotes: project.accessNotes,
    waterRightsNotes: project.waterRightsNotes,
    visionStatement: project.visionStatement,
  };

  const layers = {} as Record<Tier1ImportLayerType, TemplateLayerEntry>;
  for (const lt of TIER1_IMPORT_LAYERS) {
    layers[lt] = {
      include: false,
      confidence: 'medium',
      dataDate: null,
      attribution: '',
      summary: defaultSummary(lt),
    };
  }

  return {
    __meta: {
      schemaVersion: SCHEMA_VERSION,
      projectId: project.id,
      projectName: project.name,
      country: project.country,
      units: project.units,
      generatedAt: now.toISOString(),
    },
    __instructions: [
      'This is the Atlas Site Intelligence import template.',
      'For each layer you want to apply, set "include": true.',
      'Fill in the fields you have data for; leave others as null. Unknown fields will be ignored.',
      'When include=true, "attribution" is required (free text describing the source).',
      '"confidence" must be one of: "high", "medium", "low".',
      '"dataDate" should be in YYYY-MM-DD form.',
      'projectNotes overwrite the matching project fields when the value is non-null.',
      'Fields prefixed with __hint_ are documentation only and are ignored on upload.',
    ],
    projectNotes,
    layers,
  };
}

export function templateFilename(projectId: string, projectName: string, now: Date = new Date()): string {
  const slug = (projectName || 'project')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'project';
  const short = projectId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 8) || 'project';
  const yyyy = now.getFullYear().toString();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `atlas-site-intel-${slug}-${short}-${yyyy}${mm}${dd}.json`;
}
