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
  // Universal gap-closure (2026-06-12): the three remaining universal
  // objectives with no in-app completion path. All are non-spatial decision
  // objectives; the workbench's generic per-item capture (textarea + Record ->
  // saveVisionFormData + setItemComplete) is the v1 path. Bespoke captures
  // (direction classifier, phasing worksheet, Amanah-clean capital worksheet)
  // are deferred pending operator mockups.
  's4-direction',
  's7-phase1',
  's7-resource-plan',
  // Ecovillage workbench membership (2026-06-12): ten ev- objectives across
  // s4, s6, and s7 strata added to the Tier-0 set so the workbench execution
  // surface covers them without a map mount. Bespoke captures deferred; the
  // generic workbench per-item path (textarea + Record) is the v1 route.
  'ev-s4-food-system',
  'ev-s4-infra-strategy',
  'ev-s6-coordination-feedback',
  'ev-s6-external-relations',
  'ev-s6-maintenance-protocol',
  'ev-s6-social-monitoring',
  'ev-s7-financial-plan',
  'ev-s7-launch-sequence',
  'ev-s7-onboarding',
  'ev-s7-settlement-plan',
  // Orchard workbench membership (2026-06-12)
  'orch-s4-species-mix',
  'orch-s4-succession-management',
  'orch-sec-s4-species-pollination',
  'orch-s6-adaptive-management',
  'orch-sec-s6-perennial-care',
  'orch-s7-financial-viability',
  'orch-s7-planting-establishment',
  'orch-s7-succession-plan',
  // Silvopasture workbench membership (2026-06-12)
  'silv-s4-animal-health',
  'silv-s6-animal-health-monitoring',
  'silv-s7-financial-viability',
  'silv-s7-livestock-establishment',
  // Nursery-secondary workbench membership (2026-06-12)
  'nur-sec-s1-water-survey',
  // Homestead workbench membership (2026-06-12)
  'hms-s4-energy-shelter-resilience',
  'hms-s4-food-production-strategy',
  'hms-s6-self-sufficiency-feedback',
  'hms-s7-adaptive-management',
  'hms-s7-budget-input-reduction',
  'hms-s7-provision-phasing',
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
