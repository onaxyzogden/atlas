// objectiveObserveDomains.ts
//
// Derive the set of Observe universal domains a Plan tier objective is
// "about" — i.e. the domains where new Observe evidence (verified or
// diverged) should reopen the objective for cyclical review. The
// Phase 1 PlanStratumObjective schema does not carry an explicit
// `observeDomainIds` field, so this helper hides the mapping behind a
// single accessor that consumers can call without coupling to the
// underlying source.
//
// Two layers of resolution:
//
//   1. Per-objective override table (`OBJECTIVE_OBSERVE_DOMAINS_OVERRIDE`)
//      — explicit list when the objective's domain footprint is finer
//      than its tier default (e.g. s7-phasing primarily concerns
//      economics-capacity + monitoring-records, NOT every land-base
//      domain).
//   2. Tier default (`STRATUM_OBSERVE_DOMAINS_DEFAULT`) — the broad set of
//      domains that a tier's work routinely depends on, used when an
//      objective doesn't carry an override.
//
// Both maps are tightly scoped to the catalogue shipped with the spec —
// extending the seed list of tier objectives (or adding a new
// PlanStratumId) requires augmenting both maps with the appropriate
// entries. Keeping both layers explicit makes the wiring contract
// readable when future objectives ship without churning a derivation
// algorithm.

import type { PlanStratumObjective, PlanStratumId } from '../schemas/plan/planStratumObjective.schema.js';
import type { UniversalDomain } from '../schemas/universalDomain.schema.js';

/**
 * Broad per-tier default — used when an objective has no
 * per-objective override. Chosen to cover the foundational Observe
 * surfaces the tier's work typically reads / writes against. Falls back
 * conservatively wide; the per-objective override narrows when needed.
 */
export const STRATUM_OBSERVE_DOMAINS_DEFAULT: Readonly<
  Record<PlanStratumId, readonly UniversalDomain[]>
> = {
  's1-project-foundation': ['vision-intent', 'people-governance'],
  's2-land-reading': [
    'climate',
    'topography',
    'hydrology',
    'soil',
    'ecology',
    'land-base',
  ],
  's3-systems-reading': [
    'access-circulation',
    'energy-resources',
    'built-infrastructure',
    'monitoring-records',
  ],
  's4-foundation-decisions': ['topography', 'climate', 'hydrology'],
  's5-system-design': [
    'hydrology',
    'risk-compliance',
    'soil',
    'access-circulation',
    'built-infrastructure',
  ],
  's6-integration-design': [
    'plants-food',
    'animals-livestock',
    'ecology',
    'soil',
  ],
  's7-phasing-resourcing': [
    'economics-capacity',
    'monitoring-records',
    'people-governance',
  ],
} as const;

/**
 * Per-objective override. Add an entry when the objective's domain
 * footprint is finer-grained than its tier default. Absent ids fall
 * through to `STRATUM_OBSERVE_DOMAINS_DEFAULT`.
 */
export const OBJECTIVE_OBSERVE_DOMAINS_OVERRIDE: Readonly<
  Record<string, readonly UniversalDomain[]>
> = {
  // ---------- S1 ----------
  's1-vision': ['vision-intent'],
  's1-stewardship': ['people-governance'],

  // ---------- S2 ----------
  // Baseline objective reads the full land-reading surface.
  's2-land-baseline': [
    'topography',
    'hydrology',
    'soil',
    'ecology',
    'climate',
    'land-base',
  ],

  // ---------- S3 ----------
  's3-systems-baseline': [
    'access-circulation',
    'energy-resources',
    'built-infrastructure',
    'monitoring-records',
  ],

  // ---------- S4 ----------
  // Zones + sectors depend on landform, climate sectors, water flow.
  's4-zones-sectors': ['topography', 'climate', 'hydrology'],

  // ---------- S5 ----------
  // Water strategy is hydrology-led, with soil + risk-compliance
  // (flood / drought / contamination) as required co-readings.
  's5-water-strategy': ['hydrology', 'soil', 'risk-compliance'],

  // ---------- S6 ----------
  's6-yield-flows': ['plants-food', 'animals-livestock', 'ecology', 'soil'],

  // ---------- S7 ----------
  's7-phasing': [
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
  objective: PlanStratumObjective,
): readonly UniversalDomain[] {
  const override = OBJECTIVE_OBSERVE_DOMAINS_OVERRIDE[objective.id];
  if (override) return override;
  return STRATUM_OBSERVE_DOMAINS_DEFAULT[objective.stratumId] ?? [];
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
  objectives: readonly PlanStratumObjective[],
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
  objective: PlanStratumObjective,
): UniversalDomain | null {
  const domains = getObjectiveObserveDomains(objective);
  return domains[0] ?? null;
}
