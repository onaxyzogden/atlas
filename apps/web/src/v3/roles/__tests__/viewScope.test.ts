/**
 * viewScope -- pure scope predicates for the Operational Role Layer. Plain
 * fixtures, no store/render. Pins the three load-bearing rules:
 *   1. empty scope (no roles / solo / Full view) ⇒ everything in scope.
 *   2. unmapped objective (no observe domains) ⇒ in scope (never dim the
 *      unclassifiable).
 *   3. mapped items partition by domain intersection, order preserved.
 */

import { describe, it, expect } from 'vitest';
import {
  scopeForRoles,
  type PlanStratumObjective,
  type UniversalDomain,
} from '@ogden/shared';
import {
  scopeIsFull,
  moduleInScope,
  objectiveInScope,
  partitionByScope,
  orderByObjectiveScope,
  type SectionRoleScope,
} from '../viewScope.js';

// getObjectiveObserveDomains only reads `id` + `stratumId`; a thin cast keeps
// the fixture honest without minting an entire PlanStratumObjective.
function obj(id: string, stratumId: string): PlanStratumObjective {
  return { id, stratumId } as unknown as PlanStratumObjective;
}

const EMPTY: ReadonlySet<UniversalDomain> = new Set();

describe('scopeIsFull', () => {
  it('is true only for an empty scope', () => {
    expect(scopeIsFull(EMPTY)).toBe(true);
    expect(scopeIsFull(scopeForRoles(['food_production']))).toBe(false);
  });
});

describe('moduleInScope', () => {
  it('treats an empty scope as full view (every module in)', () => {
    expect(moduleInScope('economics-capacity', EMPTY)).toBe(true);
  });

  it('admits only domains present in a non-empty scope', () => {
    const scope = scopeForRoles(['food_production']); // { plants-food }
    expect(moduleInScope('plants-food', scope)).toBe(true);
    expect(moduleInScope('animals-livestock', scope)).toBe(false);
  });
});

describe('objectiveInScope', () => {
  it('treats an empty scope as full view (every objective in)', () => {
    expect(objectiveInScope(obj('s6-yield-flows', 's6-integration-design'), EMPTY)).toBe(
      true,
    );
  });

  it('admits an objective when ANY of its domains intersects the scope', () => {
    // s6-yield-flows -> [plants-food, animals-livestock, ecology, soil]
    const livestock = scopeForRoles(['livestock']); // { animals-livestock }
    expect(
      objectiveInScope(obj('s6-yield-flows', 's6-integration-design'), livestock),
    ).toBe(true);
  });

  it('excludes an objective with no domain overlap', () => {
    // s1-vision -> [vision-intent], which is in NO operational scope.
    const food = scopeForRoles(['food_production']);
    expect(objectiveInScope(obj('s1-vision', 's1-project-foundation'), food)).toBe(
      false,
    );
  });

  it('keeps an unmapped objective (no observe domains) in scope', () => {
    const food = scopeForRoles(['food_production']);
    // Bogus stratumId ⇒ no tier default ⇒ resolver returns [].
    expect(objectiveInScope(obj('mystery', 'sX-unknown'), food)).toBe(true);
  });
});

describe('partitionByScope', () => {
  const domainsOf = (d: UniversalDomain): readonly UniversalDomain[] => [d];

  it('puts everything in inScope under full view, outScope empty', () => {
    const items: UniversalDomain[] = ['plants-food', 'animals-livestock'];
    const { inScope, outScope } = partitionByScope(items, domainsOf, EMPTY);
    expect(inScope).toEqual(items);
    expect(outScope).toEqual([]);
  });

  it('splits by domain membership, preserving order within each bucket', () => {
    const scope = scopeForRoles(['food_production', 'livestock']); // food + animals
    const items: UniversalDomain[] = [
      'plants-food',
      'economics-capacity',
      'animals-livestock',
      'risk-compliance',
    ];
    const { inScope, outScope } = partitionByScope(items, domainsOf, scope);
    expect(inScope).toEqual(['plants-food', 'animals-livestock']);
    expect(outScope).toEqual(['economics-capacity', 'risk-compliance']);
  });

  it('treats an item with no domains as in scope', () => {
    const scope = scopeForRoles(['food_production']);
    const { inScope, outScope } = partitionByScope(
      [{ id: 'x' }],
      () => [],
      scope,
    );
    expect(inScope).toHaveLength(1);
    expect(outScope).toHaveLength(0);
  });
});

describe('orderByObjectiveScope', () => {
  interface Item {
    planObjectiveId: string;
  }
  const items: Item[] = [
    { planObjectiveId: 'a' },
    { planObjectiveId: 'b' },
    { planObjectiveId: 'c' },
  ];
  const getId = (i: Item) => i.planObjectiveId;
  const map = new Map<string, readonly UniversalDomain[]>([
    ['a', ['plants-food']],
    ['b', ['economics-capacity']],
    ['c', ['animals-livestock']],
  ]);

  it('does not de-emphasize under full view (empty scope)', () => {
    const rs: SectionRoleScope = { scope: EMPTY, domainsByObjective: map };
    const { inScope, outScope, dim } = orderByObjectiveScope(items, getId, rs);
    expect(dim).toBe(false);
    expect(inScope).toEqual(items);
    expect(outScope).toEqual([]);
  });

  it('splits and dims on a genuine in/out mix, in-scope first', () => {
    const rs: SectionRoleScope = {
      scope: scopeForRoles(['food_production']), // { plants-food }
      domainsByObjective: map,
    };
    const { inScope, outScope, dim } = orderByObjectiveScope(items, getId, rs);
    expect(dim).toBe(true);
    expect(inScope.map(getId)).toEqual(['a']);
    expect(outScope.map(getId)).toEqual(['b', 'c']);
  });

  it('does not dim when every item is in scope', () => {
    const rs: SectionRoleScope = {
      scope: scopeForRoles(['food_production', 'finance_legal', 'livestock']),
      domainsByObjective: map,
    };
    const { dim, inScope, outScope } = orderByObjectiveScope(items, getId, rs);
    expect(dim).toBe(false);
    expect(inScope).toHaveLength(3);
    expect(outScope).toHaveLength(0);
  });

  it('does not dim when every item is out of scope (all preserved for plain render)', () => {
    const rs: SectionRoleScope = {
      scope: scopeForRoles(['infrastructure']), // no overlap with a/b/c
      domainsByObjective: map,
    };
    const { dim, inScope, outScope } = orderByObjectiveScope(items, getId, rs);
    expect(dim).toBe(false);
    expect([...inScope, ...outScope].map(getId)).toEqual(['a', 'b', 'c']);
  });

  it('keeps an objective absent from the map in scope (never dims the unclassifiable)', () => {
    const withUnknown: Item[] = [...items, { planObjectiveId: 'zzz-not-in-map' }];
    const rs: SectionRoleScope = {
      scope: scopeForRoles(['food_production']),
      domainsByObjective: map,
    };
    const { inScope } = orderByObjectiveScope(withUnknown, getId, rs);
    expect(inScope.map(getId)).toContain('zzz-not-in-map');
  });
});
