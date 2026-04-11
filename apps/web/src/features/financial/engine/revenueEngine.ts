/**
 * Revenue engine — generates revenue streams from detected enterprises,
 * scaled by feature quantities and growing season.
 */

import type {
  AllFeaturesInput,
  CostRange,
  CostRegion,
  EnterpriseType,
  RevenueStream,
  SiteContext,
} from './types.js';
import { costRange } from './types.js';
import { getRevenueBenchmarks } from './revenueDatabase.js';
import { countEnterpriseUnits } from './enterpriseDetector.js';

const ENTERPRISE_LABELS: Record<EnterpriseType, string> = {
  livestock: 'Livestock & Grazing',
  orchard: 'Orchard & Tree Crops',
  market_garden: 'Market Garden & CSA',
  retreat: 'Retreat & Hospitality',
  education: 'Educational Programs',
  agritourism: 'Agritourism & Events',
  carbon: 'Carbon & Conservation Credits',
  grants: 'Grants & Stewardship Programs',
};

/**
 * Determine the earliest start year for an enterprise based on
 * the phase assignments of its contributing features.
 */
function getEnterpriseStartYear(
  enterprise: EnterpriseType,
  input: AllFeaturesInput,
): number {
  const phaseTimeframes: string[] = [];

  switch (enterprise) {
    case 'livestock':
      phaseTimeframes.push(...input.paddocks.filter((p) => p.species.length > 0).map((p) => p.phase));
      break;
    case 'orchard':
      phaseTimeframes.push(...input.crops.filter((c) => c.type === 'orchard' || c.type === 'food_forest').map((c) => c.phase));
      break;
    case 'market_garden':
      phaseTimeframes.push(...input.crops.filter((c) => c.type === 'market_garden' || c.type === 'garden_bed' || c.type === 'row_crop').map((c) => c.phase));
      break;
    case 'retreat':
      phaseTimeframes.push(...input.structures.filter((s) => s.type === 'cabin' || s.type === 'yurt' || s.type === 'tent_glamping').map((s) => s.phase));
      break;
    case 'education':
      phaseTimeframes.push(...input.structures.filter((s) => s.type === 'classroom').map((s) => s.phase));
      break;
    case 'agritourism':
      phaseTimeframes.push(...input.structures.filter((s) => s.type === 'pavilion' || s.type === 'fire_circle').map((s) => s.phase));
      break;
    case 'carbon':
      phaseTimeframes.push(...input.zones.filter((z) => z.category === 'conservation').map((z) => z.phase ?? 'Phase 1'));
      break;
    case 'grants':
      return 1; // Grants available from Year 1
  }

  // Parse phase names to find earliest year
  // Phase format: "Phase N" — we use phase order, or default to Year 1
  // Since phases store timeframe as "Year 0-1", "Year 1-3", etc.
  // We parse the first number after "Year"
  return Math.max(1, parseMinYearFromPhases(phaseTimeframes));
}

function parseMinYearFromPhases(phases: string[]): number {
  if (phases.length === 0) return 1;

  // Phase names like "Phase 1", "Phase 2" don't have year info directly.
  // We'll use a simple heuristic: Phase 1 = Year 1, Phase 2 = Year 2, etc.
  let minYear = 10;
  for (const phase of phases) {
    const match = phase.match(/(\d+)/);
    if (match?.[1]) {
      minYear = Math.min(minYear, parseInt(match[1], 10));
    }
  }
  return minYear === 10 ? 1 : minYear;
}

export function computeRevenueStreams(
  enterprises: EnterpriseType[],
  input: AllFeaturesInput,
  siteContext: SiteContext,
  region: CostRegion,
): RevenueStream[] {
  const benchmarks = getRevenueBenchmarks(region);
  const streams: RevenueStream[] = [];

  // Growing season factor: normalize to 200-day baseline
  const growingSeasonFactor = siteContext.growingSeasonDays / 200;

  for (const enterprise of enterprises) {
    const driver = benchmarks.enterprises[enterprise];
    if (!driver) continue;

    const units = countEnterpriseUnits(enterprise, input);
    if (units <= 0) continue;

    // Scale revenue by unit count
    const seasonMult = driver.seasonalFactor ? growingSeasonFactor : 1;
    const annualRevenue: CostRange = {
      low: Math.round(driver.annualPerUnit.low * units * seasonMult),
      mid: Math.round(driver.annualPerUnit.mid * units * seasonMult),
      high: Math.round(driver.annualPerUnit.high * units * seasonMult),
    };

    const startYear = getEnterpriseStartYear(enterprise, input);
    const maturityYear = startYear + driver.rampYears - 1;

    // Build ramp schedule: year -> multiplier
    const rampSchedule: Record<number, number> = {};
    for (let y = 0; y <= 10; y++) {
      if (y < startYear) {
        rampSchedule[y] = 0;
      } else {
        const rampIndex = y - startYear;
        rampSchedule[y] = driver.rampCurve[Math.min(rampIndex, driver.rampCurve.length - 1)] ?? 1.0;
      }
    }

    const assumptions = [
      `${units.toFixed(1)} ${driver.unitBasis}`,
      `$${driver.annualPerUnit.low.toLocaleString()}-$${driver.annualPerUnit.high.toLocaleString()} ${driver.unitBasis} at maturity`,
    ];
    if (driver.seasonalFactor && growingSeasonFactor !== 1) {
      assumptions.push(`Growing season factor: ${growingSeasonFactor.toFixed(2)}x (${siteContext.growingSeasonDays} days)`);
    }
    assumptions.push(`Ramp: ${driver.rampYears} years to maturity`);

    streams.push({
      id: `revenue-${enterprise}`,
      name: ENTERPRISE_LABELS[enterprise],
      enterprise,
      description: driver.description,
      annualRevenue,
      rampSchedule,
      startYear,
      maturityYear,
      confidence: enterprise === 'grants' || enterprise === 'carbon' ? 'low' : 'medium',
      assumptions,
    });
  }

  return streams;
}

export function sumRevenue(streams: RevenueStream[]): CostRange {
  return streams.reduce(
    (acc, s) => ({
      low: acc.low + s.annualRevenue.low,
      mid: acc.mid + s.annualRevenue.mid,
      high: acc.high + s.annualRevenue.high,
    }),
    costRange(0, 0),
  );
}

export function applyRevenueOverrides(
  streams: RevenueStream[],
  overrides: Record<string, Partial<CostRange>>,
): RevenueStream[] {
  if (Object.keys(overrides).length === 0) return streams;
  return streams.map((s) => {
    const ov = overrides[s.id];
    if (!ov) return s;
    return { ...s, annualRevenue: { ...s.annualRevenue, ...ov } };
  });
}
