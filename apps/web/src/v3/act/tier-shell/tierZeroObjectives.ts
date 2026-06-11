import type { PlanStratumObjective } from '@ogden/shared';

/**
 * Non-spatial "Tier-0" foundation objectives — the decisions worked through in
 * the inline decision workbench rather than on the map.
 *
 * The interactive workbench now lives in the PLAN tier shell (PlanTierShell
 * center-swaps the map for the workbench on these ids); the ACT tier shell uses
 * the same set to drive its execution-only surface (ActTierExecutionPanel in
 * place of the map). Both shells import this single membership set so the two
 * never drift.
 *
 * Widened incrementally from a single id ('s1-vision') to a membership set as
 * more objectives converted to the non-map decision flow.
 */
export const TIER_ZERO_OBJECTIVE_IDS = new Set<string>([
  's1-vision',
  's1-boundaries',
  's1-stakeholders',
  'ev-s1-legal-governance',
  'ev-s1-provision-balance',
  's2-terrain',
  's2-climate',
  's2-ecology',
  'ev-s2-landscape-vectors',
  'ev-s2-carrying-capacity',
  'silv-sec-s1-livestock-intent',
  'silv-sec-s3-forage-survey',
  'silv-sec-s4-grazing-design',
  'ev-s1-conflict-framework',
  'silv-sec-s4-husbandry-framework',
  's5-soil-improvement',
  's4-water-strategy',
  'ev-s3-energy-potential',
  'ev-s4-settlement-strategy',
  'nur-sec-s2-biosecurity-survey',
  'ev-s4-financial-model',
  'nur-sec-s1-propagation-infra-survey',
  'ev-s7-adaptive-management',
  'ev-s7-exit-succession',
  'ev-s2-social-fabric',
  'ev-s3-infra-condition',
]);

/**
 * Tier-0 by resolved-objective identity. Used once the per-project objective
 * set has hydrated and the selected objective is non-null.
 */
export function isTierZeroObjective(
  objective: PlanStratumObjective | null,
): boolean {
  return objective != null && TIER_ZERO_OBJECTIVE_IDS.has(objective.id);
}

/**
 * Tier-0 by route identity — keys off the synchronous URL objectiveId so the
 * map shell is never mounted on a cold deep-link to a Tier-0 route while the
 * objective set is still hydrating (the resolved objective lags a tick behind
 * the route). Tests the same membership set the resolved-objective predicate
 * uses, so the two converge once hydration completes.
 */
export function isTierZeroObjectiveId(objectiveId: string | null): boolean {
  return objectiveId != null && TIER_ZERO_OBJECTIVE_IDS.has(objectiveId);
}
