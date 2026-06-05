/**
 * trueNorthGating — pure completeness model for the True North compass.
 *
 * Each of the 8 segments has a set of "answered" predicates over the three
 * backing sources (goal tree, True North questionnaire, Site Profile). A
 * segment's progress is filled/total; the compass center (the Fit Gate) unlocks
 * only when every segment is fully answered. Kept free of React/zustand so it
 * is unit-testable in isolation, exactly like `compassGating.ts`.
 *
 * Note on Deal Breakers: an empty deal-breaker list is the *good*, complete
 * state (nothing flagged), so this segment always reads complete — it is a
 * flag-if-present review, not a fill-in requirement.
 */

import type { GoalTree, SiteProfile } from '../plan/data/goalCompassTypes.js';
import type { TrueNorthProfile, TrueNorthSegmentId } from './data/trueNorthTypes.js';

export interface SegmentProgress {
  filled: number;
  total: number;
  pct: number;
  complete: boolean;
}

export interface TrueNorthSources {
  goalTree: GoalTree | null;
  trueNorth: TrueNorthProfile;
  siteProfile: SiteProfile;
}

/** A facet counts as answered when it has a value that isn't the `unknown` sentinel. */
function facetAnswered(value: string | null | undefined): boolean {
  return value != null && value !== 'unknown';
}

function ratio(filled: number, total: number): SegmentProgress {
  const pct = total === 0 ? 100 : Math.round((filled / total) * 100);
  return { filled, total, pct, complete: filled >= total };
}

function gradeCount(predicates: boolean[]): SegmentProgress {
  return ratio(predicates.filter(Boolean).length, predicates.length);
}

export function segmentProgress(
  id: TrueNorthSegmentId,
  src: TrueNorthSources,
): SegmentProgress {
  const { goalTree, trueNorth: tn, siteProfile: sp } = src;

  switch (id) {
    case 'core-vision':
      return gradeCount([
        goalTree != null,
        Boolean(goalTree?.parentGoal.title.trim()),
      ]);

    case 'required-functions':
      return gradeCount([tn.requiredFunctions.length > 0]);

    case 'legal-zoning':
      return gradeCount([
        tn.legalZoning.zoningPermitsUse !== 'unknown',
        facetAnswered(sp.zoningFit.value),
        facetAnswered(sp.legalAccess.value),
      ]);

    case 'financial':
      return gradeCount([
        tn.financial.capitalChannels.length > 0,
        tn.financial.fundingSecured !== 'unknown',
        tn.financial.carryingCostConfidence !== 'unknown',
      ]);

    case 'access-market':
      return gradeCount([
        tn.accessMarket.roadAccess !== 'unknown',
        tn.accessMarket.seasonalAccess !== 'unknown',
      ]);

    case 'ecological':
      return gradeCount([
        tn.ecological.respectCommitment !== 'unknown',
        facetAnswered(sp.conservationOverlay.value),
        facetAnswered(sp.floodplainExtent.value),
      ]);

    case 'human-neighbour':
      return gradeCount([
        tn.humanNeighbour.neighbourProximity !== 'unknown',
        tn.humanNeighbour.conflictRisk !== 'unknown',
        tn.humanNeighbour.municipalAttitude !== 'unknown',
      ]);

    case 'deal-breakers':
      // A flag-if-present review: no flags is a valid, complete answer.
      return ratio(1, 1);
  }
}

/** Aggregate stage-level progress across several segments. */
export function aggregateProgress(
  parts: readonly SegmentProgress[],
): SegmentProgress {
  const filled = parts.reduce((sum, p) => sum + p.filled, 0);
  const total = parts.reduce((sum, p) => sum + p.total, 0);
  return ratio(filled, total);
}
