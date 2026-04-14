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

import type { AssessmentFlag } from '@ogden/shared';
import type { MockLayerResult } from './mockLayerData.js';
import { evaluateAssessmentRules } from './rules/index.js';
import { semantic, confidence, water } from './tokens.js';

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
}

/** Backwards-compatible alias — SiteIntelligencePanel uses this type name */
export type AssessmentScore = ScoredResult;

export interface DataLayerRow {
  label: string;
  value: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface LiveDataRow {
  icon: string;
  label: string;
  value: string;
  detail?: string;
  confidence: 'High' | 'Medium' | 'Low';
  color: string;
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
    computedAt: new Date().toISOString(),
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
): ScoredResult[] {
  const climate = layerByType(layers, 'climate');
  const watershed = layerByType(layers, 'watershed');
  const wetlands = layerByType(layers, 'wetlands_flood');
  const soils = layerByType(layers, 'soils');
  const elevation = layerByType(layers, 'elevation');
  const landCover = layerByType(layers, 'land_cover');
  const zoning = layerByType(layers, 'zoning');

  // Tier 3 derived layers (may be absent)
  const watershedDerived = layerByType(layers, 'watershed_derived');
  const microclimate = layerByType(layers, 'microclimate');
  const soilRegen = layerByType(layers, 'soil_regeneration');
  const terrain = layerByType(layers, 'terrain_analysis');

  return [
    computeWaterResilience(climate, watershed, wetlands, watershedDerived, microclimate),
    computeAgriculturalSuitability(soils, climate, elevation, microclimate),
    computeRegenerativePotential(landCover, soils, soilRegen),
    computeBuildability(elevation, wetlands, soils, terrain),
    computeHabitatSensitivity(wetlands, landCover, terrain, soilRegen, microclimate),
    computeStewardshipReadiness(soils, watershed, wetlands, landCover, soilRegen, microclimate),
    computeDesignComplexity(elevation, wetlands, zoning, terrain),
  ];
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
  const phVal = num(soils, 'ph_value');
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

  return buildResult('Agricultural Suitability', 30, components);
}

/* ------------------------------------------------------------------ */
/*  1c. Regenerative Potential                                         */
/* ------------------------------------------------------------------ */

function computeRegenerativePotential(
  landCover: MockLayerResult | undefined,
  soils: MockLayerResult | undefined,
  soilRegen: MockLayerResult | undefined,
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
): ScoredResult {
  const components: ScoreComponent[] = [];
  const ec = layerConfidence(elevation);
  const wfc = layerConfidence(wetlands);
  const sc = layerConfidence(soils);
  const tc = layerConfidence(terrain);

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

  return buildResult('Buildability', 75, components);
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
): ScoredResult {
  const components: ScoreComponent[] = [];
  const wfc = layerConfidence(wetlands);
  const lc = layerConfidence(landCover);
  const tc = layerConfidence(terrain);
  const src = layerConfidence(soilRegen);
  const mc = layerConfidence(microclimate);

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
  components.push(comp('salinity_penalty', salPenalty, 0, 'soils', sc));

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

  return buildResult('Stewardship Readiness', 25, components);
}

/* ------------------------------------------------------------------ */
/*  1g. Design Complexity (NEW)                                        */
/* ------------------------------------------------------------------ */

function computeDesignComplexity(
  elevation: MockLayerResult | undefined,
  wetlands: MockLayerResult | undefined,
  zoning: MockLayerResult | undefined,
  terrain: MockLayerResult | undefined,
): ScoredResult {
  const components: ScoreComponent[] = [];
  const ec = layerConfidence(elevation);
  const wfc = layerConfidence(wetlands);
  const zc = layerConfidence(zoning);
  const tc = layerConfidence(terrain);

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

  // Zoning restrictions (max 12)
  const zoningClass = str(zoning, 'zoning_class').toLowerCase();
  const setbacks = num(zoning, 'setback_m');
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

  // Utility access indicators (max 8)
  const utilityAccess = str(zoning, 'utility_access').toLowerCase();
  const roadDist = num(zoning, 'road_distance_m');
  const utilPts = (utilityAccess.includes('none') || utilityAccess.includes('off-grid') ? 8
    : utilityAccess.includes('partial') ? 4 : 0) +
    (roadDist > 500 ? 4 : roadDist > 200 ? 2 : 0);
  components.push(comp('utility_access_difficulty', Math.min(8, utilPts), 8, 'zoning', zc));

  return buildResult('Design Complexity', 20, components);
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
  'Design Complexity': 0.15,
};

export function computeOverallScore(scores: ScoredResult[]): number {
  let total = 0;
  let weightSum = 0;
  for (const sc of scores) {
    const w = WEIGHTS[sc.label] ?? 0;
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

  // Elevation
  if (elevation) {
    rows.push({
      icon: '\u25B2',
      label: 'Elevation',
      value: `${s(elevation, 'min_elevation_m')}\u2013${s(elevation, 'max_elevation_m')} m`,
      confidence: normalizeConfidence(elevation.confidence),
      color: semantic.textSubtle,
    });
  }

  // Climate
  if (climate) {
    rows.push({
      icon: '\u25CF',
      label: 'Climate',
      value: `${s(climate, 'annual_precip_mm')} mm/yr \u00B7 ${s(climate, 'growing_season_days')} frost-free`,
      detail: `Hardiness zone ${s(climate, 'hardiness_zone')}`,
      confidence: normalizeConfidence(climate.confidence),
      color: confidence.high,
    });
  }

  // Soil
  if (soilsLayer) {
    rows.push({
      icon: '\u25C9',
      label: 'Soil',
      value: `${s(soilsLayer, 'predominant_texture')}, ${s(soilsLayer, 'drainage_class')}`,
      detail: `${s(soilsLayer, 'farmland_class')}`,
      confidence: normalizeConfidence(soilsLayer.confidence),
      color: semantic.textSubtle,
    });
  }

  // Wetlands
  if (wetlands) {
    const wp = num(wetlands, 'wetland_pct');
    rows.push({
      icon: '\u224B',
      label: 'Wetlands',
      value: wp > 0 ? `${wp}% of area` : 'None detected',
      confidence: normalizeConfidence(wetlands.confidence),
      color: water[400],
    });
  }

  // Hydrology
  if (watershed) {
    const stream = num(watershed, 'nearest_stream_m');
    rows.push({
      icon: '\u223F',
      label: 'Hydrology',
      value: stream > 0 ? `${stream}m to nearest stream` : 'No streams detected',
      confidence: normalizeConfidence(watershed.confidence),
      color: water[400],
    });
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/*  5. deriveOpportunities                                             */
/* ------------------------------------------------------------------ */

export function deriveOpportunities(
  layers: MockLayerResult[],
  country: 'US' | 'CA',
): AssessmentFlag[] {
  return evaluateAssessmentRules(layers, country).opportunities;
}

/* ------------------------------------------------------------------ */
/*  6. deriveRisks                                                     */
/* ------------------------------------------------------------------ */

export function deriveRisks(
  layers: MockLayerResult[],
  country: 'US' | 'CA',
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
