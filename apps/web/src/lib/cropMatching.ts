/**
 * Crop Suitability Matching Engine
 *
 * Scores each FAO EcoCrop entry against a site's climate + soil profile.
 * Uses the same optimal/absolute range scoring method as the OpenCLIM model:
 *   - Value within optimal range  → 100% (score 1.0)
 *   - Value between absolute and optimal → linear interpolation (0.0–1.0)
 *   - Value outside absolute range → 0%
 *
 * Returns ranked CropMatch[] with overall suitability, per-factor scores,
 * and limiting factors.
 */

import { ECOCROP_DB, type CropEntry } from '../data/ecocropSubset.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SiteConditions {
  /** Mean annual temperature in celsius */
  annualTempC: number | null;
  /** Annual precipitation in mm */
  annualPrecipMm: number | null;
  /** Soil pH */
  ph: number | null;
  /** Soil drainage class string (e.g. "Well drained") */
  drainageClass: string | null;
  /** Soil texture class string (e.g. "Loam", "Clay loam") */
  textureClass: string | null;
  /** Rooting depth in cm */
  rootingDepthCm: number | null;
  /** Electrical conductivity (dS/m) — salinity indicator */
  ecDsM: number | null;
  /** Clay percentage */
  clayPct: number | null;
  /** Sand percentage */
  sandPct: number | null;
  /** Frost-free days (growing season length) */
  frostFreeDays: number | null;
  /** Killing temperature — minimum winter temp in celsius */
  minWinterTempC: number | null;
}

export interface FactorScore {
  factor: string;
  score: number;        // 0.0–1.0
  siteValue: string;
  cropRange: string;
  limiting: boolean;    // true if this is the lowest-scoring factor
}

export interface CropMatch {
  crop: CropEntry;
  /** Overall suitability 0–100 */
  suitability: number;
  /** Classification: S1 (>80), S2 (60-80), S3 (40-60), N1 (20-40), N2 (<20) */
  suitabilityClass: 'S1' | 'S2' | 'S3' | 'N1' | 'N2';
  /** Human label */
  suitabilityLabel: string;
  /** Per-factor breakdown */
  factors: FactorScore[];
  /** Names of the most limiting factors (score < 0.5) */
  limitingFactors: string[];
  /** Number of factors that could be evaluated (had site data) */
  factorsEvaluated: number;
}

/* ------------------------------------------------------------------ */
/*  Scoring helpers                                                    */
/* ------------------------------------------------------------------ */

/**
 * Score a value against an optimal + absolute range.
 * Returns 1.0 if within optimal, 0.0 if outside absolute,
 * and linearly interpolated between.
 */
function rangeScore(
  value: number,
  optMin: number,
  optMax: number,
  absMin: number,
  absMax: number,
): number {
  if (value >= optMin && value <= optMax) return 1.0;
  if (value < absMin || value > absMax) return 0.0;
  if (value < optMin) {
    // Between absMin and optMin
    return (value - absMin) / (optMin - absMin);
  }
  // Between optMax and absMax
  return (absMax - value) / (absMax - optMax);
}

/** Map site drainage string to numeric code matching EcoCrop conventions. */
function drainageToCode(drainage: string): number {
  const d = drainage.toLowerCase();
  if (d.includes('poor') || d.includes('very poor')) return 1;
  if (d.includes('well') || d.includes('moderate')) return 2;
  if (d.includes('excess') || d.includes('rapid') || d.includes('somewhat excess')) return 3;
  return 2; // default to well drained
}

/** Map site texture class to numeric code matching EcoCrop conventions. */
function textureToCode(texture: string): number {
  const t = texture.toLowerCase();
  if (t.includes('clay') && !t.includes('loam')) return 1; // heavy
  if (t.includes('sand') && !t.includes('loam')) return 3; // light
  if (t.includes('organic') || t.includes('muck') || t.includes('peat')) return 4;
  return 2; // medium (loam variants)
}

/** Map EC (dS/m) to salinity tolerance code. */
function ecToSalinityCode(ec: number): number {
  if (ec <= 0.5) return 0;  // none
  if (ec <= 4) return 1;     // low
  if (ec <= 10) return 2;    // medium
  return 3;                   // high
}

function suitabilityClass(score: number): CropMatch['suitabilityClass'] {
  if (score >= 80) return 'S1';
  if (score >= 60) return 'S2';
  if (score >= 40) return 'S3';
  if (score >= 20) return 'N1';
  return 'N2';
}

const SUIT_LABELS: Record<string, string> = {
  S1: 'Highly Suitable',
  S2: 'Moderately Suitable',
  S3: 'Marginally Suitable',
  N1: 'Currently Not Suitable',
  N2: 'Not Suitable',
};

/* ------------------------------------------------------------------ */
/*  Main matching function                                             */
/* ------------------------------------------------------------------ */

/**
 * Score a single crop against site conditions.
 * Returns null if insufficient data for meaningful evaluation.
 */
function scoreCrop(crop: CropEntry, site: SiteConditions): CropMatch | null {
  const factors: FactorScore[] = [];

  // 1. Temperature
  if (site.annualTempC != null) {
    const s = rangeScore(
      site.annualTempC,
      crop.tempOpt[0], crop.tempOpt[1],
      crop.tempAbs[0], crop.tempAbs[1],
    );
    factors.push({
      factor: 'Temperature',
      score: s,
      siteValue: `${site.annualTempC.toFixed(1)}\u00B0C`,
      cropRange: `${crop.tempOpt[0]}\u2013${crop.tempOpt[1]}\u00B0C optimal`,
      limiting: false,
    });
  }

  // 2. Precipitation
  if (site.annualPrecipMm != null) {
    const s = rangeScore(
      site.annualPrecipMm,
      crop.precipOpt[0], crop.precipOpt[1],
      crop.precipAbs[0], crop.precipAbs[1],
    );
    factors.push({
      factor: 'Precipitation',
      score: s,
      siteValue: `${Math.round(site.annualPrecipMm)} mm/yr`,
      cropRange: `${crop.precipOpt[0]}\u2013${crop.precipOpt[1]} mm optimal`,
      limiting: false,
    });
  }

  // 3. Soil pH
  if (site.ph != null) {
    const s = rangeScore(
      site.ph,
      crop.phOpt[0], crop.phOpt[1],
      crop.phAbs[0], crop.phAbs[1],
    );
    factors.push({
      factor: 'Soil pH',
      score: s,
      siteValue: `${site.ph.toFixed(1)}`,
      cropRange: `${crop.phOpt[0]}\u2013${crop.phOpt[1]} optimal`,
      limiting: false,
    });
  }

  // 4. Drainage compatibility
  if (site.drainageClass != null && crop.drainage != null) {
    const siteCode = drainageToCode(site.drainageClass);
    // Score: 1.0 if match, 0.5 if adjacent, 0.0 if opposite
    const diff = Math.abs(siteCode - crop.drainage);
    const s = diff === 0 ? 1.0 : diff === 1 ? 0.5 : 0.0;
    factors.push({
      factor: 'Drainage',
      score: s,
      siteValue: site.drainageClass,
      cropRange: DRAINAGE_LABEL[crop.drainage] ?? 'Unknown',
      limiting: false,
    });
  }

  // 5. Soil texture compatibility
  if (site.textureClass != null && crop.texture != null) {
    const siteCode = textureToCode(site.textureClass);
    // 1.0 if site texture is in crop's accepted list, or crop accepts "wide" (0)
    const s = crop.texture.includes(0) || crop.texture.includes(siteCode) ? 1.0 : 0.3;
    factors.push({
      factor: 'Soil Texture',
      score: s,
      siteValue: site.textureClass,
      cropRange: crop.texture.map((c) => TEXTURE_LABEL[c] ?? '?').join(', '),
      limiting: false,
    });
  }

  // 6. Rooting depth
  if (site.rootingDepthCm != null && crop.soilDepth != null) {
    const s = site.rootingDepthCm >= crop.soilDepth
      ? 1.0
      : site.rootingDepthCm >= crop.soilDepth * 0.6
        ? 0.5
        : 0.1;
    factors.push({
      factor: 'Soil Depth',
      score: s,
      siteValue: `${Math.round(site.rootingDepthCm)} cm`,
      cropRange: `\u2265${crop.soilDepth} cm required`,
      limiting: false,
    });
  }

  // 7. Salinity tolerance
  if (site.ecDsM != null && crop.salinity != null) {
    const siteSal = ecToSalinityCode(site.ecDsM);
    // Crop salinity = maximum it can tolerate. Site salinity must be <= crop tolerance
    const s = siteSal <= crop.salinity ? 1.0 : siteSal === crop.salinity + 1 ? 0.4 : 0.0;
    factors.push({
      factor: 'Salinity',
      score: s,
      siteValue: `${site.ecDsM.toFixed(1)} dS/m`,
      cropRange: `Tolerates up to ${SAL_LABEL[crop.salinity] ?? '?'}`,
      limiting: false,
    });
  }

  // 8. Growing season length
  if (site.frostFreeDays != null && crop.growingDays[0] > 0) {
    const minDays = crop.growingDays[0];
    const s = site.frostFreeDays >= minDays
      ? 1.0
      : site.frostFreeDays >= minDays * 0.8
        ? 0.5
        : 0.1;
    factors.push({
      factor: 'Growing Season',
      score: s,
      siteValue: `${site.frostFreeDays} frost-free days`,
      cropRange: `\u2265${minDays} days required`,
      limiting: false,
    });
  }

  // 9. Killing temperature (cold hardiness)
  if (site.minWinterTempC != null && crop.killingTemp != null) {
    const s = site.minWinterTempC >= crop.killingTemp ? 1.0 : 0.0;
    factors.push({
      factor: 'Cold Hardiness',
      score: s,
      siteValue: `${site.minWinterTempC.toFixed(0)}\u00B0C winter min`,
      cropRange: `Killed at ${crop.killingTemp}\u00B0C`,
      limiting: false,
    });
  }

  // Need at least 2 factors evaluated for a meaningful result
  if (factors.length < 2) return null;

  // Mark limiting factors
  const minScore = Math.min(...factors.map((f) => f.score));
  for (const f of factors) {
    if (f.score <= minScore + 0.01) f.limiting = true;
  }

  // Overall suitability: Liebig's law — geometric mean with extra weight on minimum
  // This balances "one bad factor kills it" with "overall environment matters"
  const scores = factors.map((f) => f.score);
  const min = Math.min(...scores);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  // Weighted: 40% minimum factor, 60% mean of all factors
  const overall = Math.round((min * 0.4 + mean * 0.6) * 100);
  const clampedOverall = Math.max(0, Math.min(100, overall));

  const cls = suitabilityClass(clampedOverall);

  return {
    crop,
    suitability: clampedOverall,
    suitabilityClass: cls,
    suitabilityLabel: SUIT_LABELS[cls] ?? cls,
    factors,
    limitingFactors: factors.filter((f) => f.score < 0.5).map((f) => f.factor),
    factorsEvaluated: factors.length,
  };
}

/* ------------------------------------------------------------------ */
/*  Labels                                                             */
/* ------------------------------------------------------------------ */

const DRAINAGE_LABEL: Record<number, string> = {
  1: 'Poorly drained',
  2: 'Well drained',
  3: 'Excessively drained',
};

const TEXTURE_LABEL: Record<number, string> = {
  0: 'Any',
  1: 'Heavy (clay)',
  2: 'Medium (loam)',
  3: 'Light (sandy)',
  4: 'Organic',
};

const SAL_LABEL: Record<number, string> = {
  0: 'No salinity',
  1: 'Low (<4 dS/m)',
  2: 'Medium (4\u201310 dS/m)',
  3: 'High (>10 dS/m)',
};

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface MatchOptions {
  /** Only match crops in these categories (default: all) */
  categories?: string[];
  /** Only match these lifecycle types (default: all) */
  lifecycles?: Array<'annual' | 'biennial' | 'perennial'>;
  /** Minimum suitability score to include (default: 20) */
  minSuitability?: number;
  /** Maximum results to return (default: 50) */
  maxResults?: number;
}

/**
 * Match all EcoCrop entries against site conditions.
 * Returns ranked CropMatch[] sorted by suitability descending.
 */
export function matchCropsToSite(
  site: SiteConditions,
  options?: MatchOptions,
): CropMatch[] {
  const {
    categories,
    lifecycles,
    minSuitability = 20,
    maxResults = 50,
  } = options ?? {};

  let crops = ECOCROP_DB;

  // Filter by category if specified
  if (categories && categories.length > 0) {
    const catSet = new Set(categories);
    crops = crops.filter((c) => catSet.has(c.category));
  }

  // Filter by lifecycle if specified
  if (lifecycles && lifecycles.length > 0) {
    const lcSet = new Set(lifecycles);
    crops = crops.filter((c) => c.lifecycle !== 'unknown' && lcSet.has(c.lifecycle));
  }

  const results: CropMatch[] = [];

  for (const crop of crops) {
    const match = scoreCrop(crop, site);
    if (match && match.suitability >= minSuitability) {
      results.push(match);
    }
  }

  // Sort by suitability descending, then by name
  results.sort((a, b) => b.suitability - a.suitability || a.crop.name.localeCompare(b.crop.name));

  return results.slice(0, maxResults);
}

/**
 * Build SiteConditions from the layer summary objects produced by layerFetcher.
 * Extracts relevant fields from climate + soil + terrain summaries.
 */
export function siteConditionsFromLayers(
  climateSummary: Record<string, unknown> | null,
  soilSummary: Record<string, unknown> | null,
): SiteConditions {
  const num = (obj: Record<string, unknown> | null, key: string): number | null => {
    if (!obj) return null;
    const v = obj[key];
    return typeof v === 'number' ? v : null;
  };
  const str = (obj: Record<string, unknown> | null, key: string): string | null => {
    if (!obj) return null;
    const v = obj[key];
    return typeof v === 'string' && v !== 'N/A' && v !== 'Unknown' ? v : null;
  };

  // Estimate frost-free days from first/last frost if available
  let frostFreeDays: number | null = null;
  const firstFrost = str(climateSummary, 'first_frost_date');
  const lastFrost = str(climateSummary, 'last_frost_date');
  if (firstFrost && lastFrost) {
    const ff = new Date(`2024-${firstFrost}`);
    const lf = new Date(`2024-${lastFrost}`);
    if (!isNaN(ff.getTime()) && !isNaN(lf.getTime())) {
      const diffMs = ff.getTime() - lf.getTime();
      frostFreeDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    }
  }

  // Estimate min winter temp from monthly normals or hardiness zone
  let minWinterTempC: number | null = null;
  const monthlyMins = climateSummary?.['_monthly_normals'];
  if (Array.isArray(monthlyMins) && monthlyMins.length === 12) {
    const janMin = monthlyMins[0];
    if (typeof janMin === 'object' && janMin && typeof janMin.minC === 'number') {
      minWinterTempC = janMin.minC;
    }
  }

  return {
    annualTempC: num(climateSummary, 'annual_temp_mean_c'),
    annualPrecipMm: num(climateSummary, 'annual_precip_mm'),
    ph: num(soilSummary, 'ph_value'),
    drainageClass: str(soilSummary, 'drainage_class'),
    textureClass: str(soilSummary, 'texture_class'),
    rootingDepthCm: num(soilSummary, 'rooting_depth_cm'),
    ecDsM: num(soilSummary, 'ec_ds_m'),
    clayPct: num(soilSummary, 'clay_pct'),
    sandPct: num(soilSummary, 'sand_pct'),
    frostFreeDays,
    minWinterTempC,
  };
}
