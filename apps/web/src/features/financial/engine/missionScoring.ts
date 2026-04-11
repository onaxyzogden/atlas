/**
 * Mission-weighted scoring — surfaces the tradeoff between
 * financial return and mission impact.
 *
 * A conservation project may accept lower financial return
 * for higher ecological impact. This module quantifies that
 * tradeoff explicitly.
 */

import type { AllFeaturesInput, BreakEvenResult, MissionScore, MissionWeights } from './types.js';

const SPIRITUAL_ZONE_TYPES = new Set(['spiritual']);
const SPIRITUAL_STRUCTURE_TYPES = new Set(['prayer_space', 'bathhouse']);
const COMMUNITY_ZONE_TYPES = new Set(['education', 'commons', 'retreat']);
const COMMUNITY_STRUCTURE_TYPES = new Set(['classroom', 'pavilion', 'fire_circle']);
const ECOLOGICAL_ZONE_TYPES = new Set(['conservation', 'water_retention', 'buffer']);

export function computeMissionScore(
  input: AllFeaturesInput,
  breakEven: BreakEvenResult,
  weights: MissionWeights,
): MissionScore {
  const financial = scoreFinancial(breakEven);
  const ecological = scoreEcological(input);
  const spiritual = scoreSpiritual(input);
  const community = scoreCommunity(input);

  const totalWeight = weights.financial + weights.ecological + weights.spiritual + weights.community;
  const overall = totalWeight > 0
    ? Math.round(
      (financial * weights.financial +
        ecological * weights.ecological +
        spiritual * weights.spiritual +
        community * weights.community) / totalWeight,
    )
    : 0;

  return { overall, financial, ecological, spiritual, community };
}

/** Financial score: inversely proportional to break-even year */
function scoreFinancial(breakEven: BreakEvenResult): number {
  const midYear = breakEven.breakEvenYear.mid;
  if (midYear === null) return 10;
  if (midYear <= 3) return 95;
  if (midYear <= 4) return 85;
  if (midYear <= 5) return 70;
  if (midYear <= 6) return 55;
  if (midYear <= 7) return 40;
  if (midYear <= 8) return 30;
  return 20;
}

/** Ecological score: proportion of land in conservation/water/buffer zones */
function scoreEcological(input: AllFeaturesInput): number {
  const totalArea = input.zones.reduce((sum, z) => sum + z.areaM2, 0);
  if (totalArea === 0) return 0;

  const ecoArea = input.zones
    .filter((z) => ECOLOGICAL_ZONE_TYPES.has(z.category))
    .reduce((sum, z) => sum + z.areaM2, 0);

  const ratio = ecoArea / totalArea;

  // 0% = 10, 10% = 30, 25% = 55, 50% = 80, 75%+ = 95
  if (ratio >= 0.75) return 95;
  if (ratio >= 0.50) return 80;
  if (ratio >= 0.25) return 55;
  if (ratio >= 0.10) return 30;
  return 10;
}

/** Spiritual score: presence and proportion of spiritual zones and structures */
function scoreSpiritual(input: AllFeaturesInput): number {
  const hasSpiritualZone = input.zones.some((z) => SPIRITUAL_ZONE_TYPES.has(z.category));
  const spiritualStructures = input.structures.filter((s) => SPIRITUAL_STRUCTURE_TYPES.has(s.type));

  let score = 0;
  if (hasSpiritualZone) score += 40;
  score += Math.min(50, spiritualStructures.length * 25);

  // Bonus for dedicated spiritual area ratio
  const totalArea = input.zones.reduce((sum, z) => sum + z.areaM2, 0);
  if (totalArea > 0) {
    const spiritualArea = input.zones
      .filter((z) => SPIRITUAL_ZONE_TYPES.has(z.category))
      .reduce((sum, z) => sum + z.areaM2, 0);
    if (spiritualArea / totalArea >= 0.05) score += 10;
  }

  return Math.min(100, score);
}

/** Community score: presence of education, commons, retreat zones and gathering structures */
function scoreCommunity(input: AllFeaturesInput): number {
  const communityZones = input.zones.filter((z) => COMMUNITY_ZONE_TYPES.has(z.category));
  const communityStructures = input.structures.filter((s) => COMMUNITY_STRUCTURE_TYPES.has(s.type));

  let score = 0;
  score += Math.min(40, communityZones.length * 15);
  score += Math.min(40, communityStructures.length * 15);

  // Bonus for retreat capacity
  const guestCapacity = input.structures.filter(
    (s) => s.type === 'cabin' || s.type === 'yurt' || s.type === 'tent_glamping',
  ).length;
  score += Math.min(20, guestCapacity * 5);

  return Math.min(100, score);
}
