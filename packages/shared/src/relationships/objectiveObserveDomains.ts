// objectiveObserveDomains.ts
//
// Derive the set of Observe universal domains a Plan tier objective is
// "about" — i.e. the domains where new Observe evidence (verified or
// diverged) should reopen the objective for cyclical review. The
// Phase 1 PlanTierObjective schema does not carry an explicit
// `observeDomainIds` field, so this helper hides the mapping behind a
// single accessor that consumers can call without coupling to the
// underlying source.
//
// Two layers of resolution:
//
//   1. Per-objective override table (`OBJECTIVE_OBSERVE_DOMAINS_OVERRIDE`)
//      — explicit list when the objective's domain footprint is finer
//      than its tier default (e.g. t6-phasing primarily concerns
//      economics-capacity + monitoring-records, NOT every land-base
//      domain).
//   2. Tier default (`TIER_OBSERVE_DOMAINS_DEFAULT`) — the broad set of
//      domains that a tier's work routinely depends on, used when an
//      objective doesn't carry an override.
//
// Both maps are tightly scoped to the catalogue shipped with the spec —
// extending the seed list of tier objectives (or adding a new
// PlanTierId) requires augmenting both maps with the appropriate
// entries. Keeping both layers explicit makes the wiring contract
// readable when future objectives ship without churning a derivation
// algorithm.

import type { PlanTierObjective, PlanTierId } from '../schemas/plan/planTierObjective.schema.js';
import type { UniversalDomain } from '../schemas/universalDomain.schema.js';

/**
 * Broad per-tier default — used when an objective has no
 * per-objective override. Chosen to cover the foundational Observe
 * surfaces the tier's work typically reads / writes against. Falls back
 * conservatively wide; the per-objective override narrows when needed.
 */
export const TIER_OBSERVE_DOMAINS_DEFAULT: Readonly<
  Record<PlanTierId, readonly UniversalDomain[]>
> = {
  't0-project-foundation': ['vision-intent', 'people-governance'],
  't1-land-reading': [
    'climate',
    'topography',
    'hydrology',
    'soil',
    'ecology',
    'land-base',
  ],
  't2-systems-reading': [
    'access-circulation',
    'energy-resources',
    'built-infrastructure',
    'monitoring-records',
  ],
  't3-foundation-decisions': ['topography', 'climate', 'hydrology'],
  't4-system-design': [
    'hydrology',
    'risk-compliance',
    'soil',
    'access-circulation',
    'built-infrastructure',
  ],
  't5-integration-design': [
    'plants-food',
    'animals-livestock',
    'ecology',
    'soil',
  ],
  't6-phasing-resourcing': [
    'economics-capacity',
    'monitoring-records',
    'people-governance',
  ],
} as const;

/**
 * Per-objective override. Add an entry when the objective's domain
 * footprint is finer-grained than its tier default. Absent ids fall
 * through to `TIER_OBSERVE_DOMAINS_DEFAULT`.
 */
export const OBJECTIVE_OBSERVE_DOMAINS_OVERRIDE: Readonly<
  Record<string, readonly UniversalDomain[]>
> = {
  // ---------- T0 ----------
  't0-vision': ['vision-intent'],
  't0-stewardship': ['people-governance'],

  // ---------- T1 ----------
  // Baseline objective reads the full land-reading surface.
  't1-land-baseline': [
    'topography',
    'hydrology',
    'soil',
    'ecology',
    'climate',
    'land-base',
  ],

  // ---------- T2 ----------
  't2-systems-baseline': [
    'access-circulation',
    'energy-resources',
    'built-infrastructure',
    'monitoring-records',
  ],

  // ---------- T3 ----------
  // Zones + sectors depend on landform, climate sectors, water flow.
  't3-zones-sectors': ['topography', 'climate', 'hydrology'],

  // ---------- T4 ----------
  // Water strategy is hydrology-led, with soil + risk-compliance
  // (flood / drought / contamination) as required co-readings.
  't4-water-strategy': ['hydrology', 'soil', 'risk-compliance'],

  // ---------- T5 ----------
  't5-yield-flows': ['plants-food', 'animals-livestock', 'ecology', 'soil'],

  // ---------- T6 ----------
  't6-phasing': [
    'economics-capacity',
    'monitoring-records',
    'people-governance',
  ],
};

/**
 * Resolve the set of Observe domains a Plan tier objective concerns.
 * Per-objective override wins; tier default is the fallback. Returns
 * an empty list when no mapping exists (defensive — a brand-new
 * tier without an entry returns `[]` so the caller does not
 * accidentally trigger a Plan revision flag across every objective).
 */
export function getObjectiveObserveDomains(
  objective: PlanTierObjective,
): readonly UniversalDomain[] {
  const override = OBJECTIVE_OBSERVE_DOMAINS_OVERRIDE[objective.id];
  if (override) return override;
  return TIER_OBSERVE_DOMAINS_DEFAULT[objective.tierId] ?? [];
}

/**
 * Inverse mapping helper — given a domain, return the ids of the
 * Plan tier objectives that consider it part of their footprint.
 * Used by `routeToDataPoint` (Slice 4.4) and the divergence
 * deep-link on `ObjectiveCard` so a click on the divergence chip
 * lands on the correct domain detail without each call site doing
 * the inverse scan itself.
 */
export function getObjectivesForDomain(
  objectives: readonly PlanTierObjective[],
  domainId: UniversalDomain,
): readonly string[] {
  const out: string[] = [];
  for (const obj of objectives) {
    const domains = getObjectiveObserveDomains(obj);
    if (domains.includes(domainId)) out.push(obj.id);
  }
  return out;
}

/**
 * Inverse mapping helper — given an objective id, return the
 * "primary" Observe domain it concerns. The first entry in the
 * resolved domain list (override or tier default) is the convention,
 * since per-objective overrides list their primary domain first.
 * Returns `null` when no mapping exists. Used by the `routeToDataPoint`
 * adapter (Slice 4.4) to project feed entries back to a domain.
 */
export function getPrimaryDomainForObjective(
  objective: PlanTierObjective,
): UniversalDomain | null {
  const domains = getObjectiveObserveDomains(objective);
  return domains[0] ?? null;
}
