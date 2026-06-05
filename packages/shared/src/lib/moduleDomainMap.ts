// moduleDomainMap.ts
//
// Maps the legacy stage-local module ids (ObserveModule 7 + PlanModule 15 +
// ActModule 8 = 30 ids in apps/web/src/v3/{observe,plan,act}/types.ts) to
// their primary UniversalDomain (16). Source of truth for the assignment is
// the current -> universal mapping table in ADR
// 2026-05-25-atlas-universal-domains.
//
// Many-to-one notes (the ADR's '*' cross-contributions):
//   Observe earth-water-ecology contributes to Hydrology + Soil + Ecology.
//   Observe macroclimate-hazards contributes to Climate + Risk.
//   Observe swot-synthesis     contributes to Risk + Monitoring.
//   Observe sectors-zones      contributes to Access.
//   Plan   cross-section-solar contributes to Climate + Energy.
//   Plan   machinery           contributes to Built Infra + Energy.
//   Plan   dynamic-layering    contributes to Access.
//   Plan   principle-verification contributes to Vision + Risk.
//   Plan   regeneration-monitor / biodiversity-monitor also contribute to
//                                 Monitoring beyond their Ecology home.
//   Act    maintain   contributes to Built Infra + Hydrology.
//   Act    schedule   contributes to Economics.
//   Act    review     contributes to Risk + Monitoring.
//
// For the data migration we pick a single PRIMARY target per legacy module
// id so persisted byProject blobs collapse 1:1 where possible. Splitting
// persisted evidence-index maps across multiple domains is ambiguous (the
// integer indices have no domain dimension) and would risk data loss, so
// the migration utility intentionally preserves the blob whole on the
// primary domain.
//
// COLLISION SURFACES (multiple legacy module ids -> same primary domain):
//   Plan 15 ids -> 11 distinct domains, with 4 collision groups:
//     access-circulation:    dynamic-layering + zone-circulation
//     built-infrastructure:  structures-subsystems + machinery
//     ecology:               regeneration-monitor + habitat-allocation + biodiversity-monitor
//   Act 8 ids -> 6 distinct domains, with 2 collision groups:
//     built-infrastructure:  build + maintain
//     monitoring-records:    tracker + review
//   Observe 7 ids -> 7 distinct domains (no collisions).
// The exhaustive collision set is asserted by universalDomain.test.ts and
// the naive last-wins behaviour is documented in moduleDomainMigration.ts —
// step 3 of the refactor must supply a per-store merge strategy where it
// matters (Plan + Act stores).
//
// IMPORTANT: this file deliberately does NOT import from apps/web. The
// shared package must not depend on the web app, so the legacy id strings
// are duplicated as literals here. A test asserts the union of the three
// keysets matches the documented 30 ids.

import type { UniversalDomain } from '../schemas/universalDomain.schema.js';

export type LegacyStage = 'observe' | 'plan' | 'act';

/** Legacy ObserveModule id -> primary UniversalDomain. 7 entries. */
export const OBSERVE_MODULE_TO_DOMAIN: Record<string, UniversalDomain> = {
  'human-context': 'people-governance',
  'built-environment': 'built-infrastructure',
  'macroclimate-hazards': 'climate',
  'topography': 'topography',
  'earth-water-ecology': 'hydrology',
  'sectors-zones': 'access-circulation',
  'swot-synthesis': 'monitoring-records',
};

/** Legacy PlanModule id -> primary UniversalDomain. 15 entries. */
export const PLAN_MODULE_TO_DOMAIN: Record<string, UniversalDomain> = {
  'goal-compass': 'vision-intent',
  'dynamic-layering': 'access-circulation',
  'water-management': 'hydrology',
  'zone-circulation': 'access-circulation',
  'structures-subsystems': 'built-infrastructure',
  'machinery': 'built-infrastructure',
  'livestock': 'animals-livestock',
  'plant-systems': 'plants-food',
  'soil-fertility': 'soil',
  'cross-section-solar': 'climate',
  'phasing-budgeting': 'economics-capacity',
  'principle-verification': 'risk-compliance',
  'regeneration-monitor': 'ecology',
  'habitat-allocation': 'ecology',
  'biodiversity-monitor': 'ecology',
};

/** Legacy ActModule id -> primary UniversalDomain. 8 entries. */
export const ACT_MODULE_TO_DOMAIN: Record<string, UniversalDomain> = {
  'tracker': 'monitoring-records',
  'build': 'built-infrastructure',
  'maintain': 'built-infrastructure',
  'livestock': 'animals-livestock',
  'harvest': 'plants-food',
  'review': 'monitoring-records',
  'network': 'people-governance',
  'schedule': 'economics-capacity',
};

const TABLES: Record<LegacyStage, Record<string, UniversalDomain>> = {
  observe: OBSERVE_MODULE_TO_DOMAIN,
  plan: PLAN_MODULE_TO_DOMAIN,
  act: ACT_MODULE_TO_DOMAIN,
};

/**
 * Resolve a legacy stage-local module id to its primary UniversalDomain.
 * Returns null when the module id is not recognised for the given stage —
 * callers (notably the persistence migration) treat that as drop-with-warn.
 */
export function mapLegacyModuleId(
  stage: LegacyStage,
  moduleId: string,
): UniversalDomain | null {
  return TABLES[stage][moduleId] ?? null;
}
