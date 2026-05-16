/**
 * Criteria forecast roll-up — given a sequencing result + goal tree,
 * computes per-criterion functional value at year buckets {1,3,5,7,10,20}.
 *
 * Confidence attenuator: when > 50% of SiteProfile facets are `provenance:
 * 'manual'`, confidence is set to 'low'; 25-50% manual = 'medium'; else
 * 'high'. Confidence is a label only — it does not scale the numbers.
 */

import type {
  GoalTree,
  SiteProfile,
  SuccessCriterion,
} from '../../data/goalCompassTypes.js';
import type { SequencingResult, SelectedIntervention } from './sequencingEngine.js';

export const FORECAST_YEARS = [1, 3, 5, 7, 10, 20] as const;
export type ForecastYear = (typeof FORECAST_YEARS)[number];

export interface CriterionForecastPoint {
  year: ForecastYear;
  value: number;
  pctOfTarget: number;
}

export interface CriterionForecast {
  criterion: SuccessCriterion;
  points: CriterionForecastPoint[];
  meetsTargetByDeadline: boolean;
}

export interface ForecastResult {
  criteria: CriterionForecast[];
  confidence: 'low' | 'medium' | 'high';
  manualFacetPct: number;
}

function maturityAtYear(
  selected: SelectedIntervention,
  absoluteYear: number,
): number {
  const yrFromStart = absoluteYear - selected.startYearOffset;
  if (yrFromStart < 0) return 0;
  const curve = selected.intervention.maturityCurve;
  if (curve.length === 0) return 1;
  let last = 0;
  for (const step of curve) {
    if (yrFromStart >= step.yearOffset) last = step.functionalPct / 100;
    else break;
  }
  return last;
}

function contributionAtYear(
  selected: SelectedIntervention,
  criterionId: string,
  absoluteYear: number,
): number {
  const i = selected.intervention;
  let total = 0;
  for (const cc of i.criterionContributions) {
    if (cc.criterionId !== criterionId) continue;
    const requiredYear = selected.startYearOffset + cc.appliesAtYearOffset;
    if (absoluteYear < requiredYear) continue;
    const acres = selected.acresAllocated;
    const raw = (cc.contributionPerAcre ?? 0) * acres + (cc.contributionFixed ?? 0);
    total += raw * maturityAtYear(selected, absoluteYear);
  }
  return total;
}

export function computeForecast(
  result: SequencingResult,
  goalTree: GoalTree,
  siteProfile: SiteProfile,
  currentValues?: Record<string, number>,
): ForecastResult {
  const criteria: CriterionForecast[] = goalTree.subGoals.flatMap((sg) =>
    sg.criteria.map((cr) => {
      const baseline = currentValues?.[cr.id] ?? 0;
      const points: CriterionForecastPoint[] = FORECAST_YEARS.map((year) => {
        const value =
          baseline +
          result.selected.reduce(
            (sum, s) => sum + contributionAtYear(s, cr.id, year),
            0,
          );
        return {
          year,
          value,
          pctOfTarget: cr.target > 0 ? Math.min(200, (value / cr.target) * 100) : 0,
        };
      });
      const atDeadline =
        baseline +
        result.selected.reduce(
          (sum, s) => sum + contributionAtYear(s, cr.id, cr.deadlineYear),
          0,
        );
      return {
        criterion: cr,
        points,
        meetsTargetByDeadline: atDeadline >= cr.target,
      };
    }),
  );

  const allFacets = [
    siteProfile.acres,
    siteProfile.climateZone,
    siteProfile.primaryLandform,
    siteProfile.avgSlopePct,
    siteProfile.currentLandCover,
    siteProfile.soilCompaction,
    siteProfile.waterPosture,
    siteProfile.hazards,
    siteProfile.household,
  ];
  const filled = allFacets.filter((f) => f.value !== null);
  const manualCount = filled.filter((f) => f.provenance === 'manual').length;
  const manualFacetPct = filled.length === 0 ? 0 : (manualCount / filled.length) * 100;

  const confidence: ForecastResult['confidence'] =
    manualFacetPct > 50 ? 'low' : manualFacetPct >= 25 ? 'medium' : 'high';

  return { criteria, confidence, manualFacetPct };
}
