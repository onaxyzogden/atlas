/**
 * railScope -- pure composition of the scoped objective rail. Plain fixtures,
 * no store/render. Pins the partition + promotion + badge contract the rail
 * leans on:
 *   - in-scope cards lead the main list (original order), promoted out-of-scope
 *     cards follow; un-promoted out-of-scope cards drop to the outside list.
 *   - nothing is dropped (mainList + outsideList == total).
 *   - role badges name the OWNING roles of an out-of-focus card (in-scope and
 *     unmapped cards carry none).
 *
 * Real id/stratum fixtures so getObjectiveObserveDomains resolves truthfully:
 *   s6-yield-flows    -> [plants-food, animals-livestock, ecology, soil]  (IN under FOOD)
 *   s5-water-strategy -> [hydrology, soil, risk-compliance]               (OUT)
 *   s1-stewardship    -> [people-governance]                              (OUT)
 */

import { describe, it, expect } from 'vitest';
import {
  scopeForRoles,
  resolveOperationalRoleDomains,
  OPERATIONAL_ROLE_DEFS,
  type OperationalRole,
  type PlanStratumObjective,
  type UniversalDomain,
} from '@ogden/shared';
import { composeScopedRail } from '../railScope.js';
import type { SurfaceReason } from '../alwaysSurface.js';

// composeScopedRail reads id + stratumId (via getObjectiveObserveDomains). A
// thin cast keeps fixtures honest (promotion is supplied via surfaceMap, so no
// checklist/feedsInto is needed here).
function obj(id: string, stratumId: string): PlanStratumObjective {
  return { id, stratumId, checklist: [] } as unknown as PlanStratumObjective;
}

const EMPTY: ReadonlySet<UniversalDomain> = new Set();
const FOOD = scopeForRoles(['food_production']); // { plants-food }
const NO_SURFACE: ReadonlyMap<string, SurfaceReason[]> = new Map();

const IN = obj('s6-yield-flows', 's6-integration-design');
const OUT_WATER = obj('s5-water-strategy', 's5-system-design');
const OUT_STEWARD = obj('s1-stewardship', 's1-project-foundation');

describe('composeScopedRail -- empty scope (defensive full view)', () => {
  it('classifies every objective in-focus and leaves the outside list empty', () => {
    const rail = composeScopedRail([IN, OUT_WATER], EMPTY, NO_SURFACE);
    expect(rail.mainList.map((e) => e.objective.id)).toEqual([
      's6-yield-flows',
      's5-water-strategy',
    ]);
    expect(rail.mainList.every((e) => e.scopeState === 'in')).toBe(true);
    expect(rail.outsideList).toEqual([]);
    expect(rail.inFocusCount).toBe(2);
    expect(rail.totalCount).toBe(2);
  });
});

describe('composeScopedRail -- scoped partition', () => {
  it('leads with in-scope cards, promotes surfaced out-of-scope cards, dims the rest', () => {
    const surfaceMap = new Map<string, SurfaceReason[]>([
      ['s1-stewardship', ['open-review-flag']],
    ]);
    const rail = composeScopedRail([IN, OUT_WATER, OUT_STEWARD], FOOD, surfaceMap);

    // Main list: in-scope first, then the promoted out-of-scope objective.
    expect(rail.mainList.map((e) => e.objective.id)).toEqual([
      's6-yield-flows',
      's1-stewardship',
    ]);
    // Outside list: the un-promoted out-of-scope objective only.
    expect(rail.outsideList.map((e) => e.objective.id)).toEqual([
      's5-water-strategy',
    ]);

    // Nothing dropped.
    expect(rail.inFocusCount).toBe(2);
    expect(rail.totalCount).toBe(3);
  });

  it('tags scope state + reasons + badges per card', () => {
    const surfaceMap = new Map<string, SurfaceReason[]>([
      ['s1-stewardship', ['open-review-flag']],
    ]);
    const rail = composeScopedRail([IN, OUT_WATER, OUT_STEWARD], FOOD, surfaceMap);

    const inEntry = rail.mainList[0]!;
    expect(inEntry.scopeState).toBe('in');
    expect(inEntry.reasons).toEqual([]);
    expect(inEntry.roleBadges).toEqual([]); // own domain -> no context badge

    const promoted = rail.mainList[1]!;
    expect(promoted.scopeState).toBe('out-surfaced');
    expect(promoted.reasons).toEqual(['open-review-flag']);
    // people-governance is owned by community_governance.
    expect(promoted.roleBadges).toEqual([
      OPERATIONAL_ROLE_DEFS.community_governance.label,
    ]);

    const dimmed = rail.outsideList[0]!;
    expect(dimmed.scopeState).toBe('out');
    expect(dimmed.reasons).toEqual([]);
    // hydrology -> ecology_soils + infrastructure; soil -> ecology_soils;
    // risk-compliance -> finance_legal. Canonical, de-duplicated order.
    expect(dimmed.roleBadges).toEqual([
      OPERATIONAL_ROLE_DEFS.ecology_soils.label,
      OPERATIONAL_ROLE_DEFS.infrastructure.label,
      OPERATIONAL_ROLE_DEFS.finance_legal.label,
    ]);
  });

  it('preserves original order among multiple promoted cards', () => {
    const surfaceMap = new Map<string, SurfaceReason[]>([
      ['s5-water-strategy', ['cross-role-dependency']],
      ['s1-stewardship', ['open-review-flag']],
    ]);
    // OUT_STEWARD precedes OUT_WATER in the input -> must keep that order in main.
    const rail = composeScopedRail([IN, OUT_STEWARD, OUT_WATER], FOOD, surfaceMap);
    expect(rail.mainList.map((e) => e.objective.id)).toEqual([
      's6-yield-flows',
      's1-stewardship',
      's5-water-strategy',
    ]);
    expect(rail.outsideList).toEqual([]);
  });
});

// The Option-C override path (a stored project re-scope / rename driving the
// rail) had no consumer test before the pre-push review -- composeScopedRail
// accepted opts.domainsMap / opts.labelFor but nothing exercised them end-to-end
// from a stored override. These pin both halves.
describe('composeScopedRail -- stored override (Option C re-scope / rename)', () => {
  it('a re-scope override flips an out-of-focus card into the main list', () => {
    // Project re-scopes food_production to ALSO own hydrology. Resolve the same
    // way the hook does, then derive the viewer scope from that override.
    const domainsMap = resolveOperationalRoleDomains([
      { slug: 'food_production', domains: ['plants-food', 'hydrology'] },
    ]);
    const reScoped = scopeForRoles(['food_production'], domainsMap);

    // Built-in FOOD ({plants-food}) leaves s5-water-strategy OUT (existing test);
    // under the override its hydrology domain is now in focus -> it leads the main
    // list instead of dropping to the outside list.
    const builtin = composeScopedRail([IN, OUT_WATER], FOOD, NO_SURFACE);
    expect(builtin.outsideList.map((e) => e.objective.id)).toEqual([
      's5-water-strategy',
    ]);

    const rail = composeScopedRail([IN, OUT_WATER], reScoped, NO_SURFACE, {
      domainsMap,
    });
    expect(rail.mainList.map((e) => e.objective.id)).toEqual([
      's6-yield-flows',
      's5-water-strategy',
    ]);
    expect(rail.mainList.every((e) => e.scopeState === 'in')).toBe(true);
    expect(rail.outsideList).toEqual([]);
  });

  it('a rename override flows the project-natural label into the role badges', () => {
    const surfaceMap = new Map<string, SurfaceReason[]>([
      ['s1-stewardship', ['open-review-flag']],
    ]);
    // Project renamed community_governance -> "Village Council".
    const labelFor = (slug: OperationalRole): string =>
      slug === 'community_governance'
        ? 'Village Council'
        : OPERATIONAL_ROLE_DEFS[slug].label;

    const rail = composeScopedRail([IN, OUT_STEWARD], FOOD, surfaceMap, {
      labelFor,
    });
    const promoted = rail.mainList.find((e) => e.objective.id === 's1-stewardship')!;
    expect(promoted.roleBadges).toEqual(['Village Council']);

    // Contrast: with no override the same card carries the built-in label.
    const builtin = composeScopedRail([IN, OUT_STEWARD], FOOD, surfaceMap);
    const builtinPromoted = builtin.mainList.find(
      (e) => e.objective.id === 's1-stewardship',
    )!;
    expect(builtinPromoted.roleBadges).toEqual([
      OPERATIONAL_ROLE_DEFS.community_governance.label,
    ]);
  });
});
