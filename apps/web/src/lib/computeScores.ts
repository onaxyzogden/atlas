/**
 * Score computation module — pure functions that derive assessment scores,
 * opportunities, risks, and narrative summaries from environmental layer data.
 *
 * No side effects, no API calls. All functions are deterministic given their inputs.
 */

import type { AssessmentFlag } from '@ogden/shared';
import type { MockLayerResult } from './mockLayerData.js';
import { evaluateAssessmentRules } from './rules/index.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AssessmentScore {
  label: string;
  score: number;
  rating: 'Exceptional' | 'Good' | 'Moderate' | 'Low' | 'Insufficient Data';
}

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
): AssessmentScore['rating'] {
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
  return layers.find((l) => l.layer_type === type);
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

/* ------------------------------------------------------------------ */
/*  1. computeAssessmentScores                                         */
/* ------------------------------------------------------------------ */

export function computeAssessmentScores(
  layers: MockLayerResult[],
  acreage: number | null,
): AssessmentScore[] {
  const climate = layerByType(layers, 'climate');
  const watershed = layerByType(layers, 'watershed');
  const wetlands = layerByType(layers, 'wetlands_flood');
  const soils = layerByType(layers, 'soils');
  const elevation = layerByType(layers, 'elevation');
  const landCover = layerByType(layers, 'land_cover');

  // --- Water Resilience ---
  let water = 50;
  const precip = num(climate, 'annual_precip_mm');
  if (precip > 800) water += 10;
  else if (precip > 600) water += 5;

  const wetlandPct = num(wetlands, 'wetland_pct');
  if (wetlandPct > 5) water += 10;
  else if (wetlandPct > 2) water += 5;

  const riparian = num(wetlands, 'riparian_buffer_m');
  if (riparian >= 30) water += 8;

  const floodZone = str(wetlands, 'flood_zone').toLowerCase();
  if (!floodZone.includes('minimal risk') && !floodZone.includes('not regulated')) {
    water -= 10;
  }

  const nearestStream = num(watershed, 'nearest_stream_m');
  if (nearestStream > 0 && nearestStream <= 500) water += 7;

  water = clamp(water);

  // --- Agricultural Suitability ---
  let ag = 40;
  const drainage = str(soils, 'drainage_class').toLowerCase();
  if (drainage === 'well drained') ag += 15;
  else if (drainage.includes('moderately well')) ag += 8;

  const om = num(soils, 'organic_matter_pct');
  if (om > 3) ag += 8;
  else if (om > 2) ag += 4;

  const farmland = str(soils, 'farmland_class').toLowerCase();
  if (farmland.includes('prime') || farmland.includes('class 1') || farmland.includes('class 2')) {
    ag += 15;
  } else if (farmland.includes('class 3')) {
    ag += 8;
  }

  const frostFree = num(climate, 'growing_season_days');
  if (frostFree > 150) ag += 8;
  else if (frostFree > 120) ag += 4;

  const meanSlope = num(elevation, 'mean_slope_deg');
  if (meanSlope < 5) ag += 5;
  else if (meanSlope < 10) ag += 2;
  else if (meanSlope >= 15) ag -= 10;

  ag = clamp(ag);

  // --- Regenerative Potential ---
  let regen = 45;
  const treeCanopy = num(landCover, 'tree_canopy_pct');
  if (treeCanopy > 30) regen += 12;
  else if (treeCanopy > 15) regen += 6;

  if (om > 3) regen += 8;

  const classes = s(landCover, 'classes');
  const classCount = classes && typeof classes === 'object' ? Object.keys(classes).length : 0;
  if (classCount > 4) regen += 10;
  else if (classCount > 2) regen += 5;

  const impervious = num(landCover, 'impervious_pct');
  if (impervious < 10) regen += 5;

  regen = clamp(regen);

  // --- Buildability ---
  let build = 70;
  if (meanSlope > 15) build -= 20;
  else if (meanSlope > 10) build -= 10;
  else if (meanSlope > 5) build -= 5;

  if (
    floodZone.includes('ae') ||
    (floodZone.includes('zone a') && !floodZone.includes('minimal'))
  ) {
    build -= 20;
  }

  const regulated = num(wetlands, 'regulated_area_pct');
  if (regulated > 30) build -= 15;
  else if (regulated > 15) build -= 8;

  const bedrock = num(soils, 'depth_to_bedrock_m');
  if (bedrock > 0 && bedrock < 1) build -= 10;

  build = clamp(build);

  // --- Habitat Sensitivity ---
  let habitat = 30;
  if (wetlandPct > 10) habitat += 25;
  else if (wetlandPct > 5) habitat += 15;
  else if (wetlandPct > 2) habitat += 8;

  if (treeCanopy > 40) habitat += 15;
  else if (treeCanopy > 20) habitat += 8;

  const wetlandTypes = s(wetlands, 'wetland_types');
  if (
    Array.isArray(wetlandTypes) &&
    wetlandTypes.some(
      (t) => typeof t === 'string' && t.toLowerCase().includes('forested'),
    )
  ) {
    habitat += 10;
  }

  habitat = clamp(habitat);

  // --- Economic Viability ---
  let econ = 50;
  if (acreage != null) {
    if (acreage > 50) econ += 10;
    else if (acreage > 20) econ += 7;
    else if (acreage > 10) econ += 4;
  }

  if (farmland.includes('prime') || farmland.includes('class 1') || farmland.includes('class 2')) {
    econ += 12;
  }

  if (meanSlope < 8) econ += 5;

  if (drainage === 'well drained' || drainage.includes('good')) econ += 5;

  econ = clamp(econ);

  return [
    { label: 'Water Resilience', score: water, rating: ratingFromScore(water) },
    { label: 'Agricultural Suitability', score: ag, rating: ratingFromScore(ag) },
    { label: 'Regenerative Potential', score: regen, rating: ratingFromScore(regen) },
    { label: 'Buildability', score: build, rating: ratingFromScore(build) },
    { label: 'Habitat Sensitivity', score: habitat, rating: ratingFromScore(habitat) },
    { label: 'Economic Viability', score: econ, rating: ratingFromScore(econ) },
  ];
}

/* ------------------------------------------------------------------ */
/*  2. computeOverallScore                                             */
/* ------------------------------------------------------------------ */

const WEIGHTS: Record<string, number> = {
  'Water Resilience': 0.2,
  'Agricultural Suitability': 0.2,
  'Regenerative Potential': 0.2,
  'Buildability': 0.15,
  'Habitat Sensitivity': 0.1,
  'Economic Viability': 0.15,
};

export function computeOverallScore(scores: AssessmentScore[]): number {
  let total = 0;
  let weightSum = 0;
  for (const sc of scores) {
    const w = WEIGHTS[sc.label] ?? 0;
    total += sc.score * w;
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
      color: '#9a8a74',
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
      color: '#2d7a4f',
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
      color: '#9a8a74',
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
      color: '#5b9db8',
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
      color: '#5b9db8',
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
