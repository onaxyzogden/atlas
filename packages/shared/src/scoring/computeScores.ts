/**
 * Score computation module — pure functions that derive assessment scores,
 * opportunities, risks, and narrative summaries from environmental layer data.
 *
 * Each of the 7 scores follows WithConfidence: every score carries confidence,
 * dataSources, computedAt, and a score_breakdown array naming the source layer
 * and contribution of every component.
 *
 * Tier 3 derived layers (terrain_analysis, watershed_derived, microclimate,
 * soil_regeneration) are consumed when present; absent Tier 3 data contributes
 * 0 points (graceful degradation, not inflation).
 *
 * No side effects, no API calls. All functions are deterministic given inputs.
 */

// Cycle-avoidance: import types from specific schema files, not the '@ogden/shared' barrel.
import type { AssessmentFlag } from '../schemas/assessment.schema.js';
import type { MockLayerResult } from './types.js';
import { evaluateAssessmentRules } from './rules/index.js';
import { semantic, confidence, water } from './tokens.js';
import { computeHydrologyMetrics, computeWindEnergy } from './hydrologyMetrics.js';
import { computeFuzzyFAOMembership, type FuzzyFAOResult } from './fuzzyMCDM.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ScoreComponent {
  /** Human-readable component name, e.g. "precipitation_adequacy" */
  name: string;
  /** Points contributed (can be negative) */
  value: number;
  /** Maximum this component could contribute */
  maxPossible: number;
  /** The layerType that produced this data point */
  sourceLayer: string;
  /** Confidence of the source layer */
  confidence: 'high' | 'medium' | 'low';
}

export interface ScoredResult {
  label: string;
  score: number;
  rating: 'Exceptional' | 'Good' | 'Moderate' | 'Low' | 'Insufficient Data';
  /** Lowest confidence among all contributing source layers */
  confidence: 'high' | 'medium' | 'low';
  /** Unique list of layerType values that contributed */
  dataSources: string[];
  /** ISO datetime of computation */
  computedAt: string;
  /** Per-component breakdown showing contribution and source */
  score_breakdown: ScoreComponent[];
  /**
   * Fuzzy FAO S1–N2 membership vector. Populated only when
   * `computeAssessmentScores` is called with `scoringMode: 'fuzzy'`, and only
   * on the FAO Suitability entry. Consumers use this to draw membership bars
   * beside the crisp class label; absent = crisp-mode output.
   */
  fuzzyFAO?: FuzzyFAOResult;
}

export interface ComputeAssessmentScoresOptions {
  /**
   * 'crisp' (default) — unchanged legacy behavior.
   * 'fuzzy' — additionally computes `FuzzyFAOResult` and attaches it to the
   * FAO Suitability entry. Crisp scores are untouched; this is purely additive.
   */
  scoringMode?: 'crisp' | 'fuzzy';
}

/** Backwards-compatible alias — SiteIntelligencePanel uses this type name */
export type AssessmentScore = ScoredResult;

export interface DataLayerRow {
  label: string;
  value: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export type LiveDataIconKey =
  | 'elevation'
  | 'climate'
  | 'soil'
  | 'wetlands'
  | 'hydrology';

export interface LiveDataRow {
  /**
   * Semantic icon key — renderer decides which glyph to show.
   * Web maps to a Lucide icon component; keeps this module renderer-agnostic.
   */
  icon: LiveDataIconKey;
  label: string;
  value: string;
  detail?: string;
  confidence: 'High' | 'Medium' | 'Low';
  color: string;
  /** Provenance (Phase 3 UX): surfaced via delayed tooltip on the
   *  confidence pill so the confidence rating doesn't sit in isolation. */
  source?: string;
  dataDate?: string;
  /** Why the confidence is what it is. Renderer maps this to a reason
   *  glyph (clock = freshness, crosshair = resolution, shield = authority). */
  reason?: 'freshness' | 'resolution' | 'authority';
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v));
}

function ratingFromScore(
  score: number,
): ScoredResult['rating'] {
  if (score >= 85) return 'Exceptional';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Moderate';
  if (score >= 30) return 'Low';
  return 'Insufficient Data';
}

function layerByType(
  layers: MockLayerResult[],
  type: string,
): MockLayerResult | undefined {
  return layers.find((l) => l.layerType === type);
}

function s(layer: MockLayerResult | undefined, key: string): unknown {
  return layer?.summary?.[key];
}

function num(layer: MockLayerResult | undefined, key: string): number {
  const v = s(layer, key);
  return typeof v === 'number' ? v : 0;
}

function str(layer: MockLayerResult | undefined, key: string): string {
  const v = s(layer, key);
  return typeof v === 'string' ? v : '';
}

function normalizeConfidence(
  raw: string | undefined,
): 'High' | 'Medium' | 'Low' {
  const c = (raw ?? '').toLowerCase();
  if (c === 'high') return 'High';
  if (c === 'medium') return 'Medium';
  return 'Low';
}

/** Returns the confidence of a layer, defaulting to 'low' if absent. */
function layerConfidence(layer: MockLayerResult | undefined): 'high' | 'medium' | 'low' {
  if (!layer) return 'low';
  const c = (layer.confidence ?? '').toLowerCase();
  if (c === 'high') return 'high';
  if (c === 'medium') return 'medium';
  return 'low';
}

const CONF_RANK: Record<string, number> = { high: 2, medium: 1, low: 0 };

/** Returns the lowest confidence level from an array of components. */
function lowestConfidence(components: ScoreComponent[]): 'high' | 'medium' | 'low' {
  if (components.length === 0) return 'low';
  let min = 2;
  for (const c of components) {
    const r = CONF_RANK[c.confidence] ?? 0;
    if (r < min) min = r;
  }
  return min === 2 ? 'high' : min === 1 ? 'medium' : 'low';
}

/**
 * Module-local override for the `computedAt` timestamp stamped into every
 * ScoredResult. Set inside `computeAssessmentScores` via try/finally so that
 * API callers (SiteAssessmentWriter) can pass a deterministic pipeline
 * timestamp; cleared on exit so web callers get live `new Date()` behaviour.
 * JS is single-threaded so there is no race; the try/finally handles re-entry.
 */
let _computedAtOverride: string | undefined;

/** Build a ScoredResult from base score and components. */
function buildResult(label: string, base: number, components: ScoreComponent[]): ScoredResult {
  const raw = base + components.reduce((sum, c) => sum + c.value, 0);
  const score = clamp(Math.round(raw));
  const sources = [...new Set(components.map((c) => c.sourceLayer))];
  return {
    label,
    score,
    rating: ratingFromScore(score),
    confidence: lowestConfidence(components.filter((c) => c.value !== 0)),
    dataSources: sources,
    computedAt: _computedAtOverride ?? new Date().toISOString(),
    score_breakdown: components,
  };
}

/** Shorthand to push a component. */
function comp(
  name: string,
  value: number,
  maxPossible: number,
  sourceLayer: string,
  confidence: 'high' | 'medium' | 'low',
): ScoreComponent {
  return { name, value: Math.round(value * 10) / 10, maxPossible, sourceLayer, confidence };
}

/* ------------------------------------------------------------------ */
/*  Nested summary accessor for Tier 3 data                           */
/* ------------------------------------------------------------------ */

function nested(layer: MockLayerResult | undefined, path: string): unknown {
  if (!layer?.summary) return undefined;
  const keys = path.split('.');
  let cur: unknown = layer.summary;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

function nestedNum(layer: MockLayerResult | undefined, path: string): number {
  const v = nested(layer, path);
  return typeof v === 'number' ? v : 0;
}

/* ------------------------------------------------------------------ */
/*  1. computeAssessmentScores — 7 scores with WithConfidence          */
/* ------------------------------------------------------------------ */

export function computeAssessmentScores(
  layers: MockLayerResult[],
  acreage: number | null,
  country?: string,
  computedAt?: string,
  opts?: ComputeAssessmentScoresOptions,
): ScoredResult[] {
  const _prevOverride = _computedAtOverride;
  if (computedAt !== undefined) _computedAtOverride = computedAt;
  try {
  const climate = layerByType(layers, 'climate');
  const watershed = layerByType(layers, 'watershed');
  const wetlands = layerByType(layers, 'wetlands_flood');
  const soils = layerByType(layers, 'soils');
  const elevation = layerByType(layers, 'elevation');
  const landCover = layerByType(layers, 'land_cover');
  const zoning = layerByType(layers, 'zoning');
  const infrastructure = layerByType(layers, 'infrastructure');

  // Tier 3 derived layers (may be absent)
  const watershedDerived = layerByType(layers, 'watershed_derived');
  const microclimate = layerByType(layers, 'microclimate');
  const soilRegen = layerByType(layers, 'soil_regeneration');
  const terrain = layerByType(layers, 'terrain_analysis');

  // Sprint M: direct-fetch federal data (US-only, may be absent)
  const groundwater = layerByType(layers, 'groundwater');
  const waterQuality = layerByType(layers, 'water_quality');

  // Sprint O: environmental risk + ecological layers (US-only)
  const superfund = layerByType(layers, 'superfund');
  const criticalHabitat = layerByType(layers, 'critical_habitat');

  // Sprint P: climate resilience + crop validation (US-only)
  const stormEvents = layerByType(layers, 'storm_events');
  const cropValidation = layerByType(layers, 'crop_validation');

  // Sprint T: air quality (EPA EJSCREEN — US-only)
  const airQuality = layerByType(layers, 'air_quality');

  // Sprint U: seismic hazard (USGS Design Maps — US-only)
  const earthquakeHazard = layerByType(layers, 'earthquake_hazard');

  // Sprint V: census demographics (US Census Bureau ACS — US-only)
  const censusDemographics = layerByType(layers, 'census_demographics');

  // Sprint W: proximity data (OSM Overpass — global)
  const proximityData = layerByType(layers, 'proximity_data');

  // Sprint BB: biodiversity (GBIF + IUCN) — global
  const biodiversity = layerByType(layers, 'biodiversity');

  // Sprint BC: Cat 8 environmental risk extensions (US-focused)
  const ustLust = layerByType(layers, 'ust_lust');
  const brownfields = layerByType(layers, 'brownfields');
  const landfills = layerByType(layers, 'landfills');
  const mineHazards = layerByType(layers, 'mine_hazards');
  const fuds = layerByType(layers, 'fuds');
  // Sprint BD: Cat 4 hydrology extensions
  const aquifer = layerByType(layers, 'aquifer');
  const waterStress = layerByType(layers, 'water_stress');
  const seasonalFlooding = layerByType(layers, 'seasonal_flooding');
  // Sprint BF: Cat 8 prior land-use history (NLCD multi-epoch)
  const landUseHistory = layerByType(layers, 'land_use_history');

  // Sprint F: hydro metrics for Water Resilience scoring
  // Sprint I: pass monthly normals + soil params for LGP computation
  let hydroForScoring: Parameters<typeof computeWaterResilience>[5];
  let lgpDaysForScoring: number | undefined;
  const precipMmForHydro = num(climate, 'annual_precip_mm');
  if (precipMmForHydro > 0) {
    const catchRaw = parseFloat(String(s(watershed, 'catchment_area_ha') ?? ''));
    const propAcres = acreage ?? 10;
    const climSummary = climate?.summary as Record<string, unknown> | undefined;
    const monthlyNormals = climSummary?.['_monthly_normals'] as
      { month: number; mean_max_c: number | null; mean_min_c: number | null; precip_mm: number }[] | undefined;
    const hm = computeHydrologyMetrics({
      precipMm: precipMmForHydro,
      catchmentHa: isFinite(catchRaw) ? catchRaw : null,
      propertyAcres: propAcres,
      slopeDeg: num(elevation, 'mean_slope_deg') || 3,
      hydrologicGroup: str(soils, 'hydrologic_group') || 'B',
      drainageClass: str(soils, 'drainage_class') || 'well drained',
      floodZone: str(wetlands, 'flood_zone') || 'Zone X',
      wetlandPct: num(wetlands, 'wetland_pct'),
      annualTempC: num(climate, 'annual_temp_mean_c') || 9,
      monthlyNormals: monthlyNormals ?? null,
      awcCmCm: num(soils, 'awc_cm_cm'),
      rootingDepthCm: num(soils, 'rooting_depth_cm'),
    });
    hydroForScoring = {
      waterBalanceMm: hm.waterBalanceMm,
      aridityClass: hm.aridityClass,
      rwhPotentialGal: hm.rwhPotentialGal,
      irrigationDeficitMm: hm.irrigationDeficitMm,
      propertyM2: propAcres * 4046.86,
    };
    lgpDaysForScoring = hm.lgpDays;
  }

  // Sprint J: Wind energy from wind_rose data in climate layer
  const climSummaryWind = climate?.summary as Record<string, unknown> | undefined;
  const windRoseRaw = climSummaryWind?.['_wind_rose'] as
    { frequencies_16: number[]; speeds_avg_ms: number[]; calm_pct: number } | undefined;
  const windEnergy = computeWindEnergy(windRoseRaw ?? null);
  const windPowerDensity = windEnergy?.powerDensityWm2 ?? 0;

  // Sprint K: Solar radiation for PV scoring (already fetched from NASA POWER)
  const solarRadiation = num(climate, 'solar_radiation_kwh_m2_day');

  // Sprint Q: Biomass energy potential (GJ/ha/yr) from existing layers
  let biomassGjHa = 0;
  const cropName = str(cropValidation, 'cdl_crop_name').toLowerCase();
  const isCropland = s(cropValidation, 'is_cropland');
  const isAgricultural = s(cropValidation, 'is_agricultural');
  const organicMatterPct = num(soils, 'organic_matter_pct');
  if (isCropland) {
    // Row crop residue: estimate 4-8 t/ha residue × ~15 MJ/kg
    const residueTHa = cropName.includes('corn') ? 7 : cropName.includes('wheat') ? 5
      : cropName.includes('soy') ? 3 : cropName.includes('rice') ? 6 : 4;
    biomassGjHa = Math.round(residueTHa * 15); // MJ/kg → GJ/ha (1 t = 1000 kg, /1000 = GJ)
  } else if (isAgricultural) {
    // Pasture/hay: ~2-4 t/ha harvestable × 12 MJ/kg
    biomassGjHa = Math.round(3 * 12);
  } else {
    // Forest/natural: estimate from organic matter (higher OM → more standing biomass)
    const treeCanopy = num(landCover, 'tree_canopy_pct');
    if (treeCanopy > 20) {
      biomassGjHa = Math.round((treeCanopy / 100) * 120); // forested: up to ~120 GJ/ha
    }
  }
  // Organic matter bonus: high OM indicates productive land with residue potential
  if (organicMatterPct > 3 && biomassGjHa > 0) {
    biomassGjHa = Math.round(biomassGjHa * (1 + (organicMatterPct - 3) * 0.05));
  }

  // Sprint Q: Micro-hydro potential (kW) from existing hydro + elevation data
  let microhydroKw = 0;
  if (precipMmForHydro > 0) {
    const slopeDeg = num(elevation, 'mean_slope_deg');
    const nearestStreamM = num(watershed, 'nearest_stream_m');
    const catchRaw2 = parseFloat(String(s(watershed, 'catchment_area_ha') ?? ''));
    const catchHa = isFinite(catchRaw2) ? catchRaw2 : 0;
    // Estimate mean annual discharge from catchment: Q = P × A × Cr / seconds_per_year
    // P in m/yr, A in m², Cr = runoff coefficient ~0.3
    const precipM = precipMmForHydro / 1000;
    const catchM2 = catchHa * 10000;
    const annualRunoffM3 = precipM * catchM2 * 0.3;
    const meanDischargeM3s = catchHa > 0 ? annualRunoffM3 / (365.25 * 86400) : 0;
    // Estimate usable head from slope and stream proximity
    const headM = slopeDeg > 0 && nearestStreamM > 0
      ? Math.min(nearestStreamM * Math.tan(slopeDeg * Math.PI / 180), 50) // cap at 50m
      : slopeDeg > 2 ? Math.min(slopeDeg * 3, 30) // rough estimate from slope alone
      : 0;
    // Power = Q × H × g × η (efficiency ~0.7 for small turbines)
    if (meanDischargeM3s > 0.01 && headM > 1) {
      microhydroKw = Math.round(meanDischargeM3s * headM * 9.81 * 0.7 * 10) / 10;
    }
  }

  // Sprint R: Carbon sequestration rate (tCO₂/ha/yr) — IPCC Tier 1 flux estimation
  // Three pools: forest canopy (NPP), wetland (peat accretion), soil organic C flux
  const cTreeCanopy   = num(landCover, 'tree_canopy_pct');
  const cWetlandPct   = num(wetlands,  'wetland_pct');
  const cOmPct        = num(soils,     'organic_matter_pct');
  const cIsCropland   = s(cropValidation, 'is_cropland') as boolean | undefined;

  // Forest pool: temperate deciduous/mixed ~4.5 tCO₂/ha/yr at full canopy
  const forestSeqRate = (cTreeCanopy / 100) * 4.5;

  // Wetland pool: freshwater wetlands (peat accretion) ~6 tCO₂/ha/yr
  const wetlandPct = typeof cWetlandPct === 'number' && isFinite(cWetlandPct) ? cWetlandPct : 0;
  const wetlandSeqRate = (wetlandPct / 100) * 6.0;

  // Soil pool: flux estimated from OM level — higher OM = more active C cycling
  // Well-stocked (>3%) soils under perennial vegetation: ~1.5 tCO₂/ha/yr
  const soilSeqRate = cOmPct > 3 ? 1.5 : cOmPct > 2 ? 0.8 : cOmPct > 1 ? 0.3 : 0;

  // Cropland penalty: annual tillage releases ~0.5 tCO₂/ha/yr net
  const cropPenalty  = cIsCropland ? -0.5 : 0;

  const carbonSeqTonsCO2HaYr = Math.round(
    Math.max(0, forestSeqRate + wetlandSeqRate + soilSeqRate + cropPenalty) * 100,
  ) / 100;

  const faoResult = computeFAOSuitability(soils, climate, elevation);
  if (opts?.scoringMode === 'fuzzy') {
    faoResult.fuzzyFAO = computeFuzzyFAOMembership({
      pH: typeof soils?.summary?.ph === 'number' ? soils.summary.ph : null,
      rootingDepthCm: typeof soils?.summary?.rooting_depth_cm === 'number' ? soils.summary.rooting_depth_cm : null,
      slopeDeg: typeof elevation?.summary?.mean_slope_deg === 'number' ? elevation.summary.mean_slope_deg : null,
      awcCmCm: typeof soils?.summary?.awc_cm_cm === 'number' ? soils.summary.awc_cm_cm : null,
      ecDsM: typeof soils?.summary?.ec_ds_m === 'number' ? soils.summary.ec_ds_m : null,
      cecCmolKg: typeof soils?.summary?.cec_cmol_kg === 'number' ? soils.summary.cec_cmol_kg : null,
      gdd: typeof climate?.summary?.gdd === 'number' ? climate.summary.gdd : null,
      drainageClass: typeof soils?.summary?.drainage_class === 'string' ? soils.summary.drainage_class : null,
    });
  }

  return [
    computeWaterResilience(climate, watershed, wetlands, watershedDerived, microclimate, hydroForScoring, groundwater, waterQuality, waterStress, aquifer, seasonalFlooding),
    computeAgriculturalSuitability(soils, climate, elevation, microclimate, lgpDaysForScoring, cropValidation),
    computeRegenerativePotential(landCover, soils, soilRegen, carbonSeqTonsCO2HaYr),
    computeBuildability(elevation, wetlands, soils, terrain, infrastructure, superfund, stormEvents, airQuality, earthquakeHazard, ustLust, brownfields, landfills, mineHazards, fuds, landUseHistory),
    computeHabitatSensitivity(wetlands, landCover, terrain, soilRegen, microclimate, infrastructure, criticalHabitat, biodiversity),
    computeStewardshipReadiness(soils, watershed, wetlands, landCover, soilRegen, microclimate, elevation, windPowerDensity, infrastructure, solarRadiation, biomassGjHa, microhydroKw, proximityData),
    computeCommunitySuitability(censusDemographics),
    computeDesignComplexity(elevation, wetlands, zoning, terrain, infrastructure),
    // §5 water-resilience sub-scores — weight 0 in overall (diagnostic facets)
    computeWaterRetention(soils, wetlands, watershedDerived, microclimate, acreage),
    computeDroughtResilience(soils, climate, wetlands, watershedDerived, hydroForScoring, groundwater, waterStress, acreage),
    computeStormResilience(soils, wetlands, watershedDerived, landCover, acreage),
    // Formal classification systems (Sprint D) — weight 0 in overall score
    faoResult,
    computeUSDALCC(soils, climate, elevation),
    // Sprint I: Canada Soil Capability Classification (weight 0, CA only)
    ...(country === 'CA' ? [computeCanadaSoilCapability(soils, climate, elevation)] : []),
  ];
  } finally {
    _computedAtOverride = _prevOverride;
  }
}

/* ------------------------------------------------------------------ */
/*  1a. Water Resilience                                               */
/* ------------------------------------------------------------------ */

function computeWaterResilience(
  climate: MockLayerResult | undefined,
  watershed: MockLayerResult | undefined,
  wetlands: MockLayerResult | undefined,
  watershedDerived: MockLayerResult | undefined,
  microclimate: MockLayerResult | undefined,
  hydro?: {
    waterBalanceMm: number;
    aridityClass: 'Hyperarid' | 'Arid' | 'Semi-arid' | 'Dry sub-humid' | 'Humid';
    rwhPotentialGal: number;
    irrigationDeficitMm: number;
    propertyM2: number;
  },
  groundwater?: MockLayerResult | undefined,
  waterQuality?: MockLayerResult | undefined,
  waterStress?: MockLayerResult | undefined,
  aquifer?: MockLayerResult | undefined,
  seasonalFlooding?: MockLayerResult | undefined,
): ScoredResult {
  const components: ScoreComponent[] = [];
  const cc = layerConfidence(climate);
  const wc = layerConfidence(watershed);
  const wfc = layerConfidence(wetlands);
  const wdc = layerConfidence(watershedDerived);
  const mc = layerConfidence(microclimate);

  // Precipitation adequacy (max 15)
  const precip = num(climate, 'annual_precip_mm');
  const precipPts = precip > 800 ? 15 : precip > 600 ? 10 : precip > 400 ? 5 : 0;
  components.push(comp('precipitation_adequacy', precipPts, 15, 'climate', cc));

  // Wetland coverage (max 15)
  const wetlandPct = num(wetlands, 'wetland_pct');
  const wetPts = wetlandPct > 10 ? 15 : wetlandPct > 5 ? 10 : wetlandPct > 2 ? 5 : 0;
  components.push(comp('wetland_coverage', wetPts, 15, 'wetlands_flood', wfc));

  // Riparian buffers (max 10)
  const riparian = num(wetlands, 'riparian_buffer_m');
  const ripPts = riparian >= 30 ? 10 : riparian >= 15 ? 5 : 0;
  components.push(comp('riparian_buffers', ripPts, 10, 'wetlands_flood', wfc));

  // Flood zone status (penalty, max -15)
  const floodZone = str(wetlands, 'flood_zone').toLowerCase();
  let floodPenalty = 0;
  if (floodZone.includes('ae') || (floodZone.includes('zone a') && !floodZone.includes('minimal'))) {
    floodPenalty = -15;
  } else if (!floodZone.includes('minimal risk') && !floodZone.includes('not regulated') && floodZone.length > 0) {
    floodPenalty = -8;
  }
  components.push(comp('flood_zone_status', floodPenalty, -15, 'wetlands_flood', wfc));

  // Stream proximity (max 10)
  const nearestStream = num(watershed, 'nearest_stream_m');
  const streamPts = nearestStream > 0 && nearestStream <= 200 ? 10
    : nearestStream <= 500 ? 7 : nearestStream <= 1000 ? 3 : 0;
  components.push(comp('stream_proximity', streamPts, 10, 'watershed', wc));

  // Tier 3: Watershed flow accumulation (max 10)
  if (watershedDerived) {
    const meanAcc = nestedNum(watershedDerived, 'runoff.meanAccumulation');
    const accPts = meanAcc > 50 ? 10 : meanAcc > 20 ? 7 : meanAcc > 5 ? 4 : 0;
    components.push(comp('watershed_flow_accumulation', accPts, 10, 'watershed_derived', wdc));
  } else {
    components.push(comp('watershed_flow_accumulation', 0, 10, 'watershed_derived', 'low'));
  }

  // Tier 3: Detention zone presence (max 10)
  if (watershedDerived) {
    const detentionPct = nestedNum(watershedDerived, 'flood.detentionAreaPct');
    const detPts = detentionPct > 5 ? 10 : detentionPct > 2 ? 7 : detentionPct > 0 ? 3 : 0;
    components.push(comp('detention_zone_presence', detPts, 10, 'watershed_derived', wdc));
  } else {
    components.push(comp('detention_zone_presence', 0, 10, 'watershed_derived', 'low'));
  }

  // Tier 3: Moisture zone distribution (max 10)
  if (microclimate) {
    const moistDominant = nested(microclimate, 'moistureZones.dominantClass') as string | undefined;
    const moistPts = moistDominant === 'moist' ? 10 : moistDominant === 'moderate' ? 7
      : moistDominant === 'wet' ? 5 : moistDominant === 'dry' ? 2 : 0;
    components.push(comp('moisture_zone_distribution', moistPts, 10, 'microclimate', mc));
  } else {
    components.push(comp('moisture_zone_distribution', 0, 10, 'microclimate', 'low'));
  }

  // Sprint F: Water balance surplus/deficit (max +10 / min -10)
  if (hydro) {
    const wb = hydro.waterBalanceMm;
    const wbPts = wb > 200 ? 10 : wb > 0 ? 6 : wb > -100 ? 2 : wb > -300 ? -5 : -10;
    components.push(comp('water_balance_surplus', wbPts, 10, 'climate', cc));
  } else {
    components.push(comp('water_balance_surplus', 0, 10, 'climate', 'low'));
  }

  // Sprint F: Aridity class (max 8, min -5)
  if (hydro) {
    const arPts: Record<string, number> = {
      'Humid': 8, 'Dry sub-humid': 8, 'Semi-arid': 4, 'Arid': 0, 'Hyperarid': -5,
    };
    components.push(comp('aridity_class', arPts[hydro.aridityClass] ?? 0, 8, 'climate', cc));
  } else {
    components.push(comp('aridity_class', 0, 8, 'climate', 'low'));
  }

  // Sprint F: RWH potential per acre (max 7)
  if (hydro) {
    const galPerAcre = hydro.propertyM2 > 0
      ? hydro.rwhPotentialGal / (hydro.propertyM2 / 4046.86) : 0;
    const rwhPts = galPerAcre > 50_000 ? 7 : galPerAcre > 30_000 ? 5
      : galPerAcre > 15_000 ? 3 : galPerAcre > 5_000 ? 1 : 0;
    components.push(comp('rwh_potential', rwhPts, 7, 'climate', cc));
  } else {
    components.push(comp('rwh_potential', 0, 7, 'climate', 'low'));
  }

  // Sprint F: Irrigation feasibility (max 5)
  if (hydro) {
    const defPts = hydro.irrigationDeficitMm === 0 ? 5
      : hydro.irrigationDeficitMm < 100 ? 3
      : hydro.irrigationDeficitMm < 300 ? 1 : 0;
    components.push(comp('irrigation_feasibility', defPts, 5, 'climate', cc));
  } else {
    components.push(comp('irrigation_feasibility', 0, 5, 'climate', 'low'));
  }

  // Sprint M: Groundwater depth (max 10) — optimal 3–10m; shallow = waterlogging risk; deep = well cost
  if (groundwater) {
    const depthM = num(groundwater, 'groundwater_depth_m');
    const gwPts = depthM === 0 ? 0
      : depthM <= 3 ? 5
      : depthM <= 10 ? 10
      : depthM <= 30 ? 6
      : 2;
    components.push(comp('groundwater_depth', gwPts, 10, 'groundwater', layerConfidence(groundwater)));
  } else {
    components.push(comp('groundwater_depth', 0, 10, 'groundwater', 'low'));
  }

  // Sprint M: Water quality pH (max 5) — ideal 6.5–8.5 for irrigation and aquatic health
  if (waterQuality) {
    const ph = num(waterQuality, 'ph_value');
    const phPts = ph === 0 ? 0 : ph >= 6.5 && ph <= 8.5 ? 5 : ph >= 6.0 && ph <= 9.0 ? 3 : 1;
    components.push(comp('water_quality_ph', phPts, 5, 'water_quality', layerConfidence(waterQuality)));
  } else {
    components.push(comp('water_quality_ph', 0, 5, 'water_quality', 'low'));
  }

  // Sprint Z: Dissolved oxygen (max 3) — ≥ 8 mg/L ideal; < 6 hypoxic
  if (waterQuality) {
    const doVal = num(waterQuality, 'dissolved_oxygen_mg_l');
    const doPts = doVal >= 8 ? 3 : doVal >= 6 ? 1 : 0;
    components.push(comp('wq_dissolved_oxygen', doPts, 3, 'water_quality', layerConfidence(waterQuality)));
  } else {
    components.push(comp('wq_dissolved_oxygen', 0, 3, 'water_quality', 'low'));
  }

  // Sprint Z: Nitrate risk (max 2, penalty -3) — EPA MCL 10 mg/L
  if (waterQuality) {
    const nitrateRaw = s(waterQuality, 'nitrate_mg_l');
    const nitPts = typeof nitrateRaw !== 'number' ? 0 : nitrateRaw < 2 ? 2 : nitrateRaw < 5 ? 1 : nitrateRaw < 10 ? 0 : -3;
    components.push(comp('wq_nitrate_risk', nitPts, 2, 'water_quality', layerConfidence(waterQuality)));
  } else {
    components.push(comp('wq_nitrate_risk', 0, 2, 'water_quality', 'low'));
  }

  // Sprint BD: Cat 4 — WRI Aqueduct baseline water stress (penalty max -10)
  if (waterStress) {
    const stressClass = str(waterStress, 'water_stress_class');
    const wsPts = stressClass === 'Low' ? 0
      : stressClass === 'Low-Medium' ? -2
      : stressClass === 'Medium-High' ? -5
      : stressClass === 'High' ? -8
      : stressClass === 'Extremely High' ? -10
      : 0;
    components.push(comp('baseline_water_stress', wsPts, -10, 'water_stress', layerConfidence(waterStress)));
  } else {
    components.push(comp('baseline_water_stress', 0, -10, 'water_stress', 'low'));
  }

  // Sprint BD: Cat 4 — USGS Principal Aquifer productivity (max 5)
  if (aquifer) {
    const prod = str(aquifer, 'aquifer_productivity');
    const aqPts = prod === 'High' ? 5 : prod === 'Moderate' ? 3 : prod === 'Low' ? 1 : 0;
    components.push(comp('aquifer_productivity', aqPts, 5, 'aquifer', layerConfidence(aquifer)));
  } else {
    components.push(comp('aquifer_productivity', 0, 5, 'aquifer', 'low'));
  }

  // Sprint BD: Cat 4 — Stream flow seasonality (penalty max -5)
  if (seasonalFlooding) {
    const sc2 = str(seasonalFlooding, 'seasonality_class');
    const sfPts = sc2 === 'Extreme' ? -5 : sc2 === 'High' ? -3 : sc2 === 'Moderate' ? -1 : 0;
    components.push(comp('stream_seasonality', sfPts, -5, 'seasonal_flooding', layerConfidence(seasonalFlooding)));
  } else {
    components.push(comp('stream_seasonality', 0, -5, 'seasonal_flooding', 'low'));
  }

  return buildResult('Water Resilience', 40, components);
}

/* ------------------------------------------------------------------ */
/*  1b. Agricultural Suitability                                       */
/* ------------------------------------------------------------------ */

function computeAgriculturalSuitability(
  soils: MockLayerResult | undefined,
  climate: MockLayerResult | undefined,
  elevation: MockLayerResult | undefined,
  microclimate: MockLayerResult | undefined,
  lgpDays?: number,
  cropValidation?: MockLayerResult | undefined,
): ScoredResult {
  const components: ScoreComponent[] = [];
  const sc = layerConfidence(soils);
  const cc = layerConfidence(climate);
  const ec = layerConfidence(elevation);
  const mc = layerConfidence(microclimate);

  // Drainage class (max 15)
  const drainage = str(soils, 'drainage_class').toLowerCase();
  const drainPts = drainage === 'well drained' ? 15
    : drainage.includes('moderately well') ? 10
    : drainage.includes('moderate') ? 6
    : drainage.includes('poor') ? 2 : 0;
  components.push(comp('drainage_class', drainPts, 15, 'soils', sc));

  // Organic matter (max 10)
  const om = num(soils, 'organic_matter_pct');
  const omPts = om > 5 ? 10 : om > 3 ? 8 : om > 2 ? 4 : om > 1 ? 2 : 0;
  components.push(comp('organic_matter', omPts, 10, 'soils', sc));

  // Farmland class (max 15)
  const farmland = str(soils, 'farmland_class').toLowerCase();
  const farmPts = farmland.includes('prime') || farmland.includes('class 1') ? 15
    : farmland.includes('class 2') ? 12
    : farmland.includes('class 3') ? 8 : 0;
  components.push(comp('farmland_class', farmPts, 15, 'soils', sc));

  // pH suitability (max 10)
  const phVal = num(soils, 'ph');
  const phPts = phVal === 0 ? 0
    : (phVal >= 6.0 && phVal <= 7.5) ? 10
    : (phVal >= 5.5 && phVal <= 8.0) ? 5
    : 2;
  components.push(comp('ph_suitability', phPts, 10, 'soils', sc));

  // CEC (max 5)
  const cecVal = num(soils, 'cec_meq_100g');
  const cecPts = cecVal === 0 ? 0 : cecVal >= 15 ? 5 : cecVal >= 5 ? 3 : 1;
  components.push(comp('cation_exchange', cecPts, 5, 'soils', sc));

  // Available water capacity (max 5)
  const awcVal = num(soils, 'awc_cm_cm');
  const awcPts = awcVal === 0 ? 0 : awcVal >= 0.15 ? 5 : awcVal >= 0.10 ? 3 : 1;
  components.push(comp('water_holding', awcPts, 5, 'soils', sc));

  // Sprint G: Calcium carbonate / calcareous soil risk (max 4)
  const caco3 = num(soils, 'caco3_pct');
  const caco3Pts = caco3 === 0 ? 2 // unknown — neutral
    : caco3 < 5 ? 4     // non-calcareous, ideal
    : caco3 < 15 ? 2    // moderately calcareous
    : caco3 < 25 ? 0    // highly calcareous — Fe/Zn lock-up
    : -2;               // extremely calcareous — severe nutrient lock
  components.push(comp('calcium_carbonate', caco3Pts, 4, 'soils', sc));

  // Sprint G: Saturated hydraulic conductivity (max 4)
  const ksat = num(soils, 'ksat_um_s');
  const ksatPts = ksat === 0 ? 2 // unknown
    : ksat >= 10 && ksat <= 100 ? 4   // moderate — ideal for agriculture
    : ksat >= 1 && ksat <= 300 ? 2    // slow or fast — manageable
    : ksat < 1 ? -1                   // very slow — waterlogging risk
    : 0;                              // very fast — nutrient leaching
  components.push(comp('permeability', ksatPts, 4, 'soils', sc));

  // Sprint BB: Coarse fragment % (surface stoniness) — FAO S1–N2 analog (max 3)
  // Prefer SSURGO `chfrags.fragvol_r` (canonical horizon total; see audit H5 #4).
  // Fall back to legacy `frag3to10_r + fraggt10_r` aggregate when chfrags is
  // unavailable or not exposed by the adapter (CA path).
  const coarseFragChfrags = num(soils, 'coarse_fragment_pct_chfrags');
  const coarseFrag = coarseFragChfrags !== 0 ? coarseFragChfrags : num(soils, 'coarse_fragment_pct');
  const coarseFragPts = coarseFrag === 0 ? 1     // unknown or absent — neutral
    : coarseFrag < 15 ? 3                         // optimal (<15%)
    : coarseFrag < 35 ? 1                         // moderate (15–35%)
    : coarseFrag < 55 ? -1                        // severe (35–55%)
    : -3;                                         // not suited (>55%)
  components.push(comp('coarse_fragment_penalty', coarseFragPts, 3, 'soils', sc));

  // Sprint G: Bulk density / compaction risk (max 3)
  const bd = num(soils, 'bulk_density_g_cm3');
  const bdPts = bd === 0 ? 1 // unknown
    : bd <= 1.3 ? 3     // ideal — good porosity
    : bd <= 1.5 ? 2     // slightly compacted
    : bd <= 1.7 ? 0     // moderately compacted — root restriction
    : -2;               // severely compacted
  components.push(comp('compaction_risk', bdPts, 3, 'soils', sc));

  // Growing season (max 10)
  const frostFree = num(climate, 'growing_season_days');
  const growPts = frostFree > 180 ? 10 : frostFree > 150 ? 8 : frostFree > 120 ? 5 : frostFree > 90 ? 2 : 0;
  components.push(comp('growing_season', growPts, 10, 'climate', cc));

  // Koppen climate zone (max 8)
  const koppenCode = str(climate, 'koppen_classification');
  const koppenGroup = koppenCode.charAt(0);
  const koppenPts = koppenGroup === 'A' || koppenGroup === 'C' ? 8
    : koppenGroup === 'D' ? 5
    : koppenGroup === 'B' ? 3
    : koppenGroup === 'E' ? 1 : 0;
  components.push(comp('koppen_zone', koppenPts, 8, 'climate', cc));

  // GDD accumulation (max 5)
  const gddVal = num(climate, 'growing_degree_days_base10c');
  const gddPts = gddVal >= 2000 ? 5 : gddVal >= 1500 ? 4 : gddVal >= 1000 ? 3 : gddVal > 0 ? 1 : 0;
  components.push(comp('heat_accumulation', gddPts, 5, 'climate', cc));

  // Sprint G: USDA Hardiness Zone — cold tolerance indicator (max 5)
  const hardinessStr = str(climate, 'hardiness_zone');
  const hardinessNum = parseFloat(hardinessStr) || 0; // e.g. "6b" → 6
  const hardPts = hardinessNum >= 7 ? 5
    : hardinessNum >= 5 ? 3
    : hardinessNum >= 3 ? 1
    : hardinessNum > 0 ? 0 : 2; // unknown → neutral
  components.push(comp('hardiness_zone', hardPts, 5, 'climate', cc));

  // Sprint I: Length of Growing Period — moisture-limited growing days (max 6)
  const lgp = lgpDays ?? 0;
  const lgpPts = lgp >= 270 ? 6
    : lgp >= 180 ? 5
    : lgp >= 120 ? 3
    : lgp >= 60 ? 1
    : 0;
  components.push(comp('length_of_growing_period', lgpPts, 6, 'climate', cc));

  // Slope suitability (max 10)
  const meanSlope = num(elevation, 'mean_slope_deg');
  const slopePts = meanSlope < 3 ? 10 : meanSlope < 5 ? 8 : meanSlope < 10 ? 5
    : meanSlope < 15 ? 0 : -5;
  components.push(comp('slope_suitability', slopePts, 10, 'elevation', ec));

  // Tier 3: Sun trap coverage (max 10)
  if (microclimate) {
    const sunTrapPct = nestedNum(microclimate, 'sunTraps.areaPct');
    const sunPts = sunTrapPct > 20 ? 10 : sunTrapPct > 10 ? 7 : sunTrapPct > 5 ? 4 : 0;
    components.push(comp('sun_trap_coverage', sunPts, 10, 'microclimate', mc));
  } else {
    components.push(comp('sun_trap_coverage', 0, 10, 'microclimate', 'low'));
  }

  // Tier 3: Frost risk reduction (max 10)
  if (microclimate) {
    const effGrowing = nestedNum(microclimate, 'frostRisk.effectiveGrowingSeason');
    const climateGrowing = nestedNum(microclimate, 'frostRisk.climateGrowingSeason');
    const extensionDays = effGrowing - climateGrowing;
    const frostPts = extensionDays > 15 ? 10 : extensionDays > 5 ? 7 : extensionDays > 0 ? 4 : 0;
    components.push(comp('frost_risk_reduction', frostPts, 10, 'microclimate', mc));
  } else {
    components.push(comp('frost_risk_reduction', 0, 10, 'microclimate', 'low'));
  }

  // Tier 3: Wind shelter (max 5)
  if (microclimate) {
    const shelteredPct = nestedNum(microclimate, 'windShelter.shelteredAreaPct');
    const windPts = shelteredPct > 40 ? 5 : shelteredPct > 20 ? 3 : shelteredPct > 10 ? 1 : 0;
    components.push(comp('wind_shelter', windPts, 5, 'microclimate', mc));
  } else {
    components.push(comp('wind_shelter', 0, 5, 'microclimate', 'low'));
  }

  // Sprint P: CDL crop validation — confirms site is agricultural use (max 5)
  if (cropValidation) {
    const isCropland = s(cropValidation, 'is_cropland');
    const isAgricultural = s(cropValidation, 'is_agricultural');
    const cdlPts = isCropland ? 5 : isAgricultural ? 3 : 0;
    components.push(comp('cdl_crop_validation', cdlPts, 5, 'crop_validation', layerConfidence(cropValidation)));
  } else {
    components.push(comp('cdl_crop_validation', 0, 5, 'crop_validation', 'low'));
  }

  return buildResult('Agricultural Suitability', 30, components);
}

/* ------------------------------------------------------------------ */
/*  1c. Regenerative Potential                                         */
/* ------------------------------------------------------------------ */

function computeRegenerativePotential(
  landCover: MockLayerResult | undefined,
  soils: MockLayerResult | undefined,
  soilRegen: MockLayerResult | undefined,
  carbonSeqTonsCO2HaYr?: number,
): ScoredResult {
  const components: ScoreComponent[] = [];
  const lc = layerConfidence(landCover);
  const sc = layerConfidence(soils);
  const src = layerConfidence(soilRegen);

  // Tree canopy (max 12)
  const treeCanopy = num(landCover, 'tree_canopy_pct');
  const treePts = treeCanopy > 30 ? 12 : treeCanopy > 15 ? 8 : treeCanopy > 5 ? 4 : 0;
  components.push(comp('tree_canopy', treePts, 12, 'land_cover', lc));

  // Organic matter (max 10)
  const om = num(soils, 'organic_matter_pct');
  const omPts = om > 5 ? 10 : om > 3 ? 8 : om > 2 ? 4 : 0;
  components.push(comp('organic_matter', omPts, 10, 'soils', sc));

  // Land cover diversity (max 10)
  const classes = s(landCover, 'classes');
  const classCount = classes && typeof classes === 'object' ? Object.keys(classes).length : 0;
  const divPts = classCount > 5 ? 10 : classCount > 3 ? 7 : classCount > 1 ? 4 : 0;
  components.push(comp('land_cover_diversity', divPts, 10, 'land_cover', lc));

  // Impervious surface penalty (max -10)
  const impervious = num(landCover, 'impervious_pct');
  const impPts = impervious > 30 ? -10 : impervious > 15 ? -6 : impervious > 5 ? -3 : 0;
  components.push(comp('impervious_surface_penalty', impPts, -10, 'land_cover', lc));

  // Tier 3: Carbon sequestration potential (max 12)
  if (soilRegen) {
    const meanSeq = nestedNum(soilRegen, 'carbonSequestration.meanSeqPotential');
    const carbPts = meanSeq > 0.6 ? 12 : meanSeq > 0.3 ? 8 : meanSeq > 0.1 ? 4 : 0;
    components.push(comp('carbon_sequestration_potential', carbPts, 12, 'soil_regeneration', src));
  } else {
    components.push(comp('carbon_sequestration_potential', 0, 12, 'soil_regeneration', 'low'));
  }

  // Tier 3: Restoration priority zones (max 10)
  if (soilRegen) {
    const highPriorityPct = nestedNum(soilRegen, 'restorationPriority.highPriorityAreaPct');
    // Higher priority area = more potential for improvement = higher score
    const restPts = highPriorityPct > 50 ? 10 : highPriorityPct > 30 ? 7 : highPriorityPct > 10 ? 4 : 0;
    components.push(comp('restoration_priority_zones', restPts, 10, 'soil_regeneration', src));
  } else {
    components.push(comp('restoration_priority_zones', 0, 10, 'soil_regeneration', 'low'));
  }

  // Tier 3: Intervention suitability (max 8)
  if (soilRegen) {
    const summary = nested(soilRegen, 'interventions.interventionSummary') as Record<string, { zoneCount: number }> | undefined;
    const totalInterventionZones = summary
      ? Object.values(summary).reduce((sum, v) => sum + (v?.zoneCount ?? 0), 0)
      : 0;
    const intPts = totalInterventionZones > 8 ? 8 : totalInterventionZones > 4 ? 5 : totalInterventionZones > 0 ? 3 : 0;
    components.push(comp('intervention_suitability', intPts, 8, 'soil_regeneration', src));
  } else {
    components.push(comp('intervention_suitability', 0, 8, 'soil_regeneration', 'low'));
  }

  // Sprint I: Carbon stock estimation — IPCC/FAO formula (max 6)
  // Carbon (tC/ha) = OM% × 0.58 × bulk_density × rooting_depth × 100
  const omForCarbon = num(soils, 'organic_matter_pct');
  let bdForCarbon = num(soils, 'bulk_density_g_cm3');
  const depthForCarbon = num(soils, 'rooting_depth_cm');
  // Pedotransfer fallback for bulk density: Adams (1973) bd = 1.66 - 0.318 × sqrt(OM%)
  if (bdForCarbon === 0 && omForCarbon > 0) {
    bdForCarbon = Math.max(0.8, 1.66 - 0.318 * Math.sqrt(omForCarbon));
  }
  const effectiveDepth = depthForCarbon > 0 ? depthForCarbon : 30; // default 30cm topsoil
  const carbonStockTCHa = omForCarbon > 0 && bdForCarbon > 0
    ? Math.round((omForCarbon / 100) * 0.58 * bdForCarbon * effectiveDepth * 100 * 10) / 10
    : 0;
  const carbonPts = carbonStockTCHa >= 80 ? 6
    : carbonStockTCHa >= 40 ? 4
    : carbonStockTCHa >= 20 ? 2
    : carbonStockTCHa > 0 ? 1
    : 0;
  components.push(comp('carbon_stock', carbonPts, 6, 'soils', sc));

  // Sprint R: Annual carbon sequestration flux (tCO₂/ha/yr) — max 8
  // Computed upstream from forest + wetland + soil pools minus cropland penalty
  const cSeq = carbonSeqTonsCO2HaYr ?? 0;
  const cSeqPts = cSeq >= 5 ? 8 : cSeq >= 2 ? 5 : cSeq >= 0.5 ? 2 : 0;
  const cSeqConf = cSeq > 0
    ? (cSeq >= 2 ? 'medium' : 'low')
    : 'low';
  components.push(comp('carbon_sequestration_flux', cSeqPts, 8, 'land_cover', cSeqConf as 'high' | 'medium' | 'low'));

  return buildResult('Regenerative Potential', 35, components);
}

/* ------------------------------------------------------------------ */
/*  1d. Buildability                                                   */
/* ------------------------------------------------------------------ */

function computeBuildability(
  elevation: MockLayerResult | undefined,
  wetlands: MockLayerResult | undefined,
  soils: MockLayerResult | undefined,
  terrain: MockLayerResult | undefined,
  infrastructure?: MockLayerResult | undefined,
  superfund?: MockLayerResult | undefined,
  stormEvents?: MockLayerResult | undefined,
  airQuality?: MockLayerResult | undefined,
  earthquakeHazard?: MockLayerResult | undefined,
  ustLust?: MockLayerResult | undefined,
  brownfields?: MockLayerResult | undefined,
  landfills?: MockLayerResult | undefined,
  mineHazards?: MockLayerResult | undefined,
  fuds?: MockLayerResult | undefined,
  landUseHistory?: MockLayerResult | undefined,
): ScoredResult {
  const components: ScoreComponent[] = [];
  const ec = layerConfidence(elevation);
  const wfc = layerConfidence(wetlands);
  const sc = layerConfidence(soils);
  const tc = layerConfidence(terrain);
  const ic = layerConfidence(infrastructure);

  // Slope grade (penalty, max -20)
  const meanSlope = num(elevation, 'mean_slope_deg');
  const slopePen = meanSlope > 15 ? -20 : meanSlope > 10 ? -12 : meanSlope > 5 ? -5 : 0;
  components.push(comp('slope_grade', slopePen, -20, 'elevation', ec));

  // Flood zone (penalty, max -20)
  const floodZone = str(wetlands, 'flood_zone').toLowerCase();
  let floodPen = 0;
  if (floodZone.includes('ae') || (floodZone.includes('zone a') && !floodZone.includes('minimal'))) {
    floodPen = -20;
  } else if (floodZone.length > 0 && !floodZone.includes('minimal risk') && !floodZone.includes('not regulated')) {
    floodPen = -10;
  }
  components.push(comp('flood_zone', floodPen, -20, 'wetlands_flood', wfc));

  // Regulated area (penalty, max -15)
  const regulated = num(wetlands, 'regulated_area_pct');
  const regPen = regulated > 30 ? -15 : regulated > 15 ? -8 : regulated > 5 ? -3 : 0;
  components.push(comp('regulated_area', regPen, -15, 'wetlands_flood', wfc));

  // Bedrock depth (penalty, max -10)
  const bedrock = num(soils, 'depth_to_bedrock_m');
  const bedPen = bedrock > 0 && bedrock < 1 ? -10 : bedrock >= 1 && bedrock < 2 ? -4 : 0;
  components.push(comp('bedrock_depth', bedPen, -10, 'soils', sc));

  // Tier 3: Terrain curvature complexity (penalty, max -10)
  if (terrain) {
    const profileMean = Math.abs(nestedNum(terrain, 'curvature.profileMean'));
    const curvPen = profileMean > 0.05 ? -10 : profileMean > 0.02 ? -5 : 0;
    components.push(comp('terrain_curvature_complexity', curvPen, -10, 'terrain_analysis', tc));
  } else {
    components.push(comp('terrain_curvature_complexity', 0, -10, 'terrain_analysis', 'low'));
  }

  // Tier 3: TPI flat area percentage (bonus, max 10)
  if (terrain) {
    const tpiClass = nested(terrain, 'tpiClassification') as Record<string, number> | undefined;
    const flatPct = tpiClass?.flat ?? 0;
    const flatPts = flatPct > 60 ? 10 : flatPct > 40 ? 7 : flatPct > 20 ? 4 : 0;
    components.push(comp('tpi_flat_area', flatPts, 10, 'terrain_analysis', tc));
  } else {
    components.push(comp('tpi_flat_area', 0, 10, 'terrain_analysis', 'low'));
  }

  // Tier 3: Viewshed openness (bonus, max 5)
  if (terrain) {
    const visiblePct = nestedNum(terrain, 'viewshed.visiblePct');
    const visPts = visiblePct > 70 ? 5 : visiblePct > 40 ? 3 : visiblePct > 20 ? 1 : 0;
    components.push(comp('viewshed_openness', visPts, 5, 'terrain_analysis', tc));
  } else {
    components.push(comp('viewshed_openness', 0, 5, 'terrain_analysis', 'low'));
  }

  // Sprint K: Infrastructure proximity from Overpass API (4 components)
  const hospKm = num(infrastructure, 'hospital_nearest_km');
  const hospPts = hospKm > 0 ? (hospKm <= 5 ? 5 : hospKm <= 15 ? 3 : hospKm <= 30 ? 1 : 0) : 0;
  components.push(comp('hospital_proximity', hospPts, 5, 'infrastructure', ic));

  const roadKm = num(infrastructure, 'road_nearest_km');
  const roadType = str(infrastructure, 'road_type');
  const roadPts = roadKm > 0
    ? (roadType === 'primary' && roadKm <= 2 ? 5
      : roadType === 'secondary' && roadKm <= 5 ? 4
      : roadKm <= 5 ? 3
      : roadKm <= 10 ? 1
      : 0)
    : 0;
  components.push(comp('road_access', roadPts, 5, 'infrastructure', ic));

  const gridKm = num(infrastructure, 'power_substation_nearest_km');
  const gridPts = gridKm > 0 ? (gridKm <= 5 ? 4 : gridKm <= 15 ? 2 : 0) : 0;
  components.push(comp('grid_proximity', gridPts, 4, 'infrastructure', ic));

  const mktKm = num(infrastructure, 'market_nearest_km');
  const mktPts = mktKm > 0 ? (mktKm <= 5 ? 3 : mktKm <= 15 ? 1 : 0) : 0;
  components.push(comp('market_proximity', mktPts, 3, 'infrastructure', ic));

  // Sprint L: Water supply proximity (max 3)
  const waterKm = num(infrastructure, 'water_supply_nearest_km');
  const waterPts = waterKm > 0 ? (waterKm <= 2 ? 3 : waterKm <= 5 ? 2 : waterKm <= 15 ? 1 : 0) : 0;
  components.push(comp('water_supply_proximity', waterPts, 3, 'infrastructure', ic));

  // Sprint Z: Superfund contamination risk — count within radius + proximity (penalty, max -10)
  if (superfund) {
    const sfWithin2 = num(superfund, 'sites_within_2km');
    const sfWithin5 = num(superfund, 'sites_within_5km');
    const sfKm = num(superfund, 'nearest_site_km');
    const sfPen = sfWithin2 > 0 ? -10 : sfWithin5 > 0 ? -6 : (sfKm > 0 && sfKm < 10) ? -3 : (sfKm >= 10 && sfKm <= 20) ? -1 : 0;
    components.push(comp('contamination_risk', sfPen, -10, 'superfund', layerConfidence(superfund)));
  } else {
    components.push(comp('contamination_risk', 0, -10, 'superfund', 'low'));
  }

  // Sprint Z: Disaster frequency — major federal declarations only (DR-type) (penalty, max -8)
  if (stormEvents) {
    const count = num(stormEvents, 'major_disaster_count');
    const disPen = count > 8 ? -8 : count > 5 ? -6 : count > 3 ? -4 : count > 0 ? -2 : 0;
    components.push(comp('disaster_frequency', disPen, -8, 'storm_events', layerConfidence(stormEvents)));
  } else {
    components.push(comp('disaster_frequency', 0, -8, 'storm_events', 'low'));
  }

  // Sprint T: Air quality — PM2.5 annual mean (penalty, max -8)
  // EPA NAAQS annual standard: 12 µg/m³. Rural agricultural land typically 6-9.
  if (airQuality) {
    const pm25 = num(airQuality, 'pm25_ug_m3');
    const aqPen = pm25 >= 12 ? -8 : pm25 >= 10 ? -5 : pm25 >= 8 ? -2 : 0;
    components.push(comp('air_quality_pm25', aqPen, -8, 'air_quality', layerConfidence(airQuality)));
  } else {
    components.push(comp('air_quality_pm25', 0, -8, 'air_quality', 'low'));
  }

  // Sprint U: Seismic hazard — PGA (penalty, max -10)
  // USGS ASCE 7-22 Site Class D. Rural land in CONUS averages 0.05-0.15g.
  if (earthquakeHazard) {
    const pga = num(earthquakeHazard, 'pga_g');
    const seismicPen = pga >= 0.6 ? -10 : pga >= 0.3 ? -7 : pga >= 0.15 ? -3 : 0;
    components.push(comp('seismic_hazard_pga', seismicPen, -10, 'earthquake_hazard', layerConfidence(earthquakeHazard)));
  } else {
    components.push(comp('seismic_hazard_pga', 0, -10, 'earthquake_hazard', 'low'));
  }

  // Sprint BC: UST/LUST proximity (penalty, max -3) — focus on leaking sites
  if (ustLust) {
    const lustKm = num(ustLust, 'nearest_lust_km');
    const lustW1 = num(ustLust, 'lust_sites_within_1km');
    const ustPen = lustW1 > 0 || (lustKm > 0 && lustKm < 0.5) ? -3
      : lustKm > 0 && lustKm < 2 ? -2
      : lustKm > 0 && lustKm < 5 ? -1 : 0;
    components.push(comp('ust_proximity', ustPen, -3, 'ust_lust', layerConfidence(ustLust)));
  } else {
    components.push(comp('ust_proximity', 0, -3, 'ust_lust', 'low'));
  }

  // Sprint BC: Brownfield proximity (penalty, max -3)
  if (brownfields) {
    const bfKm = num(brownfields, 'nearest_brownfield_km');
    const bfW2 = num(brownfields, 'sites_within_2km');
    const bfPen = bfW2 > 0 || (bfKm > 0 && bfKm < 0.5) ? -3
      : bfKm > 0 && bfKm < 2 ? -2
      : bfKm > 0 && bfKm < 5 ? -1 : 0;
    components.push(comp('brownfield_proximity', bfPen, -3, 'brownfields', layerConfidence(brownfields)));
  } else {
    components.push(comp('brownfield_proximity', 0, -3, 'brownfields', 'low'));
  }

  // Sprint BC: Landfill proximity (penalty, max -3)
  if (landfills) {
    const lfKm = num(landfills, 'nearest_landfill_km');
    const lfW2 = num(landfills, 'sites_within_2km');
    const lfPen = lfW2 > 0 || (lfKm > 0 && lfKm < 0.5) ? -3
      : lfKm > 0 && lfKm < 2 ? -2
      : lfKm > 0 && lfKm < 5 ? -1 : 0;
    components.push(comp('landfill_proximity', lfPen, -3, 'landfills', layerConfidence(landfills)));
  } else {
    components.push(comp('landfill_proximity', 0, -3, 'landfills', 'low'));
  }

  // Sprint BC: Legacy contamination (mines + FUDS combined, penalty max -3)
  const mineKm = mineHazards ? num(mineHazards, 'nearest_mine_km') : 0;
  const fudsKm = fuds ? num(fuds, 'nearest_fuds_km') : 0;
  const legacyNear = (mineKm > 0 && mineKm < 2) || (fudsKm > 0 && fudsKm < 2);
  const legacyMid = (mineKm > 0 && mineKm < 5) || (fudsKm > 0 && fudsKm < 5);
  const legacyPen = legacyNear ? -3 : legacyMid ? -1 : 0;
  const legacyConf = layerConfidence(mineHazards ?? fuds);
  components.push(comp('legacy_contamination', legacyPen, -3, 'mine_hazards', legacyConf));

  // Sprint BF: Prior disturbance flag (NLCD multi-epoch). Penalty max -2.
  // Triggered by any wetland-to-any or natural-to-developed transition in 2001-2021.
  const disturbanceFlags = landUseHistory?.summary?.['disturbance_flags'] as string[] | undefined;
  const disturbancePen = (disturbanceFlags && disturbanceFlags.length > 0) ? -2 : 0;
  components.push(comp('prior_disturbance_flag', disturbancePen, -2, 'land_use_history', layerConfidence(landUseHistory)));

  return buildResult('Buildability', 60, components);
}

/* ------------------------------------------------------------------ */
/*  1e. Habitat Sensitivity                                            */
/* ------------------------------------------------------------------ */

function computeHabitatSensitivity(
  wetlands: MockLayerResult | undefined,
  landCover: MockLayerResult | undefined,
  terrain: MockLayerResult | undefined,
  soilRegen: MockLayerResult | undefined,
  microclimate: MockLayerResult | undefined,
  infrastructure?: MockLayerResult | undefined,
  criticalHabitat?: MockLayerResult | undefined,
  biodiversity?: MockLayerResult | undefined,
): ScoredResult {
  const components: ScoreComponent[] = [];
  const wfc = layerConfidence(wetlands);
  const lc = layerConfidence(landCover);
  const tc = layerConfidence(terrain);
  const src = layerConfidence(soilRegen);
  const mc = layerConfidence(microclimate);
  const ic = layerConfidence(infrastructure);

  // Wetland coverage (max 25)
  const wetlandPct = num(wetlands, 'wetland_pct');
  const wetPts = wetlandPct > 10 ? 25 : wetlandPct > 5 ? 15 : wetlandPct > 2 ? 8 : 0;
  components.push(comp('wetland_coverage', wetPts, 25, 'wetlands_flood', wfc));

  // Tree canopy (max 15)
  const treeCanopy = num(landCover, 'tree_canopy_pct');
  const treePts = treeCanopy > 40 ? 15 : treeCanopy > 20 ? 10 : treeCanopy > 10 ? 5 : 0;
  components.push(comp('tree_canopy', treePts, 15, 'land_cover', lc));

  // Forested wetland presence (max 10)
  const wetlandTypes = s(wetlands, 'wetland_types');
  const hasForested = Array.isArray(wetlandTypes) &&
    wetlandTypes.some((t) => typeof t === 'string' && t.toLowerCase().includes('forested'));
  components.push(comp('forested_wetland_presence', hasForested ? 10 : 0, 10, 'wetlands_flood', wfc));

  // Tier 3: Cold air drainage corridors (max 8)
  if (terrain) {
    const riskRating = nested(terrain, 'coldAirDrainage.riskRating') as string | undefined;
    const coldPts = riskRating === 'high' ? 8 : riskRating === 'moderate' ? 5 : riskRating === 'low' ? 2 : 0;
    components.push(comp('cold_air_drainage_corridors', coldPts, 8, 'terrain_analysis', tc));
  } else {
    components.push(comp('cold_air_drainage_corridors', 0, 8, 'terrain_analysis', 'low'));
  }

  // Tier 3: Disturbed land area (inverse — less disturbed = higher habitat value) (max 10)
  if (soilRegen) {
    const disturbedPct = nestedNum(soilRegen, 'disturbedLand.disturbedAreaPct');
    const intactPts = disturbedPct < 10 ? 10 : disturbedPct < 30 ? 7 : disturbedPct < 50 ? 4 : 0;
    components.push(comp('intact_land_area', intactPts, 10, 'soil_regeneration', src));
  } else {
    components.push(comp('intact_land_area', 0, 10, 'soil_regeneration', 'low'));
  }

  // Tier 3: Moisture zone wet areas (max 7)
  if (microclimate) {
    const moistClass = nested(microclimate, 'moistureZones.classification') as Record<string, number> | undefined;
    const wetZonePct = (moistClass?.wet ?? 0) + (moistClass?.moist ?? 0);
    const moistPts = wetZonePct > 40 ? 7 : wetZonePct > 20 ? 5 : wetZonePct > 10 ? 2 : 0;
    components.push(comp('moisture_zone_wet_areas', moistPts, 7, 'microclimate', mc));
  } else {
    components.push(comp('moisture_zone_wet_areas', 0, 7, 'microclimate', 'low'));
  }

  // Sprint L: Protected area proximity (max 8, inverted — closer = higher sensitivity)
  const paKm = num(infrastructure, 'protected_area_nearest_km');
  const paPts = paKm > 0
    ? (paKm <= 1 ? 8 : paKm <= 5 ? 5 : paKm <= 15 ? 2 : 0)
    : 0;
  components.push(comp('protected_area_proximity', paPts, 8, 'infrastructure', ic));

  // Sprint O: ESA critical habitat presence (max 12) — on-site = highest sensitivity
  if (criticalHabitat) {
    const chc = layerConfidence(criticalHabitat);
    const onSite = s(criticalHabitat, 'on_site');
    const speciesOnSite = num(criticalHabitat, 'species_on_site');
    const speciesNearby = num(criticalHabitat, 'species_nearby');
    const chPts = onSite ? Math.min(12, 8 + speciesOnSite * 2)
      : speciesNearby > 0 ? Math.min(6, speciesNearby * 2)
      : 0;
    components.push(comp('critical_habitat_presence', chPts, 12, 'critical_habitat', chc));
  } else {
    components.push(comp('critical_habitat_presence', 0, 12, 'critical_habitat', 'low'));
  }

  // Sprint BB: Biodiversity index (GBIF species richness in 5 km radius) — max 5
  if (biodiversity) {
    const bc = layerConfidence(biodiversity);
    const richness = num(biodiversity, 'species_richness');
    const bioPts = richness >= 400 ? 5
      : richness >= 150 ? 4
      : richness >= 50 ? 2
      : richness > 0 ? 1
      : 0;
    components.push(comp('biodiversity_index', bioPts, 5, 'biodiversity', bc));
  } else {
    components.push(comp('biodiversity_index', 0, 5, 'biodiversity', 'low'));
  }

  return buildResult('Habitat Sensitivity', 25, components);
}

/* ------------------------------------------------------------------ */
/*  1f. Stewardship Readiness (NEW)                                    */
/* ------------------------------------------------------------------ */

function computeStewardshipReadiness(
  soils: MockLayerResult | undefined,
  watershed: MockLayerResult | undefined,
  wetlands: MockLayerResult | undefined,
  landCover: MockLayerResult | undefined,
  soilRegen: MockLayerResult | undefined,
  microclimate: MockLayerResult | undefined,
  elevation?: MockLayerResult | undefined,
  windPowerDensityWm2?: number,
  infrastructure?: MockLayerResult | undefined,
  solarRadiationKwhM2Day?: number,
  biomassGjHa?: number,
  microhydroKw?: number,
  proximityData?: MockLayerResult | undefined,
): ScoredResult {
  const components: ScoreComponent[] = [];
  const sc = layerConfidence(soils);
  const wc = layerConfidence(watershed);
  const wfc = layerConfidence(wetlands);
  const lc = layerConfidence(landCover);
  const src = layerConfidence(soilRegen);
  const mc = layerConfidence(microclimate);

  // Soil organic matter health (max 15)
  const om = num(soils, 'organic_matter_pct');
  const omPts = om > 5 ? 15 : om > 3 ? 10 : om > 2 ? 6 : om > 1 ? 3 : 0;
  components.push(comp('soil_organic_matter_health', omPts, 15, 'soils', sc));

  // Drainage condition (max 10)
  const drainage = str(soils, 'drainage_class').toLowerCase();
  const drainPts = drainage === 'well drained' ? 10
    : drainage.includes('moderately') ? 7
    : drainage.includes('moderate') ? 5
    : drainage.includes('poor') ? 2 : 0;
  components.push(comp('drainage_condition', drainPts, 10, 'soils', sc));

  // Fertility index (max 10) — use directly if available from extended soil data
  const fertilityIdx = num(soils, 'fertility_index');
  const fertPts = fertilityIdx === 0 ? 0
    : fertilityIdx >= 70 ? 10
    : fertilityIdx >= 50 ? 7
    : fertilityIdx >= 30 ? 4 : 2;
  components.push(comp('soil_fertility', fertPts, 10, 'soils', sc));

  // Salinity penalty (max -5) — penalize saline/sodic soils
  const ecVal = num(soils, 'ec_ds_m');
  const salPenalty = ecVal === 0 ? 0 : ecVal >= 4 ? -5 : ecVal >= 2 ? -3 : 0;
  components.push(comp('salinity_penalty', salPenalty, -5, 'soils', sc));

  // Water resilience cross-reference (max 15)
  const precip = num(soils, 'annual_precip_mm') || num(layerByType([...(watershed ? [watershed] : []), ...(wetlands ? [wetlands] : [])], 'climate') ?? undefined, 'annual_precip_mm');
  const nearStream = num(watershed, 'nearest_stream_m');
  const waterPts = (nearStream > 0 && nearStream <= 500 ? 8 : 0) +
    (num(wetlands, 'wetland_pct') > 2 ? 7 : num(wetlands, 'wetland_pct') > 0 ? 3 : 0);
  components.push(comp('water_resilience_indicators', Math.min(15, waterPts), 15, 'watershed', wc));

  // Habitat cross-reference (max 10)
  const wetPct = num(wetlands, 'wetland_pct');
  const treeCanopy = num(landCover, 'tree_canopy_pct');
  const habitatPts = (wetPct > 5 ? 5 : wetPct > 2 ? 3 : 0) +
    (treeCanopy > 20 ? 5 : treeCanopy > 10 ? 3 : 0);
  components.push(comp('habitat_quality_indicators', Math.min(10, habitatPts), 10, 'wetlands_flood', wfc));

  // Land cover quality (max 10)
  const impervious = num(landCover, 'impervious_pct');
  const classes = s(landCover, 'classes');
  const classCount = classes && typeof classes === 'object' ? Object.keys(classes).length : 0;
  const lcPts = (impervious < 10 ? 5 : impervious < 20 ? 3 : 0) +
    (classCount > 3 ? 5 : classCount > 1 ? 3 : 0);
  components.push(comp('land_cover_quality', Math.min(10, lcPts), 10, 'land_cover', lc));

  // Tier 3: Soil regeneration readiness (max 15)
  if (soilRegen) {
    const criticalPct = nestedNum(soilRegen, 'restorationPriority.criticalAreaPct');
    const disturbedPct = nestedNum(soilRegen, 'disturbedLand.disturbedAreaPct');
    // Low critical + low disturbed = high readiness (soil is already in good shape)
    // High critical + high disturbed = low readiness (needs lots of work first)
    const readyScore = 100 - (criticalPct * 0.5 + disturbedPct * 0.5);
    const regenPts = readyScore > 70 ? 15 : readyScore > 50 ? 10 : readyScore > 30 ? 5 : 2;
    components.push(comp('soil_regeneration_readiness', regenPts, 15, 'soil_regeneration', src));
  } else {
    components.push(comp('soil_regeneration_readiness', 0, 15, 'soil_regeneration', 'low'));
  }

  // Tier 3: Regeneration sequence feasibility (max 10)
  if (soilRegen) {
    const phases = nested(soilRegen, 'regenerationSequence.sitewidePhaseSummary') as Record<string, { zoneCount: number; avgDurationMonths: number }> | undefined;
    if (phases) {
      const totalPhases = Object.values(phases).filter((p) => p.zoneCount > 0).length;
      const maxDuration = Math.max(...Object.values(phases).map((p) => p.avgDurationMonths), 0);
      // Fewer phases + shorter duration = more feasible
      const feasPts = totalPhases <= 2 && maxDuration < 18 ? 10
        : totalPhases <= 3 && maxDuration < 30 ? 7
        : totalPhases <= 4 ? 4 : 2;
      components.push(comp('regeneration_sequence_feasibility', feasPts, 10, 'soil_regeneration', src));
    } else {
      components.push(comp('regeneration_sequence_feasibility', 0, 10, 'soil_regeneration', src));
    }
  } else {
    components.push(comp('regeneration_sequence_feasibility', 0, 10, 'soil_regeneration', 'low'));
  }

  // Tier 3: Outdoor comfort for fieldwork (max 5)
  if (microclimate) {
    const meanComfort = nestedNum(microclimate, 'outdoorComfort.annualMeanScore');
    const comfortPts = meanComfort > 60 ? 5 : meanComfort > 40 ? 3 : meanComfort > 20 ? 1 : 0;
    components.push(comp('outdoor_comfort_fieldwork', comfortPts, 5, 'microclimate', mc));
  } else {
    components.push(comp('outdoor_comfort_fieldwork', 0, 5, 'microclimate', 'low'));
  }

  // Sprint J: Soil degradation risk — composite of 5 indicators (max 8)
  // Higher score = lower degradation (healthy soil)
  let degradPts = 0;
  const omDeg = num(soils, 'organic_matter_pct');
  degradPts += omDeg >= 3 ? 2 : omDeg >= 2 ? 1.5 : omDeg >= 1 ? 0.5 : 0;       // OM depletion
  const ecDeg = num(soils, 'ec_ds_m');
  const sarDeg = num(soils, 'sodium_adsorption_ratio');
  degradPts += ecDeg === 0 ? 1.5 : ecDeg < 2 ? 2 : ecDeg < 4 ? 1 : 0;          // salinization
  degradPts += sarDeg === 0 ? 0.5 : sarDeg < 6 ? 1 : 0;                         // sodicity bonus
  const bdDeg = num(soils, 'bulk_density_g_cm3');
  degradPts += bdDeg === 0 ? 0.5 : bdDeg <= 1.3 ? 1.5 : bdDeg <= 1.5 ? 1 : 0;  // compaction
  const slopeDeg = num(elevation, 'mean_slope_deg');
  const kfactDeg = num(soils, 'kfact');
  const erosionIdx = kfactDeg > 0 ? kfactDeg * (1 + slopeDeg / 10) : slopeDeg / 10;
  degradPts += erosionIdx < 0.3 ? 1.5 : erosionIdx < 0.5 ? 1 : erosionIdx < 1 ? 0.5 : 0; // erosion
  components.push(comp('soil_degradation_risk', Math.round(Math.min(degradPts, 8) * 10) / 10, 8, 'soils', sc));

  // Sprint J: Wind energy potential (max 5) — renewable energy is part of land stewardship
  const wpd = windPowerDensityWm2 ?? 0;
  const windPts = wpd >= 400 ? 5
    : wpd >= 200 ? 3
    : wpd >= 100 ? 1
    : 0;
  components.push(comp('wind_energy_potential', windPts, 5, 'climate', wpd > 0 ? 'medium' : 'low'));

  // Sprint K/W: Masjid proximity — Islamic community stewardship (OGDEN differentiator, max 4)
  // Sprint W: prefer real OSM proximity data; fall back to infrastructure layer
  const ic = layerConfidence(infrastructure);
  const pc = layerConfidence(proximityData);
  const masjidKm = num(proximityData, 'masjid_nearest_km') || num(infrastructure, 'masjid_nearest_km');
  const masjidPts = masjidKm > 0
    ? (masjidKm <= 3 ? 4 : masjidKm <= 8 ? 2 : masjidKm <= 15 ? 1 : 0)
    : 0;
  components.push(comp('masjid_proximity', masjidPts, 4, 'proximity_data', pc || ic));

  // Sprint W: Farmers market proximity — food system connectivity (max 3)
  const marketKm = num(proximityData, 'farmers_market_km');
  const marketPts = marketKm > 0
    ? (marketKm <= 10 ? 3 : marketKm <= 25 ? 2 : marketKm <= 50 ? 1 : 0)
    : 0;
  components.push(comp('farmers_market_proximity', marketPts, 3, 'proximity_data', pc));

  // Sprint W: Town proximity — rural accessibility sweet spot (max 3)
  // Best score: rural but within 30km of a town (not isolated, not suburban)
  const townKm = num(proximityData, 'nearest_town_km');
  const townPts = townKm > 0
    ? (townKm <= 30 && townKm >= 5 ? 3 : townKm < 5 ? 1 : townKm <= 60 ? 2 : 0)
    : 0;
  components.push(comp('rural_town_proximity', townPts, 3, 'proximity_data', pc));

  // Sprint K: Solar PV potential — from existing NASA POWER solar radiation (max 5)
  // solar_radiation_kwh_m2_day already in climate layer = peak sun hours (PSH)
  const solarRad = solarRadiationKwhM2Day ?? 0;
  const solarPts = solarRad >= 5 ? 5 : solarRad >= 4 ? 3 : solarRad >= 3 ? 1 : 0;
  components.push(comp('solar_pv_potential', solarPts, 5, 'climate', solarRad > 0 ? 'medium' : 'low'));

  // Sprint Q: Biomass energy potential (max 5)
  const bm = biomassGjHa ?? 0;
  const bmPts = bm >= 80 ? 5 : bm >= 40 ? 3 : bm >= 20 ? 1 : 0;
  components.push(comp('biomass_energy_potential', bmPts, 5, 'crop_validation', bm > 0 ? 'medium' : 'low'));

  // Sprint Q: Micro-hydro potential (max 4)
  const mh = microhydroKw ?? 0;
  const mhPts = mh >= 10 ? 4 : mh >= 5 ? 3 : mh >= 1 ? 1 : 0;
  components.push(comp('microhydro_potential', mhPts, 4, 'watershed', mh > 0 ? 'medium' : 'low'));

  return buildResult('Stewardship Readiness', 25, components);
}

/* ------------------------------------------------------------------ */
/*  1g. Community Suitability (Sprint V)                              */
/* ------------------------------------------------------------------ */

function computeCommunitySuitability(
  census: MockLayerResult | undefined,
): ScoredResult {
  const components: ScoreComponent[] = [];
  const cc = layerConfidence(census);

  // Rural classification (max 10) — rural/peri-urban = ideal for CSRA
  const ruralClass = str(census, 'rural_class').toLowerCase();
  const ruralPts = ruralClass === 'rural' ? 10
    : ruralClass === 'peri-urban' ? 8
    : ruralClass === 'suburban' ? 3
    : ruralClass === 'urban' ? 0
    : 5; // unknown: neutral
  components.push(comp('rural_classification', ruralPts, 10, 'census_demographics', cc));

  // Median household income band (max 8) — $60k-$120k = CSRA participation sweet spot
  const income = num(census, 'median_income_usd');
  const incomePts = income <= 0 ? 4 // unknown: neutral
    : income >= 60000 && income <= 120000 ? 8
    : income > 120000 ? 5             // high income: can afford but may not prioritise
    : income >= 40000 ? 5             // moderate income: some capacity
    : 2;                              // low income: limited CSRA participation capacity
  components.push(comp('income_band', incomePts, 8, 'census_demographics', cc));

  // Community age profile (max 7) — median age 30-55 = homesteading / food security interest
  const medAge = num(census, 'median_age');
  const agePts = medAge <= 0 ? 4 // unknown: neutral
    : medAge >= 30 && medAge <= 55 ? 7
    : medAge >= 25 && medAge < 30  ? 4
    : medAge > 55 && medAge <= 65  ? 4
    : 2;
  components.push(comp('community_age_profile', agePts, 7, 'census_demographics', cc));

  // Tract population (max 5) — moderate-density tract (2000-8000) = active community
  const pop = num(census, 'population');
  const popPts = pop <= 0 ? 3
    : pop >= 2000 && pop <= 8000 ? 5
    : pop > 8000 && pop <= 15000 ? 3
    : pop < 2000 && pop >= 500  ? 3
    : 1;
  components.push(comp('tract_population', popPts, 5, 'census_demographics', cc));

  // Educational attainment (max 10) — % with bachelor's or higher
  const bachelorsRate = num(census, 'bachelors_pct');
  const eduPts = bachelorsRate <= 0 ? 5 // unknown: neutral
    : bachelorsRate >= 30 ? 10
    : bachelorsRate >= 20 ? 7
    : bachelorsRate >= 10 ? 4
    : 2;
  components.push(comp('educational_attainment', eduPts, 10, 'census_demographics', cc));

  // Homeownership rate (max 8) — higher ownership = community stability
  const homeownerPct = num(census, 'homeowner_pct');
  const homePts = homeownerPct <= 0 ? 4 // unknown: neutral
    : homeownerPct >= 70 ? 8
    : homeownerPct >= 50 ? 5
    : homeownerPct >= 30 ? 3
    : 1;
  components.push(comp('homeownership_rate', homePts, 8, 'census_demographics', cc));

  // Poverty rate (penalty, max -8) — high poverty = limited CSRA capacity
  const povertyRate = num(census, 'poverty_pct');
  const povPen = povertyRate <= 0 ? 0 // unknown: no penalty
    : povertyRate >= 25 ? -8
    : povertyRate >= 15 ? -4
    : povertyRate >= 10 ? -2
    : 0;
  components.push(comp('poverty_rate', povPen, -8, 'census_demographics', cc));

  // Vacancy rate — low vacancy = active community (max 5)
  const vacancyRate = num(census, 'vacancy_pct');
  const vacPts = vacancyRate <= 0 ? 3 // unknown: neutral
    : vacancyRate <= 5 ? 5
    : vacancyRate <= 10 ? 3
    : vacancyRate <= 20 ? 1
    : 0;
  components.push(comp('vacancy_rate', vacPts, 5, 'census_demographics', cc));

  return buildResult('Community Suitability', 25, components);
}

/* ------------------------------------------------------------------ */
/*  1h. Design Complexity (NEW)                                        */
/* ------------------------------------------------------------------ */

function computeDesignComplexity(
  elevation: MockLayerResult | undefined,
  wetlands: MockLayerResult | undefined,
  zoning: MockLayerResult | undefined,
  terrain: MockLayerResult | undefined,
  infrastructure: MockLayerResult | undefined,
): ScoredResult {
  const components: ScoreComponent[] = [];
  const ec = layerConfidence(elevation);
  const wfc = layerConfidence(wetlands);
  const zc = layerConfidence(zoning);
  const tc = layerConfidence(terrain);
  const ic = layerConfidence(infrastructure);

  // Slope variance (max 15)
  const meanSlope = num(elevation, 'mean_slope_deg');
  const maxSlope = num(elevation, 'max_slope_deg');
  const slopeVariance = maxSlope > 0 ? maxSlope - meanSlope : meanSlope;
  const slopePts = slopeVariance > 20 ? 15 : slopeVariance > 10 ? 10 : slopeVariance > 5 ? 5 : 0;
  components.push(comp('slope_variance', slopePts, 15, 'elevation', ec));

  // Flood zone constraints (max 15)
  const floodZone = str(wetlands, 'flood_zone').toLowerCase();
  let floodPts = 0;
  if (floodZone.includes('ae') || (floodZone.includes('zone a') && !floodZone.includes('minimal'))) {
    floodPts = 15;
  } else if (floodZone.length > 0 && !floodZone.includes('minimal risk') && !floodZone.includes('not regulated')) {
    floodPts = 8;
  }
  components.push(comp('flood_zone_constraints', floodPts, 15, 'wetlands_flood', wfc));

  // Zoning restrictions (max 12) — reads zoning_code (actual fetcher field)
  const zoningClass = str(zoning, 'zoning_code').toLowerCase();
  const setbacks = num(zoning, 'front_setback_m');
  const zonePts = (zoningClass.includes('conservation') || zoningClass.includes('protected') ? 8
    : zoningClass.includes('agricultural') ? 4 : 0) +
    (setbacks > 30 ? 4 : setbacks > 15 ? 2 : 0);
  components.push(comp('zoning_restrictions', Math.min(12, zonePts), 12, 'zoning', zc));

  // PSW/regulated area flags (max 10)
  const regulated = num(wetlands, 'regulated_area_pct');
  const pswPts = regulated > 30 ? 10 : regulated > 15 ? 7 : regulated > 5 ? 3 : 0;
  components.push(comp('psw_regulated_flags', pswPts, 10, 'wetlands_flood', wfc));

  // Tier 3: TPI distribution heterogeneity (max 12)
  if (terrain) {
    const tpiClass = nested(terrain, 'tpiClassification') as Record<string, number> | undefined;
    if (tpiClass) {
      const values = Object.values(tpiClass).filter((v) => typeof v === 'number' && v > 0);
      // More TPI classes with significant representation = more heterogeneous terrain
      const significantClasses = values.filter((v) => v > 10).length;
      const tpiPts = significantClasses > 4 ? 12 : significantClasses > 3 ? 8 : significantClasses > 2 ? 4 : 0;
      components.push(comp('tpi_heterogeneity', tpiPts, 12, 'terrain_analysis', tc));
    } else {
      components.push(comp('tpi_heterogeneity', 0, 12, 'terrain_analysis', tc));
    }
  } else {
    components.push(comp('tpi_heterogeneity', 0, 12, 'terrain_analysis', 'low'));
  }

  // Tier 3: Curvature complexity (max 10)
  if (terrain) {
    const profileMean = Math.abs(nestedNum(terrain, 'curvature.profileMean'));
    const planMean = Math.abs(nestedNum(terrain, 'curvature.planMean'));
    const totalCurv = profileMean + planMean;
    const curvPts = totalCurv > 0.08 ? 10 : totalCurv > 0.04 ? 6 : totalCurv > 0.01 ? 3 : 0;
    components.push(comp('curvature_complexity', curvPts, 10, 'terrain_analysis', tc));
  } else {
    components.push(comp('curvature_complexity', 0, 10, 'terrain_analysis', 'low'));
  }

  // Utility access indicators (max 8) — derived from infrastructure layer
  // Power substation distance proxies grid access; road distance proxies site accessibility
  const powerKm = num(infrastructure, 'power_substation_nearest_km');
  const roadKm = num(infrastructure, 'road_nearest_km');
  const gridAccessPts = powerKm > 20 ? 8 : powerKm > 10 ? 4 : 0;
  const roadAccessPts = roadKm > 0.5 ? 4 : roadKm > 0.2 ? 2 : 0;
  components.push(comp('utility_access_difficulty', Math.min(8, gridAccessPts + roadAccessPts), 8, 'infrastructure', ic));

  return buildResult('Design Complexity', 20, components);
}

/* ------------------------------------------------------------------ */
/*  1h-j. §5 Water-resilience sub-scores                              */
/*                                                                    */
/*  Three diagnostic water scores that deepen the Water Resilience    */
/*  aggregate with facet-specific views. Weight 0 in overall (same    */
/*  pattern as FAO/USDA LCC) so they do not shift existing projects'  */
/*  overall_score; they render in score_breakdown and the Section 4   */
/*  label list for actionable water-systems planning.                 */
/* ------------------------------------------------------------------ */

function computeWaterRetention(
  soils: MockLayerResult | undefined,
  wetlands: MockLayerResult | undefined,
  watershedDerived: MockLayerResult | undefined,
  microclimate: MockLayerResult | undefined,
  acreage: number | null,
): ScoredResult {
  const components: ScoreComponent[] = [];
  const sc = layerConfidence(soils);
  const wfc = layerConfidence(wetlands);
  const wdc = layerConfidence(watershedDerived);
  const mc = layerConfidence(microclimate);

  // Soil water storage: AWC × rooting depth (max 20)
  const awc = num(soils, 'awc_cm_cm');
  const rootCm = num(soils, 'rooting_depth_cm');
  const storageCm = awc * rootCm;
  const storagePts = storageCm >= 18 ? 20 : storageCm >= 12 ? 15
    : storageCm >= 6 ? 10 : storageCm > 0 ? 5 : 0;
  components.push(comp('soil_water_storage', storagePts, 20, 'soils', sc));

  // Organic matter (max 15)
  const om = num(soils, 'organic_matter_pct');
  const omPts = om > 5 ? 15 : om > 3 ? 12 : om > 2 ? 8 : om > 1 ? 4 : 0;
  components.push(comp('organic_matter_retention', omPts, 15, 'soils', sc));

  // Pond candidate density per acre (max 20)
  if (watershedDerived && acreage && acreage > 0) {
    const pondCount = nestedNum(watershedDerived, 'pondCandidates.candidateCount');
    const perAcre = pondCount / acreage;
    const pondPts = perAcre >= 0.1 ? 20 : perAcre >= 0.05 ? 14
      : perAcre >= 0.02 ? 8 : perAcre > 0 ? 3 : 0;
    components.push(comp('pond_candidate_density', pondPts, 20, 'watershed_derived', wdc));
  } else {
    components.push(comp('pond_candidate_density', 0, 20, 'watershed_derived', 'low'));
  }

  // Swale candidate density per acre (max 15)
  if (watershedDerived && acreage && acreage > 0) {
    const swaleCount = nestedNum(watershedDerived, 'swaleCandidates.candidateCount');
    const perAcre = swaleCount / acreage;
    const swalePts = perAcre >= 0.2 ? 15 : perAcre >= 0.1 ? 10
      : perAcre >= 0.05 ? 5 : perAcre > 0 ? 2 : 0;
    components.push(comp('swale_candidate_density', swalePts, 15, 'watershed_derived', wdc));
  } else {
    components.push(comp('swale_candidate_density', 0, 15, 'watershed_derived', 'low'));
  }

  // Detention area presence (max 15)
  if (watershedDerived) {
    const detPct = nestedNum(watershedDerived, 'flood.detentionAreaPct');
    const detPts = detPct > 5 ? 15 : detPct > 2 ? 10 : detPct > 0 ? 5 : 0;
    components.push(comp('detention_area_presence', detPts, 15, 'watershed_derived', wdc));
  } else {
    components.push(comp('detention_area_presence', 0, 15, 'watershed_derived', 'low'));
  }

  // Drainage density (max 10) — lower density = slower runoff = better retention
  if (watershedDerived) {
    const ddClass = nested(watershedDerived, 'drainageDensity.drainageDensityClass') as string | undefined;
    const ddPts = ddClass === 'Low' ? 10 : ddClass === 'Moderate' ? 6
      : ddClass === 'High' ? 2 : 0;
    components.push(comp('drainage_density_class', ddPts, 10, 'watershed_derived', wdc));
  } else {
    components.push(comp('drainage_density_class', 0, 10, 'watershed_derived', 'low'));
  }

  // Wetland coverage (max 10)
  const wetlandPct = num(wetlands, 'wetland_pct');
  const wetPts = wetlandPct > 10 ? 10 : wetlandPct > 5 ? 7 : wetlandPct > 2 ? 3 : 0;
  components.push(comp('wetland_coverage', wetPts, 10, 'wetlands_flood', wfc));

  // Microclimate moist-zone dominance (max 5)
  if (microclimate) {
    const dom = nested(microclimate, 'moistureZones.dominantClass') as string | undefined;
    const moistPts = dom === 'moist' ? 5 : dom === 'moderate' ? 3 : dom === 'wet' ? 2 : 0;
    components.push(comp('microclimate_moisture', moistPts, 5, 'microclimate', mc));
  } else {
    components.push(comp('microclimate_moisture', 0, 5, 'microclimate', 'low'));
  }

  return buildResult('Water Retention', 0, components);
}

function computeDroughtResilience(
  soils: MockLayerResult | undefined,
  climate: MockLayerResult | undefined,
  wetlands: MockLayerResult | undefined,
  watershedDerived: MockLayerResult | undefined,
  hydro: {
    waterBalanceMm: number;
    aridityClass: 'Hyperarid' | 'Arid' | 'Semi-arid' | 'Dry sub-humid' | 'Humid';
    rwhPotentialGal: number;
    irrigationDeficitMm: number;
    propertyM2: number;
  } | undefined,
  groundwater: MockLayerResult | undefined,
  waterStress: MockLayerResult | undefined,
  acreage: number | null,
): ScoredResult {
  const components: ScoreComponent[] = [];
  const sc = layerConfidence(soils);
  const cc = layerConfidence(climate);
  const wfc = layerConfidence(wetlands);
  const wdc = layerConfidence(watershedDerived);

  // Aridity buffer (max 20)
  if (hydro) {
    const arPts: Record<string, number> = {
      'Humid': 20, 'Dry sub-humid': 16, 'Semi-arid': 10, 'Arid': 4, 'Hyperarid': 0,
    };
    components.push(comp('aridity_buffer', arPts[hydro.aridityClass] ?? 0, 20, 'climate', cc));
  } else {
    components.push(comp('aridity_buffer', 0, 20, 'climate', 'low'));
  }

  // Water balance surplus (max 15)
  if (hydro) {
    const wb = hydro.waterBalanceMm;
    const wbPts = wb > 200 ? 15 : wb > 0 ? 10 : wb > -100 ? 5 : wb > -300 ? 2 : 0;
    components.push(comp('water_balance_surplus', wbPts, 15, 'climate', cc));
  } else {
    components.push(comp('water_balance_surplus', 0, 15, 'climate', 'low'));
  }

  // Rainwater harvest potential (max 15)
  if (hydro && hydro.propertyM2 > 0) {
    const galPerAcre = hydro.rwhPotentialGal / (hydro.propertyM2 / 4046.86);
    const rwhPts = galPerAcre > 50_000 ? 15 : galPerAcre > 30_000 ? 11
      : galPerAcre > 15_000 ? 7 : galPerAcre > 5_000 ? 3 : 0;
    components.push(comp('rwh_potential', rwhPts, 15, 'climate', cc));
  } else {
    components.push(comp('rwh_potential', 0, 15, 'climate', 'low'));
  }

  // Soil plant-available water (max 15)
  const awc = num(soils, 'awc_cm_cm');
  const rootCm = num(soils, 'rooting_depth_cm');
  const paw = awc * rootCm;
  const pawPts = paw >= 18 ? 15 : paw >= 12 ? 11 : paw >= 6 ? 6 : paw > 0 ? 2 : 0;
  components.push(comp('plant_available_water', pawPts, 15, 'soils', sc));

  // Pond storage capacity (max 10) — on-site storage buffers dry spells
  if (watershedDerived && acreage && acreage > 0) {
    const pondCount = nestedNum(watershedDerived, 'pondCandidates.candidateCount');
    const perAcre = pondCount / acreage;
    const ppts = perAcre >= 0.1 ? 10 : perAcre >= 0.05 ? 7 : perAcre > 0 ? 3 : 0;
    components.push(comp('pond_storage_potential', ppts, 10, 'watershed_derived', wdc));
  } else {
    components.push(comp('pond_storage_potential', 0, 10, 'watershed_derived', 'low'));
  }

  // Groundwater access (max 10) — 3-30m optimal; very shallow or very deep = worse buffer
  if (groundwater) {
    const depthM = num(groundwater, 'groundwater_depth_m');
    const gwPts = depthM === 0 ? 0
      : depthM <= 3 ? 4
      : depthM <= 10 ? 10
      : depthM <= 30 ? 7
      : 3;
    components.push(comp('groundwater_access', gwPts, 10, 'groundwater', layerConfidence(groundwater)));
  } else {
    components.push(comp('groundwater_access', 0, 10, 'groundwater', 'low'));
  }

  // Irrigation-deficit buffer (max 5)
  if (hydro) {
    const defPts = hydro.irrigationDeficitMm === 0 ? 5
      : hydro.irrigationDeficitMm < 100 ? 3
      : hydro.irrigationDeficitMm < 300 ? 1 : 0;
    components.push(comp('irrigation_deficit_buffer', defPts, 5, 'climate', cc));
  } else {
    components.push(comp('irrigation_deficit_buffer', 0, 5, 'climate', 'low'));
  }

  // Wetland refugia (max 5)
  const wetlandPct = num(wetlands, 'wetland_pct');
  const refPts = wetlandPct > 5 ? 5 : wetlandPct > 2 ? 3 : wetlandPct > 0 ? 1 : 0;
  components.push(comp('wetland_refugia', refPts, 5, 'wetlands_flood', wfc));

  // Baseline water stress (penalty max -10)
  if (waterStress) {
    const cls = str(waterStress, 'water_stress_class');
    const wsPts = cls === 'Low' ? 0
      : cls === 'Low-Medium' ? -2
      : cls === 'Medium-High' ? -5
      : cls === 'High' ? -8
      : cls === 'Extremely High' ? -10
      : 0;
    components.push(comp('baseline_water_stress', wsPts, -10, 'water_stress', layerConfidence(waterStress)));
  } else {
    components.push(comp('baseline_water_stress', 0, -10, 'water_stress', 'low'));
  }

  return buildResult('Drought Resilience', 0, components);
}

function computeStormResilience(
  soils: MockLayerResult | undefined,
  wetlands: MockLayerResult | undefined,
  watershedDerived: MockLayerResult | undefined,
  landCover: MockLayerResult | undefined,
  acreage: number | null,
): ScoredResult {
  const components: ScoreComponent[] = [];
  const sc = layerConfidence(soils);
  const wfc = layerConfidence(wetlands);
  const wdc = layerConfidence(watershedDerived);
  const lcc = layerConfidence(landCover);

  // Inverse runoff concentration (max 20) — low concentrated-runoff area = more storm resilient
  if (watershedDerived) {
    const highPct = nestedNum(watershedDerived, 'runoff.highConcentrationPct');
    const rPts = highPct < 2 ? 20 : highPct < 5 ? 15 : highPct < 10 ? 10 : highPct < 20 ? 5 : 0;
    components.push(comp('inverse_runoff_concentration', rPts, 20, 'watershed_derived', wdc));
  } else {
    components.push(comp('inverse_runoff_concentration', 0, 20, 'watershed_derived', 'low'));
  }

  // Swale candidates per acre (max 15) — distributed slow/spread/sink infrastructure
  if (watershedDerived && acreage && acreage > 0) {
    const swaleCount = nestedNum(watershedDerived, 'swaleCandidates.candidateCount');
    const perAcre = swaleCount / acreage;
    const sPts = perAcre >= 0.2 ? 15 : perAcre >= 0.1 ? 10
      : perAcre >= 0.05 ? 6 : perAcre > 0 ? 2 : 0;
    components.push(comp('swale_candidate_density', sPts, 15, 'watershed_derived', wdc));
  } else {
    components.push(comp('swale_candidate_density', 0, 15, 'watershed_derived', 'low'));
  }

  // Detention zones (max 15)
  if (watershedDerived) {
    const zoneCount = nestedNum(watershedDerived, 'flood.detentionZoneCount');
    const areaPct = nestedNum(watershedDerived, 'flood.detentionAreaPct');
    const dPts = zoneCount >= 3 && areaPct >= 3 ? 15
      : zoneCount >= 2 || areaPct >= 2 ? 10
      : zoneCount >= 1 ? 5 : 0;
    components.push(comp('detention_zones', dPts, 15, 'watershed_derived', wdc));
  } else {
    components.push(comp('detention_zones', 0, 15, 'watershed_derived', 'low'));
  }

  // Flood zone penalty (max -20)
  const floodZone = str(wetlands, 'flood_zone').toLowerCase();
  let floodPenalty = 0;
  if (floodZone.includes('ae') || (floodZone.includes('zone a') && !floodZone.includes('minimal'))) {
    floodPenalty = -20;
  } else if (floodZone.includes('x') && floodZone.includes('shaded')) {
    floodPenalty = -8;
  } else if (!floodZone.includes('minimal risk') && !floodZone.includes('not regulated') && floodZone.length > 0 && !floodZone.includes('zone x')) {
    floodPenalty = -10;
  }
  components.push(comp('flood_zone_penalty', floodPenalty, -20, 'wetlands_flood', wfc));

  // Hydrologic group infiltration (max 15) — A=sandy/fast, D=clay/slow
  const hg = str(soils, 'hydrologic_group').toUpperCase();
  const hgPts = hg === 'A' ? 15 : hg === 'B' ? 11 : hg === 'C' ? 6 : hg === 'D' ? 2 : 0;
  components.push(comp('hydrologic_group', hgPts, 15, 'soils', sc));

  // Tree canopy buffer (max 10) — canopy intercepts rainfall intensity
  const canopy = num(landCover, 'tree_canopy_pct');
  const canopyPts = canopy > 40 ? 10 : canopy > 20 ? 7 : canopy > 10 ? 4 : canopy > 0 ? 2 : 0;
  components.push(comp('tree_canopy_buffer', canopyPts, 10, 'land_cover', lcc));

  // Riparian buffer width (max 15)
  const riparian = num(wetlands, 'riparian_buffer_m');
  const ripPts = riparian >= 30 ? 15 : riparian >= 15 ? 10 : riparian >= 5 ? 5 : 0;
  components.push(comp('riparian_buffer', ripPts, 15, 'wetlands_flood', wfc));

  // Drainage class (max 10) — well-drained soils shed storm surcharge
  const drainage = str(soils, 'drainage_class').toLowerCase();
  const drainPts = drainage === 'well drained' ? 10
    : drainage.includes('moderately well') ? 7
    : drainage.includes('somewhat poorly') ? 4
    : drainage.includes('poorly') ? 1 : 5;
  components.push(comp('drainage_class', drainPts, 10, 'soils', sc));

  return buildResult('Storm Resilience', 0, components);
}

/* ------------------------------------------------------------------ */
/*  1k. FAO Land Suitability (S1/S2/S3/N1/N2) — Sprint D              */
/* ------------------------------------------------------------------ */

/**
 * FAO Framework for Land Evaluation (1976, updated 2007).
 * Classifies land into suitability orders and classes based on soil, climate,
 * and terrain limitations for general agricultural use.
 *
 * Classes:
 *   S1 (Highly Suitable)     — no significant limitations, score 85-100
 *   S2 (Moderately Suitable) — moderate limitations, score 60-84
 *   S3 (Marginally Suitable) — severe limitations, score 40-59
 *   N1 (Currently Not Suitable) — limitations correctable, score 20-39
 *   N2 (Permanently Not Suitable) — permanent limitations, score 0-19
 *
 * Each limiting factor is scored independently; the most limiting factor
 * determines the final class (Liebig's law of the minimum).
 */
function computeFAOSuitability(
  soils: MockLayerResult | undefined,
  climate: MockLayerResult | undefined,
  elevation: MockLayerResult | undefined,
): ScoredResult {
  const components: ScoreComponent[] = [];
  const sc = layerConfidence(soils);
  const cc = layerConfidence(climate);
  const ec = layerConfidence(elevation);

  // Factor 1: Soil pH (max 15)
  const ph = num(soils, 'ph');
  const phPts = ph === 0 ? 8 // unknown — assume moderate
    : (ph >= 5.5 && ph <= 7.8) ? 15
    : (ph >= 5.0 && ph <= 8.5) ? 10
    : (ph >= 4.5 && ph <= 9.0) ? 5
    : 2;
  components.push(comp('fao_soil_reaction', phPts, 15, 'soils', sc));

  // Factor 2: Effective rooting depth (max 15)
  const rootDepth = num(soils, 'rooting_depth_cm');
  const rootPts = rootDepth === 0 ? 8
    : rootDepth >= 100 ? 15
    : rootDepth >= 75 ? 12
    : rootDepth >= 50 ? 8
    : rootDepth >= 25 ? 4 : 2;
  components.push(comp('fao_rooting_depth', rootPts, 15, 'soils', sc));

  // Factor 3: Drainage (max 12)
  const drainage = str(soils, 'drainage_class').toLowerCase();
  const drainPts = drainage.includes('well') && !drainage.includes('poorly') && !drainage.includes('moderately') ? 12
    : drainage.includes('moderately well') ? 10
    : drainage.includes('somewhat poorly') || drainage.includes('somewhat excessively') ? 6
    : drainage.includes('poorly') ? 3
    : drainage.includes('excessively') ? 4 : 6;
  components.push(comp('fao_drainage', drainPts, 12, 'soils', sc));

  // Factor 4: Soil texture / AWC (max 12)
  const awc = num(soils, 'awc_cm_cm');
  const awcPts = awc === 0 ? 6
    : awc >= 0.18 ? 12
    : awc >= 0.12 ? 9
    : awc >= 0.08 ? 5 : 2;
  components.push(comp('fao_water_retention', awcPts, 12, 'soils', sc));

  // Factor 5: Salinity/sodicity (max 10)
  const ecVal = num(soils, 'ec_ds_m');
  const sar = num(soils, 'sodium_adsorption_ratio');
  const salPts = (ecVal === 0 && sar === 0) ? 8
    : (ecVal < 2 && sar < 6) ? 10
    : (ecVal < 4 && sar < 10) ? 6
    : (ecVal < 8 && sar < 15) ? 3 : 1;
  components.push(comp('fao_salinity', salPts, 10, 'soils', sc));

  // Factor 6: CEC / fertility (max 10)
  const cec = num(soils, 'cec_meq_100g');
  const cecPts = cec === 0 ? 5
    : cec >= 15 ? 10
    : cec >= 8 ? 7
    : cec >= 4 ? 4 : 2;
  components.push(comp('fao_nutrient_retention', cecPts, 10, 'soils', sc));

  // Factor 7: Slope / topography (max 12)
  const slope = num(elevation, 'mean_slope_deg');
  const slopePts = slope < 3 ? 12
    : slope < 8 ? 10
    : slope < 15 ? 6
    : slope < 25 ? 3 : 1;
  components.push(comp('fao_topography', slopePts, 12, 'elevation', ec));

  // Factor 8: Growing season / thermal regime (max 14)
  const growDays = num(climate, 'growing_season_days');
  const gdd = num(climate, 'growing_degree_days_base10c');
  const thermPts = (growDays === 0 && gdd === 0) ? 7
    : (growDays >= 180 && gdd >= 1500) ? 14
    : (growDays >= 150 && gdd >= 1000) ? 11
    : (growDays >= 120 && gdd >= 700) ? 7
    : (growDays >= 90) ? 4 : 2;
  components.push(comp('fao_thermal_regime', thermPts, 14, 'climate', cc));

  // Use base 0 — score is purely additive from limiting factors
  // Max possible = 100 (15+15+12+12+10+10+12+14)
  const result = buildResult('FAO Land Suitability', 0, components);

  // Override rating with FAO class names
  const s = result.score;
  result.rating = s >= 85 ? 'S1 \u2014 Highly Suitable' as ScoredResult['rating']
    : s >= 60 ? 'S2 \u2014 Moderately Suitable' as ScoredResult['rating']
    : s >= 40 ? 'S3 \u2014 Marginally Suitable' as ScoredResult['rating']
    : s >= 20 ? 'N1 \u2014 Currently Not Suitable' as ScoredResult['rating']
    : 'N2 \u2014 Permanently Not Suitable' as ScoredResult['rating'];

  return result;
}

/* ------------------------------------------------------------------ */
/*  1i. USDA Land Capability Classification (LCC I-VIII) — Sprint D    */
/* ------------------------------------------------------------------ */

/**
 * USDA/NRCS Land Capability Classification System.
 * Eight classes (I-VIII) based on permanent soil/terrain limitations.
 * Classes I-IV: suited to cultivation
 * Class V: wetland/flood limitations (not slope)
 * Classes VI-VII: suited to grazing/forestry
 * Class VIII: recreation/wildlife only
 *
 * The system uses the most limiting factor to assign class.
 * Higher limitation → higher class number → lower score.
 */
function computeUSDALCC(
  soils: MockLayerResult | undefined,
  climate: MockLayerResult | undefined,
  elevation: MockLayerResult | undefined,
): ScoredResult {
  const components: ScoreComponent[] = [];
  const sc = layerConfidence(soils);
  const cc = layerConfidence(climate);
  const ec = layerConfidence(elevation);

  // Subclass suffixes: e=erosion, w=water, s=soil, c=climate
  const limitations: string[] = [];

  // Limitation 1: Slope (max 20) — primary differentiator for LCC
  const slope = num(elevation, 'mean_slope_deg');
  let slopePts: number;
  if (slope < 2) { slopePts = 20; } // Class I range
  else if (slope < 5) { slopePts = 17; } // Class II
  else if (slope < 8) { slopePts = 14; } // Class III
  else if (slope < 15) { slopePts = 10; } // Class IV
  else if (slope < 25) { slopePts = 6; } // Class VI
  else if (slope < 35) { slopePts = 3; } // Class VII
  else { slopePts = 1; } // Class VIII
  if (slope >= 8) limitations.push('e');
  components.push(comp('lcc_slope', slopePts, 20, 'elevation', ec));

  // Limitation 2: Drainage / wetness (max 15)
  const drainage = str(soils, 'drainage_class').toLowerCase();
  let drainPts: number;
  if (drainage.includes('well') && !drainage.includes('poorly') && !drainage.includes('moderately')) {
    drainPts = 15;
  } else if (drainage.includes('moderately well')) {
    drainPts = 12;
  } else if (drainage.includes('somewhat poorly')) {
    drainPts = 8; limitations.push('w');
  } else if (drainage.includes('poorly') && !drainage.includes('very')) {
    drainPts = 4; limitations.push('w');
  } else if (drainage.includes('very poorly')) {
    drainPts = 1; limitations.push('w');
  } else {
    drainPts = 10; // unknown
  }
  components.push(comp('lcc_drainage', drainPts, 15, 'soils', sc));

  // Limitation 3: Effective soil depth (max 15)
  const rootDepth = num(soils, 'rooting_depth_cm');
  let depthPts: number;
  if (rootDepth === 0) { depthPts = 8; }
  else if (rootDepth >= 100) { depthPts = 15; }
  else if (rootDepth >= 75) { depthPts = 12; }
  else if (rootDepth >= 50) { depthPts = 9; }
  else if (rootDepth >= 25) { depthPts = 5; limitations.push('s'); }
  else { depthPts = 2; limitations.push('s'); }
  components.push(comp('lcc_soil_depth', depthPts, 15, 'soils', sc));

  // Limitation 4: Texture / permeability (max 12)
  const clay = num(soils, 'clay_pct');
  const sand = num(soils, 'sand_pct');
  let texPts: number;
  if (clay === 0 && sand === 0) { texPts = 7; }
  else if (clay >= 40 || sand >= 85) { texPts = 5; limitations.push('s'); } // extreme texture
  else if (clay >= 35 || sand >= 70) { texPts = 8; }
  else { texPts = 12; } // loam range
  components.push(comp('lcc_texture', texPts, 12, 'soils', sc));

  // Limitation 5: Erosion hazard (max 12)
  const kfact = num(soils, 'kfact');
  // K-factor: 0.02 (low) to 0.69 (high erodibility)
  // Combined with slope for erosion risk
  const erosionRisk = kfact > 0 ? kfact * (1 + slope / 10) : slope / 10;
  let erosPts: number;
  if (erosionRisk < 0.1) { erosPts = 12; }
  else if (erosionRisk < 0.3) { erosPts = 10; }
  else if (erosionRisk < 0.5) { erosPts = 7; }
  else if (erosionRisk < 1.0) { erosPts = 4; limitations.push('e'); }
  else { erosPts = 2; limitations.push('e'); }
  components.push(comp('lcc_erosion_hazard', erosPts, 12, 'elevation', ec));

  // Limitation 6: Salinity (max 8)
  const ecSoil = num(soils, 'ec_ds_m');
  let salPts: number;
  if (ecSoil === 0) { salPts = 6; }
  else if (ecSoil < 2) { salPts = 8; }
  else if (ecSoil < 4) { salPts = 5; limitations.push('s'); }
  else if (ecSoil < 8) { salPts = 3; limitations.push('s'); }
  else { salPts = 1; limitations.push('s'); }
  components.push(comp('lcc_salinity', salPts, 8, 'soils', sc));

  // Limitation 7: Climate severity (max 10)
  const growDays = num(climate, 'growing_season_days');
  let climPts: number;
  if (growDays === 0) { climPts = 5; }
  else if (growDays >= 180) { climPts = 10; }
  else if (growDays >= 150) { climPts = 8; }
  else if (growDays >= 120) { climPts = 6; }
  else if (growDays >= 90) { climPts = 4; limitations.push('c'); }
  else { climPts = 2; limitations.push('c'); }
  components.push(comp('lcc_climate_severity', climPts, 10, 'climate', cc));

  // Limitation 8: AWC / drought susceptibility (max 8)
  const awc = num(soils, 'awc_cm_cm');
  let awcPts: number;
  if (awc === 0) { awcPts = 4; }
  else if (awc >= 0.18) { awcPts = 8; }
  else if (awc >= 0.12) { awcPts = 6; }
  else if (awc >= 0.08) { awcPts = 3; limitations.push('s'); }
  else { awcPts = 1; limitations.push('s'); }
  components.push(comp('lcc_drought_susceptibility', awcPts, 8, 'soils', sc));

  // Build result — max 100 (20+15+15+12+12+8+10+8)
  const result = buildResult('USDA Land Capability', 0, components);

  // Map score to LCC class + subclass
  const s = result.score;
  const uniqueLimitations = [...new Set(limitations)];
  const subclass = uniqueLimitations.length > 0 ? uniqueLimitations[0] : '';

  let lccClass: string;
  if (s >= 90) lccClass = 'I';
  else if (s >= 78) lccClass = 'II';
  else if (s >= 66) lccClass = 'III';
  else if (s >= 54) lccClass = 'IV';
  else if (s >= 45 && uniqueLimitations.includes('w') && !uniqueLimitations.includes('e')) lccClass = 'V';
  else if (s >= 42) lccClass = 'VI';
  else if (s >= 28) lccClass = 'VII';
  else lccClass = 'VIII';

  const classLabel = lccClass + (subclass && lccClass !== 'I' ? subclass : '');
  const useDesc = ['I', 'II', 'III', 'IV'].includes(lccClass) ? 'Suited to cultivation'
    : lccClass === 'V' ? 'Wetland/flood limitations'
    : ['VI', 'VII'].includes(lccClass) ? 'Grazing/forestry'
    : 'Recreation/wildlife only';

  result.rating = `Class ${classLabel} \u2014 ${useDesc}` as ScoredResult['rating'];

  return result;
}

/* ------------------------------------------------------------------ */
/*  1j. Canada Soil Capability Classification (Sprint I)               */
/* ------------------------------------------------------------------ */

/**
 * Canada Soil Capability for Agriculture (AAFC CLI framework).
 * Class 1 (no significant limitations) through Class 7 (no capability).
 * Subclass notation: T=topography, W=wetness, I=inundation, D=soil depth,
 * F=low fertility, M=moisture deficit, P=stoniness, R=bedrock, E=erosion.
 *
 * Same 8-limitation model as USDA LCC but with Canadian-specific thresholds
 * per the AAFC "Soil Capability for Agriculture" handbook.
 */
function computeCanadaSoilCapability(
  soils: MockLayerResult | undefined,
  climate: MockLayerResult | undefined,
  elevation: MockLayerResult | undefined,
): ScoredResult {
  const components: ScoreComponent[] = [];
  const sc = layerConfidence(soils);
  const cc = layerConfidence(climate);
  const ec = layerConfidence(elevation);
  const limitations: string[] = [];

  // Limitation 1: Slope / topography (max 20) — AAFC slope classes
  // CA uses % slope; convert from degrees: tan(deg) × 100
  const slopeDeg = num(elevation, 'mean_slope_deg');
  const slopePct = Math.tan(slopeDeg * Math.PI / 180) * 100;
  let slopePts: number;
  if (slopePct < 2) { slopePts = 20; }       // Class 1
  else if (slopePct < 5) { slopePts = 17; }  // Class 2
  else if (slopePct < 9) { slopePts = 14; }  // Class 3
  else if (slopePct < 15) { slopePts = 10; } // Class 4
  else if (slopePct < 30) { slopePts = 6; }  // Class 5
  else if (slopePct < 60) { slopePts = 3; }  // Class 6
  else { slopePts = 1; }                     // Class 7
  if (slopePct >= 9) limitations.push('T');
  components.push(comp('cscs_slope', slopePts, 20, 'elevation', ec));

  // Limitation 2: Drainage / wetness (max 15)
  const drainage = str(soils, 'drainage_class').toLowerCase();
  let drainPts: number;
  if (drainage.includes('well') && !drainage.includes('poorly') && !drainage.includes('moderately') && !drainage.includes('imperfect')) {
    drainPts = 15;          // Class 1
  } else if (drainage.includes('moderately well')) {
    drainPts = 12;          // Class 2
  } else if (drainage.includes('imperfect')) {
    drainPts = 9;           // Class 3
    limitations.push('W');
  } else if (drainage.includes('poorly') && !drainage.includes('very')) {
    drainPts = 5;           // Class 4-5
    limitations.push('W');
  } else if (drainage.includes('very poorly')) {
    drainPts = 2;           // Class 6-7
    limitations.push('W');
  } else {
    drainPts = 10;          // unknown
  }
  components.push(comp('cscs_drainage', drainPts, 15, 'soils', sc));

  // Limitation 3: Effective soil depth (max 15) — AAFC rooting depth classes
  const rootDepth = num(soils, 'rooting_depth_cm');
  let depthPts: number;
  if (rootDepth === 0) { depthPts = 8; }         // unknown
  else if (rootDepth >= 100) { depthPts = 15; }  // Class 1
  else if (rootDepth >= 75) { depthPts = 12; }   // Class 2
  else if (rootDepth >= 50) { depthPts = 9; }    // Class 3
  else if (rootDepth >= 25) { depthPts = 5; limitations.push('D'); }  // Class 4-5
  else { depthPts = 2; limitations.push('D'); }  // Class 6-7
  components.push(comp('cscs_soil_depth', depthPts, 15, 'soils', sc));

  // Limitation 4: Texture / permeability (max 12) — coarse or heavy → limitation
  const clay = num(soils, 'clay_pct');
  const sand = num(soils, 'sand_pct');
  let texPts: number;
  if (clay === 0 && sand === 0) { texPts = 7; }
  else if (clay >= 60) { texPts = 3; limitations.push('D'); }    // very heavy clay
  else if (clay >= 40 || sand >= 85) { texPts = 5; }             // heavy clay or sand
  else if (clay >= 35 || sand >= 70) { texPts = 8; }             // moderately limiting
  else { texPts = 12; }                                          // loam range (ideal)
  components.push(comp('cscs_texture', texPts, 12, 'soils', sc));

  // Limitation 5: Erosion hazard (max 12) — same model as USDA, Canadian context
  const kfact = num(soils, 'kfact');
  const erosionRisk = kfact > 0 ? kfact * (1 + slopeDeg / 10) : slopeDeg / 10;
  let erosPts: number;
  if (erosionRisk < 0.1) { erosPts = 12; }
  else if (erosionRisk < 0.3) { erosPts = 10; }
  else if (erosionRisk < 0.5) { erosPts = 7; }
  else if (erosionRisk < 1.0) { erosPts = 4; limitations.push('E'); }
  else { erosPts = 2; limitations.push('E'); }
  components.push(comp('cscs_erosion_hazard', erosPts, 12, 'elevation', ec));

  // Limitation 6: Salinity (max 8)
  const ecSoil = num(soils, 'ec_ds_m');
  let salPts: number;
  if (ecSoil === 0) { salPts = 6; }        // unknown
  else if (ecSoil < 2) { salPts = 8; }     // non-saline
  else if (ecSoil < 4) { salPts = 5; }     // slightly saline
  else if (ecSoil < 8) { salPts = 3; limitations.push('F'); }  // moderately saline
  else { salPts = 1; limitations.push('F'); }                   // severely saline
  components.push(comp('cscs_salinity', salPts, 8, 'soils', sc));

  // Limitation 7: Climate severity (max 10) — Canadian frost-free period thresholds
  // Canada's shorter growing seasons make climate a bigger factor
  const growDays = num(climate, 'growing_season_days');
  let climPts: number;
  if (growDays === 0) { climPts = 5; }          // unknown
  else if (growDays >= 200) { climPts = 10; }   // Class 1 (southern Ontario, BC coast)
  else if (growDays >= 160) { climPts = 8; }    // Class 2
  else if (growDays >= 120) { climPts = 6; }    // Class 3
  else if (growDays >= 90) { climPts = 4; limitations.push('M'); }  // Class 4
  else if (growDays >= 60) { climPts = 2; limitations.push('M'); }  // Class 5-6
  else { climPts = 1; limitations.push('M'); }  // Class 7
  components.push(comp('cscs_climate_severity', climPts, 10, 'climate', cc));

  // Limitation 8: AWC / moisture deficit (max 8)
  const awc = num(soils, 'awc_cm_cm');
  let awcPts: number;
  if (awc === 0) { awcPts = 4; }         // unknown
  else if (awc >= 0.18) { awcPts = 8; }  // excellent
  else if (awc >= 0.12) { awcPts = 6; }  // good
  else if (awc >= 0.08) { awcPts = 3; limitations.push('M'); }
  else { awcPts = 1; limitations.push('M'); }
  components.push(comp('cscs_moisture', awcPts, 8, 'soils', sc));

  // Build result — max 100 (20+15+15+12+12+8+10+8)
  const result = buildResult('Canada Soil Capability', 0, components);

  // Map score to CSCS Class 1-7
  const score = result.score;
  const uniqueLimitations = [...new Set(limitations)];
  // Primary subclass: most severe limitation
  const subclass = uniqueLimitations.length >= 2 ? 'X'
    : uniqueLimitations.length === 1 ? uniqueLimitations[0]!
    : '';

  let cscsClass: number;
  if (score >= 90) cscsClass = 1;
  else if (score >= 78) cscsClass = 2;
  else if (score >= 66) cscsClass = 3;
  else if (score >= 54) cscsClass = 4;
  else if (score >= 42) cscsClass = 5;
  else if (score >= 28) cscsClass = 6;
  else cscsClass = 7;

  const classLabel = `${cscsClass}${subclass && cscsClass > 1 ? subclass : ''}`;
  const useDesc = cscsClass === 1 ? 'No significant limitations'
    : cscsClass === 2 ? 'Minor limitations'
    : cscsClass === 3 ? 'Moderately severe limitations'
    : cscsClass === 4 ? 'Severe limitations'
    : cscsClass === 5 ? 'Forage crops only'
    : cscsClass === 6 ? 'Natural pasture only'
    : 'No capability for agriculture';

  result.rating = `Class ${classLabel} \u2014 ${useDesc}` as ScoredResult['rating'];

  return result;
}

/* ------------------------------------------------------------------ */
/*  2. computeOverallScore                                             */
/* ------------------------------------------------------------------ */

const WEIGHTS: Record<string, number> = {
  'Water Resilience': 0.15,
  'Agricultural Suitability': 0.15,
  'Regenerative Potential': 0.15,
  'Buildability': 0.12,
  'Habitat Sensitivity': 0.10,
  'Stewardship Readiness': 0.18,
  'Design Complexity': 0.10,
  'Community Suitability': 0.05,
};

export function computeOverallScore(scores: ScoredResult[], weights?: number[]): number {
  let total = 0;
  let weightSum = 0;
  for (let i = 0; i < scores.length; i++) {
    const sc = scores[i]!;
    // Sprint BF: optional AHP-derived positional weight override (same order as computeAssessmentScores output)
    const w = weights && weights[i] != null ? weights[i]! : (WEIGHTS[sc.label] ?? 0);
    // Design Complexity is inverted — high complexity reduces overall score
    const effectiveScore = sc.label === 'Design Complexity' ? (100 - sc.score) : sc.score;
    total += effectiveScore * w;
    weightSum += w;
  }
  return weightSum > 0 ? Math.round(total / weightSum) : 0;
}

/* ------------------------------------------------------------------ */
/*  3. deriveDataLayerRows                                             */
/* ------------------------------------------------------------------ */

export function deriveDataLayerRows(layers: MockLayerResult[]): DataLayerRow[] {
  const elevation = layerByType(layers, 'elevation');
  const climate = layerByType(layers, 'climate');
  const soilsLayer = layerByType(layers, 'soils');
  const landCover = layerByType(layers, 'land_cover');
  const wetlands = layerByType(layers, 'wetlands_flood');

  const rows: DataLayerRow[] = [];

  // Elevation
  if (elevation) {
    const min = s(elevation, 'min_elevation_m');
    const max = s(elevation, 'max_elevation_m');
    rows.push({
      label: 'Elevation',
      value: `${min}\u2013${max} m asl`,
      confidence: normalizeConfidence(elevation.confidence),
    });
  }

  // Rainfall
  if (climate) {
    rows.push({
      label: 'Rainfall',
      value: `${s(climate, 'annual_precip_mm')} mm/year`,
      confidence: normalizeConfidence(climate.confidence),
    });
  }

  // Soil Type
  if (soilsLayer) {
    rows.push({
      label: 'Soil Type',
      value: `${s(soilsLayer, 'predominant_texture')}`,
      confidence: normalizeConfidence(soilsLayer.confidence),
    });
  }

  // Slope
  if (elevation) {
    const slope = s(elevation, 'mean_slope_deg');
    rows.push({
      label: 'Slope',
      value: slope != null ? `${slope}\u00B0` : 'Not detected',
      confidence: normalizeConfidence(elevation.confidence),
    });
  }

  // Frost Free Days
  if (climate) {
    rows.push({
      label: 'Frost Free Days',
      value: `${s(climate, 'growing_season_days')} days`,
      confidence: normalizeConfidence(climate.confidence),
    });
  }

  // Tree Cover
  if (landCover) {
    rows.push({
      label: 'Tree Cover',
      value: `${s(landCover, 'tree_canopy_pct')}%`,
      confidence: normalizeConfidence(landCover.confidence),
    });
  }

  // Wetland Presence
  if (wetlands) {
    const wp = num(wetlands, 'wetland_pct');
    rows.push({
      label: 'Wetland Presence',
      value: wp > 0 ? 'Present' : 'Absent',
      confidence: normalizeConfidence(wetlands.confidence),
    });
  }

  // Floodplain
  if (wetlands) {
    rows.push({
      label: 'Floodplain',
      value: str(wetlands, 'flood_zone') || 'Unknown',
      confidence: normalizeConfidence(wetlands.confidence),
    });
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/*  4. deriveLiveDataRows                                              */
/* ------------------------------------------------------------------ */

export function deriveLiveDataRows(layers: MockLayerResult[]): LiveDataRow[] {
  const elevation = layerByType(layers, 'elevation');
  const climate = layerByType(layers, 'climate');
  const soilsLayer = layerByType(layers, 'soils');
  const wetlands = layerByType(layers, 'wetlands_flood');
  const watershed = layerByType(layers, 'watershed');

  const rows: LiveDataRow[] = [];

  // Phase 3 UX: dominant reason the confidence is what it is — chosen
  // to match what the user most wants to know about the layer.
  // - freshness  → temporally-sensitive layers (climate)
  // - resolution → geometrically-sensitive layers (elevation, wetlands, hydro)
  // - authority  → catalog/survey layers (soils)

  // Elevation
  if (elevation) {
    rows.push({
      icon: 'elevation',
      label: 'Elevation',
      value: `${s(elevation, 'min_elevation_m')}\u2013${s(elevation, 'max_elevation_m')} m`,
      confidence: normalizeConfidence(elevation.confidence),
      color: semantic.textSubtle,
      source: elevation.sourceApi,
      dataDate: elevation.dataDate,
      reason: 'resolution',
    });
  }

  // Climate
  if (climate) {
    rows.push({
      icon: 'climate',
      label: 'Climate',
      value: `${s(climate, 'annual_precip_mm')} mm/yr \u00B7 ${s(climate, 'growing_season_days')} frost-free`,
      detail: `Hardiness zone ${s(climate, 'hardiness_zone')}`,
      confidence: normalizeConfidence(climate.confidence),
      color: confidence.high,
      source: climate.sourceApi,
      dataDate: climate.dataDate,
      reason: 'freshness',
    });
  }

  // Soil
  if (soilsLayer) {
    rows.push({
      icon: 'soil',
      label: 'Soil',
      value: `${s(soilsLayer, 'predominant_texture')}, ${s(soilsLayer, 'drainage_class')}`,
      detail: `${s(soilsLayer, 'farmland_class')}`,
      confidence: normalizeConfidence(soilsLayer.confidence),
      color: semantic.textSubtle,
      source: soilsLayer.sourceApi,
      dataDate: soilsLayer.dataDate,
      reason: 'authority',
    });
  }

  // Wetlands
  if (wetlands) {
    const wp = num(wetlands, 'wetland_pct');
    rows.push({
      icon: 'wetlands',
      label: 'Wetlands',
      value: wp > 0 ? `${wp}% of area` : 'None detected',
      confidence: normalizeConfidence(wetlands.confidence),
      color: water[400],
      source: wetlands.sourceApi,
      dataDate: wetlands.dataDate,
      reason: 'resolution',
    });
  }

  // Hydrology
  if (watershed) {
    const stream = num(watershed, 'nearest_stream_m');
    rows.push({
      icon: 'hydrology',
      label: 'Hydrology',
      value: stream > 0 ? `${stream}m to nearest stream` : 'No streams detected',
      confidence: normalizeConfidence(watershed.confidence),
      color: water[400],
      source: watershed.sourceApi,
      dataDate: watershed.dataDate,
      reason: 'resolution',
    });
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/*  5. deriveOpportunities                                             */
/* ------------------------------------------------------------------ */

export function deriveOpportunities(
  layers: MockLayerResult[],
  country: string,
): AssessmentFlag[] {
  return evaluateAssessmentRules(layers, country).opportunities;
}

/* ------------------------------------------------------------------ */
/*  6. deriveRisks                                                     */
/* ------------------------------------------------------------------ */

export function deriveRisks(
  layers: MockLayerResult[],
  country: string,
): AssessmentFlag[] {
  return evaluateAssessmentRules(layers, country).risks;
}

/* ------------------------------------------------------------------ */
/*  7. deriveSiteSummary                                               */
/* ------------------------------------------------------------------ */

export function deriveSiteSummary(
  layers: MockLayerResult[],
  project: {
    name: string;
    acreage: number | null;
    provinceState: string | null;
    country: string;
  },
): string {
  const elevation = layerByType(layers, 'elevation');
  const soilsLayer = layerByType(layers, 'soils');
  const landCover = layerByType(layers, 'land_cover');
  const wetlands = layerByType(layers, 'wetlands_flood');
  const watershed = layerByType(layers, 'watershed');
  const climate = layerByType(layers, 'climate');

  const parts: string[] = [];

  // Sentence 1: overview
  const acreStr = project.acreage != null ? `${project.acreage}-acre` : '';
  const locStr = project.provinceState
    ? `in ${project.provinceState}`
    : '';
  const elevMin = s(elevation, 'min_elevation_m');
  const elevMax = s(elevation, 'max_elevation_m');
  const elevRange =
    elevMin != null && elevMax != null
      ? `, ranging from ${elevMin} to ${elevMax} m in elevation`
      : '';

  parts.push(
    `${project.name} is a ${acreStr} ${locStr} property${elevRange}.`.replace(
      /\s{2,}/g,
      ' ',
    ),
  );

  // Sentence 2: soils and land cover
  const texture = str(soilsLayer, 'predominant_texture');
  const treeCanopy = num(landCover, 'tree_canopy_pct');
  const drainageClass = str(soilsLayer, 'drainage_class').toLowerCase();
  const soilDetail = texture ? `${texture} soils with ${drainageClass} drainage` : 'varied soils';
  const coverDetail = treeCanopy > 0 ? ` and ${treeCanopy}% tree canopy cover` : '';
  parts.push(`The site features ${soilDetail}${coverDetail}.`);

  // Sentence 3: notable features
  const features: string[] = [];
  const wetlandPct = num(wetlands, 'wetland_pct');
  if (wetlandPct > 0) features.push(`${wetlandPct}% wetland coverage`);
  const nearStream = num(watershed, 'nearest_stream_m');
  if (nearStream > 0) features.push(`a stream within ${nearStream}m`);
  const precip = num(climate, 'annual_precip_mm');
  if (precip > 0) features.push(`${precip} mm annual rainfall`);

  if (features.length > 0) {
    parts.push(
      `Key features include ${features.join(', ')}.`,
    );
  }

  return parts.join(' ');
}

/* ------------------------------------------------------------------ */
/*  8. deriveLandWants                                                 */
/* ------------------------------------------------------------------ */

export function deriveLandWants(layers: MockLayerResult[]): string {
  const soilsLayer = layerByType(layers, 'soils');
  const elevation = layerByType(layers, 'elevation');
  const landCover = layerByType(layers, 'land_cover');
  const wetlands = layerByType(layers, 'wetlands_flood');

  const drainage = str(soilsLayer, 'drainage_class').toLowerCase();
  const om = num(soilsLayer, 'organic_matter_pct');
  const meanSlope = num(elevation, 'mean_slope_deg');
  const treeCanopy = num(landCover, 'tree_canopy_pct');
  const wetlandPct = num(wetlands, 'wetland_pct');
  const impervious = num(landCover, 'impervious_pct');

  const classes = s(landCover, 'classes');
  const classNames = classes && typeof classes === 'object' ? Object.keys(classes) : [];
  const hasCropland = classNames.some((c) => c.toLowerCase().includes('crop'));
  const hasForest = classNames.some((c) => c.toLowerCase().includes('forest'));

  const sentences: string[] = [];

  // Core want based on soil + water dynamics
  if (
    (drainage.includes('poor') || drainage.includes('imperfect')) &&
    om > 2
  ) {
    sentences.push(
      'This land wants to slow water down and rebuild its soil biology, letting organic matter accumulate in the low places where moisture gathers.',
    );
  } else if (meanSlope > 10 && hasForest) {
    sentences.push(
      'This land wants erosion protection and forest continuity, holding its steep ground together with deep roots and unbroken canopy.',
    );
  } else if (hasCropland && treeCanopy < 15) {
    sentences.push(
      'This land wants diversification and hedgerow restoration, breaking up open cropland with shelterbelts that bring back pollinators and soil life.',
    );
  } else if (drainage === 'well drained' && om > 3) {
    sentences.push(
      'This land wants to deepen its relationship with the living soil, channeling its good drainage and rich organic matter toward perennial roots and diverse cover.',
    );
  } else {
    sentences.push(
      'This land wants attentive stewardship that listens to its contours and follows the water, building fertility where the ground is willing.',
    );
  }

  // Wetland narrative
  if (wetlandPct > 2) {
    sentences.push(
      'Its wetland edges are asking for riparian corridor protection — wider buffers, native plantings, and room for water to meander.',
    );
  }

  // Canopy narrative
  if (treeCanopy > 30 && hasForest) {
    sentences.push(
      'The existing forest canopy is a strength to be conserved, offering shade, wildlife passage, and a carbon bank that only grows more valuable with time.',
    );
  } else if (treeCanopy > 0 && treeCanopy <= 15) {
    sentences.push(
      'There is room for more trees here — strategically placed windbreaks and silvopasture alleys would knit the landscape together.',
    );
  }

  // Impervious balance
  if (impervious > 10) {
    sentences.push(
      'Where hard surfaces already exist, the land wants permeable alternatives and rain gardens to let water return to the soil.',
    );
  }

  // Keep to 3-4 sentences max
  return sentences.slice(0, 4).join(' ');
}
