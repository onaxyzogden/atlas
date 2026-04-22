/**
 * Mock Tier 1 data provider — generates realistic-looking layer data
 * for the LayerPanel and map visualization without requiring the API.
 *
 * When the real API is connected, this module is bypassed entirely.
 * Each layer type returns mock GeoJSON features that can be rendered
 * on the Mapbox map.
 *
 * Sprint X: Extended to cover all 17 LayerTypes (Sprints M–W).
 */

// MockLayerResult type lifted to `@ogden/shared/scoring` (2026-04-21). The
// fixture DATA below stays in web because it's only consumed by the dev-mode
// mock layer service; re-export the type so existing import paths still work.
export type { MockLayerResult } from '@ogden/shared/scoring';
import type { MockLayerResult } from '@ogden/shared/scoring';

/**
 * Generate mock layer results for all 17 LayerTypes.
 * Uses the project's country to pick US vs CA data sources.
 * Federal-API layers (Sprints M–W) are US-only in production; mocks
 * provide fallback estimates for both countries in offline mode.
 */
export function generateMockLayers(country: string): MockLayerResult[] {
  const now = new Date().toISOString().split('T')[0]!;

  return [
    // ── Tier 1 core layers ─────────────────────────────────────────────────
    {
      layerType: 'elevation',
      fetchStatus: 'complete',
      confidence: 'high',
      dataDate: now,
      sourceApi: country === 'US' ? 'USGS 3DEP' : 'NRCan HRDEM',
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
      layerType: 'soils',
      fetchStatus: 'complete',
      confidence: 'high',
      dataDate: now,
      sourceApi: country === 'US' ? 'SSURGO' : 'Ontario Soil Survey Complex (LIO)',
      attribution: country === 'US' ? 'USDA NRCS' : 'OMAFRA / Ontario Ministry of Natural Resources',
      summary: {
        predominant_texture: country === 'CA' ? 'Clay loam' : 'Loam',
        drainage_class: country === 'CA' ? 'Imperfectly drained' : 'Well drained',
        organic_matter_pct: country === 'CA' ? 3.8 : 3.2,
        ph_range: '6.1 - 6.8',
        hydrologic_group: country === 'CA' ? 'C' : 'B',
        farmland_class: country === 'US' ? 'Prime farmland' : 'Class 2 (CSCS)',
        depth_to_bedrock_m: country === 'CA' ? null : 1.8,
        // Sprint S extended SSURGO fields
        bulk_density_g_cm3: 1.35,
        ec_ds_m: 0.28,
        sodium_adsorption_ratio: 1.8,
        rooting_depth_cm: 95,
        fertility_index: 62,
        kfact: 0.24,
      },
    },
    {
      layerType: 'watershed',
      fetchStatus: 'complete',
      confidence: 'medium',
      dataDate: now,
      sourceApi: country === 'US' ? 'NHD Plus' : 'Ontario Hydro Network (LIO)',
      attribution: country === 'US' ? 'USGS' : 'Ontario Ministry of Natural Resources and Forestry',
      summary: {
        huc_code: country === 'US' ? '041001020304' : null,
        watershed_name: country === 'US' ? 'Upper Susquehanna' : 'Sixteen Mile Creek',
        nearest_stream_m: country === 'CA' ? 380 : 420,
        stream_order: 2,
        catchment_area_ha: country === 'CA' ? null : 845,
        flow_direction: 'SE to NW',
      },
    },
    {
      layerType: 'wetlands_flood',
      fetchStatus: 'complete',
      confidence: 'medium',
      dataDate: now,
      sourceApi: country === 'US' ? 'NWI + FEMA NFHL' : 'Conservation Authority',
      attribution: country === 'US' ? 'USFWS / FEMA' : 'Conservation Halton',
      summary: {
        flood_zone: country === 'US' ? 'Zone X (minimal risk)' : 'Not regulated',
        flood_risk: 'low',
        wetland_pct: 4.2,
        wetland_types: ['PEM1 (Emergent)', 'PFO1 (Forested)'],
        riparian_buffer_m: 30,
        regulated_area_pct: '12.5% of parcel',
      },
    },
    {
      layerType: 'land_cover',
      fetchStatus: 'complete',
      confidence: 'high',
      dataDate: now,
      sourceApi: country === 'US' ? 'NLCD 2021' : 'AAFC Annual Crop Inventory 2024',
      attribution: country === 'US' ? 'USGS EROS' : 'Agriculture and Agri-Food Canada',
      summary: {
        primary_class: country === 'CA' ? 'Soybeans' : 'Deciduous Forest',
        ...(country === 'CA' ? { aafc_code: 3 } : {}),
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
      layerType: 'climate',
      fetchStatus: 'complete',
      confidence: 'high',
      dataDate: now,
      sourceApi: country === 'US' ? 'NOAA Climate Normals' : 'ECCC Climate Normals (OGC API)',
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
        koppen_classification: country === 'CA' ? 'Dfb' : 'Cfa',
        koppen_label: country === 'CA' ? 'Warm-summer humid continental' : 'Humid subtropical',
        freeze_thaw_cycles_per_year: country === 'CA' ? 70 : 40,
        snow_months: country === 'CA' ? 4 : 2,
        solar_radiation_kwh_m2_day: 4.2,
        solar_radiation_monthly: null,
      },
    },
    {
      layerType: 'zoning',
      fetchStatus: 'complete',
      confidence: 'low',
      dataDate: now,
      sourceApi: country === 'US' ? 'County GIS' : 'Ontario Municipal GIS',
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

    // ── Sprint Y: OSM Infrastructure Access ──────────────────────────────
    {
      layerType: 'infrastructure',
      fetchStatus: 'complete',
      confidence: 'medium',
      dataDate: now,
      sourceApi: 'OpenStreetMap Overpass API',
      attribution: '© OpenStreetMap contributors',
      summary: {
        road_nearest_km: 1.2,
        road_type: 'secondary',
        power_substation_nearest_km: 7.4,
        hospital_nearest_km: 22.6,
        hospital_name: country === 'US' ? 'Highland District Hospital' : 'Milton District Hospital',
        water_supply_nearest_km: 4.1,
        market_nearest_km: 8.7,
        market_name: country === 'US' ? 'Hillsboro Farmers Market' : 'Milton Farmers Market',
        protected_area_nearest_km: 9.3,
        protected_area_name: country === 'US' ? 'Paint Creek State Park' : 'Rattlesnake Point Conservation Area',
        protected_area_count: 2,
        poi_count: 18,
      },
    },

    // ── Sprint M: USGS NWIS Groundwater ───────────────────────────────────
    {
      layerType: 'groundwater',
      fetchStatus: 'complete',
      confidence: 'medium',
      dataDate: '2024-09-15',
      sourceApi: country === 'US' ? 'USGS NWIS' : 'Provincial Groundwater Survey (est.)',
      attribution: country === 'US'
        ? 'U.S. Geological Survey National Water Information System'
        : 'Provincial groundwater monitoring network (estimated)',
      summary: {
        groundwater_depth_m: 12.5,
        groundwater_depth_ft: 41.0,
        station_nearest_km: 3.2,
        station_name: country === 'US' ? 'USGS 03098600 - Local monitoring well' : 'PGMN Well OW0042',
        station_count: 4,
        measurement_date: '2024-09-15',
      },
    },

    // ── Sprint M: EPA Water Quality Portal ────────────────────────────────
    {
      layerType: 'water_quality',
      fetchStatus: 'complete',
      confidence: 'medium',
      dataDate: '2024-08-20',
      sourceApi: country === 'US' ? 'EPA Water Quality Portal' : 'Ontario Provincial Water Quality (est.)',
      attribution: country === 'US'
        ? 'EPA National Water Quality Monitoring Council'
        : 'Ontario Ministry of the Environment (estimated)',
      summary: {
        ph_value: 7.2,
        ph_date: '2024-08-20',
        dissolved_oxygen_mg_l: 8.4,
        do_date: '2024-08-20',
        nitrate_mg_l: 2.1,
        nitrate_date: '2024-08-20',
        turbidity_ntu: 4.8,
        turbidity_date: '2024-08-20',
        station_nearest_km: 5.8,
        station_name: country === 'US' ? 'Paint Creek at Bainbridge' : 'Credit River @ Norval',
        station_count: 3,
        orgname: country === 'US' ? 'Ohio EPA' : 'Conservation Halton',
        last_measured: '2024-08-20',
      },
    },

    // ── Sprint O: EPA Superfund ────────────────────────────────────────────
    {
      layerType: 'superfund',
      fetchStatus: 'complete',
      confidence: 'high',
      dataDate: now,
      sourceApi: country === 'US' ? 'EPA Envirofacts SEMS' : 'MOE Contaminated Sites (est.)',
      attribution: country === 'US'
        ? 'U.S. Environmental Protection Agency'
        : 'Ontario Ministry of the Environment (estimated)',
      summary: {
        nearest_site_km: 18.4,
        nearest_site_name: country === 'US' ? 'Old Industrial Landfill' : 'Former Agricultural Chemical Depot',
        nearest_site_status: 'NPL Listed',
        nearest_epa_id: country === 'US' ? 'OHD980613781' : 'N/A',
        nearest_city: country === 'US' ? 'Chillicothe, OH' : 'Milton, ON',
        sites_within_radius: 2,
        sites_within_5km: 0,
        sites_within_2km: 0,
      },
    },

    // ── Sprint O: USFWS Critical Habitat ──────────────────────────────────
    {
      layerType: 'critical_habitat',
      fetchStatus: 'complete',
      confidence: 'high',
      dataDate: now,
      sourceApi: country === 'US' ? 'USFWS Critical Habitat' : 'SARA Critical Habitat (est.)',
      attribution: country === 'US'
        ? 'U.S. Fish and Wildlife Service'
        : 'Environment and Climate Change Canada (estimated)',
      summary: {
        on_site: false,
        species_on_site: 0,
        species_nearby: 1,
        species_list: country === 'US'
          ? ['Indiana Bat (Myotis sodalis)']
          : ['Bobolink (Dolichonyx oryzivorus)'],
        primary_species: country === 'US' ? 'Indiana Bat' : 'Bobolink',
        primary_status: country === 'US' ? 'E' : 'Threatened',
      },
    },

    // ── Sprint P: FEMA Disaster Declarations ──────────────────────────────
    {
      layerType: 'storm_events',
      fetchStatus: 'complete',
      confidence: 'high',
      dataDate: now,
      sourceApi: country === 'US' ? 'FEMA Disaster Declarations' : 'Emergency Management (est.)',
      attribution: country === 'US'
        ? 'Federal Emergency Management Agency'
        : 'Public Safety Canada (estimated)',
      summary: {
        state_code: country === 'US' ? 'OH' : 'ON',
        state_name: country === 'US' ? 'Ohio' : 'Ontario',
        county_fips: country === 'US' ? '39071' : null,
        disaster_count_10yr: 7,
        major_disaster_count: 4,
        latest_disaster_date: '2024-03-15',
        latest_disaster_title: country === 'US'
          ? 'OHIO SEVERE STORMS, STRAIGHT-LINE WINDS, AND FLOODING'
          : 'ONTARIO SEVERE STORMS AND FLOODING',
        latest_disaster_type: 'Severe Storm(s)',
        type_breakdown: ['Severe Storm(s) (3)', 'Flood (2)', 'Winter Storm (2)'],
        most_common_type: 'Severe Storm(s)',
      },
    },

    // ── Sprint P: USDA NASS CropScape CDL ─────────────────────────────────
    {
      layerType: 'crop_validation',
      fetchStatus: 'complete',
      confidence: 'high',
      dataDate: '2024-01-01',
      sourceApi: country === 'US' ? 'USDA NASS CropScape CDL' : 'AAFC Annual Crop Inventory (est.)',
      attribution: country === 'US'
        ? 'USDA National Agricultural Statistics Service'
        : 'Agriculture and Agri-Food Canada (estimated)',
      summary: {
        cdl_crop_code: country === 'US' ? 5 : 158,
        cdl_crop_name: country === 'US' ? 'Soybeans' : 'Soybeans',
        cdl_year: 2024,
        land_use_class: 'Row Crop',
        is_agricultural: true,
        is_cropland: true,
      },
    },

    // ── Sprint T: EPA EJSCREEN Air Quality ────────────────────────────────
    {
      layerType: 'air_quality',
      fetchStatus: 'complete',
      confidence: 'high',
      dataDate: now,
      sourceApi: country === 'US' ? 'EPA EJSCREEN' : 'NAPS Air Quality (est.)',
      attribution: country === 'US'
        ? 'U.S. Environmental Protection Agency — EJSCREEN'
        : 'Environment and Climate Change Canada — NAPS (estimated)',
      summary: {
        pm25_ug_m3: 7.8,
        ozone_ppb: 42.3,
        diesel_pm_ug_m3: 0.052,
        traffic_proximity: 8420,
        pm25_national_pct: 38,
        aqi_class: 'Clean',
      },
    },

    // ── Sprint U: USGS Seismic Hazard ─────────────────────────────────────
    {
      layerType: 'earthquake_hazard',
      fetchStatus: 'complete',
      confidence: 'high',
      dataDate: now,
      sourceApi: country === 'US' ? 'USGS Design Maps (ASCE 7-22)' : 'NRCan Seismic Hazard (est.)',
      attribution: country === 'US'
        ? 'U.S. Geological Survey — National Seismic Hazard Model'
        : 'Natural Resources Canada (estimated)',
      summary: {
        pga_g: 0.048,
        ss_g: 0.094,
        s1_g: 0.038,
        sds_g: 0.071,
        sd1_g: 0.058,
        hazard_class: 'Very Low',
        site_class: 'D',
        risk_category: 'II',
      },
    },

    // ── Sprint V: US Census Bureau ACS ────────────────────────────────────
    {
      layerType: 'census_demographics',
      fetchStatus: 'complete',
      confidence: 'high',
      dataDate: '2022-01-01',
      sourceApi: country === 'US' ? 'US Census Bureau ACS 5-Year (2022)' : 'Statistics Canada Census (est.)',
      attribution: country === 'US'
        ? 'U.S. Census Bureau — American Community Survey'
        : 'Statistics Canada (estimated)',
      summary: {
        population: 2847,
        pop_density_km2: 18,
        median_income_usd: country === 'US' ? 58400 : 64200,
        median_age: 43.2,
        rural_class: 'Rural',
        tract_fips: country === 'US' ? '390710201' : null,
        county_name: country === 'US' ? 'Highland County' : 'Halton Region',
      },
    },

    // ── Sprint W: OpenStreetMap Proximity Data ────────────────────────────
    {
      layerType: 'proximity_data',
      fetchStatus: 'complete',
      confidence: 'medium',
      dataDate: now,
      sourceApi: 'OpenStreetMap (Overpass API)',
      attribution: '© OpenStreetMap contributors, ODbL',
      summary: {
        masjid_nearest_km: 12.4,
        masjid_name: country === 'US' ? 'Masjid Al-Rahman' : 'Islamic Society of Milton',
        farmers_market_km: 8.7,
        farmers_market_name: country === 'US' ? 'Hillsboro Farmers Market' : 'Milton Farmers Market',
        nearest_town_km: 3.1,
        nearest_town_name: country === 'US' ? 'Hillsboro' : 'Campbellville',
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

  switch (result.layerType) {
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

    // ── Sprint M ──────────────────────────────────────────────────────────
    case 'groundwater':
      lines.push(`Depth: ${s['groundwater_depth_m']}m (${s['groundwater_depth_ft']}ft)`);
      lines.push(`Station: ${s['station_name']}`);
      lines.push(`Nearest: ${s['station_nearest_km']}km, ${s['station_count']} wells`);
      break;
    case 'water_quality': {
      const ph = s['ph_value'];
      const doMgl = s['dissolved_oxygen_mg_l'];
      const nitrate = s['nitrate_mg_l'];
      if (ph != null) lines.push(`pH ${ph}, DO ${doMgl} mg/L`);
      if (nitrate != null) lines.push(`Nitrate: ${nitrate} mg/L`);
      lines.push(`Station: ${s['station_name']} (${s['station_nearest_km']}km)`);
      break;
    }

    // ── Sprint O ──────────────────────────────────────────────────────────
    case 'superfund':
      lines.push(`Nearest: ${s['nearest_site_name']}`);
      lines.push(`${s['nearest_site_km']}km away — ${s['nearest_site_status']}`);
      lines.push(`Within 5km: ${s['sites_within_5km']} sites`);
      break;
    case 'critical_habitat':
      if (s['on_site']) {
        lines.push(`On-site critical habitat detected`);
        lines.push(`${s['species_on_site']} species on parcel`);
      } else {
        lines.push(`No critical habitat on parcel`);
      }
      if ((s['species_nearby'] as number) > 0) {
        lines.push(`Nearby: ${s['primary_species']} (${s['primary_status']})`);
      }
      break;

    // ── Sprint P ──────────────────────────────────────────────────────────
    case 'storm_events':
      lines.push(`${s['disaster_count_10yr']} disasters in 10yr (${s['state_name']})`);
      lines.push(`Most common: ${s['most_common_type']}`);
      if (s['latest_disaster_date']) lines.push(`Latest: ${s['latest_disaster_date']}`);
      break;
    case 'crop_validation':
      lines.push(`${s['cdl_crop_name']} (${s['cdl_year']})`);
      lines.push(`Class: ${s['land_use_class']}`);
      lines.push(s['is_cropland'] ? 'Active cropland' : 'Non-cropland land use');
      break;

    // ── Sprint T ──────────────────────────────────────────────────────────
    case 'air_quality':
      lines.push(`PM2.5: ${s['pm25_ug_m3']} µg/m³ — ${s['aqi_class']}`);
      lines.push(`Ozone: ${s['ozone_ppb']} ppb`);
      if (s['pm25_national_pct'] != null) lines.push(`Nat'l percentile: ${s['pm25_national_pct']}th`);
      break;

    // ── Sprint U ──────────────────────────────────────────────────────────
    case 'earthquake_hazard':
      lines.push(`Hazard class: ${s['hazard_class']}`);
      lines.push(`PGA: ${s['pga_g']}g, Ss: ${s['ss_g']}g`);
      lines.push(`ASCE 7-22 Site Class ${s['site_class']}`);
      break;

    // ── Sprint V ──────────────────────────────────────────────────────────
    case 'census_demographics':
      lines.push(`${s['rural_class']} — ${s['pop_density_km2']} pop/km²`);
      if (s['median_income_usd']) lines.push(`Median income: $${(s['median_income_usd'] as number).toLocaleString()}`);
      lines.push(`Median age: ${s['median_age']} — ${s['county_name']}`);
      break;

    // ── Sprint W ──────────────────────────────────────────────────────────
    case 'proximity_data':
      lines.push(`Masjid: ${s['masjid_name']} (${s['masjid_nearest_km']}km)`);
      lines.push(`Market: ${s['farmers_market_name']} (${s['farmers_market_km']}km)`);
      lines.push(`Town: ${s['nearest_town_name']} (${s['nearest_town_km']}km)`);
      break;

    // ── Sprint Y ──────────────────────────────────────────────────────────
    case 'infrastructure':
      lines.push(`Road: ${s['road_nearest_km']}km (${s['road_type']})`);
      lines.push(`Grid: ${s['power_substation_nearest_km']}km, Hospital: ${s['hospital_nearest_km']}km`);
      if ((s['protected_area_count'] as number) > 0) {
        lines.push(`Protected areas: ${s['protected_area_count']} within 25km`);
      }
      break;

    // ── Derived layers (no mock data source) ─────────────────────────────
    case 'watershed_derived':
    case 'microclimate':
    case 'soil_regeneration':
      lines.push('Derived — computed from Tier 1 inputs');
      break;
  }

  return lines;
}
