/**
 * Mock Tier 1 data provider — generates realistic-looking layer data
 * for the LayerPanel and map visualization without requiring the API.
 *
 * When the real API is connected, this module is bypassed entirely.
 * Each layer type returns mock GeoJSON features that can be rendered
 * on the Mapbox map.
 */

import type { LayerType } from '@ogden/shared';

export interface MockLayerResult {
  layer_type: LayerType;
  fetch_status: 'complete' | 'pending' | 'failed' | 'unavailable';
  confidence: 'high' | 'medium' | 'low';
  data_date: string;
  source_api: string;
  attribution: string;
  summary: Record<string, unknown>;
}

/**
 * Generate mock layer results for all 7 Tier 1 types.
 * Uses the project's country to pick US vs CA data sources.
 */
export function generateMockLayers(country: 'US' | 'CA'): MockLayerResult[] {
  const now = new Date().toISOString().split('T')[0]!;

  return [
    {
      layer_type: 'elevation',
      fetch_status: 'complete',
      confidence: 'high',
      data_date: now,
      source_api: country === 'US' ? 'USGS 3DEP' : 'NRCan HRDEM',
      attribution: country === 'US' ? 'U.S. Geological Survey' : 'Natural Resources Canada',
      summary: {
        min_elevation_m: 185,
        max_elevation_m: 312,
        mean_elevation_m: 247,
        mean_slope_deg: 8.4,
        max_slope_deg: 32.1,
        predominant_aspect: 'SE',
      },
    },
    {
      layer_type: 'soils',
      fetch_status: 'complete',
      confidence: 'high',
      data_date: now,
      source_api: country === 'US' ? 'SSURGO' : 'Ontario Soil Survey Complex (LIO)',
      attribution: country === 'US' ? 'USDA NRCS' : 'OMAFRA / Ontario Ministry of Natural Resources',
      summary: {
        predominant_texture: country === 'CA' ? 'Clay loam' : 'Loam',
        drainage_class: country === 'CA' ? 'Imperfectly drained' : 'Well drained',
        organic_matter_pct: country === 'CA' ? 3.8 : 3.2,
        ph_range: '6.1 - 6.8',
        hydrologic_group: country === 'CA' ? 'C' : 'B',
        farmland_class: country === 'US' ? 'Prime farmland' : 'Class 2 (CSCS)',
        depth_to_bedrock_m: country === 'CA' ? 'N/A' : 1.8,
      },
    },
    {
      layer_type: 'watershed',
      fetch_status: 'complete',
      confidence: 'medium',
      data_date: now,
      source_api: country === 'US' ? 'NHD Plus' : 'Ontario Hydro Network (LIO)',
      attribution: country === 'US' ? 'USGS' : 'Ontario Ministry of Natural Resources and Forestry',
      summary: {
        huc_code: country === 'US' ? '041001020304' : 'N/A',
        watershed_name: country === 'US' ? 'Upper Susquehanna' : 'Sixteen Mile Creek',
        nearest_stream_m: country === 'CA' ? 380 : 420,
        stream_order: 2,
        catchment_area_ha: country === 'CA' ? 'N/A' : 845,
        flow_direction: 'SE to NW',
      },
    },
    {
      layer_type: 'wetlands_flood',
      fetch_status: 'complete',
      confidence: 'medium',
      data_date: now,
      source_api: country === 'US' ? 'NWI + FEMA NFHL' : 'Conservation Authority',
      attribution: country === 'US' ? 'USFWS / FEMA' : 'Conservation Halton',
      summary: {
        flood_zone: country === 'US' ? 'Zone X (minimal risk)' : 'Not regulated',
        wetland_pct: 4.2,
        wetland_types: ['PEM1 (Emergent)', 'PFO1 (Forested)'],
        riparian_buffer_m: 30,
        regulated_area_pct: 12.5,
      },
    },
    {
      layer_type: 'land_cover',
      fetch_status: 'complete',
      confidence: 'high',
      data_date: now,
      source_api: country === 'US' ? 'NLCD 2021' : 'AAFC Annual Crop Inventory 2024',
      attribution: country === 'US' ? 'USGS EROS' : 'Agriculture and Agri-Food Canada',
      summary: {
        ...(country === 'CA' ? { primary_class: 'Soybeans', aafc_code: 3 } : {}),
        classes: country === 'CA' ? {
          'Soybeans': 50,
          'Seeded Forage': 20,
          'Deciduous Forest': 12,
          'Wetland': 8,
          'Developed, Low': 6,
          'Grassland': 4,
        } : {
          'Deciduous Forest': 35,
          'Cultivated Cropland': 28,
          'Pasture/Hay': 18,
          'Developed, Low': 8,
          'Shrub/Scrub': 6,
          'Open Water': 3,
          'Wetland': 2,
        },
        tree_canopy_pct: country === 'CA' ? 2 : 38,
        impervious_pct: country === 'CA' ? 3 : 5,
      },
    },
    {
      layer_type: 'climate',
      fetch_status: 'complete',
      confidence: 'high',
      data_date: now,
      source_api: country === 'US' ? 'NOAA Climate Normals' : 'ECCC Climate Normals (OGC API)',
      attribution: country === 'US' ? 'NOAA NCEI' : 'Environment and Climate Change Canada',
      summary: {
        annual_precip_mm: country === 'CA' ? 860 : 920,
        annual_temp_mean_c: country === 'CA' ? 7.2 : 8.4,
        growing_season_days: 165,
        first_frost_date: 'Oct 12',
        last_frost_date: 'Apr 28',
        hardiness_zone: country === 'US' ? '6b' : '5b',
        prevailing_wind: 'W-SW',
        annual_sunshine_hours: 2050,
      },
    },
    {
      layer_type: 'zoning',
      fetch_status: 'complete',
      confidence: 'low',
      data_date: now,
      source_api: country === 'US' ? 'County GIS' : 'Ontario Municipal GIS',
      attribution: 'Municipal planning department',
      summary: {
        zoning_code: country === 'US' ? 'A-1 (Agricultural)' : 'A (Agricultural)',
        permitted_uses: ['Single family dwelling', 'Farm operation', 'Home occupation'],
        conditional_uses: ['Bed and breakfast', 'Agritourism', 'Farm winery'],
        min_lot_size_ac: 10,
        front_setback_m: 15,
        side_setback_m: 6,
        rear_setback_m: 10,
        max_building_height_m: 10.5,
        max_lot_coverage_pct: 25,
      },
    },
  ];
}

/**
 * Get display-friendly summary text for a layer's data.
 */
export function getLayerSummaryText(result: MockLayerResult): string[] {
  const s = result.summary;
  const lines: string[] = [];

  switch (result.layer_type) {
    case 'elevation':
      lines.push(`Elevation: ${s['min_elevation_m']}–${s['max_elevation_m']}m`);
      lines.push(`Mean slope: ${s['mean_slope_deg']}°, Aspect: ${s['predominant_aspect']}`);
      break;
    case 'soils':
      lines.push(`${s['predominant_texture']}, ${s['drainage_class']}`);
      lines.push(`pH ${s['ph_range']}, OM ${s['organic_matter_pct']}%`);
      lines.push(`${s['farmland_class']}`);
      break;
    case 'watershed':
      lines.push(`${s['watershed_name']}`);
      lines.push(`Nearest stream: ${s['nearest_stream_m']}m`);
      lines.push(`Flow: ${s['flow_direction']}`);
      break;
    case 'wetlands_flood':
      lines.push(`Flood: ${s['flood_zone']}`);
      lines.push(`Wetland: ${s['wetland_pct']}% of area`);
      lines.push(`Regulated: ${s['regulated_area_pct']}%`);
      break;
    case 'land_cover':
      lines.push(`Tree canopy: ${s['tree_canopy_pct']}%`);
      lines.push(`Impervious: ${s['impervious_pct']}%`);
      break;
    case 'climate':
      lines.push(`${s['annual_temp_mean_c']}°C avg, ${s['annual_precip_mm']}mm/yr`);
      lines.push(`Growing season: ${s['growing_season_days']} days`);
      lines.push(`Zone ${s['hardiness_zone']}`);
      break;
    case 'zoning':
      lines.push(`${s['zoning_code']}`);
      lines.push(`Min lot: ${s['min_lot_size_ac']} ac`);
      break;
  }

  return lines;
}
