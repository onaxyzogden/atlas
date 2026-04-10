/**
 * Soil regeneration mapping — 5 analyses for regenerative land management.
 *
 * Analyses:
 *   1. Restoration priority map — degradation severity x regenerative potential
 *   2. Disturbed land recovery zones — compacted, eroded, or depleted areas
 *   3. Carbon sequestration potential — IPCC Tier 1 estimates by land use category
 *   4. Intervention recommendation zones — mulching, compost, cover crop, silvopasture, food forest
 *   5. Regeneration sequence — dependency-ordered intervention plan
 *
 * All functions operate on soil, land cover, and slope data loaded from
 * project_layers. No elevation raster re-fetch needed — slope is passed
 * as a pre-computed summary.
 */

// ── Shared types ───────────────────────────────────────────────────────────

/** Soil context per zone/polygon loaded from the soils project_layer. */
export interface SoilZone {
  id: number;
  /** Drainage class */
  drainageClass: 'well' | 'moderate' | 'poor' | 'very_poor';
  /** Soil organic matter percentage (0-20+) */
  organicMatterPct: number;
  /** Texture class */
  textureClass: 'sand' | 'loamy_sand' | 'sandy_loam' | 'loam' | 'silt_loam' | 'silt' | 'clay_loam' | 'silty_clay_loam' | 'sandy_clay_loam' | 'clay' | 'silty_clay' | 'sandy_clay';
  /** Compaction indicator: 0-1 (estimated from drainage + texture) */
  compactionRisk: number;
  /** Mean slope in degrees for this soil polygon */
  slopeDeg: number;
  /** Area in hectares */
  areaHa: number;
}

/** Land cover context per zone from the land_cover project_layer. */
export interface LandCoverZone {
  id: number;
  /** NLCD / AAFC land cover class */
  coverClass: string;
  /** Disturbance level 0-1 (derived from land cover type) */
  disturbanceLevel: number;
  /** Area in hectares */
  areaHa: number;
}

/** Combined zone for analysis (soil + land cover intersection). */
export interface AnalysisZone {
  zoneId: number;
  soil: SoilZone;
  landCover: LandCoverZone;
  /** Effective slope from soil polygon */
  slopeDeg: number;
  areaHa: number;
}

// ── IPCC Tier 1 coefficients ───────────────────────────────────────────────

/** IPCC Tier 1 SOC reference values by climate zone and soil type (tC/ha) */
const IPCC_SOC_REFERENCE: Record<string, number> = {
  // Temperate moist (most of US/CA agricultural zones)
  'temperate_moist_high_clay': 95,
  'temperate_moist_low_clay': 85,
  'temperate_moist_sandy': 60,
  // Temperate dry
  'temperate_dry_high_clay': 55,
  'temperate_dry_low_clay': 50,
  'temperate_dry_sandy': 35,
  // Default
  'default': 70,
};

/** IPCC land use change factors (relative to reference SOC) */
const IPCC_LAND_USE_FACTORS: Record<string, number> = {
  // Gains relative to baseline
  'forest_to_forest': 1.0,
  'cropland_to_forest': 1.2,       // afforestation gain
  'grassland_to_forest': 1.15,
  'cropland_to_grassland': 1.1,    // improved management
  'cropland_to_agroforestry': 1.25, // silvopasture/food forest
  // Losses relative to baseline
  'forest_to_cropland': 0.7,
  'grassland_to_cropland': 0.8,
  'wetland_to_cropland': 0.5,
  // Maintained
  'cropland_to_cropland': 0.9,     // with cover crops
  'grassland_to_grassland': 1.0,
  // Default
  'default': 1.0,
};

/** Annual C sequestration rates by intervention (tC/ha/yr) */
const SEQUESTRATION_RATES: Record<string, number> = {
  cover_crop: 0.32,
  compost_application: 0.45,
  mulching: 0.20,
  silvopasture: 0.80,
  food_forest: 1.10,
  no_till: 0.25,
  improved_grassland: 0.35,
};

// ── Helper: texture to soil group ──────────────────────────────────────────

function textureToSoilGroup(texture: string): 'sandy' | 'low_clay' | 'high_clay' {
  if (texture.includes('sand') && !texture.includes('clay')) return 'sandy';
  if (texture.includes('clay')) return 'high_clay';
  return 'low_clay';
}

function drainageToCompaction(drainage: string): number {
  switch (drainage) {
    case 'very_poor': return 0.9;
    case 'poor': return 0.6;
    case 'moderate': return 0.3;
    case 'well': return 0.1;
    default: return 0.3;
  }
}

function landCoverToDisturbance(coverClass: string): number {
  const lower = coverClass.toLowerCase();
  if (lower.includes('developed') || lower.includes('urban') || lower.includes('impervious')) return 1.0;
  if (lower.includes('cultivated') || lower.includes('crops') || lower.includes('annual')) return 0.7;
  if (lower.includes('pasture') || lower.includes('hay')) return 0.4;
  if (lower.includes('grassland') || lower.includes('herbaceous')) return 0.25;
  if (lower.includes('shrub') || lower.includes('scrub')) return 0.2;
  if (lower.includes('forest') || lower.includes('deciduous') || lower.includes('evergreen') || lower.includes('mixed')) return 0.1;
  if (lower.includes('wetland') || lower.includes('marsh')) return 0.05;
  if (lower.includes('water') || lower.includes('barren') || lower.includes('ice')) return 0.0;
  return 0.5; // unknown
}

// ── 1. Restoration priority map ────────────────────────────────────────────

export interface RestorationPriorityResult {
  zones: Array<{
    zoneId: number;
    degradationScore: number;   // 0-100
    regenerativePotential: number; // 0-100
    priorityScore: number;       // 0-100 (degradation x potential)
    priorityClass: 'critical' | 'high' | 'moderate' | 'low';
    areaHa: number;
  }>;
  totalAreaHa: number;
  criticalAreaPct: number;
  highPriorityAreaPct: number;
}

/**
 * Restoration priority = degradation severity x regenerative potential.
 *
 * Degradation from: soil drainage class + compaction + land cover disturbance.
 * Regenerative potential from: organic matter baseline + texture + slope.
 */
export function computeRestorationPriority(zones: AnalysisZone[]): RestorationPriorityResult {
  const results: RestorationPriorityResult['zones'] = [];
  let totalArea = 0;
  let criticalArea = 0;
  let highArea = 0;

  for (const zone of zones) {
    totalArea += zone.areaHa;

    // Degradation score (0-100): higher = more degraded
    const drainageDeg = zone.soil.drainageClass === 'very_poor' ? 80
      : zone.soil.drainageClass === 'poor' ? 55
      : zone.soil.drainageClass === 'moderate' ? 25
      : 10;
    const compactionDeg = zone.soil.compactionRisk * 100;
    const disturbanceDeg = zone.landCover.disturbanceLevel * 100;
    // Low organic matter = more degraded
    const omDeg = Math.max(0, 100 - zone.soil.organicMatterPct * 20);

    const degradationScore = Math.round(
      drainageDeg * 0.25 + compactionDeg * 0.25 + disturbanceDeg * 0.30 + omDeg * 0.20,
    );

    // Regenerative potential (0-100): higher = more potential for improvement
    // High OM baseline = higher capacity to build further
    const omPotential = Math.min(100, zone.soil.organicMatterPct * 15 + 20);
    // Loamy textures are most regenerable; sandy and heavy clay less so
    const texturePotential = textureToSoilGroup(zone.soil.textureClass) === 'low_clay' ? 90
      : textureToSoilGroup(zone.soil.textureClass) === 'high_clay' ? 65
      : 50; // sandy
    // Moderate slope (2-10 deg) is ideal; steep slopes limit interventions
    const slopePotential = zone.slopeDeg < 2 ? 70
      : zone.slopeDeg <= 10 ? 90
      : zone.slopeDeg <= 20 ? 60
      : zone.slopeDeg <= 30 ? 35
      : 15;

    const regenerativePotential = Math.round(
      omPotential * 0.35 + texturePotential * 0.35 + slopePotential * 0.30,
    );

    // Priority = geometric mean of degradation and potential
    const priorityScore = Math.round(Math.sqrt(degradationScore * regenerativePotential));

    let priorityClass: 'critical' | 'high' | 'moderate' | 'low';
    if (priorityScore >= 75) { priorityClass = 'critical'; criticalArea += zone.areaHa; }
    else if (priorityScore >= 55) { priorityClass = 'high'; highArea += zone.areaHa; }
    else if (priorityScore >= 35) priorityClass = 'moderate';
    else priorityClass = 'low';

    results.push({
      zoneId: zone.zoneId,
      degradationScore,
      regenerativePotential,
      priorityScore,
      priorityClass,
      areaHa: zone.areaHa,
    });
  }

  // Sort by priority (highest first)
  results.sort((a, b) => b.priorityScore - a.priorityScore);

  return {
    zones: results,
    totalAreaHa: +totalArea.toFixed(2),
    criticalAreaPct: totalArea > 0 ? +((criticalArea / totalArea) * 100).toFixed(1) : 0,
    highPriorityAreaPct: totalArea > 0 ? +(((criticalArea + highArea) / totalArea) * 100).toFixed(1) : 0,
  };
}

// ── 2. Disturbed land recovery zones ───────────────────────────────────────

export type DisturbanceType = 'compacted' | 'eroded' | 'depleted' | 'intact';

export interface DisturbedLandResult {
  zones: Array<{
    zoneId: number;
    disturbanceType: DisturbanceType;
    severityScore: number; // 0-100
    recoveryTimeline: 'short' | 'medium' | 'long'; // 1-3yr, 3-7yr, 7-15yr
    areaHa: number;
  }>;
  disturbedAreaPct: number;
  dominantDisturbance: DisturbanceType;
}

/**
 * Identify compacted, eroded, or depleted areas.
 * - Compacted: poor/very_poor drainage + high compaction risk
 * - Eroded: steep slope + low OM + high disturbance
 * - Depleted: low OM + moderate/poor drainage + cropland history
 * - Intact: none of the above
 */
export function computeDisturbedLand(zones: AnalysisZone[]): DisturbedLandResult {
  const results: DisturbedLandResult['zones'] = [];
  let totalArea = 0;
  let disturbedArea = 0;
  const typeCounts: Record<DisturbanceType, number> = { compacted: 0, eroded: 0, depleted: 0, intact: 0 };

  for (const zone of zones) {
    totalArea += zone.areaHa;

    const isCompacted = zone.soil.compactionRisk > 0.5 &&
      (zone.soil.drainageClass === 'poor' || zone.soil.drainageClass === 'very_poor');

    const isEroded = zone.slopeDeg > 8 &&
      zone.soil.organicMatterPct < 2.5 &&
      zone.landCover.disturbanceLevel > 0.4;

    const isDepleted = zone.soil.organicMatterPct < 2.0 &&
      zone.landCover.disturbanceLevel > 0.5 &&
      (zone.soil.drainageClass === 'moderate' || zone.soil.drainageClass === 'poor');

    let disturbanceType: DisturbanceType;
    let severityScore: number;

    if (isCompacted && isEroded) {
      disturbanceType = 'eroded'; // erosion is more severe
      severityScore = Math.round(Math.min(100, zone.soil.compactionRisk * 50 + zone.slopeDeg * 2 + (5 - zone.soil.organicMatterPct) * 10));
    } else if (isCompacted) {
      disturbanceType = 'compacted';
      severityScore = Math.round(zone.soil.compactionRisk * 70 + (1 - drainageScore(zone.soil.drainageClass)) * 30);
    } else if (isEroded) {
      disturbanceType = 'eroded';
      severityScore = Math.round(Math.min(100, zone.slopeDeg * 3 + zone.landCover.disturbanceLevel * 40));
    } else if (isDepleted) {
      disturbanceType = 'depleted';
      severityScore = Math.round(Math.max(0, (3 - zone.soil.organicMatterPct) * 30 + zone.landCover.disturbanceLevel * 20));
    } else {
      disturbanceType = 'intact';
      severityScore = 0;
    }

    let recoveryTimeline: 'short' | 'medium' | 'long';
    if (disturbanceType === 'intact') recoveryTimeline = 'short';
    else if (severityScore < 40) recoveryTimeline = 'short';
    else if (severityScore < 70) recoveryTimeline = 'medium';
    else recoveryTimeline = 'long';

    if (disturbanceType !== 'intact') disturbedArea += zone.areaHa;
    typeCounts[disturbanceType] += zone.areaHa;

    results.push({
      zoneId: zone.zoneId,
      disturbanceType,
      severityScore,
      recoveryTimeline,
      areaHa: zone.areaHa,
    });
  }

  // Dominant disturbance by area
  const dominant = (Object.entries(typeCounts) as [DisturbanceType, number][])
    .filter(([t]) => t !== 'intact')
    .sort((a, b) => b[1] - a[1])[0];
  const dominantDisturbance: DisturbanceType = dominant && dominant[1] > 0 ? dominant[0] : 'intact';

  return {
    zones: results,
    disturbedAreaPct: totalArea > 0 ? +((disturbedArea / totalArea) * 100).toFixed(1) : 0,
    dominantDisturbance,
  };
}

function drainageScore(cls: string): number {
  switch (cls) {
    case 'well': return 1.0;
    case 'moderate': return 0.6;
    case 'poor': return 0.3;
    case 'very_poor': return 0.1;
    default: return 0.5;
  }
}

// ── 3. Carbon sequestration potential ──────────────────────────────────────

export interface CarbonSequestrationResult {
  zones: Array<{
    zoneId: number;
    currentSOC_tCha: number;           // estimated current SOC (tC/ha)
    potentialSOC_tCha: number;         // potential SOC under best management
    annualSeqRate_tChaYr: number;      // estimated annual sequestration rate
    sequestrationPotential: 'high' | 'medium' | 'low';
    bestIntervention: string;
    areaHa: number;
  }>;
  totalCurrentSOC_tC: number;
  totalPotentialSOC_tC: number;
  totalAnnualSeq_tCyr: number;
  meanSeqPotential: number; // tC/ha averaged across site
}

/**
 * Carbon sequestration potential using IPCC Tier 1 coefficients.
 * Estimates current SOC from organic matter % and texture, then
 * calculates potential gains from land use changes.
 */
export function computeCarbonSequestration(zones: AnalysisZone[]): CarbonSequestrationResult {
  const results: CarbonSequestrationResult['zones'] = [];
  let totalCurrentSOC = 0;
  let totalPotentialSOC = 0;
  let totalAnnualSeq = 0;
  let totalArea = 0;

  for (const zone of zones) {
    totalArea += zone.areaHa;

    // Estimate reference SOC from texture
    const soilGroup = textureToSoilGroup(zone.soil.textureClass);
    const refKey = `temperate_moist_${soilGroup}`;
    const referenceSOC = IPCC_SOC_REFERENCE[refKey] ?? IPCC_SOC_REFERENCE['default']!;

    // Current SOC estimated from organic matter % (van Bemmelen factor: SOC = OM * 0.58)
    const currentSOC = zone.soil.organicMatterPct * 0.58 * (referenceSOC / 5);
    // Clamp to reasonable range
    const currentSOC_tCha = Math.max(5, Math.min(referenceSOC * 1.2, currentSOC));

    // Determine best intervention based on zone characteristics
    const bestIntervention = selectBestCarbonIntervention(zone);

    // Calculate potential SOC under intervention
    const landUseFactor = IPCC_LAND_USE_FACTORS[`cropland_to_${bestIntervention === 'food_forest' ? 'agroforestry' : bestIntervention === 'silvopasture' ? 'agroforestry' : 'grassland'}`]
      ?? IPCC_LAND_USE_FACTORS['default']!;
    const potentialSOC_tCha = +(referenceSOC * landUseFactor).toFixed(1);

    // Annual sequestration rate
    const annualRate = SEQUESTRATION_RATES[bestIntervention] ?? 0.25;
    const annualSeqRate = +(annualRate * Math.min(1, (potentialSOC_tCha - currentSOC_tCha) / potentialSOC_tCha)).toFixed(2);

    let sequestrationPotential: 'high' | 'medium' | 'low';
    if (annualSeqRate >= 0.6) sequestrationPotential = 'high';
    else if (annualSeqRate >= 0.3) sequestrationPotential = 'medium';
    else sequestrationPotential = 'low';

    totalCurrentSOC += currentSOC_tCha * zone.areaHa;
    totalPotentialSOC += potentialSOC_tCha * zone.areaHa;
    totalAnnualSeq += annualSeqRate * zone.areaHa;

    results.push({
      zoneId: zone.zoneId,
      currentSOC_tCha: +currentSOC_tCha.toFixed(1),
      potentialSOC_tCha,
      annualSeqRate_tChaYr: annualSeqRate,
      sequestrationPotential,
      bestIntervention,
      areaHa: zone.areaHa,
    });
  }

  return {
    zones: results,
    totalCurrentSOC_tC: +totalCurrentSOC.toFixed(0),
    totalPotentialSOC_tC: +totalPotentialSOC.toFixed(0),
    totalAnnualSeq_tCyr: +totalAnnualSeq.toFixed(1),
    meanSeqPotential: totalArea > 0 ? +(totalAnnualSeq / totalArea).toFixed(2) : 0,
  };
}

function selectBestCarbonIntervention(zone: AnalysisZone): string {
  const slope = zone.slopeDeg;
  const drainage = zone.soil.drainageClass;
  const disturbance = zone.landCover.disturbanceLevel;

  // Steep slopes: silvopasture (trees stabilize)
  if (slope > 15) return 'silvopasture';

  // Poor drainage + low disturbance: improved grassland
  if ((drainage === 'poor' || drainage === 'very_poor') && disturbance < 0.4) return 'improved_grassland';

  // Low disturbance (existing forest/grassland): food forest (highest sequestration)
  if (disturbance < 0.3 && slope < 10) return 'food_forest';

  // Moderate disturbance: compost + cover crop
  if (disturbance >= 0.3 && disturbance < 0.6) return 'compost_application';

  // High disturbance: cover crop first
  if (disturbance >= 0.6) return 'cover_crop';

  return 'cover_crop';
}

// ── 4. Intervention recommendation zones ───────────────────────────────────

export type InterventionType =
  | 'mulching_priority'
  | 'compost_application'
  | 'cover_crop_candidate'
  | 'silvopasture_candidate'
  | 'food_forest_candidate';

export interface InterventionRecommendationResult {
  zones: Array<{
    zoneId: number;
    interventions: InterventionType[];
    primaryIntervention: InterventionType;
    suitabilityScore: number; // 0-100
    rationale: string;
    areaHa: number;
  }>;
  interventionSummary: Record<InterventionType, { zoneCount: number; totalAreaHa: number }>;
}

/**
 * Classify each zone for one or more interventions based on:
 * soil texture + drainage + slope + existing land cover.
 */
export function computeInterventionRecommendations(zones: AnalysisZone[]): InterventionRecommendationResult {
  const results: InterventionRecommendationResult['zones'] = [];
  const summary: Record<InterventionType, { zoneCount: number; totalAreaHa: number }> = {
    mulching_priority: { zoneCount: 0, totalAreaHa: 0 },
    compost_application: { zoneCount: 0, totalAreaHa: 0 },
    cover_crop_candidate: { zoneCount: 0, totalAreaHa: 0 },
    silvopasture_candidate: { zoneCount: 0, totalAreaHa: 0 },
    food_forest_candidate: { zoneCount: 0, totalAreaHa: 0 },
  };

  for (const zone of zones) {
    const interventions: InterventionType[] = [];
    const reasons: string[] = [];

    const slope = zone.slopeDeg;
    const drainage = zone.soil.drainageClass;
    const texture = zone.soil.textureClass;
    const om = zone.soil.organicMatterPct;
    const disturbance = zone.landCover.disturbanceLevel;
    const soilGroup = textureToSoilGroup(texture);

    // Mulching priority: eroded or depleted soils needing surface protection
    if ((om < 2.5 && disturbance > 0.4) || (slope > 10 && disturbance > 0.3)) {
      interventions.push('mulching_priority');
      reasons.push('Low OM or erosion risk requires surface protection');
    }

    // Compost application: soils that can absorb and benefit from organic amendments
    if (om < 4.0 && soilGroup !== 'sandy' && slope < 15) {
      interventions.push('compost_application');
      reasons.push('Loamy/clay soils with low OM benefit from compost');
    }

    // Cover crop candidate: cultivated or disturbed land with manageable slope
    if (disturbance > 0.4 && slope < 20) {
      interventions.push('cover_crop_candidate');
      reasons.push('Disturbed land suitable for cover crop establishment');
    }

    // Silvopasture candidate: moderate slope, fair drainage, existing grass/pasture
    if (slope >= 5 && slope <= 30 && drainage !== 'very_poor' && disturbance < 0.7) {
      interventions.push('silvopasture_candidate');
      reasons.push('Moderate slope with adequate drainage for tree-pasture integration');
    }

    // Food forest candidate: gentle slope, good drainage, loamy soil, lower disturbance
    if (slope < 12 && (drainage === 'well' || drainage === 'moderate') &&
        soilGroup !== 'sandy' && disturbance < 0.5) {
      interventions.push('food_forest_candidate');
      reasons.push('Gentle slope with good soil structure for polyculture planting');
    }

    // If no interventions matched, default to cover crop
    if (interventions.length === 0) {
      interventions.push('cover_crop_candidate');
      reasons.push('Default: cover crop to build soil biology');
    }

    // Primary = first matched (priority order from the push sequence)
    const primaryIntervention = interventions[0]!;

    // Suitability score for the primary intervention
    const suitabilityScore = computeInterventionSuitability(zone, primaryIntervention);

    for (const intervention of interventions) {
      summary[intervention].zoneCount++;
      summary[intervention].totalAreaHa += zone.areaHa;
    }

    results.push({
      zoneId: zone.zoneId,
      interventions,
      primaryIntervention,
      suitabilityScore,
      rationale: reasons.join('; '),
      areaHa: zone.areaHa,
    });
  }

  // Round summary areas
  for (const key of Object.keys(summary) as InterventionType[]) {
    summary[key].totalAreaHa = +(summary[key].totalAreaHa).toFixed(2);
  }

  return { zones: results, interventionSummary: summary };
}

function computeInterventionSuitability(zone: AnalysisZone, intervention: InterventionType): number {
  const slope = zone.slopeDeg;
  const drainage = drainageScore(zone.soil.drainageClass);
  const soilGroup = textureToSoilGroup(zone.soil.textureClass);

  switch (intervention) {
    case 'mulching_priority':
      // Best on flat-moderate slopes with exposed soil
      return Math.round(Math.max(0, 100 - slope * 3) * 0.5 + zone.landCover.disturbanceLevel * 50);

    case 'compost_application':
      // Best on loamy soils with moderate slope
      return Math.round(
        (soilGroup === 'low_clay' ? 40 : soilGroup === 'high_clay' ? 30 : 20) +
        Math.max(0, 30 - slope * 2) +
        (1 - zone.soil.organicMatterPct / 10) * 30,
      );

    case 'cover_crop_candidate':
      // Best on flat to moderate slopes with high disturbance
      return Math.round(
        Math.max(0, 40 - slope * 2) +
        zone.landCover.disturbanceLevel * 30 +
        drainage * 30,
      );

    case 'silvopasture_candidate':
      // Best on moderate slopes with fair drainage
      return Math.round(
        (slope >= 5 && slope <= 15 ? 40 : slope <= 25 ? 25 : 10) +
        drainage * 30 +
        (1 - zone.landCover.disturbanceLevel) * 30,
      );

    case 'food_forest_candidate':
      // Best on gentle slopes with good soil
      return Math.round(
        Math.max(0, 40 - slope * 4) +
        drainage * 30 +
        (soilGroup === 'low_clay' ? 30 : soilGroup === 'high_clay' ? 20 : 10),
      );

    default:
      return 50;
  }
}

// ── 5. Regeneration sequence ───────────────────────────────────────────────

export type SequencePhase = 'stabilize_erosion' | 'improve_drainage' | 'build_organic_matter' | 'introduce_perennials';

export interface RegenerationSequenceResult {
  zones: Array<{
    zoneId: number;
    phases: Array<{
      phase: SequencePhase;
      order: number;
      interventions: string[];
      estimatedDurationMonths: number;
      rationale: string;
    }>;
    totalDurationMonths: number;
    areaHa: number;
  }>;
  sitewidePhaseSummary: Record<SequencePhase, {
    zoneCount: number;
    totalAreaHa: number;
    avgDurationMonths: number;
  }>;
}

/**
 * Order interventions by dependency:
 *   1. Stabilize erosion first (mulching, erosion control)
 *   2. Improve drainage second (subsoiling, drainage amendments)
 *   3. Build organic matter third (compost, cover crops)
 *   4. Introduce perennials last (silvopasture, food forest)
 *
 * Not all zones need all phases — only applicable ones are included.
 */
export function computeRegenerationSequence(
  zones: AnalysisZone[],
  disturbedLand: DisturbedLandResult,
  interventions: InterventionRecommendationResult,
): RegenerationSequenceResult {
  const results: RegenerationSequenceResult['zones'] = [];
  const phaseSummary: Record<SequencePhase, { zoneCount: number; totalAreaHa: number; durationSum: number }> = {
    stabilize_erosion: { zoneCount: 0, totalAreaHa: 0, durationSum: 0 },
    improve_drainage: { zoneCount: 0, totalAreaHa: 0, durationSum: 0 },
    build_organic_matter: { zoneCount: 0, totalAreaHa: 0, durationSum: 0 },
    introduce_perennials: { zoneCount: 0, totalAreaHa: 0, durationSum: 0 },
  };

  for (const zone of zones) {
    const disturbance = disturbedLand.zones.find((d) => d.zoneId === zone.zoneId);
    const intervention = interventions.zones.find((i) => i.zoneId === zone.zoneId);

    const phases: RegenerationSequenceResult['zones'][0]['phases'] = [];
    let order = 0;

    // Phase 1: Stabilize erosion (if needed)
    if (disturbance?.disturbanceType === 'eroded' || zone.slopeDeg > 12) {
      const duration = disturbance?.severityScore
        ? disturbance.severityScore > 70 ? 12 : disturbance.severityScore > 40 ? 6 : 3
        : 3;
      phases.push({
        phase: 'stabilize_erosion',
        order: ++order,
        interventions: ['mulching', 'erosion_blankets', 'contour_swales'],
        estimatedDurationMonths: duration,
        rationale: 'Stabilize soil surface before any amendment or planting',
      });
      phaseSummary.stabilize_erosion.zoneCount++;
      phaseSummary.stabilize_erosion.totalAreaHa += zone.areaHa;
      phaseSummary.stabilize_erosion.durationSum += duration;
    }

    // Phase 2: Improve drainage (if needed)
    if (zone.soil.drainageClass === 'poor' || zone.soil.drainageClass === 'very_poor' ||
        disturbance?.disturbanceType === 'compacted') {
      const duration = zone.soil.drainageClass === 'very_poor' ? 18 : 9;
      phases.push({
        phase: 'improve_drainage',
        order: ++order,
        interventions: ['subsoiling', 'keyline_plowing', 'drainage_swales', 'gypsum_amendment'],
        estimatedDurationMonths: duration,
        rationale: 'Relieve compaction and improve water infiltration before biological inputs',
      });
      phaseSummary.improve_drainage.zoneCount++;
      phaseSummary.improve_drainage.totalAreaHa += zone.areaHa;
      phaseSummary.improve_drainage.durationSum += duration;
    }

    // Phase 3: Build organic matter (almost always needed)
    if (zone.soil.organicMatterPct < 5.0 || zone.landCover.disturbanceLevel > 0.3) {
      const duration = zone.soil.organicMatterPct < 2.0 ? 24
        : zone.soil.organicMatterPct < 3.5 ? 18
        : 12;
      const interventionList: string[] = [];
      if (intervention?.interventions.includes('compost_application')) interventionList.push('compost_application');
      if (intervention?.interventions.includes('cover_crop_candidate')) interventionList.push('cover_crops');
      if (intervention?.interventions.includes('mulching_priority')) interventionList.push('deep_mulching');
      if (interventionList.length === 0) interventionList.push('cover_crops', 'compost_application');

      phases.push({
        phase: 'build_organic_matter',
        order: ++order,
        interventions: interventionList,
        estimatedDurationMonths: duration,
        rationale: 'Build soil biology and carbon stocks before introducing permanent plantings',
      });
      phaseSummary.build_organic_matter.zoneCount++;
      phaseSummary.build_organic_matter.totalAreaHa += zone.areaHa;
      phaseSummary.build_organic_matter.durationSum += duration;
    }

    // Phase 4: Introduce perennials (if zone is candidate)
    const hasPerennial = intervention?.interventions.some(
      (i) => i === 'silvopasture_candidate' || i === 'food_forest_candidate',
    );
    if (hasPerennial) {
      const isFoodForest = intervention!.interventions.includes('food_forest_candidate');
      const duration = isFoodForest ? 36 : 24;
      phases.push({
        phase: 'introduce_perennials',
        order: ++order,
        interventions: isFoodForest
          ? ['food_forest_design', 'canopy_layer', 'understory', 'ground_cover']
          : ['silvopasture_tree_planting', 'pasture_improvement', 'rotational_grazing'],
        estimatedDurationMonths: duration,
        rationale: 'Establish permanent productive systems once soil foundation is built',
      });
      phaseSummary.introduce_perennials.zoneCount++;
      phaseSummary.introduce_perennials.totalAreaHa += zone.areaHa;
      phaseSummary.introduce_perennials.durationSum += duration;
    }

    const totalDuration = phases.reduce((sum, p) => sum + p.estimatedDurationMonths, 0);

    results.push({
      zoneId: zone.zoneId,
      phases,
      totalDurationMonths: totalDuration,
      areaHa: zone.areaHa,
    });
  }

  const sitewidePhaseSummary = {} as RegenerationSequenceResult['sitewidePhaseSummary'];
  for (const [phase, data] of Object.entries(phaseSummary) as [SequencePhase, typeof phaseSummary[SequencePhase]][]) {
    sitewidePhaseSummary[phase] = {
      zoneCount: data.zoneCount,
      totalAreaHa: +data.totalAreaHa.toFixed(2),
      avgDurationMonths: data.zoneCount > 0 ? Math.round(data.durationSum / data.zoneCount) : 0,
    };
  }

  return { zones: results, sitewidePhaseSummary };
}

// ── Exported helpers for processor ─────────────────────────────────────────

export { landCoverToDisturbance, drainageToCompaction };
