/**
 * designIntelligence.ts
 * Passive solar orientation, windbreak siting, water-harvesting siting,
 * septic/leach-field suitability, and shadow/shade modeling.
 *
 * Derived from:
 *   - elevation layer       (predominant_aspect, mean_slope_deg)
 *   - climate layer         (_wind_rose: { frequencies_16, speeds_avg_ms, calm_pct })
 *   - watershed_derived     (swaleCandidates, pondCandidates — pre-computed server-side)
 *   - soils layer           (ksat_um_s, drainage_class, depth_to_bedrock_m)
 *   - groundwater layer     (groundwater_depth_m)
 *   - site latitude         (from parcel centroid)
 *
 * Sprint X/Y/Z — 2026-04-19
 */

// ── Passive Solar ─────────────────────────────────────────────────────────────

export interface PassiveSolarResult {
  currentAspect: string;
  optimalAspect: string;
  solarAdvantage: 'Excellent' | 'Good' | 'Moderate' | 'Poor';
  solarScore: number;
  recommendation: string;
}

// ── Windbreak ─────────────────────────────────────────────────────────────────

export interface WindbreakResult {
  primaryWindDir: string;
  secondaryWindDir: string | null;
  windbreakOrientation: string;
  avgWindSpeedMs: number;
  recommendation: string;
}

// ── Water Harvesting ──────────────────────────────────────────────────────────

/** A single swale candidate as stored in the watershed_derived summary. */
export interface SwaleCandidate {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  lengthCells: number;
  meanSlope: number;
  elevation: number;
  suitabilityScore: number;
}

/** A single pond candidate as stored in the watershed_derived summary. */
export interface PondCandidate {
  location: { lat: number; lng: number };
  cellCount: number;
  meanSlope: number;
  meanAccumulation: number;
  suitabilityScore: number;
}

export interface WaterHarvestingResult {
  /** Total swale candidates found on the site */
  swaleCandidateCount: number;
  /** Highest-scoring swale candidate, or null if none */
  topSwale: SwaleCandidate | null;
  /** Total pond candidates found on the site */
  pondCandidateCount: number;
  /** Highest-scoring pond candidate, or null if none */
  topPond: PondCandidate | null;
  /**
   * Overall swale suitability rating derived from top swale score:
   *   ≥70 → Excellent, ≥50 → Good, ≥30 → Fair, else Limited
   */
  swaleRating: 'Excellent' | 'Good' | 'Fair' | 'Limited';
  /**
   * Overall pond suitability rating derived from top pond score:
   *   ≥70 → Excellent, ≥50 → Good, ≥30 → Fair, else None
   */
  pondRating: 'Excellent' | 'Good' | 'Fair' | 'None';
  swaleRecommendation: string;
  pondRecommendation: string;
}

// ── Septic / Leach Field ──────────────────────────────────────────────────────

export interface SepticSuitabilityResult {
  septicRating: 'Excellent' | 'Good' | 'Marginal' | 'Unsuitable';
  recommendedSystem: 'Conventional' | 'Mound' | 'Engineered' | 'Not recommended';
  /** List of factors that limit suitability (empty if fully suitable) */
  limitingFactors: string[];
  /** Key input values for transparency */
  inputs: {
    ksatUmS: number | null;
    bedrockDepthM: number | null;
    waterTableDepthM: number | null;
    drainageClass: string | null;
    slopeDeg: number | null;
  };
  recommendation: string;
}

// ── Shadow / Shade Modeling ───────────────────────────────────────────────────

export interface ShadowAnalysisResult {
  /** Noon solar altitude at winter solstice (Dec 21), degrees above horizon */
  winterNoonAltitude: number;
  /** Noon solar altitude at summer solstice (Jun 21), degrees above horizon */
  summerNoonAltitude: number;
  /** Noon solar altitude at equinox (Mar 21), degrees above horizon */
  equinoxNoonAltitude: number;
  /** Winter shade risk — N-facing slopes at high latitude = Severe */
  winterShadeRisk: 'Low' | 'Moderate' | 'High' | 'Severe';
  /** Annual sun access rating */
  sunAccessRating: 'Excellent' | 'Good' | 'Limited' | 'Poor';
  recommendation: string;
}

// ── Rainwater Harvesting (RWH) Sizing ────────────────────────────────────────

export interface RwhSizingResult {
  annualPrecipMm: number;
  /** EPA WaterSense typical runoff coefficient for metal/shingle roofing */
  efficiency: number;
  /** Liters harvested per 100 m² catchment per year */
  harvestPer100m2Liters: number;
  /** Cubic meters per 100 m² catchment per year */
  harvestPer100m2M3: number;
  /** Assumed typical farmhouse catchment area (200 m²) */
  typicalRoofAreaM2: number;
  /** Volume harvestable at typical roof area (m³/year) */
  typicalFarmhouseM3: number;
  /** Days of household water supply at WHO basic benchmark (400 L/day) */
  daysOfHouseholdSupply: number;
  rwhRating: 'Excellent' | 'Good' | 'Limited' | 'Poor';
  recommendation: string;
}

// ── Pond Volume Estimation ────────────────────────────────────────────────────

export interface PondVolumeResult {
  topCandidateCells: number;
  /** Estimated pond surface area (m²) — cellCount × cellArea */
  estimatedAreaM2: number;
  /** Estimated pond depth (m) — derived from local slope */
  estimatedDepthM: number;
  /** Estimated storage volume (m³) — area × depth × pyramidal shape factor */
  estimatedVolumeM3: number;
  /** Same volume in US gallons for user convenience */
  estimatedGallonsUs: number;
  /** Cell area assumption used (US 3DEP = 100 m², CA HRDEM ≈ 400 m²) */
  cellAreaM2: number;
  volumeRating: 'Large' | 'Medium' | 'Small' | 'Very small';
  recommendation: string;
}

// ── Fire Risk Zoning ──────────────────────────────────────────────────────────

export interface FireRiskResult {
  /** 0–100 fuel loading score (land cover + canopy) */
  fuelLoading: number;
  /** Rothermel-inspired slope multiplier (1.0 flat to ~3.0 very steep) */
  slopeFactor: number;
  /** Wind multiplier (1.0 calm to ~3.0 strong avg winds) */
  windFactor: number;
  /** Composite score 0–100+ */
  compositeScore: number;
  fireRiskClass: 'Low' | 'Moderate' | 'High' | 'Extreme';
  primaryWindDirection: string | null;
  recommendation: string;
}

// ── Footprint Optimization ────────────────────────────────────────────────────

export interface FootprintOptimizationResult {
  /** 0–100 composite score of building footprint quality */
  compositeScore: number;
  rating: 'Excellent' | 'Good' | 'Marginal' | 'Poor';
  /** Recommended building axis direction (hemisphere-aware) */
  bestAspectDirection: string;
  /** One-line narrative summary of the ideal build zone */
  recommendedBuildZone: string;
  /** Ordered list of factors reducing site suitability */
  limitingFactors: string[];
  /** Component sub-scores for transparency */
  subScores: {
    terrain: number;    // 0–25
    solar: number;      // 0–25
    wind: number;       // 0–20
    drainage: number;   // 0–15
    flood: number;      // 0–15 (15 if no flood concern)
  };
}

// ── Compost Siting ────────────────────────────────────────────────────────────

export interface CompostSitingResult {
  rating: 'Excellent' | 'Good' | 'Marginal' | 'Unsuitable';
  /** Recommended compass direction from dwelling (downwind of prevailing winds) */
  recommendedDirectionFromDwelling: string;
  slopeDeg: number | null;
  drainageClass: string | null;
  limitingFactors: string[];
  recommendation: string;
}

// ── Top-level result ──────────────────────────────────────────────────────────

export interface DesignIntelligenceResult {
  passiveSolar: PassiveSolarResult | null;
  windbreak: WindbreakResult | null;
  waterHarvesting: WaterHarvestingResult | null;
  septic: SepticSuitabilityResult | null;
  shadow: ShadowAnalysisResult | null;
  rwh: RwhSizingResult | null;
  pondVolume: PondVolumeResult | null;
  fireRisk: FireRiskResult | null;
  footprint: FootprintOptimizationResult | null;
  compostSiting: CompostSitingResult | null;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Compass rose — cardinal and intercardinal bearings (degrees clockwise from N) */
const CARDINAL_ANGLES: Record<string, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
};

/** Minimum angular difference between two bearings (0–180°) */
function angleDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Convert a 0–360° bearing to the nearest 8-direction cardinal label */
function degToCardinal(deg: number): string {
  const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return (['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const)[idx] ?? 'N';
}

/** Safe numeric extractor from an unknown record value */
function safeNum(v: unknown): number | null {
  return typeof v === 'number' && isFinite(v) ? v : null;
}

// ── Passive Solar ─────────────────────────────────────────────────────────────

/**
 * Computes passive solar orientation quality for a site.
 *
 * @param predominantAspect  - Cardinal direction of predominant slope aspect (e.g. 'SE')
 * @param lat                - Site latitude (positive = N hemisphere, negative = S hemisphere)
 * @param meanSlopeDeg       - Mean slope in degrees (0 = flat)
 */
export function computePassiveSolarOrientation(
  predominantAspect: string,
  lat: number,
  meanSlopeDeg: number,
): PassiveSolarResult {
  // In N hemisphere, optimal south-facing maximises winter solar gain.
  // In S hemisphere, north-facing is optimal.
  const optimal = lat >= 0 ? 'S' : 'N';
  const optimalAngle = CARDINAL_ANGLES[optimal] ?? 180;
  const currentAngle = CARDINAL_ANGLES[predominantAspect] ?? 180;
  const deviation = angleDiff(currentAngle, optimalAngle);

  // Score 100 when perfectly aligned, 0 when 180° opposed.
  const solarScore = Math.round(Math.max(0, 100 - (deviation / 180) * 100));
  const solarAdvantage: PassiveSolarResult['solarAdvantage'] =
    solarScore >= 80 ? 'Excellent'
    : solarScore >= 60 ? 'Good'
    : solarScore >= 40 ? 'Moderate'
    : 'Poor';

  // A gentle slope (5–20°) amplifies solar gain beyond flat terrain.
  const slopeBonus =
    meanSlopeDeg >= 5 && meanSlopeDeg <= 20
      ? ' Gentle slope enhances solar gain.'
      : '';

  const recommendation =
    solarScore >= 80
      ? `${predominantAspect}-facing slope is optimal for passive solar. Orient buildings with long axis E–W.${slopeBonus}`
      : solarScore >= 60
      ? `${predominantAspect}-facing slope is good for passive solar with moderate adaptations.${slopeBonus}`
      : solarScore >= 40
      ? `${predominantAspect}-facing slope has limited passive solar potential. Consider site micro-topography.${slopeBonus}`
      : `${predominantAspect}-facing slope is unfavorable for passive solar. Buffer shading strategies recommended.`;

  return {
    currentAspect: predominantAspect,
    optimalAspect: optimal,
    solarAdvantage,
    solarScore,
    recommendation,
  };
}

// ── Windbreak ─────────────────────────────────────────────────────────────────

/**
 * Computes windbreak siting recommendations from a 16-sector wind rose.
 *
 * Wind energy is proportional to frequency × speed², so dominant directions
 * by energy (not just frequency) drive the analysis.
 *
 * @param windRose - 16-sector wind rose from climate layer (_wind_rose field)
 */
export function computeWindbreakSiting(windRose: {
  frequencies_16: number[];
  speeds_avg_ms: number[];
  calm_pct: number;
} | null): WindbreakResult | null {
  if (!windRose) return null;
  const { frequencies_16, speeds_avg_ms } = windRose;
  if (!frequencies_16 || frequencies_16.length < 16) return null;
  if (!speeds_avg_ms || speeds_avg_ms.length < 16) return null;

  // Aggregate 16 sectors into 8 cardinal bins by wind energy (freq × speed²)
  const cardinalEnergy: Record<string, number> = {
    N: 0, NE: 0, E: 0, SE: 0, S: 0, SW: 0, W: 0, NW: 0,
  };
  const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

  for (let i = 0; i < 16; i++) {
    const freq = frequencies_16[i] ?? 0;
    const speed = speeds_avg_ms[i] ?? 0;
    const energy = freq * speed * speed;
    const cardIdx = Math.round(i / 2) % 8;
    const card = cardinals[cardIdx]!;
    cardinalEnergy[card] = (cardinalEnergy[card] ?? 0) + energy;
  }

  const sorted = Object.entries(cardinalEnergy).sort((a, b) => b[1] - a[1]);
  const primaryDir = sorted[0]![0];
  const secondaryEntry = sorted[1];
  const secondaryDir =
    secondaryEntry && secondaryEntry[1] > 0 ? secondaryEntry[0] : null;

  // Windbreak perpendicular to the primary wind direction
  const primaryAngle = CARDINAL_ANGLES[primaryDir] ?? 0;
  const windbreakAngle = (primaryAngle + 90) % 360;
  const windbreakOrientation =
    degToCardinal(windbreakAngle) + '–' + degToCardinal((windbreakAngle + 180) % 360);

  // Average speed for the primary cardinal (two 16-sector bins → one cardinal)
  const primaryCardIdx = cardinals.indexOf(primaryDir as typeof cardinals[number]);
  const bin0 = speeds_avg_ms[primaryCardIdx * 2] ?? 0;
  const bin1 = speeds_avg_ms[primaryCardIdx * 2 + 1] ?? 0;
  const avgWindSpeedMs = Math.round(((bin0 + bin1) / 2) * 10) / 10;

  const recommendation =
    `Plant windbreak oriented ${windbreakOrientation} to intercept prevailing ${primaryDir} winds` +
    (secondaryDir ? `. Secondary exposure from ${secondaryDir}.` : '.');

  return {
    primaryWindDir: primaryDir,
    secondaryWindDir: secondaryDir,
    windbreakOrientation,
    avgWindSpeedMs,
    recommendation,
  };
}

// ── Water Harvesting ──────────────────────────────────────────────────────────

/**
 * Extracts swale and pond siting intelligence from the watershed_derived summary.
 *
 * The server-side WatershedRefinementProcessor has already run
 * computeSwaleCandidates and computePondCandidates on the elevation DEM.
 * This function reads the pre-scored candidates and derives human-readable
 * ratings and recommendations.
 *
 * Swale suitability scoring (server algorithm):
 *   - Slope optimum ~8° (2–15° qualifying range)
 *   - Flow accumulation P50–P90 (enough to fill, not overwhelm)
 *   - Run length bonus (longer contour = better infiltration)
 *
 * Pond suitability scoring (server algorithm):
 *   - High accumulation (≥P75) — large catchment feeds the pond
 *   - Gentle slope (<3°) — water stays, low erosion risk
 *
 * @param watershedDerivedSummary - The `summary` object from the watershed_derived MockLayerResult
 */
export function computeWaterHarvesting(
  watershedDerivedSummary: Record<string, unknown> | null,
): WaterHarvestingResult | null {
  if (!watershedDerivedSummary) return null;

  // ── Extract swale candidates ───────────────────────────────────────────────
  const swaleData = watershedDerivedSummary.swaleCandidates as Record<string, unknown> | undefined;
  const rawSwales = Array.isArray(swaleData?.candidates) ? swaleData!.candidates as unknown[] : [];
  const swaleCandidateCount = safeNum(swaleData?.candidateCount) ?? rawSwales.length;

  // Parse the top swale (already sorted best-first by server)
  let topSwale: SwaleCandidate | null = null;
  if (rawSwales.length > 0) {
    const raw = rawSwales[0] as Record<string, unknown>;
    const startRaw = raw.start as Record<string, unknown> | undefined;
    const endRaw = raw.end as Record<string, unknown> | undefined;
    const startLat = safeNum(startRaw?.lat);
    const startLng = safeNum(startRaw?.lng);
    const endLat = safeNum(endRaw?.lat);
    const endLng = safeNum(endRaw?.lng);
    const lengthCells = safeNum(raw.lengthCells) ?? 0;
    const meanSlope = safeNum(raw.meanSlope) ?? 0;
    const elevation = safeNum(raw.elevation) ?? 0;
    const suitabilityScore = safeNum(raw.suitabilityScore) ?? 0;

    if (startLat !== null && startLng !== null && endLat !== null && endLng !== null) {
      topSwale = {
        start: { lat: startLat, lng: startLng },
        end: { lat: endLat, lng: endLng },
        lengthCells,
        meanSlope,
        elevation,
        suitabilityScore,
      };
    }
  }

  // ── Extract pond candidates ────────────────────────────────────────────────
  const pondData = watershedDerivedSummary.pondCandidates as Record<string, unknown> | undefined;
  const rawPonds = Array.isArray(pondData?.candidates) ? pondData!.candidates as unknown[] : [];
  const pondCandidateCount = safeNum(pondData?.candidateCount) ?? rawPonds.length;

  let topPond: PondCandidate | null = null;
  if (rawPonds.length > 0) {
    const raw = rawPonds[0] as Record<string, unknown>;
    const locRaw = raw.location as Record<string, unknown> | undefined;
    const locLat = safeNum(locRaw?.lat);
    const locLng = safeNum(locRaw?.lng);
    const cellCount = safeNum(raw.cellCount) ?? 0;
    const meanSlope = safeNum(raw.meanSlope) ?? 0;
    const meanAccumulation = safeNum(raw.meanAccumulation) ?? 0;
    const suitabilityScore = safeNum(raw.suitabilityScore) ?? 0;

    if (locLat !== null && locLng !== null) {
      topPond = {
        location: { lat: locLat, lng: locLng },
        cellCount,
        meanSlope,
        meanAccumulation,
        suitabilityScore,
      };
    }
  }

  // If both are empty, nothing to show
  if (swaleCandidateCount === 0 && pondCandidateCount === 0) return null;

  // ── Derive ratings ─────────────────────────────────────────────────────────
  const topSwaleScore = topSwale?.suitabilityScore ?? 0;
  const swaleRating: WaterHarvestingResult['swaleRating'] =
    swaleCandidateCount === 0 ? 'Limited'
    : topSwaleScore >= 70 ? 'Excellent'
    : topSwaleScore >= 50 ? 'Good'
    : topSwaleScore >= 30 ? 'Fair'
    : 'Limited';

  const topPondScore = topPond?.suitabilityScore ?? 0;
  const pondRating: WaterHarvestingResult['pondRating'] =
    pondCandidateCount === 0 ? 'None'
    : topPondScore >= 70 ? 'Excellent'
    : topPondScore >= 50 ? 'Good'
    : topPondScore >= 30 ? 'Fair'
    : 'None';

  // ── Build recommendations ──────────────────────────────────────────────────
  const swaleRecommendation =
    swaleCandidateCount === 0
      ? 'No suitable swale locations identified. Site may be too flat or too steep.'
      : swaleRating === 'Excellent' || swaleRating === 'Good'
      ? `${swaleCandidateCount} swale location${swaleCandidateCount > 1 ? 's' : ''} identified. ` +
        `Best candidate: ${topSwale!.meanSlope.toFixed(1)}° slope at ${topSwale!.elevation.toFixed(0)} m elevation. ` +
        `Install on-contour to slow and infiltrate runoff.`
      : `${swaleCandidateCount} marginal swale location${swaleCandidateCount > 1 ? 's' : ''} found. ` +
        `Verify contour alignment in the field before installation.`;

  const pondRecommendation =
    pondCandidateCount === 0
      ? 'No suitable pond locations identified. High slope or insufficient accumulation.'
      : pondRating === 'Excellent' || pondRating === 'Good'
      ? `${pondCandidateCount} pond site${pondCandidateCount > 1 ? 's' : ''} identified. ` +
        `Best candidate: ${topPond!.meanSlope.toFixed(1)}° slope, ` +
        `catchment accumulation ${topPond!.meanAccumulation.toFixed(0)} cells. ` +
        `Conduct soil perc test before construction.`
      : `${pondCandidateCount} marginal pond site${pondCandidateCount > 1 ? 's' : ''} found. ` +
        `Low accumulation may limit storage. Conduct site survey.`;

  return {
    swaleCandidateCount,
    topSwale,
    pondCandidateCount,
    topPond,
    swaleRating,
    pondRating,
    swaleRecommendation,
    pondRecommendation,
  };
}

// ── Septic / Leach Field Suitability ──────────────────────────────────────────

/**
 * Classify the drainage class string into a suitability tier for septic systems.
 * SSURGO (US) uses phrases like "well drained", "somewhat poorly drained".
 * LIO (CA) uses similar wording — substring match on key terms handles both.
 */
function classifyDrainage(drainageClass: string | null):
  | 'ideal' | 'acceptable' | 'marginal' | 'unsuitable' | 'unknown' {
  if (!drainageClass) return 'unknown';
  const s = drainageClass.toLowerCase();
  if (s.includes('excessively')) return 'marginal';      // too fast — contamination risk
  if (s.includes('well') && !s.includes('somewhat')) return 'ideal';
  if (s.includes('moderately well')) return 'ideal';
  if (s.includes('somewhat poor')) return 'marginal';
  if (s.includes('poor') || s.includes('very poor')) return 'unsuitable';
  return 'acceptable';
}

/**
 * Computes septic / leach-field suitability from soil, water-table, and slope inputs.
 *
 * Thresholds follow USDA NRCS and EPA Onsite Wastewater Treatment Manual guidance:
 *   - Ksat (µm/s): 15–150 ideal for absorption trench. <5 too slow, >400 too fast.
 *   - Depth to bedrock: ≥1.8 m ideal, 1.0–1.8 m requires special design, <1.0 m limiting.
 *   - Depth to water table: ≥1.8 m ideal, 0.6–1.8 m mound system territory, <0.6 m unsuitable.
 *   - Drainage: well / moderately well drained = ideal; poor/very poor = unsuitable.
 *   - Slope: <8.5° (15%) conventional; 8.5–14° mound system; >14° engineered only.
 *
 * All inputs are optional. Null / unknown values produce a "unknown" limitingFactor
 * but don't block rating based on known factors.
 */
export function computeSepticSuitability(inputs: {
  ksatUmS: number | null;
  bedrockDepthM: number | null;
  waterTableDepthM: number | null;
  drainageClass: string | null;
  slopeDeg: number | null;
}): SepticSuitabilityResult | null {
  const { ksatUmS, bedrockDepthM, waterTableDepthM, drainageClass, slopeDeg } = inputs;

  // Need at least one known factor to produce a useful result
  if (ksatUmS === null && bedrockDepthM === null && waterTableDepthM === null
      && drainageClass === null && slopeDeg === null) {
    return null;
  }

  const limitingFactors: string[] = [];
  let unsuitableCount = 0;
  let marginalCount = 0;
  let requiresMound = false;
  let requiresEngineered = false;

  // Ksat (permeability)
  if (ksatUmS !== null) {
    if (ksatUmS < 5) {
      limitingFactors.push(`Very slow permeability (${ksatUmS} µm/s) — high saturation risk`);
      unsuitableCount++;
    } else if (ksatUmS > 400) {
      limitingFactors.push(`Very high permeability (${ksatUmS} µm/s) — groundwater contamination risk`);
      unsuitableCount++;
    } else if (ksatUmS < 15 || ksatUmS > 150) {
      limitingFactors.push(`Non-ideal permeability (${ksatUmS} µm/s)`);
      marginalCount++;
    }
  }

  // Depth to bedrock
  if (bedrockDepthM !== null) {
    if (bedrockDepthM < 1.0) {
      limitingFactors.push(`Shallow bedrock (${bedrockDepthM.toFixed(1)} m) — <1 m prevents absorption field`);
      unsuitableCount++;
      requiresEngineered = true;
    } else if (bedrockDepthM < 1.8) {
      limitingFactors.push(`Moderate bedrock depth (${bedrockDepthM.toFixed(1)} m) — mound or shallow system required`);
      marginalCount++;
      requiresMound = true;
    }
  }

  // Depth to water table (from groundwater layer)
  if (waterTableDepthM !== null) {
    if (waterTableDepthM < 0.6) {
      limitingFactors.push(`High water table (${waterTableDepthM.toFixed(1)} m) — insufficient separation`);
      unsuitableCount++;
      requiresEngineered = true;
    } else if (waterTableDepthM < 1.8) {
      limitingFactors.push(`Moderate water table (${waterTableDepthM.toFixed(1)} m) — mound system recommended`);
      marginalCount++;
      requiresMound = true;
    }
  }

  // Drainage class
  const drainTier = classifyDrainage(drainageClass);
  if (drainTier === 'unsuitable') {
    limitingFactors.push(`Poor drainage ("${drainageClass}") — groundwater saturation likely`);
    unsuitableCount++;
  } else if (drainTier === 'marginal') {
    limitingFactors.push(`Restricted drainage ("${drainageClass}")`);
    marginalCount++;
  }

  // Slope
  if (slopeDeg !== null) {
    if (slopeDeg > 14) {
      limitingFactors.push(`Steep slope (${slopeDeg.toFixed(1)}°) — engineered system required`);
      marginalCount++;
      requiresEngineered = true;
    } else if (slopeDeg > 8.5) {
      limitingFactors.push(`Moderate slope (${slopeDeg.toFixed(1)}°) — mound system recommended`);
      marginalCount++;
      requiresMound = true;
    }
  }

  // ── Rating ────────────────────────────────────────────────────────────────
  const septicRating: SepticSuitabilityResult['septicRating'] =
    unsuitableCount >= 2 ? 'Unsuitable'
    : unsuitableCount >= 1 ? 'Marginal'
    : marginalCount >= 2 ? 'Marginal'
    : marginalCount === 1 ? 'Good'
    : 'Excellent';

  // ── System recommendation ────────────────────────────────────────────────
  const recommendedSystem: SepticSuitabilityResult['recommendedSystem'] =
    septicRating === 'Unsuitable' ? 'Not recommended'
    : requiresEngineered ? 'Engineered'
    : requiresMound ? 'Mound'
    : 'Conventional';

  // ── Recommendation text ──────────────────────────────────────────────────
  const recommendation =
    septicRating === 'Excellent'
      ? 'Conventional septic system viable. Soil permeability and depth are within ideal ranges. Confirm with on-site percolation test per local code.'
      : septicRating === 'Good'
      ? `${recommendedSystem} system recommended. One minor limiting factor; verify in field.`
      : septicRating === 'Marginal'
      ? `${recommendedSystem} system required. ${limitingFactors.length} limiting factor${limitingFactors.length > 1 ? 's' : ''} — engage certified soil evaluator.`
      : 'Conventional on-site wastewater treatment not viable. Consider composting toilet, off-grid greywater system, or municipal sewer connection.';

  return {
    septicRating,
    recommendedSystem,
    limitingFactors,
    inputs: { ksatUmS, bedrockDepthM, waterTableDepthM, drainageClass, slopeDeg },
    recommendation,
  };
}

// ── Shadow / Shade Modeling ───────────────────────────────────────────────────

/**
 * Cooper's approximation for solar declination angle (degrees).
 * δ = 23.45° × sin(360/365 × (284 + n))  where n = day of year.
 * Accuracy: ±1° — sufficient for practical siting decisions.
 */
function solarDeclination(dayOfYear: number): number {
  const arg = (360 / 365) * (284 + dayOfYear);
  return 23.45 * Math.sin((arg * Math.PI) / 180);
}

/**
 * Noon solar altitude (degrees above horizon) at a given latitude on a given day.
 * α = 90° − |lat − δ|  (N hemisphere; S hemisphere uses |lat + δ|).
 */
function noonSolarAltitude(lat: number, dayOfYear: number): number {
  const delta = solarDeclination(dayOfYear);
  // For both hemispheres: α = 90 - |lat - δ|
  return Math.max(0, 90 - Math.abs(lat - delta));
}

/**
 * Adjust noon solar altitude for slope tilt relative to the sun.
 *
 * S-facing slope in N hemisphere effectively tilts toward the sun — adds slope.
 * N-facing slope tilts away — subtracts slope (can cause deep shade).
 * E / W / flat → no adjustment.
 *
 * The effective altitude represents the angle between the sun and the slope's normal-plus-horizon.
 */
function slopeAdjustedAltitude(
  noonAlt: number,
  lat: number,
  aspect: string | null,
  slopeDeg: number,
): number {
  if (!aspect || slopeDeg === 0) return noonAlt;
  const sunFacingCardinal = lat >= 0 ? 'S' : 'N';
  const shadyCardinal = lat >= 0 ? 'N' : 'S';
  if (aspect === sunFacingCardinal) return Math.min(90, noonAlt + slopeDeg);
  if (aspect === shadyCardinal) return Math.max(0, noonAlt - slopeDeg);
  // Partial (SE/SW/NE/NW): half of slope effect
  if (aspect === 'SE' || aspect === 'SW') {
    return lat >= 0 ? Math.min(90, noonAlt + slopeDeg / 2) : Math.max(0, noonAlt - slopeDeg / 2);
  }
  if (aspect === 'NE' || aspect === 'NW') {
    return lat >= 0 ? Math.max(0, noonAlt - slopeDeg / 2) : Math.min(90, noonAlt + slopeDeg / 2);
  }
  return noonAlt; // E / W — neutral at noon
}

/**
 * Computes shadow / sun-access analysis for a site.
 *
 * Outputs noon solar altitudes at winter solstice, summer solstice, and equinox,
 * adjusted for slope + aspect. Derives winter shade risk and annual sun-access rating.
 *
 * @param lat        - Site latitude (degrees; signed)
 * @param aspect     - Cardinal slope aspect ('N', 'NE', …), or null
 * @param slopeDeg   - Mean slope in degrees (0 if flat)
 */
export function computeShadowAnalysis(
  lat: number | null,
  aspect: string | null,
  slopeDeg: number,
): ShadowAnalysisResult | null {
  if (lat === null) return null;

  // Day of year: Dec 21 ≈ 355, Jun 21 ≈ 172, Mar 21 (equinox) ≈ 80
  // (For S hemisphere, these months flip — but since we use |lat - δ|, the math holds.)
  const winterDoY = lat >= 0 ? 355 : 172;
  const summerDoY = lat >= 0 ? 172 : 355;
  const equinoxDoY = 80;

  const winterRaw = noonSolarAltitude(lat, winterDoY);
  const summerRaw = noonSolarAltitude(lat, summerDoY);
  const equinoxRaw = noonSolarAltitude(lat, equinoxDoY);

  const winterNoonAltitude = Math.round(slopeAdjustedAltitude(winterRaw, lat, aspect, slopeDeg) * 10) / 10;
  const summerNoonAltitude = Math.round(slopeAdjustedAltitude(summerRaw, lat, aspect, slopeDeg) * 10) / 10;
  const equinoxNoonAltitude = Math.round(slopeAdjustedAltitude(equinoxRaw, lat, aspect, slopeDeg) * 10) / 10;

  // Winter shade risk — below 20° is very low sun; slope + aspect compound
  const shadyCardinal = lat >= 0 ? 'N' : 'S';
  const isShadyFace = aspect === shadyCardinal
    || aspect === (lat >= 0 ? 'NE' : 'SE')
    || aspect === (lat >= 0 ? 'NW' : 'SW');

  const winterShadeRisk: ShadowAnalysisResult['winterShadeRisk'] =
    winterNoonAltitude < 10 || (winterNoonAltitude < 20 && isShadyFace && slopeDeg >= 10) ? 'Severe'
    : winterNoonAltitude < 20 ? 'High'
    : winterNoonAltitude < 35 || (isShadyFace && slopeDeg >= 10) ? 'Moderate'
    : 'Low';

  // Annual rating — blend winter + equinox altitudes
  const annualScore = (winterNoonAltitude * 0.5) + (equinoxNoonAltitude * 0.3) + (summerNoonAltitude * 0.2);
  const sunAccessRating: ShadowAnalysisResult['sunAccessRating'] =
    annualScore >= 55 ? 'Excellent'
    : annualScore >= 40 ? 'Good'
    : annualScore >= 25 ? 'Limited'
    : 'Poor';

  // Recommendation
  const facingNote = aspect
    ? (isShadyFace && slopeDeg >= 5 ? ` ${aspect}-facing slope compounds winter shading.`
      : aspect === (lat >= 0 ? 'S' : 'N') && slopeDeg >= 5 ? ` ${aspect}-facing slope enhances solar exposure.`
      : '')
    : '';

  const recommendation =
    sunAccessRating === 'Excellent'
      ? `Full-sun crops viable year-round. Winter noon sun ${winterNoonAltitude}° — ample for greenhouses and winter growing.${facingNote}`
      : sunAccessRating === 'Good'
      ? `Most crops viable. Winter noon sun ${winterNoonAltitude}° — choose south edge for winter-sensitive plantings.${facingNote}`
      : sunAccessRating === 'Limited'
      ? `Shade-tolerant species favored. Winter noon sun only ${winterNoonAltitude}° — avoid siting winter crops near tall features on south side.${facingNote}`
      : `Persistent shade — focus on shade-adapted systems (forest garden, mushrooms, ferns). Winter noon sun ${winterNoonAltitude}° is minimal.${facingNote}`;

  return {
    winterNoonAltitude,
    summerNoonAltitude,
    equinoxNoonAltitude,
    winterShadeRisk,
    sunAccessRating,
    recommendation,
  };
}

// ── Rainwater Harvesting (RWH) Sizing ────────────────────────────────────────

const RWH_EFFICIENCY = 0.85;            // EPA WaterSense runoff coefficient (metal/shingle roof)
const TYPICAL_ROOF_AREA_M2 = 200;        // Typical single-family farmhouse footprint
const WHO_BASIC_DAILY_LITERS = 400;      // WHO basic household water demand (4-person household)

/**
 * Computes rainwater harvesting yield from annual precipitation.
 *
 * Harvest (L/yr) = catchment_area_m² × annual_precip_mm × efficiency
 * (1 mm × 1 m² = 1 L; efficiency 0.85 accounts for evaporation, first-flush diversion, overflow)
 *
 * Outputs both a normalized per-100m² figure and a typical farmhouse estimate
 * (200 m² roof) so users can scale to their own building footprint.
 *
 * @param annualPrecipMm - Annual precipitation from climate layer (mm/year)
 */
export function computeRainwaterHarvesting(
  annualPrecipMm: number | null,
): RwhSizingResult | null {
  if (annualPrecipMm === null || annualPrecipMm <= 0) return null;

  // 100 m² catchment × precip (mm) × efficiency = liters
  const harvestPer100m2Liters = Math.round(100 * annualPrecipMm * RWH_EFFICIENCY);
  const harvestPer100m2M3 = Math.round((harvestPer100m2Liters / 1000) * 10) / 10;

  const typicalFarmhouseLiters = TYPICAL_ROOF_AREA_M2 * annualPrecipMm * RWH_EFFICIENCY;
  const typicalFarmhouseM3 = Math.round((typicalFarmhouseLiters / 1000) * 10) / 10;
  const daysOfHouseholdSupply = Math.round(typicalFarmhouseLiters / WHO_BASIC_DAILY_LITERS);

  // Rating — yield per m² catchment per year
  const yieldPerM2 = annualPrecipMm * RWH_EFFICIENCY; // L/m²/yr
  const rwhRating: RwhSizingResult['rwhRating'] =
    yieldPerM2 >= 850 ? 'Excellent'     // ≥1000 mm/yr humid climate
    : yieldPerM2 >= 425 ? 'Good'          // 500-1000 mm/yr temperate
    : yieldPerM2 >= 170 ? 'Limited'       // 200-500 mm/yr semi-arid
    : 'Poor';                              // <200 mm/yr arid

  const recommendation =
    rwhRating === 'Excellent'
      ? `Humid climate supports robust RWH. A ${TYPICAL_ROOF_AREA_M2} m² roof yields ~${typicalFarmhouseM3} m³/year — ${daysOfHouseholdSupply} days of basic household supply. Size cistern for 3-6 month dry-season buffer.`
      : rwhRating === 'Good'
      ? `Temperate precipitation enables useful RWH. ${TYPICAL_ROOF_AREA_M2} m² roof yields ~${typicalFarmhouseM3} m³/year. Combine with greywater reuse for full-year supply.`
      : rwhRating === 'Limited'
      ? `Semi-arid climate — RWH valuable but supplementary. ${TYPICAL_ROOF_AREA_M2} m² roof yields only ~${typicalFarmhouseM3} m³/year. Maximize catchment area and pair with earthworks (swales, keylines).`
      : `Arid climate — RWH marginal at residential scale. Consider fog harvesting, groundwater, or imported water as primary sources. ${TYPICAL_ROOF_AREA_M2} m² roof yields only ~${typicalFarmhouseM3} m³/year.`;

  return {
    annualPrecipMm,
    efficiency: RWH_EFFICIENCY,
    harvestPer100m2Liters,
    harvestPer100m2M3,
    typicalRoofAreaM2: TYPICAL_ROOF_AREA_M2,
    typicalFarmhouseM3,
    daysOfHouseholdSupply,
    rwhRating,
    recommendation,
  };
}

// ── Pond Volume Estimation ────────────────────────────────────────────────────

/**
 * Estimates achievable pond storage volume from the top watershed_derived pond candidate.
 *
 * Uses a simplified three-step model:
 *   1. area = cellCount × cellArea  (cellArea depends on DEM resolution: US 3DEP = 100 m², CA HRDEM = 400 m²)
 *   2. depth = clamp(1.0 + meanSlope × 0.3, 0.5, 3.0)   (steeper site supports deeper dam)
 *   3. volume = area × depth × 0.5  (pyramidal shape factor)
 *
 * This is a planning-stage estimate — actual construction requires on-site survey
 * of clay layer depth, catchment yield, dam geometry, and spillway design.
 *
 * @param watershedDerivedSummary - Full summary from watershed_derived layer
 * @param countryCode             - 'US' = 10m DEM (100 m²/cell), else 20m (400 m²/cell)
 */
export function computePondVolumeEstimate(
  watershedDerivedSummary: Record<string, unknown> | null,
  countryCode: string | null = 'US',
): PondVolumeResult | null {
  if (!watershedDerivedSummary) return null;
  const pondData = watershedDerivedSummary.pondCandidates as Record<string, unknown> | undefined;
  const rawPonds = Array.isArray(pondData?.candidates) ? pondData!.candidates as unknown[] : [];
  if (rawPonds.length === 0) return null;

  const top = rawPonds[0] as Record<string, unknown>;
  const cellCount = safeNum(top.cellCount);
  const meanSlope = safeNum(top.meanSlope);
  if (cellCount === null || cellCount <= 0) return null;

  const cellAreaM2 = countryCode === 'US' ? 100 : 400;
  const estimatedAreaM2 = Math.round(cellCount * cellAreaM2);

  const slopeForDepth = meanSlope ?? 0.5;
  const estimatedDepthM = Math.max(0.5, Math.min(3.0, 1.0 + slopeForDepth * 0.3));
  const estimatedDepthRounded = Math.round(estimatedDepthM * 10) / 10;

  // Pyramidal shape factor 0.5 — pond tapers from surface to bottom
  const estimatedVolumeM3 = Math.round(estimatedAreaM2 * estimatedDepthM * 0.5);
  const estimatedGallonsUs = Math.round(estimatedVolumeM3 * 264.172);

  const volumeRating: PondVolumeResult['volumeRating'] =
    estimatedVolumeM3 >= 5000 ? 'Large'
    : estimatedVolumeM3 >= 500 ? 'Medium'
    : estimatedVolumeM3 >= 50 ? 'Small'
    : 'Very small';

  const recommendation =
    volumeRating === 'Large'
      ? `Substantial storage (~${estimatedVolumeM3.toLocaleString()} m³ ≈ ${estimatedGallonsUs.toLocaleString()} US gal). Sufficient for irrigation, aquaculture, or multi-month dry-season reserve. Engage licensed pond engineer for dam design and permit.`
      : volumeRating === 'Medium'
      ? `Useful storage (~${estimatedVolumeM3.toLocaleString()} m³). Good for seasonal irrigation and livestock. Confirm clay layer presence for sealing; check local dam permit thresholds.`
      : volumeRating === 'Small'
      ? `Modest storage (~${estimatedVolumeM3.toLocaleString()} m³). Suitable for garden irrigation, wildlife pond, or aesthetic feature. Often exempt from dam permits at this size.`
      : `Very small feature (~${estimatedVolumeM3.toLocaleString()} m³). Limited to microclimate / amphibian habitat value. Consider swales or a rainwater cistern as alternative.`;

  return {
    topCandidateCells: cellCount,
    estimatedAreaM2,
    estimatedDepthM: estimatedDepthRounded,
    estimatedVolumeM3,
    estimatedGallonsUs,
    cellAreaM2,
    volumeRating,
    recommendation,
  };
}

// ── Fire Risk Zoning ──────────────────────────────────────────────────────────

/**
 * Fuel loading by land cover class, 0–100.
 * Based on NFDRS (National Fire Danger Rating System) fuel model analogues.
 */
function fuelByLandCoverClass(primaryClass: string | null, treeCanopyPct: number): number {
  if (!primaryClass) return 30; // unknown — assume moderate
  const c = primaryClass.toLowerCase();

  // High-fuel types
  if (c.includes('evergreen') || c.includes('conifer')) return 90;
  if (c.includes('shrub') || c.includes('chaparral')) return 85;
  if (c.includes('forest') || c.includes('woodland')) {
    // Deciduous forest: fuel scales with canopy density
    return Math.round(60 + treeCanopyPct * 0.3);
  }
  if (c.includes('grassland') || c.includes('herbaceous') || c.includes('pasture')) return 70;
  if (c.includes('savanna')) return 75;

  // Moderate-fuel
  if (c.includes('crop') || c.includes('cultivated') || c.includes('agricultural')) return 40;
  if (c.includes('wetland') && !c.includes('forested')) return 25;  // wet — less flammable
  if (c.includes('forested wetland')) return 50;

  // Low-fuel
  if (c.includes('developed') || c.includes('urban') || c.includes('built')) return 20;
  if (c.includes('barren') || c.includes('rock') || c.includes('sand')) return 10;
  if (c.includes('water') || c.includes('ice')) return 0;

  // Canopy-driven fallback
  return Math.round(30 + treeCanopyPct * 0.4);
}

/**
 * Computes simplified fire risk zoning.
 *
 * Composite = fuelLoading × slopeFactor × windFactor / 100, mapped to risk class.
 *   - slopeFactor: 1 + (slope/15)² capped at 3.0   (Rothermel uphill spread)
 *   - windFactor:  1 + (avgSpeed/10)  capped at 3.0
 *
 * Inputs can be null — function returns null if no land cover is available
 * (land cover is the foundation of fuel loading).
 */
export function computeFireRisk(
  landCoverSummary: Record<string, unknown> | null,
  slopeDeg: number | null,
  avgWindSpeedMs: number | null,
  primaryWindDir: string | null,
): FireRiskResult | null {
  if (!landCoverSummary) return null;

  const primaryClass = typeof landCoverSummary.primary_class === 'string'
    ? landCoverSummary.primary_class
    : null;
  const treeCanopyPct = safeNum(landCoverSummary.tree_canopy_pct) ?? 0;
  if (!primaryClass && treeCanopyPct === 0) return null;

  const fuelLoading = Math.min(100, fuelByLandCoverClass(primaryClass, treeCanopyPct));

  const slope = slopeDeg ?? 0;
  const slopeFactor = Math.min(3.0,
    1 + Math.pow(slope / 15, 2),
  );

  const wind = avgWindSpeedMs ?? 2; // calm baseline
  const windFactor = Math.min(3.0, 1 + (wind / 10));

  const compositeScore = Math.round((fuelLoading * slopeFactor * windFactor) / 100 * 10) / 10;

  const fireRiskClass: FireRiskResult['fireRiskClass'] =
    compositeScore >= 6.0 ? 'Extreme'
    : compositeScore >= 3.5 ? 'High'
    : compositeScore >= 1.8 ? 'Moderate'
    : 'Low';

  // Defensible space guidance per NFPA/CalFire
  const windNote = primaryWindDir
    ? ` Prevailing ${primaryWindDir} winds — extend defensible space on the ${primaryWindDir}-facing side.`
    : '';

  const recommendation =
    fireRiskClass === 'Extreme'
      ? `Extreme fire risk composite (${compositeScore}). Plan ≥30 m defensible space zone + 30 m reduced-fuel zone around all structures. Use Class A roof + ember-resistant vents. Site structures on benches/flats, not upslope from fuel.${windNote}`
      : fireRiskClass === 'High'
      ? `High fire risk composite (${compositeScore}). Maintain ≥15 m defensible space + 15 m reduced-fuel zone. Limb trees to 2 m; keep grass <10 cm within 10 m of structures.${windNote}`
      : fireRiskClass === 'Moderate'
      ? `Moderate fire risk composite (${compositeScore}). Standard 10 m defensible space sufficient. Seasonal mowing + gutter cleaning recommended.${windNote}`
      : `Low fire risk composite (${compositeScore}). Minimal fire-specific siting constraints. Standard brush management adequate.${windNote}`;

  return {
    fuelLoading,
    slopeFactor: Math.round(slopeFactor * 100) / 100,
    windFactor: Math.round(windFactor * 100) / 100,
    compositeScore,
    fireRiskClass,
    primaryWindDirection: primaryWindDir,
    recommendation,
  };
}

// ── Footprint Optimization ────────────────────────────────────────────────────

/** Map a passive-solar advantage rating to a 0–25 sub-score */
function solarAdvantageToScore(advantage: PassiveSolarResult['solarAdvantage'] | undefined): number {
  if (!advantage) return 12; // neutral assumption when unknown
  if (advantage === 'Excellent') return 25;
  if (advantage === 'Good') return 20;
  if (advantage === 'Moderate') return 13;
  return 6; // Poor
}

/** Map drainage class phrase to a 0–15 sub-score (well-drained preferred for dry footings) */
function drainageClassToFootprintScore(drainage: string | null): number {
  if (!drainage) return 8;
  const d = drainage.toLowerCase();
  if (d.includes('well drained') && !d.includes('moderately') && !d.includes('somewhat') && !d.includes('excess')) return 15;
  if (d.includes('moderately well')) return 12;
  if (d.includes('somewhat excessively') || d.includes('excessively')) return 11; // dry but stable
  if (d.includes('somewhat poorly')) return 7;
  if (d.includes('poorly')) return 3;
  if (d.includes('very poorly')) return 0;
  return 8;
}

/**
 * Composite building-footprint quality from terrain + solar + wind + drainage + flood.
 *
 * Returns null if there is not enough upstream data to produce even a rough rating
 * (neither passive solar, windbreak, nor slope known).
 */
export function computeFootprintOptimization(
  passiveSolar: PassiveSolarResult | null,
  windbreak: WindbreakResult | null,
  meanSlopeDeg: number,
  lat: number | null,
  watershedDerivedSummary: Record<string, unknown> | null,
  soilsSummary: Record<string, unknown> | null,
  wetlandsSummary: Record<string, unknown> | null,
): FootprintOptimizationResult | null {
  if (!passiveSolar && !windbreak && !meanSlopeDeg) return null;

  const limitingFactors: string[] = [];

  // ── Terrain sub-score (0–25) — slope preferred 2–6°; TPI flat bonus if available
  let terrain = 25;
  if (meanSlopeDeg > 15) {
    terrain = 6;
    limitingFactors.push(`Steep mean slope ${meanSlopeDeg.toFixed(1)}° — major cut/fill or stepped foundation required`);
  } else if (meanSlopeDeg > 10) {
    terrain = 12;
    limitingFactors.push(`Moderately steep slope ${meanSlopeDeg.toFixed(1)}° — engineered foundation recommended`);
  } else if (meanSlopeDeg > 6) {
    terrain = 18;
  } else if (meanSlopeDeg < 1) {
    terrain = 20; // flat but drainage risk
  }
  // TPI flat-area bonus
  const tpiFlatPct = safeNum(watershedDerivedSummary?.tpi_flat_area_pct);
  if (tpiFlatPct !== null && tpiFlatPct > 30) {
    terrain = Math.min(25, terrain + 3);
  }

  // ── Solar sub-score (0–25)
  const solar = solarAdvantageToScore(passiveSolar?.solarAdvantage);
  if (passiveSolar && (passiveSolar.solarAdvantage === 'Poor' || passiveSolar.solarAdvantage === 'Moderate')) {
    limitingFactors.push(`Passive solar ${passiveSolar.solarAdvantage.toLowerCase()} — current ${passiveSolar.currentAspect}-facing aspect off optimal ${passiveSolar.optimalAspect}`);
  }

  // ── Wind sub-score (0–20)
  let wind = 20;
  if (windbreak) {
    if (windbreak.avgWindSpeedMs >= 7) {
      wind = 6;
      limitingFactors.push(`High average wind ${windbreak.avgWindSpeedMs.toFixed(1)} m/s — site behind windbreak essential`);
    } else if (windbreak.avgWindSpeedMs >= 5) {
      wind = 12;
      limitingFactors.push(`Moderate wind exposure ${windbreak.avgWindSpeedMs.toFixed(1)} m/s — plan windbreak upwind`);
    } else if (windbreak.avgWindSpeedMs >= 3) {
      wind = 17;
    }
  }

  // ── Drainage sub-score (0–15)
  const drainageClass = typeof soilsSummary?.drainage_class === 'string' ? soilsSummary.drainage_class : null;
  const drainage = drainageClassToFootprintScore(drainageClass);
  if (drainage <= 3 && drainageClass) {
    limitingFactors.push(`${drainageClass} soils — poor drainage at footings, plan perimeter drains + raised slab`);
  }

  // ── Flood sub-score (0–15) — penalize when in flood zone
  let flood = 15;
  const floodZone = wetlandsSummary?.flood_zone ?? wetlandsSummary?.fema_flood_zone;
  const floodZoneStr = typeof floodZone === 'string' ? floodZone.toUpperCase() : '';
  if (floodZoneStr.startsWith('A') || floodZoneStr.startsWith('V')) {
    flood = 0;
    limitingFactors.push(`FEMA flood zone ${floodZoneStr} — structures disallowed/prohibitively regulated`);
  } else if (floodZoneStr === 'X-SHADED' || floodZoneStr.includes('0.2')) {
    flood = 7;
    limitingFactors.push('500-yr floodplain — elevate lowest floor ≥0.6 m above BFE');
  }

  const compositeScore = Math.round(terrain + solar + wind + drainage + flood);

  const rating: FootprintOptimizationResult['rating'] =
    compositeScore >= 85 ? 'Excellent'
    : compositeScore >= 65 ? 'Good'
    : compositeScore >= 45 ? 'Marginal'
    : 'Poor';

  // ── Best aspect: hemisphere-aware ideal building long-axis facing
  const hemisphere = lat === null ? 'N' : (lat >= 0 ? 'N' : 'S');
  const bestAspectDirection = hemisphere === 'N' ? 'South (S / SSE / SSW)' : 'North (N / NNE / NNW)';

  // ── Narrative
  const aspectNarrative = passiveSolar?.currentAspect ?? 'open';
  const shelterNarrative = windbreak && windbreak.avgWindSpeedMs >= 5
    ? ` with windbreak on the ${windbreak.primaryWindDir}-upwind side`
    : ' with open exposure';
  const terrainNarrative =
    meanSlopeDeg < 1 ? 'flat'
    : meanSlopeDeg < 6 ? 'gently sloping'
    : meanSlopeDeg < 10 ? 'moderately sloping'
    : 'steep';
  const recommendedBuildZone =
    rating === 'Poor'
      ? 'No clearly optimal footprint on this site — major grading or an alternate parcel advised'
      : `${terrainNarrative} ${aspectNarrative}-facing bench${shelterNarrative}`;

  return {
    compositeScore,
    rating,
    bestAspectDirection,
    recommendedBuildZone,
    limitingFactors,
    subScores: { terrain, solar, wind, drainage, flood },
  };
}

// ── Compost Siting ────────────────────────────────────────────────────────────

/** Return the 180°-opposite cardinal direction (downwind of prevailing wind) */
function opposite8(dir: string | null | undefined): string {
  if (!dir) return 'downwind';
  const map: Record<string, string> = {
    N: 'S', NE: 'SW', E: 'W', SE: 'NW',
    S: 'N', SW: 'NE', W: 'E', NW: 'SE',
  };
  return map[dir] ?? 'downwind';
}

/**
 * Compost / household-waste siting heuristic.
 *
 * Preferences (USDA NRCS / EPA backyard composting guidance):
 *   - Slope ≤ 8° to minimise runoff contamination
 *   - Well / moderately-well drained soils
 *   - Downwind of dwelling so odors drift away from occupied structures
 *
 * Returns null when there is neither slope nor drainage data to reason from.
 */
export function computeCompostSiting(
  meanSlopeDeg: number,
  soilsSummary: Record<string, unknown> | null,
  primaryWindDir: string | null,
): CompostSitingResult | null {
  if (!meanSlopeDeg && !soilsSummary && !primaryWindDir) return null;

  const drainageClass = typeof soilsSummary?.drainage_class === 'string' ? soilsSummary.drainage_class : null;
  const slope = meanSlopeDeg > 0 ? meanSlopeDeg : null;
  const limitingFactors: string[] = [];

  // Slope check
  let slopeScore = 0; // 0 good, 1 marginal, 2 unsuitable
  if (slope !== null) {
    if (slope <= 4) slopeScore = 0;
    else if (slope <= 8) slopeScore = 1;
    else {
      slopeScore = 2;
      limitingFactors.push(`Slope ${slope.toFixed(1)}° > 8° — high runoff/leaching risk, terrace or relocate`);
    }
  }

  // Drainage check
  let drainageScore = 0;
  if (drainageClass) {
    const d = drainageClass.toLowerCase();
    if (d.includes('very poorly') || d.includes('poorly drained')) {
      drainageScore = 2;
      limitingFactors.push(`${drainageClass} soils — standing water hampers aerobic composting`);
    } else if (d.includes('somewhat poorly')) {
      drainageScore = 1;
      limitingFactors.push(`${drainageClass} — add lifted pad to keep pile aerated`);
    } else if (d.includes('excessively')) {
      drainageScore = 1;
      limitingFactors.push(`${drainageClass} — leachate may percolate rapidly, site ≥15 m from wells`);
    }
  }

  // Rating
  const worst = Math.max(slopeScore, drainageScore);
  const rating: CompostSitingResult['rating'] =
    worst === 0 && (slope !== null || drainageClass) ? 'Excellent'
    : worst <= 1 ? 'Good'
    : worst === 2 && limitingFactors.length === 1 ? 'Marginal'
    : 'Unsuitable';

  // Direction from dwelling: downwind of prevailing wind (so odors drift away)
  const downwind = opposite8(primaryWindDir);
  const recommendedDirectionFromDwelling = primaryWindDir
    ? `${downwind} (downwind of prevailing ${primaryWindDir} winds)`
    : 'downwind of dwelling';

  const recommendation =
    rating === 'Excellent'
      ? `Site compost bay on a ${recommendedDirectionFromDwelling}, ≥15 m from wells/surface water. Three-bin rotation sized for household scale.`
      : rating === 'Good'
      ? `Workable compost site on a ${recommendedDirectionFromDwelling}. Monitor slope runoff after heavy rain and keep ≥15 m from wells.`
      : rating === 'Marginal'
      ? `Compost siting possible ${recommendedDirectionFromDwelling} but mitigations required: ${limitingFactors.join('; ')}. Consider an enclosed tumbler or raised pad.`
      : `Open-air composting not recommended here: ${limitingFactors.join('; ')}. Use an enclosed system, or relocate to flatter, better-drained ground.`;

  return {
    rating,
    recommendedDirectionFromDwelling,
    slopeDeg: slope,
    drainageClass,
    limitingFactors,
    recommendation,
  };
}

// ── Top-level entry point ─────────────────────────────────────────────────────

/**
 * Top-level entry point used by SiteIntelligencePanel.
 * Gracefully returns null sub-results when required inputs are absent.
 *
 * @param predominantAspect       - Cardinal aspect string from elevation layer, or null
 * @param lat                     - Site latitude from parcel centroid, or null
 * @param meanSlopeDeg            - Mean slope in degrees (0 if absent)
 * @param windRose                - 16-sector wind rose from climate layer, or null
 * @param watershedDerivedSummary - Full summary object from watershed_derived layer, or null
 * @param soilsSummary            - Full summary object from soils layer, or null
 * @param groundwaterSummary      - Full summary object from groundwater layer, or null
 * @param climateSummary          - Full summary object from climate layer, or null (for RWH annual_precip_mm)
 * @param landCoverSummary        - Full summary object from land_cover layer, or null (for fire risk)
 * @param countryCode             - 'US' or 'CA' — controls DEM cell-area assumption for pond volume
 */
export function computeDesignIntelligence(
  predominantAspect: string | null,
  lat: number | null,
  meanSlopeDeg: number,
  windRose: {
    frequencies_16: number[];
    speeds_avg_ms: number[];
    calm_pct: number;
  } | null,
  watershedDerivedSummary: Record<string, unknown> | null = null,
  soilsSummary: Record<string, unknown> | null = null,
  groundwaterSummary: Record<string, unknown> | null = null,
  climateSummary: Record<string, unknown> | null = null,
  landCoverSummary: Record<string, unknown> | null = null,
  countryCode: string | null = 'US',
  wetlandsSummary: Record<string, unknown> | null = null,
): DesignIntelligenceResult {
  const passiveSolar =
    predominantAspect && lat !== null
      ? computePassiveSolarOrientation(predominantAspect, lat, meanSlopeDeg)
      : null;

  const windbreak = computeWindbreakSiting(windRose);

  const waterHarvesting = computeWaterHarvesting(watershedDerivedSummary);

  // Septic inputs — pull numeric fields safely
  const septic = (soilsSummary || groundwaterSummary)
    ? computeSepticSuitability({
        ksatUmS: safeNum(soilsSummary?.ksat_um_s),
        bedrockDepthM: safeNum(soilsSummary?.depth_to_bedrock_m),
        waterTableDepthM: safeNum(groundwaterSummary?.groundwater_depth_m),
        drainageClass: typeof soilsSummary?.drainage_class === 'string' ? soilsSummary.drainage_class : null,
        slopeDeg: meanSlopeDeg > 0 ? meanSlopeDeg : null,
      })
    : null;

  const shadow = computeShadowAnalysis(lat, predominantAspect, meanSlopeDeg);

  // RWH — annual precipitation from climate layer
  const rwh = computeRainwaterHarvesting(safeNum(climateSummary?.annual_precip_mm));

  // Pond volume estimate from top candidate in watershed_derived
  const pondVolume = computePondVolumeEstimate(watershedDerivedSummary, countryCode);

  // Fire risk composite — land cover fuel × slope × wind
  const primaryWindDir = windbreak?.primaryWindDir ?? null;
  const avgWindSpeed = windbreak?.avgWindSpeedMs ?? null;
  const fireRisk = computeFireRisk(landCoverSummary, meanSlopeDeg || null, avgWindSpeed, primaryWindDir);

  // Footprint optimization — composite of terrain + solar + wind + drainage + flood
  const footprint = computeFootprintOptimization(
    passiveSolar,
    windbreak,
    meanSlopeDeg,
    lat,
    watershedDerivedSummary,
    soilsSummary,
    wetlandsSummary,
  );

  // Compost siting — slope + drainage + downwind-of-dwelling heuristic
  const compostSiting = computeCompostSiting(meanSlopeDeg, soilsSummary, primaryWindDir);

  return {
    passiveSolar,
    windbreak,
    waterHarvesting,
    septic,
    shadow,
    rwh,
    pondVolume,
    fireRisk,
    footprint,
    compostSiting,
  };
}
