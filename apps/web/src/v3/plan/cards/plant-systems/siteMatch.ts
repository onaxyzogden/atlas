/**
 * Plant-systems site-match scoring helpers.
 *
 * Scholar verdict (Permaculture Scholar NotebookLM, 2026-05-07): plant
 * design must respond to macro-site analysis (water flow, sectors, zones)
 * — not operate as an isolated database. Quote: "Tree placement will
 * follow the patterns of water flow and access and will be part of the
 * long-term major infrastructure of our design sites."
 *
 * v1 was hardiness-zone overlap only. v2 (2026-05-07) adds two optional
 * site axes pulled from `siteDataStore`:
 *
 *   1. **Precipitation match.** A species' `waterNeeds` (low | med | high)
 *      is matched against the site's annual precipitation. Mediterranean
 *      olive on a 1500 mm/yr site or a `high`-need bog plant on a 300 mm
 *      site is flagged via the score, not just the rationale.
 *
 *   2. **Slope match.** On steep ground (> 15° mean) deeply tap-rooted
 *      species score better than shallow fibrous-root systems — the
 *      Yeomans/Lawton observation that anchor-root woody perennials are
 *      a slope's first defence against shear failure. Flat ground
 *      receives no slope penalty either way.
 *
 * Both inputs are optional — when the site layers haven't been fetched
 * the function falls back to hardiness-only scoring with weight 1.0
 * (no penalty for missing data).
 */

import type { PlantSpecies } from '../../../../data/plantDatabase.js';

/** Approximate USDA hardiness zone band typical for a country's
 *  agriculturally-active range. Conservative centre-of-mass values used
 *  to derive a rough overlap fraction. New jurisdictions append. */
const COUNTRY_ZONE_BANDS: Record<string, [number, number]> = {
  US: [3, 11],
  CA: [2, 8],
  GB: [7, 9],
  IE: [7, 9],
  FR: [6, 10],
  ES: [7, 11],
  DE: [5, 8],
  AU: [8, 12],
  NZ: [7, 11],
  MX: [8, 12],
};

/** Returns 0..1 fraction representing how well a species' hardiness
 *  range overlaps a country's typical agricultural zone band. */
export function hardinessOverlap(
  species: Pick<PlantSpecies, 'hardinessZones'>,
  country: string,
): number {
  const band = COUNTRY_ZONE_BANDS[country] ?? [4, 10];
  const [siteMin, siteMax] = band;
  const [spMin, spMax] = species.hardinessZones;
  const lo = Math.max(siteMin, spMin);
  const hi = Math.min(siteMax, spMax);
  if (hi <= lo) return 0;
  const overlap = hi - lo;
  const spRange = Math.max(1, spMax - spMin);
  return Math.min(1, overlap / spRange);
}

/** Optional site context fed by the card from `siteDataStore`. Both
 *  fields independently optional — the score function weights each
 *  axis to zero when its input is missing. */
export interface SiteContext {
  /** Annual precipitation in millimetres (climate layer). */
  annualPrecipMm?: number | null;
  /** Mean slope of the site, degrees (elevation layer). */
  meanSlopeDeg?: number | null;
}

/** Score (0..1) of a species' `waterNeeds` against actual annual
 *  precipitation. Ranges are intentionally generous — these are
 *  rules of thumb, not crop-coefficient ET tables. */
function precipMatch(species: Pick<PlantSpecies, 'waterNeeds'>, precipMm: number): number {
  // 'low' species: drought-tolerant, prefer < 700 mm; struggle to
  // thrive (root-rot, fungal pressure) in > 1200 mm climates.
  // 'med' species: typical 500–1400 mm broadleaf orchard band.
  // 'high' species: bog/riparian, want > 800 mm and don't mind 2000.
  switch (species.waterNeeds) {
    case 'low':
      if (precipMm <= 700) return 1.0;
      if (precipMm <= 1000) return 0.8;
      if (precipMm <= 1400) return 0.5;
      return 0.25;
    case 'med':
      if (precipMm >= 500 && precipMm <= 1400) return 1.0;
      if (precipMm >= 350 && precipMm <= 1700) return 0.7;
      return 0.35;
    case 'high':
      if (precipMm >= 1000) return 1.0;
      if (precipMm >= 700) return 0.7;
      if (precipMm >= 500) return 0.4;
      return 0.15;
  }
}

/** Score (0..1) of a species' root pattern against site slope.
 *  Flat-to-gentle ground returns 1.0 for any pattern. On steep
 *  slope (>15°) tap-rooted woody anchors are favoured. */
function slopeMatch(species: Pick<PlantSpecies, 'rootPattern'>, slopeDeg: number): number {
  if (slopeDeg < 5) return 1.0;
  if (slopeDeg < 15) {
    // Mild slope — only a small bonus for tap roots.
    return species.rootPattern === 'tap' ? 1.0 : 0.92;
  }
  if (slopeDeg < 25) {
    // Steep — tap full credit, fibrous moderate, rhizome poor (rhizomes
    // mat horizontally and don't anchor a steep face).
    if (species.rootPattern === 'tap') return 1.0;
    if (species.rootPattern === 'fibrous') return 0.75;
    return 0.55;
  }
  // Very steep — only deep tap roots score well.
  if (species.rootPattern === 'tap') return 0.9;
  if (species.rootPattern === 'fibrous') return 0.55;
  return 0.35;
}

export interface SiteMatchScore {
  /** 0..100 % match to site context. */
  score: number;
  /** Short explanation of which factor drove the score. */
  rationale: string;
  /** Per-axis breakdown (0..1) for diagnostic UI. */
  factors: {
    hardiness: number;
    precip: number | null;
    slope: number | null;
  };
}

/**
 * Produce a site-match score for a species. v2 reads:
 *   - country → hardiness band overlap (always),
 *   - annualPrecipMm → waterNeeds match (when supplied),
 *   - meanSlopeDeg → root-pattern match (when supplied).
 *
 * Weighting: when all three axes present, hardiness 0.55, precip 0.30,
 * slope 0.15. Missing axes drop out and remaining weights renormalise.
 */
export function scoreSiteMatch(
  species: PlantSpecies,
  country: string,
  context?: SiteContext,
): SiteMatchScore {
  const hardiness = hardinessOverlap(species, country);

  const precipPresent = context?.annualPrecipMm != null && context.annualPrecipMm > 0;
  const slopePresent  = context?.meanSlopeDeg  != null && context.meanSlopeDeg  >= 0;

  const precip = precipPresent ? precipMatch(species, context!.annualPrecipMm!) : null;
  const slope  = slopePresent  ? slopeMatch(species, context!.meanSlopeDeg!)    : null;

  // Renormalising weights.
  let wHardiness = 0.55;
  let wPrecip    = precipPresent ? 0.30 : 0;
  let wSlope     = slopePresent  ? 0.15 : 0;
  const total = wHardiness + wPrecip + wSlope;
  wHardiness /= total;
  wPrecip    /= total;
  wSlope     /= total;

  const composite =
    hardiness * wHardiness +
    (precip ?? 0) * wPrecip +
    (slope  ?? 0) * wSlope;
  const score = Math.round(composite * 100);

  // Rationale: pick the *worst* axis to surface, since that's what the
  // steward needs to act on; if all three are >= 0.6, congratulate.
  const worst: Array<[string, number]> = [['hardiness', hardiness]];
  if (precip != null) worst.push(['precip', precip]);
  if (slope  != null) worst.push(['slope',  slope]);
  worst.sort((a, b) => a[1] - b[1]);
  const [worstAxis, worstVal] = worst[0]!;

  let rationale: string;
  if (composite >= 0.7) {
    rationale = 'Strong match across the available axes.';
  } else if (worstVal < 0.3) {
    if (worstAxis === 'hardiness') rationale = 'Outside typical hardiness band for the site.';
    else if (worstAxis === 'precip') rationale = 'Precipitation mismatch — rainfall outside this species\' comfort range.';
    else rationale = 'Slope-stability concern — root pattern weak for this gradient.';
  } else if (worstVal < 0.6) {
    if (worstAxis === 'hardiness') rationale = 'Partial hardiness fit — verify microclimate.';
    else if (worstAxis === 'precip') rationale = 'Precipitation borderline — irrigation or drainage may be needed.';
    else rationale = 'Slope marginal for this root pattern — site on the gentler aspects.';
  } else {
    rationale = 'Workable match — no single factor strong, none weak.';
  }

  return {
    score,
    rationale,
    factors: { hardiness, precip, slope },
  };
}
