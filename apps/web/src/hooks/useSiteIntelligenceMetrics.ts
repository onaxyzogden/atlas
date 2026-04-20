/**
 * Sprint BQ — `useSiteIntelligenceMetrics`
 *
 * Consolidates the 31 layer-metric `useMemo` declarations that previously
 * lived in `SiteIntelligencePanel.tsx` into a single memoized hook.
 *
 * All extracted metrics share the same shape: `layer.find(by layerType) →
 * fetchStatus guard → cast summary to Record<string, unknown> → typed read →
 * return structured object or null`. The hook exposes them as a keyed object
 * so each section consumer can read `m.groundwaterMetrics`, `m.heritageMetrics`,
 * etc. without the parent needing 31 individual `useMemo` blocks.
 *
 * Design notes:
 * - Single `useMemo` keyed on `[layers, project.acreage, project.country,
 *   project.provinceState, project.parcelBoundaryGeojson]` — the union of all
 *   deps the individual useMemos previously had. Recomputation semantics are
 *   preserved.
 * - `hydroMetrics` is the historical outlier (reads `project.acreage`).
 *   `agUseValueMetrics` + `ecoGiftsMetrics` read other project props.
 * - Return type is inferred — section consumers rely on structural typing.
 *   Export `SiteIntelligenceMetrics = ReturnType<typeof useSiteIntelligenceMetrics>`
 *   for consumers that want the shape explicitly.
 */

import { useMemo } from 'react';
import * as turf from '@turf/turf';
import type { LocalProject } from '../store/projectStore.js';
import type { MockLayerResult } from '../lib/mockLayerData.js';
import {
  computeHydrologyMetrics,
  computeWindEnergy,
  parseHydrologicGroup,
  HYDRO_DEFAULTS,
  type HydroMetrics,
  type WindEnergyResult,
} from '../lib/hydrologyMetrics.js';
import { estimateCanopyHeight } from '../lib/canopyHeight.js';
import { computeFuzzyFAOMembership } from '../lib/fuzzyMCDM.js';
import { classifyAgUseValue } from '../lib/regulatoryIntelligence.js';

export function useSiteIntelligenceMetrics(
  layers: MockLayerResult[],
  project: LocalProject,
) {
  return useMemo(() => {
    // ── Sprint F: Hydrology Intelligence metrics ────────────────────────
    const hydroMetrics: HydroMetrics | null = (() => {
      const climateLayer   = layers.find((l) => l.layerType === 'climate');
      const watershedLayer = layers.find((l) => l.layerType === 'watershed');
      const wetlandsLayer  = layers.find((l) => l.layerType === 'wetlands_flood');
      const elevationLayer = layers.find((l) => l.layerType === 'elevation');
      const soilsLayer     = layers.find((l) => l.layerType === 'soils');
      if (!climateLayer) return null;
      const cs  = climateLayer.summary  as Record<string, unknown> | undefined;
      const ws  = watershedLayer?.summary as Record<string, unknown> | undefined;
      const wfs = wetlandsLayer?.summary  as Record<string, unknown> | undefined;
      const es  = elevationLayer?.summary as Record<string, unknown> | undefined;
      const ss  = soilsLayer?.summary     as Record<string, unknown> | undefined;
      const precipMm = typeof cs?.annual_precip_mm === 'number'
        ? cs.annual_precip_mm : HYDRO_DEFAULTS.precipMm;
      return computeHydrologyMetrics({
        precipMm,
        catchmentHa: (() => {
          const v = parseFloat(String(ws?.catchment_area_ha ?? ''));
          return isFinite(v) ? v : null;
        })(),
        propertyAcres:   project.acreage  ?? HYDRO_DEFAULTS.propertyAcres,
        slopeDeg:        typeof es?.mean_slope_deg === 'number'   ? es.mean_slope_deg   : HYDRO_DEFAULTS.slopeDeg,
        hydrologicGroup: parseHydrologicGroup(typeof ss?.hydrologic_group === 'string' ? ss.hydrologic_group : undefined),
        drainageClass:   typeof ss?.drainage_class === 'string'   ? ss.drainage_class   : HYDRO_DEFAULTS.drainageClass,
        floodZone:       typeof wfs?.flood_zone === 'string'      ? wfs.flood_zone      : HYDRO_DEFAULTS.floodZone,
        wetlandPct:      typeof wfs?.wetland_pct === 'number'     ? wfs.wetland_pct     : HYDRO_DEFAULTS.wetlandPct,
        annualTempC:     typeof cs?.annual_temp_mean_c === 'number' ? cs.annual_temp_mean_c : HYDRO_DEFAULTS.annualTempC,
        monthlyNormals:  Array.isArray(cs?.['_monthly_normals']) ? cs['_monthly_normals'] as
          { month: number; mean_max_c: number | null; mean_min_c: number | null; precip_mm: number }[] : null,
        awcCmCm:         typeof ss?.awc_cm_cm === 'number' ? ss.awc_cm_cm : 0,
        rootingDepthCm:  typeof ss?.rooting_depth_cm === 'number' ? ss.rooting_depth_cm : 0,
      });
    })();

    // ── Sprint J: Wind energy potential ──────────────────────────────────
    const windEnergy: WindEnergyResult | null = (() => {
      const climateLayer = layers.find((l) => l.layerType === 'climate');
      if (!climateLayer) return null;
      const cs = climateLayer.summary as Record<string, unknown> | undefined;
      const windRose = cs?.['_wind_rose'] as
        { frequencies_16: number[]; speeds_avg_ms: number[]; calm_pct: number } | undefined;
      return computeWindEnergy(windRose ?? null);
    })();

    // ── Sprint K: Infrastructure distances ───────────────────────────────
    const infraMetrics = (() => {
      const infraLayer = layers.find((l) => l.layerType === 'infrastructure');
      if (!infraLayer || infraLayer.fetchStatus !== 'complete') return null;
      const sm = infraLayer.summary as Record<string, unknown>;
      return {
        hospitalKm: sm.hospital_nearest_km as number | null,
        hospitalName: sm.hospital_name as string | null,
        masjidKm: sm.masjid_nearest_km as number | null,
        masjidName: sm.masjid_name as string | null,
        marketKm: sm.market_nearest_km as number | null,
        marketName: sm.market_name as string | null,
        gridKm: sm.power_substation_nearest_km as number | null,
        waterKm: sm.water_supply_nearest_km as number | null,
        roadKm: sm.road_nearest_km as number | null,
        roadType: sm.road_type as string | null,
        protectedAreaKm: sm.protected_area_nearest_km as number | null,
        protectedAreaName: sm.protected_area_name as string | null,
        protectedAreaClass: sm.protected_area_class as string | null,
        protectedAreaCount: sm.protected_area_count as number,
        poiCount: sm.poi_count as number,
      };
    })();

    // ── Sprint K: Solar PV from NASA POWER ───────────────────────────────
    const solarPV = (() => {
      const climateLayer = layers.find((l) => l.layerType === 'climate');
      if (!climateLayer) return null;
      const cs = climateLayer.summary as Record<string, unknown> | undefined;
      const solarRad = cs?.solar_radiation_kwh_m2_day as number | undefined;
      if (!solarRad || solarRad <= 0) return null;
      const annualYieldKwhPerKwp = solarRad * 365 * 0.80;
      return {
        peakSunHours: Math.round(solarRad * 100) / 100,
        annualYieldKwhPerKwp: Math.round(annualYieldKwhPerKwp),
        pvClass: solarRad >= 5 ? 'Excellent' : solarRad >= 4 ? 'Good' : solarRad >= 3 ? 'Moderate' : 'Poor',
      };
    })();

    // ── Sprint G: Soil Intelligence metrics ──────────────────────────────
    const soilMetrics = (() => {
      const soilsLayer = layers.find((l) => l.layerType === 'soils');
      if (!soilsLayer) return null;
      const ss = soilsLayer.summary as Record<string, unknown> | undefined;
      if (!ss) return null;
      const omPct = typeof ss.organic_matter_pct === 'number' ? ss.organic_matter_pct : null;
      const bdRaw = typeof ss.bulk_density_g_cm3 === 'number' ? ss.bulk_density_g_cm3 : null;
      const rdCm = typeof ss.rooting_depth_cm === 'number' ? ss.rooting_depth_cm : null;
      let carbonStockTCHa: number | null = null;
      if (omPct != null && omPct > 0) {
        const bd = bdRaw != null && bdRaw > 0 ? bdRaw : Math.max(0.8, 1.66 - 0.318 * Math.sqrt(omPct));
        const depth = rdCm != null && rdCm > 0 ? rdCm : 30;
        carbonStockTCHa = Math.round((omPct / 100) * 0.58 * bd * depth * 100 * 10) / 10;
      }
      const taxOrder = typeof ss.taxonomic_order === 'string' ? ss.taxonomic_order : null;
      const drainStr = typeof ss.drainage_class === 'string' ? ss.drainage_class.toLowerCase() : '';
      const caco3 = typeof ss.caco3_pct === 'number' ? ss.caco3_pct : 0;
      let wrbClass: string | null = null;
      if (taxOrder) {
        const USDA_TO_WRB: Record<string, string> = {
          entisols: 'Regosols', inceptisols: 'Cambisols', alfisols: 'Luvisols',
          mollisols: 'Chernozems', spodosols: 'Podzols', ultisols: 'Acrisols',
          oxisols: 'Ferralsols', vertisols: 'Vertisols', aridisols: 'Calcisols',
          histosols: 'Histosols', andisols: 'Andosols', gelisols: 'Cryosols',
        };
        const base = USDA_TO_WRB[taxOrder.toLowerCase()] ?? null;
        if (base) {
          const qualifier = drainStr.includes('poorly') ? 'Gleyic'
            : caco3 > 5 ? 'Calcic'
            : (omPct != null && omPct > 6) ? 'Humic'
            : 'Haplic';
          wrbClass = `${qualifier} ${base}`;
        }
      }
      return {
        ph: typeof ss.ph === 'number' ? ss.ph : null,
        organicMatterPct: omPct,
        cecMeq: typeof ss.cec_meq_100g === 'number' ? ss.cec_meq_100g : null,
        bulkDensity: bdRaw,
        ksatUmS: typeof ss.ksat_um_s === 'number' ? ss.ksat_um_s : null,
        caco3Pct: typeof ss.caco3_pct === 'number' ? ss.caco3_pct : null,
        coarseFragmentPct: typeof ss.coarse_fragment_pct === 'number' ? ss.coarse_fragment_pct : null,
        awcCmCm: typeof ss.awc_cm_cm === 'number' ? ss.awc_cm_cm : null,
        textureClass: typeof ss.texture_class === 'string' ? ss.texture_class : null,
        drainageClass: typeof ss.drainage_class === 'string' ? ss.drainage_class : null,
        rootingDepthCm: rdCm,
        carbonStockTCHa,
        wrbClass,
      };
    })();

    // ── Sprint M: Groundwater depth ──────────────────────────────────────
    const groundwaterMetrics = (() => {
      const gwLayer = layers.find((l) => l.layerType === 'groundwater');
      if (!gwLayer || gwLayer.fetchStatus !== 'complete') return null;
      const gw = gwLayer.summary as Record<string, unknown> | undefined;
      if (!gw) return null;
      const depthM = typeof gw.groundwater_depth_m === 'number' ? gw.groundwater_depth_m : null;
      const depthFt = typeof gw.groundwater_depth_ft === 'number' ? gw.groundwater_depth_ft : null;
      const stationKm = typeof gw.station_nearest_km === 'number' ? gw.station_nearest_km : null;
      const stationName = typeof gw.station_name === 'string' ? gw.station_name : null;
      const measureDate = typeof gw.measurement_date === 'string' ? gw.measurement_date : null;
      const depthClass = depthM === null ? 'Unknown'
        : depthM <= 3 ? 'Shallow (<3m)'
        : depthM <= 10 ? 'Moderate (3\u201310m)'
        : depthM <= 30 ? 'Deep (10\u201330m)'
        : 'Very deep (>30m)';
      return { depthM, depthFt, stationKm, stationName, measureDate, depthClass, confidence: gwLayer.confidence };
    })();

    // ── Sprint M: Water quality ──────────────────────────────────────────
    const waterQualityMetrics = (() => {
      const wqLayer = layers.find((l) => l.layerType === 'water_quality');
      if (!wqLayer || wqLayer.fetchStatus !== 'complete') return null;
      const wq = wqLayer.summary as Record<string, unknown> | undefined;
      if (!wq) return null;
      const ph = typeof wq.ph_value === 'number' ? wq.ph_value : null;
      const doMgL = typeof wq.dissolved_oxygen_mg_l === 'number' ? wq.dissolved_oxygen_mg_l : null;
      const nitrateMgL = typeof wq.nitrate_mg_l === 'number' ? wq.nitrate_mg_l : null;
      const turbidityNtu = typeof wq.turbidity_ntu === 'number' ? wq.turbidity_ntu : null;
      const stationKm = typeof wq.station_nearest_km === 'number' ? wq.station_nearest_km : null;
      const stationName = typeof wq.station_name === 'string' ? wq.station_name : null;
      const lastMeasured = typeof wq.last_measured === 'string' ? wq.last_measured : null;
      const hasData = ph !== null || doMgL !== null || nitrateMgL !== null;
      if (!hasData) return null;
      return { ph, doMgL, nitrateMgL, turbidityNtu, stationKm, stationName, lastMeasured, confidence: wqLayer.confidence };
    })();

    // ── Sprint O: Superfund / contamination ──────────────────────────────
    const superfundMetrics = (() => {
      const layer = layers.find((l) => l.layerType === 'superfund');
      if (!layer || layer.fetchStatus !== 'complete') return null;
      const sm = layer.summary as Record<string, unknown>;
      return {
        nearestKm: typeof sm.nearest_site_km === 'number' ? sm.nearest_site_km : null,
        nearestName: typeof sm.nearest_site_name === 'string' ? sm.nearest_site_name : null,
        nearestStatus: typeof sm.nearest_site_status === 'string' ? sm.nearest_site_status : null,
        within5km: typeof sm.sites_within_5km === 'number' ? sm.sites_within_5km : 0,
        within2km: typeof sm.sites_within_2km === 'number' ? sm.sites_within_2km : 0,
        confidence: layer.confidence,
      };
    })();

    // ── Sprint O: Critical habitat ───────────────────────────────────────
    const criticalHabitatMetrics = (() => {
      const layer = layers.find((l) => l.layerType === 'critical_habitat');
      if (!layer || layer.fetchStatus !== 'complete') return null;
      const sm = layer.summary as Record<string, unknown>;
      return {
        onSite: sm.on_site === true,
        speciesOnSite: typeof sm.species_on_site === 'number' ? sm.species_on_site : 0,
        speciesNearby: typeof sm.species_nearby === 'number' ? sm.species_nearby : 0,
        speciesList: Array.isArray(sm.species_list) ? sm.species_list as string[] : [],
        primarySpecies: typeof sm.primary_species === 'string' ? sm.primary_species : null,
        primaryStatus: typeof sm.primary_status === 'string' ? sm.primary_status : null,
        confidence: layer.confidence,
      };
    })();

    // ── Sprint BB: Biodiversity (GBIF) + IUCN habitat ────────────────────
    const biodiversityMetrics = (() => {
      const layer = layers.find((l) => l.layerType === 'biodiversity');
      if (!layer || layer.fetchStatus !== 'complete') return null;
      const sm = layer.summary as Record<string, unknown>;
      return {
        speciesRichness: typeof sm.species_richness === 'number' ? sm.species_richness : 0,
        totalObservations: typeof sm.total_observations === 'number' ? sm.total_observations : 0,
        biodiversityClass: typeof sm.biodiversity_class === 'string' ? sm.biodiversity_class : null,
        iucnHabitatCode: typeof sm.iucn_habitat_code === 'string' ? sm.iucn_habitat_code : null,
        iucnHabitatLabel: typeof sm.iucn_habitat_label === 'string' ? sm.iucn_habitat_label : null,
        searchRadiusKm: typeof sm.search_radius_km === 'number' ? sm.search_radius_km : 5,
        confidence: layer.confidence,
      };
    })();

    // ── Sprint BB: SoilGrids (ISRIC) global cross-check ──────────────────
    const soilGridsMetrics = (() => {
      const layer = layers.find((l) => l.layerType === 'soilgrids_global');
      if (!layer || layer.fetchStatus !== 'complete') return null;
      const sm = layer.summary as Record<string, unknown>;
      return {
        ph: typeof sm.sg_ph === 'number' ? sm.sg_ph : null,
        nitrogen: typeof sm.sg_nitrogen_g_kg === 'number' ? sm.sg_nitrogen_g_kg : null,
        socGKg: typeof sm.sg_soc_g_kg === 'number' ? sm.sg_soc_g_kg : null,
        cfvo: typeof sm.sg_cfvo_pct === 'number' ? sm.sg_cfvo_pct : null,
        clay: typeof sm.sg_clay_pct === 'number' ? sm.sg_clay_pct : null,
        sand: typeof sm.sg_sand_pct === 'number' ? sm.sg_sand_pct : null,
        confidence: layer.confidence,
      };
    })();

    // ── Sprint BC: UST/LUST proximity (EPA Envirofacts) ──────────────────
    const ustLustMetrics = (() => {
      const layer = layers.find((l) => l.layerType === 'ust_lust');
      if (!layer || layer.fetchStatus !== 'complete') return null;
      const sm = layer.summary as Record<string, unknown>;
      return {
        nearestUstKm: typeof sm.nearest_ust_km === 'number' ? sm.nearest_ust_km : null,
        nearestLustKm: typeof sm.nearest_lust_km === 'number' ? sm.nearest_lust_km : null,
        nearestLustName: typeof sm.nearest_lust_name === 'string' ? sm.nearest_lust_name : null,
        nearestUstName: typeof sm.nearest_ust_name === 'string' ? sm.nearest_ust_name : null,
        lustWithin1km: typeof sm.lust_sites_within_1km === 'number' ? sm.lust_sites_within_1km : 0,
        ustWithin2km: typeof sm.ust_sites_within_2km === 'number' ? sm.ust_sites_within_2km : 0,
        confidence: layer.confidence,
      };
    })();

    // ── Sprint BC: Brownfields (EPA ACRES) ───────────────────────────────
    const brownfieldMetrics = (() => {
      const layer = layers.find((l) => l.layerType === 'brownfields');
      if (!layer || layer.fetchStatus !== 'complete') return null;
      const sm = layer.summary as Record<string, unknown>;
      return {
        nearestKm: typeof sm.nearest_brownfield_km === 'number' ? sm.nearest_brownfield_km : null,
        nearestName: typeof sm.nearest_brownfield_name === 'string' ? sm.nearest_brownfield_name : null,
        cleanupStatus: typeof sm.cleanup_status === 'string' ? sm.cleanup_status : null,
        within5km: typeof sm.sites_within_5km === 'number' ? sm.sites_within_5km : 0,
        within2km: typeof sm.sites_within_2km === 'number' ? sm.sites_within_2km : 0,
        confidence: layer.confidence,
      };
    })();

    // ── Sprint BC: Landfills ─────────────────────────────────────────────
    const landfillMetrics = (() => {
      const layer = layers.find((l) => l.layerType === 'landfills');
      if (!layer || layer.fetchStatus !== 'complete') return null;
      const sm = layer.summary as Record<string, unknown>;
      return {
        nearestKm: typeof sm.nearest_landfill_km === 'number' ? sm.nearest_landfill_km : null,
        nearestName: typeof sm.nearest_landfill_name === 'string' ? sm.nearest_landfill_name : null,
        facilityType: typeof sm.facility_type === 'string' ? sm.facility_type : null,
        within5km: typeof sm.sites_within_5km === 'number' ? sm.sites_within_5km : 0,
        within2km: typeof sm.sites_within_2km === 'number' ? sm.sites_within_2km : 0,
        confidence: layer.confidence,
      };
    })();

    // ── Sprint BC: Mine hazards (USGS MRDS) ──────────────────────────────
    const mineHazardMetrics = (() => {
      const layer = layers.find((l) => l.layerType === 'mine_hazards');
      if (!layer || layer.fetchStatus !== 'complete') return null;
      const sm = layer.summary as Record<string, unknown>;
      return {
        nearestKm: typeof sm.nearest_mine_km === 'number' ? sm.nearest_mine_km : null,
        nearestName: typeof sm.nearest_mine_name === 'string' ? sm.nearest_mine_name : null,
        commodity: typeof sm.nearest_mine_commodity === 'string' ? sm.nearest_mine_commodity : null,
        status: typeof sm.nearest_mine_status === 'string' ? sm.nearest_mine_status : null,
        within10km: typeof sm.mines_within_10km === 'number' ? sm.mines_within_10km : 0,
        confidence: layer.confidence,
      };
    })();

    // ── Sprint BC: FUDS (USACE) ──────────────────────────────────────────
    const fudsMetrics = (() => {
      const layer = layers.find((l) => l.layerType === 'fuds');
      if (!layer || layer.fetchStatus !== 'complete') return null;
      const sm = layer.summary as Record<string, unknown>;
      return {
        nearestKm: typeof sm.nearest_fuds_km === 'number' ? sm.nearest_fuds_km : null,
        nearestName: typeof sm.nearest_fuds_name === 'string' ? sm.nearest_fuds_name : null,
        projectType: typeof sm.project_type === 'string' ? sm.project_type : null,
        within10km: typeof sm.sites_within_10km === 'number' ? sm.sites_within_10km : 0,
        confidence: layer.confidence,
      };
    })();

    // ── Sprint BC: Conservation easement (NCED) ──────────────────────────
    const easementMetrics = (() => {
      const layer = layers.find((l) => l.layerType === 'conservation_easement');
      if (!layer || layer.fetchStatus !== 'complete') return null;
      const sm = layer.summary as Record<string, unknown>;
      return {
        present: sm.easement_present === true,
        holder: typeof sm.easement_holder === 'string' ? sm.easement_holder : null,
        purpose: typeof sm.easement_purpose === 'string' ? sm.easement_purpose : null,
        acres: typeof sm.easement_acres === 'number' ? sm.easement_acres : 0,
        nearby: typeof sm.easements_nearby === 'number' ? sm.easements_nearby : 0,
        confidence: layer.confidence,
      };
    })();

    // ── Sprint BC: Heritage / archaeology ────────────────────────────────
    const heritageMetrics = (() => {
      const layer = layers.find((l) => l.layerType === 'heritage');
      if (!layer || layer.fetchStatus !== 'complete') return null;
      const sm = layer.summary as Record<string, unknown>;
      return {
        present: sm.heritage_site_present === true,
        name: typeof sm.heritage_site_name === 'string' ? sm.heritage_site_name : null,
        designation: typeof sm.designation === 'string' ? sm.designation : null,
        nearestKm: typeof sm.nearest_heritage_km === 'number' ? sm.nearest_heritage_km : null,
        confidence: layer.confidence,
      };
    })();

    // ── Sprint BC: BC ALR ────────────────────────────────────────────────
    const alrMetrics = (() => {
      const layer = layers.find((l) => l.layerType === 'alr_status');
      if (!layer || layer.fetchStatus !== 'complete') return null;
      const sm = layer.summary as Record<string, unknown>;
      return {
        inAlr: sm.in_alr === true,
        region: typeof sm.alr_region === 'string' ? sm.alr_region : null,
        code: typeof sm.alr_code === 'string' ? sm.alr_code : null,
        confidence: layer.confidence,
      };
    })();

    // ── Sprint BD Cat 4: USGS Principal Aquifer ──────────────────────────
    const aquiferMetrics = (() => {
      const layer = layers.find((l) => l.layerType === 'aquifer');
      if (!layer || layer.fetchStatus !== 'complete') return null;
      const sm = layer.summary as Record<string, unknown>;
      return {
        name: typeof sm.aquifer_name === 'string' ? sm.aquifer_name : null,
        rockType: typeof sm.rock_type === 'string' ? sm.rock_type : null,
        productivity: typeof sm.aquifer_productivity === 'string' ? sm.aquifer_productivity : null,
        confidence: layer.confidence,
      };
    })();

    // ── Sprint BD Cat 4: WRI Aqueduct water stress ───────────────────────
    const waterStressMetrics = (() => {
      const layer = layers.find((l) => l.layerType === 'water_stress');
      if (!layer || layer.fetchStatus !== 'complete') return null;
      const sm = layer.summary as Record<string, unknown>;
      return {
        score: typeof sm.baseline_water_stress_score === 'number' ? sm.baseline_water_stress_score : null,
        label: typeof sm.baseline_water_stress_label === 'string' ? sm.baseline_water_stress_label : null,
        stressClass: typeof sm.water_stress_class === 'string' ? sm.water_stress_class : null,
        droughtRisk: typeof sm.drought_risk_label === 'string' ? sm.drought_risk_label : null,
        floodRisk: typeof sm.riverine_flood_risk_label === 'string' ? sm.riverine_flood_risk_label : null,
        confidence: layer.confidence,
      };
    })();

    // ── Sprint BD Cat 4: Seasonal flooding (USGS NWIS) ───────────────────
    const seasonalFloodingMetrics = (() => {
      const layer = layers.find((l) => l.layerType === 'seasonal_flooding');
      if (!layer || layer.fetchStatus !== 'complete') return null;
      const sm = layer.summary as Record<string, unknown>;
      return {
        gaugeName: typeof sm.gauge_name === 'string' ? sm.gauge_name : null,
        gaugeKm: typeof sm.gauge_distance_km === 'number' ? sm.gauge_distance_km : null,
        peakMonth: typeof sm.peak_flow_month === 'string' ? sm.peak_flow_month : null,
        lowMonth: typeof sm.low_flow_month === 'string' ? sm.low_flow_month : null,
        variability: typeof sm.variability_index === 'number' ? sm.variability_index : null,
        seasonalityClass: typeof sm.seasonality_class === 'string' ? sm.seasonality_class : null,
        confidence: layer.confidence,
      };
    })();

    // ── Sprint P: Storm events / disaster history (FEMA) ─────────────────
    const stormMetrics = (() => {
      const layer = layers.find((l) => l.layerType === 'storm_events');
      if (!layer || layer.fetchStatus !== 'complete') return null;
      const sm = layer.summary as Record<string, unknown>;
      return {
        disasterCount10yr: typeof sm.disaster_count_10yr === 'number' ? sm.disaster_count_10yr : 0,
        majorDisasterCount: typeof sm.major_disaster_count === 'number' ? sm.major_disaster_count : 0,
        latestDate: typeof sm.latest_disaster_date === 'string' ? sm.latest_disaster_date : null,
        latestTitle: typeof sm.latest_disaster_title === 'string' ? sm.latest_disaster_title : null,
        latestType: typeof sm.latest_disaster_type === 'string' ? sm.latest_disaster_type : null,
        mostCommonType: typeof sm.most_common_type === 'string' ? sm.most_common_type : null,
        stateName: typeof sm.state_name === 'string' ? sm.state_name : null,
        confidence: layer.confidence,
      };
    })();

    // ── Sprint P: Crop validation (USDA NASS CDL) ────────────────────────
    const cropValidationMetrics = (() => {
      const layer = layers.find((l) => l.layerType === 'crop_validation');
      if (!layer || layer.fetchStatus !== 'complete') return null;
      const sm = layer.summary as Record<string, unknown>;
      return {
        cropName: typeof sm.cdl_crop_name === 'string' ? sm.cdl_crop_name : null,
        cropYear: typeof sm.cdl_year === 'number' ? sm.cdl_year : null,
        landUseClass: typeof sm.land_use_class === 'string' ? sm.land_use_class : null,
        isAgricultural: sm.is_agricultural === true,
        isCropland: sm.is_cropland === true,
        confidence: layer.confidence,
      };
    })();

    // ── Sprint T: Air quality (EPA EJSCREEN) ─────────────────────────────
    const airQualityMetrics = (() => {
      const layer = layers.find((l) => l.layerType === 'air_quality');
      if (!layer || layer.fetchStatus !== 'complete') return null;
      const sm = layer.summary as Record<string, unknown>;
      return {
        pm25: typeof sm.pm25_ug_m3 === 'number' ? sm.pm25_ug_m3 : null,
        ozone: typeof sm.ozone_ppb === 'number' ? sm.ozone_ppb : null,
        dieselPm: typeof sm.diesel_pm_ug_m3 === 'number' ? sm.diesel_pm_ug_m3 : null,
        pm25Pct: typeof sm.pm25_national_pct === 'number' ? sm.pm25_national_pct : null,
        aqiClass: typeof sm.aqi_class === 'string' ? sm.aqi_class : null,
        confidence: layer.confidence,
      };
    })();

    // ── Sprint U: Seismic hazard (USGS Design Maps) ──────────────────────
    const earthquakeMetrics = (() => {
      const layer = layers.find((l) => l.layerType === 'earthquake_hazard');
      if (!layer || layer.fetchStatus !== 'complete') return null;
      const sm = layer.summary as Record<string, unknown>;
      return {
        pgaG: typeof sm.pga_g === 'number' ? sm.pga_g : null,
        hazardClass: typeof sm.hazard_class === 'string' ? sm.hazard_class : null,
        siteClass: typeof sm.site_class === 'string' ? sm.site_class : null,
        riskCategory: typeof sm.risk_category === 'string' ? sm.risk_category : null,
        confidence: layer.confidence,
      };
    })();

    // ── Sprint V: Census demographics (ACS) ──────────────────────────────
    const demographicsMetrics = (() => {
      const layer = layers.find((l) => l.layerType === 'census_demographics');
      if (!layer || layer.fetchStatus !== 'complete') return null;
      const sm = layer.summary as Record<string, unknown>;
      return {
        popDensityKm2: typeof sm.pop_density_km2 === 'number' ? sm.pop_density_km2 : null,
        medianIncomeUsd: typeof sm.median_income_usd === 'number' ? sm.median_income_usd : null,
        medianAge: typeof sm.median_age === 'number' ? sm.median_age : null,
        ruralClass: typeof sm.rural_class === 'string' ? sm.rural_class : null,
        countyName: typeof sm.county_name === 'string' ? sm.county_name : null,
        population: typeof sm.population === 'number' ? sm.population : null,
        confidence: layer.confidence,
      };
    })();

    // ── Sprint W: Proximity data (OSM) ───────────────────────────────────
    const proximityMetrics = (() => {
      const layer = layers.find((l) => l.layerType === 'proximity_data');
      if (!layer || layer.fetchStatus !== 'complete') return null;
      const sm = layer.summary as Record<string, unknown>;
      const farmersMarketKm = typeof sm.farmers_market_km === 'number' ? sm.farmers_market_km : null;
      const nearestTownKm = typeof sm.nearest_town_km === 'number' ? sm.nearest_town_km : null;
      if (farmersMarketKm === null && nearestTownKm === null) return null;
      return {
        farmersMarketKm,
        farmersMarketName: typeof sm.farmers_market_name === 'string' ? sm.farmers_market_name : null,
        nearestTownKm,
        nearestTownName: typeof sm.nearest_town_name === 'string' ? sm.nearest_town_name : null,
      };
    })();

    // ── Sprint BF Cat 1a: Fuzzy FAO membership ───────────────────────────
    const fuzzyFao = (() => {
      const soilsL = layers.find((l) => l.layerType === 'soils');
      const elevL = layers.find((l) => l.layerType === 'elevation');
      const climL = layers.find((l) => l.layerType === 'climate');
      const ss = soilsL?.summary as Record<string, unknown> | undefined;
      const es = elevL?.summary as Record<string, unknown> | undefined;
      const cs = climL?.summary as Record<string, unknown> | undefined;
      if (!ss && !es && !cs) return null;
      const n = (o: Record<string, unknown> | undefined, k: string): number | null =>
        (o && typeof o[k] === 'number') ? (o[k] as number) : null;
      return computeFuzzyFAOMembership({
        pH: n(ss, 'ph_value'),
        rootingDepthCm: n(ss, 'rooting_depth_cm'),
        slopeDeg: n(es, 'mean_slope_deg'),
        awcCmCm: n(ss, 'awc_cm_cm'),
        ecDsM: n(ss, 'ec_ds_m'),
        cecCmolKg: n(ss, 'cec_meq_100g'),
        gdd: n(cs, 'growing_degree_days_base10c'),
        drainageClass: (ss && typeof ss['drainage_class'] === 'string') ? (ss['drainage_class'] as string) : null,
      });
    })();

    // ── Sprint BF Cat 6b+6c: Species intelligence ────────────────────────
    const speciesIntelligence = (() => {
      const inv = layers.find((l) => l.layerType === 'invasive_species');
      const nat = layers.find((l) => l.layerType === 'native_species');
      if (!inv && !nat) return null;
      const invS = inv?.summary as Record<string, unknown> | undefined;
      const natS = nat?.summary as Record<string, unknown> | undefined;
      return {
        region: (invS?.['region'] as string) ?? (natS?.['region'] as string) ?? '\u2014',
        invasiveCount: typeof invS?.['invasive_count_state'] === 'number' ? invS['invasive_count_state'] as number : null,
        topInvasives: Array.isArray(invS?.['top_invasives']) ? (invS['top_invasives'] as string[]) : [],
        nativeCount: typeof natS?.['native_count_state'] === 'number' ? natS['native_count_state'] as number : null,
        pollinatorNatives: Array.isArray(natS?.['pollinator_friendly_natives']) ? (natS['pollinator_friendly_natives'] as string[]) : [],
        invNote: (invS?.['note'] as string) ?? null,
        natNote: (natS?.['note'] as string) ?? null,
        source: inv?.sourceApi ?? nat?.sourceApi ?? 'USDA PLANTS',
      };
    })();

    // ── Sprint BF Cat 7: Canopy height estimate ──────────────────────────
    const canopyHeight = (() => {
      const lcLayer = layers.find((l) => l.layerType === 'land_cover');
      const climLayer = layers.find((l) => l.layerType === 'climate');
      const lcs = lcLayer?.summary as Record<string, unknown> | undefined;
      const cs = climLayer?.summary as Record<string, unknown> | undefined;
      if (!lcs && !cs) return null;
      const treeCanopy = typeof lcs?.['tree_canopy_pct'] === 'number' ? lcs['tree_canopy_pct'] as number : null;
      const primary = typeof lcs?.['primary_class'] === 'string' ? lcs['primary_class'] as string : null;
      const temp = typeof cs?.['annual_temp_mean_c'] === 'number' ? cs['annual_temp_mean_c'] as number : null;
      const precip = typeof cs?.['annual_precip_mm'] === 'number' ? cs['annual_precip_mm'] as number : null;
      const koppen = typeof cs?.['koppen_classification'] === 'string' ? cs['koppen_classification'] as string : null;
      return estimateCanopyHeight({
        treeCanopyPct: treeCanopy,
        primaryLandCoverClass: primary,
        meanAnnualTempC: temp,
        annualPrecipMm: precip,
        koppenClass: koppen,
      });
    })();

    // ── Sprint BF Cat 8: Land-use history (NLCD multi-epoch) ─────────────
    const landUseHistoryMetrics = (() => {
      const l = layers.find((x) => x.layerType === 'land_use_history');
      if (!l) return null;
      const ls = l.summary as Record<string, unknown> | undefined;
      if (!ls) return null;
      return {
        history: Array.isArray(ls['land_use_history']) ? ls['land_use_history'] as { year: number; class_code: number; class_name: string }[] : [],
        transitions: Array.isArray(ls['land_use_transitions']) ? ls['land_use_transitions'] as string[] : [],
        disturbanceFlags: Array.isArray(ls['disturbance_flags']) ? ls['disturbance_flags'] as string[] : [],
        epochs: typeof ls['epochs_sampled'] === 'number' ? ls['epochs_sampled'] as number : 0,
        source: l.sourceApi ?? 'USGS NLCD',
      };
    })();

    // ── Sprint BF Cat 11b / BH: Mineral rights ───────────────────────────
    const mineralRightsMetrics = (() => {
      const l = layers.find((x) => x.layerType === 'mineral_rights');
      if (!l) return null;
      const sm = l.summary as Record<string, unknown> | undefined;
      if (!sm) return null;
      return {
        federalEstate: sm['federal_mineral_estate'] === true,
        claimsCount: typeof sm['mineral_claims_within_2km'] === 'number' ? sm['mineral_claims_within_2km'] as number : 0,
        claimTypes: Array.isArray(sm['claim_types']) ? sm['claim_types'] as string[] : [],
        note: typeof sm['coverage_note'] === 'string' ? sm['coverage_note'] as string : null,
        source: l.sourceApi ?? 'BLM',
        stateChecked: sm['state_registry_checked'] === true,
        stateAgency: typeof sm['state_registry_agency'] === 'string' ? sm['state_registry_agency'] as string : null,
        stateWells: typeof sm['state_wells_within_2km'] === 'number' ? sm['state_wells_within_2km'] as number : null,
        stateWellTypes: Array.isArray(sm['state_well_types']) ? sm['state_well_types'] as string[] : [],
        stateNote: typeof sm['state_regulatory_note'] === 'string' ? sm['state_regulatory_note'] as string : null,
        bcMtoPresent: sm['bc_mto_tenure_present'] === true,
        bcMtoCount: typeof sm['bc_mto_tenure_count'] === 'number' ? sm['bc_mto_tenure_count'] as number : 0,
      };
    })();

    // ── Sprint BH Phase 2: Water rights ──────────────────────────────────
    const waterRightsMetrics = (() => {
      const l = layers.find((x) => x.layerType === 'water_rights');
      if (!l) return null;
      const sm = l.summary as Record<string, unknown> | undefined;
      if (!sm) return null;
      return {
        doctrine: typeof sm['doctrine'] === 'string' ? sm['doctrine'] as string : 'unknown',
        doctrineDescription: typeof sm['doctrine_description'] === 'string' ? sm['doctrine_description'] as string : null,
        agency: typeof sm['agency'] === 'string' ? sm['agency'] as string : null,
        hasLiveRegistry: sm['has_live_registry'] === true,
        diversionsWithin5km: typeof sm['diversions_within_5km'] === 'number' ? sm['diversions_within_5km'] as number : null,
        nearestKm: typeof sm['nearest_diversion_km'] === 'number' ? sm['nearest_diversion_km'] as number : null,
        nearestId: typeof sm['nearest_right_id'] === 'string' ? sm['nearest_right_id'] as string : null,
        nearestPriorityDate: typeof sm['nearest_priority_date'] === 'string' ? sm['nearest_priority_date'] as string : null,
        nearestUse: typeof sm['nearest_use_type'] === 'string' ? sm['nearest_use_type'] as string : null,
        nearestFlow: typeof sm['nearest_flow_rate'] === 'string' ? sm['nearest_flow_rate'] as string : null,
        note: typeof sm['regulatory_note'] === 'string' ? sm['regulatory_note'] as string : null,
        source: l.sourceApi,
      };
    })();

    // ── Sprint BH Phase 4: Ag use-value assessment eligibility ───────────
    const agUseValueMetrics = (() => {
      const lcL = layers.find((l) => l.layerType === 'land_cover');
      const lcs = lcL?.summary as Record<string, unknown> | undefined;
      const primaryClass = typeof lcs?.['primary_class'] === 'string' ? lcs['primary_class'] as string : null;
      let areaHa: number | null = null;
      try {
        if (project.parcelBoundaryGeojson) {
          areaHa = turf.area(project.parcelBoundaryGeojson) / 10000;
        }
      } catch { /* */ }
      const acreage = areaHa != null ? areaHa * 2.47105 : project.acreage ?? null;
      const mineralL = layers.find((l) => l.layerType === 'mineral_rights');
      const ms = mineralL?.summary as Record<string, unknown> | undefined;
      const waterL = layers.find((l) => l.layerType === 'water_rights');
      const ws = waterL?.summary as Record<string, unknown> | undefined;
      const stateFromWater = typeof ws?.['state'] === 'string' ? ws['state'] as string : null;
      const stateFromMineral = typeof ms?.['state'] === 'string' ? ms['state'] as string : null;
      const stateCode = stateFromWater ?? stateFromMineral ?? project.provinceState ?? null;
      const province = typeof ws?.['province'] === 'string' ? ws['province'] as string
        : (project.country === 'CA' ? (project.provinceState ?? 'ON') : null);
      return classifyAgUseValue({
        stateCode,
        country: project.country ?? 'US',
        province,
        acreage,
        primaryLandCoverClass: primaryClass,
      });
    })();

    // ── Sprint BH Phase 5: Ecological Gifts Program (CA) ─────────────────
    const ecoGiftsMetrics = (() => {
      if (project.country !== 'CA') return null;
      const l = layers.find((x) => x.layerType === 'conservation_easement');
      if (!l) return null;
      const sm = l.summary as Record<string, unknown> | undefined;
      if (!sm) return null;
      const nearby = typeof sm['ecogift_nearby_count'] === 'number' ? sm['ecogift_nearby_count'] as number : null;
      if (nearby == null) return null;
      return {
        nearbyCount: nearby,
        nearestKm: typeof sm['nearest_ecogift_km'] === 'number' ? sm['nearest_ecogift_km'] as number : null,
        nearestName: typeof sm['nearest_ecogift_name'] === 'string' ? sm['nearest_ecogift_name'] as string : null,
        nearestAreaHa: typeof sm['nearest_ecogift_area_ha'] === 'number' ? sm['nearest_ecogift_area_ha'] as number : null,
        nearestYear: typeof sm['nearest_ecogift_year'] === 'number' ? sm['nearest_ecogift_year'] as number : null,
        oltaNote: typeof sm['olta_directory_note'] === 'string' ? sm['olta_directory_note'] as string : null,
        programNote: typeof sm['ecogift_note'] === 'string' ? sm['ecogift_note'] as string : null,
      };
    })();

    // ── Sprint BI: GAEZ v4 agro-climatic suitability ─────────────────────
    const gaezMetrics = (() => {
      const l = layers.find((x) => x.layerType === 'gaez_suitability');
      if (!l) return null;
      const sm = l.summary as Record<string, unknown> | undefined;
      if (!sm) return null;
      const enabled = sm['enabled'] === true;
      if (!enabled) {
        return {
          enabled: false as const,
          message: typeof sm['message'] === 'string' ? sm['message'] as string : null,
          attribution: l.attribution,
        };
      }
      const top3Raw = Array.isArray(sm['top_3_crops']) ? sm['top_3_crops'] as unknown[] : [];
      const top3 = top3Raw
        .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
        .map((r) => ({
          crop: typeof r['crop'] === 'string' ? r['crop'] as string : '',
          yieldKgHa: typeof r['yield_kg_ha'] === 'number' ? r['yield_kg_ha'] as number : null,
          suitability: typeof r['suitability'] === 'string' ? r['suitability'] as string : 'UNKNOWN',
        }))
        .filter((r) => r.crop);
      return {
        enabled: true as const,
        bestCrop: typeof sm['best_crop'] === 'string' ? sm['best_crop'] as string : null,
        bestManagement: typeof sm['best_management'] === 'string' ? sm['best_management'] as string : null,
        primaryClass: typeof sm['primary_suitability_class'] === 'string' ? sm['primary_suitability_class'] as string : 'UNKNOWN',
        attainableYield: typeof sm['attainable_yield_kg_ha_best'] === 'number' ? sm['attainable_yield_kg_ha_best'] as number : null,
        top3,
        resolutionNote: typeof sm['resolution_note'] === 'string' ? sm['resolution_note'] as string : null,
        licenseNote: typeof sm['license_note'] === 'string' ? sm['license_note'] as string : null,
        source: l.sourceApi,
        attribution: l.attribution,
      };
    })();

    return {
      hydroMetrics,
      windEnergy,
      infraMetrics,
      solarPV,
      soilMetrics,
      groundwaterMetrics,
      waterQualityMetrics,
      superfundMetrics,
      criticalHabitatMetrics,
      biodiversityMetrics,
      soilGridsMetrics,
      ustLustMetrics,
      brownfieldMetrics,
      landfillMetrics,
      mineHazardMetrics,
      fudsMetrics,
      easementMetrics,
      heritageMetrics,
      alrMetrics,
      aquiferMetrics,
      waterStressMetrics,
      seasonalFloodingMetrics,
      stormMetrics,
      cropValidationMetrics,
      airQualityMetrics,
      earthquakeMetrics,
      demographicsMetrics,
      proximityMetrics,
      fuzzyFao,
      speciesIntelligence,
      canopyHeight,
      landUseHistoryMetrics,
      mineralRightsMetrics,
      waterRightsMetrics,
      agUseValueMetrics,
      ecoGiftsMetrics,
      gaezMetrics,
    };
  }, [
    layers,
    project.acreage,
    project.country,
    project.provinceState,
    project.parcelBoundaryGeojson,
  ]);
}

export type SiteIntelligenceMetrics = ReturnType<typeof useSiteIntelligenceMetrics>;
