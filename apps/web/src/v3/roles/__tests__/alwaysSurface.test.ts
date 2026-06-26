/**
 * alwaysSurface -- the "never miss a signal" promotion engine for the
 * Operational Role Layer. Plain fixtures, no store/render. Pins the three
 * promotion signals + the load-bearing safety rules:
 *   - empty scope (full view) ⇒ nothing promoted (everything already shown).
 *   - only OUT-of-scope objectives are ever promoted.
 *   - open-review-flag / cross-role-dependency / shared-resource-divergence
 *     each fire independently and dedup into a canonical reason order.
 *
 * Real id/stratum fixtures so getObjectiveObserveDomains resolves truthfully:
 *   s6-yield-flows  -> [plants-food, animals-livestock, ecology, soil]
 *   s5-water-strategy -> [hydrology, soil, risk-compliance]  (hydrology = shared)
 *   s1-vision       -> [vision-intent]
 *   s3-systems-baseline -> [built-infrastructure, ...]
 */

import { describe, it, expect } from 'vitest';
import {
  scopeForRoles,
  type PlanStratumObjective,
  type UniversalDomain,
} from '@ogden/shared';
import {
  collectAlwaysSurface,
  mustSurface,
  SHARED_RESOURCE_DOMAINS,
} from '../alwaysSurface.js';

// collectAlwaysSurface reads id + stratumId (via getObjectiveObserveDomains)
// and checklist[].feedsInto. A thin cast keeps fixtures honest.
function obj(
  id: string,
  stratumId: string,
  feedsInto: string[] = [],
): PlanStratumObjective {
  return {
    id,
    stratumId,
    checklist: feedsInto.length > 0 ? [{ feedsInto }] : [],
  } as unknown as PlanStratumObjective;
}

const EMPTY: ReadonlySet<UniversalDomain> = new Set();
const FOOD = scopeForRoles(['food_production']); // { plants-food }
const NO_FLAGS: ReadonlySet<string> = new Set();

describe('SHARED_RESOURCE_DOMAINS', () => {
  it('includes a domain owned by 2+ roles and excludes single-role domains', () => {
    // hydrology is shared by ecology_soils + infrastructure.
    expect(SHARED_RESOURCE_DOMAINS.has('hydrology')).toBe(true);
    // plants-food belongs to exactly one role -> not shared.
    expect(SHARED_RESOURCE_DOMAINS.has('plants-food')).toBe(false);
  });
});

describe('collectAlwaysSurface -- full view', () => {
  it('promotes nothing when scope is empty (everything already shown)', () => {
    const result = collectAlwaysSurface({
      objectives: [obj('s1-vision', 's1-project-foundation')],
      scope: EMPTY,
      openFlagObjectiveIds: new Set(['s1-vision']),
      divergedDomains: ['hydrology'],
    });
    expect(result.size).toBe(0);
  });
});

describe('collectAlwaysSurface -- open-review-flag', () => {
  it('promotes an OUT-of-scope objective carrying an open flag', () => {
    const result = collectAlwaysSurface({
      objectives: [
        obj('s6-yield-flows', 's6-integration-design'), // in scope (plants-food)
        obj('s1-vision', 's1-project-foundation'), // out of scope
      ],
      scope: FOOD,
      openFlagObjectiveIds: new Set(['s1-vision']),
    });
    expect(result.get('s1-vision')).toEqual(['open-review-flag']);
    expect(result.has('s6-yield-flows')).toBe(false);
  });

  it('does NOT promote an IN-scope objective even with an open flag', () => {
    const result = collectAlwaysSurface({
      objectives: [obj('s6-yield-flows', 's6-integration-design')],
      scope: FOOD,
      openFlagObjectiveIds: new Set(['s6-yield-flows']),
    });
    expect(result.size).toBe(0);
  });
});

describe('collectAlwaysSurface -- cross-role-dependency', () => {
  it('promotes an OUT-of-scope objective that feeds an IN-scope one', () => {
    const result = collectAlwaysSurface({
      objectives: [
        obj('s6-yield-flows', 's6-integration-design'), // in scope
        obj('s5-water-strategy', 's5-system-design', ['s6-yield-flows']), // out, feeds in-scope
      ],
      scope: FOOD,
      openFlagObjectiveIds: NO_FLAGS,
    });
    expect(result.get('s5-water-strategy')).toEqual(['cross-role-dependency']);
  });

  it('does NOT promote when the feed target is also out of scope', () => {
    const result = collectAlwaysSurface({
      objectives: [
        obj('s6-yield-flows', 's6-integration-design'), // in scope
        // out, but feeds another out-of-scope objective
        obj('s1-vision', 's1-project-foundation', ['s3-systems-baseline']),
        obj('s3-systems-baseline', 's3-systems-reading'), // out of scope
      ],
      scope: FOOD,
      openFlagObjectiveIds: NO_FLAGS,
    });
    expect(result.size).toBe(0);
  });
});

describe('collectAlwaysSurface -- shared-resource-divergence', () => {
  it('promotes an OUT-of-scope objective whose footprint touches a diverged shared resource', () => {
    const result = collectAlwaysSurface({
      objectives: [
        obj('s6-yield-flows', 's6-integration-design'), // in scope
        obj('s5-water-strategy', 's5-system-design'), // out, footprint includes hydrology
      ],
      scope: FOOD,
      openFlagObjectiveIds: NO_FLAGS,
      divergedDomains: ['hydrology'],
    });
    expect(result.get('s5-water-strategy')).toEqual(['shared-resource-divergence']);
  });

  it('does NOT promote when the diverged domain is not a shared resource', () => {
    // s5-water-strategy footprint includes `soil`, but soil is single-role,
    // so a soil divergence does not surface it across role focus.
    const result = collectAlwaysSurface({
      objectives: [
        obj('s6-yield-flows', 's6-integration-design'),
        obj('s5-water-strategy', 's5-system-design'),
      ],
      scope: FOOD,
      openFlagObjectiveIds: NO_FLAGS,
      divergedDomains: ['soil'],
    });
    expect(result.size).toBe(0);
  });
});

// Inline fixture variant: `obj()` cannot set scopeNotes, so build the objective
// directly. The thin cast keeps fixtures honest (collectAlwaysSurface reads only
// id + stratumId + checklist + scopeNotes).
function objWithScopeNote(
  id: string,
  stratumId: string,
  scopeNotes: string,
  feedsInto: string[] = [],
): PlanStratumObjective {
  return {
    id,
    stratumId,
    checklist: feedsInto.length > 0 ? [{ feedsInto }] : [],
    scopeNotes,
  } as unknown as PlanStratumObjective;
}

describe('collectAlwaysSurface -- carries-scope-note', () => {
  it('promotes an OUT-of-scope objective carrying a non-empty scopeNotes', () => {
    const result = collectAlwaysSurface({
      objectives: [
        obj('s6-yield-flows', 's6-integration-design'), // in scope
        objWithScopeNote(
          's1-vision',
          's1-project-foundation',
          'Amanah: no advance-sale (bayʿ mā laysa ʿindak).',
        ), // out of scope, carries a covenant caution
      ],
      scope: FOOD,
      openFlagObjectiveIds: NO_FLAGS,
    });
    expect(result.get('s1-vision')).toEqual(['carries-scope-note']);
  });

  it('does NOT promote when scopeNotes is whitespace-only', () => {
    const result = collectAlwaysSurface({
      objectives: [
        obj('s6-yield-flows', 's6-integration-design'),
        objWithScopeNote('s1-vision', 's1-project-foundation', '   '),
      ],
      scope: FOOD,
      openFlagObjectiveIds: NO_FLAGS,
    });
    expect(result.size).toBe(0);
  });

  it('does NOT promote an IN-scope objective even with a scopeNotes', () => {
    const result = collectAlwaysSurface({
      objectives: [
        objWithScopeNote('s6-yield-flows', 's6-integration-design', 'note'),
      ],
      scope: FOOD,
      openFlagObjectiveIds: NO_FLAGS,
    });
    expect(result.size).toBe(0);
  });
});

describe('collectAlwaysSurface -- multiple reasons', () => {
  it('dedups and orders reasons canonically', () => {
    const result = collectAlwaysSurface({
      objectives: [
        obj('s6-yield-flows', 's6-integration-design'), // in scope
        // out: open flag + feeds in-scope + hydrology footprint diverged
        obj('s5-water-strategy', 's5-system-design', ['s6-yield-flows']),
      ],
      scope: FOOD,
      openFlagObjectiveIds: new Set(['s5-water-strategy']),
      divergedDomains: ['hydrology'],
    });
    expect(result.get('s5-water-strategy')).toEqual([
      'open-review-flag',
      'cross-role-dependency',
      'shared-resource-divergence',
    ]);
  });

  it('orders all four reasons canonically with scope-note leading', () => {
    const result = collectAlwaysSurface({
      objectives: [
        obj('s6-yield-flows', 's6-integration-design'), // in scope
        // out: scopeNotes + open flag + feeds in-scope + hydrology diverged
        objWithScopeNote(
          's5-water-strategy',
          's5-system-design',
          'CSA advance-sale limit.',
          ['s6-yield-flows'],
        ),
      ],
      scope: FOOD,
      openFlagObjectiveIds: new Set(['s5-water-strategy']),
      divergedDomains: ['hydrology'],
    });
    expect(result.get('s5-water-strategy')).toEqual([
      'carries-scope-note',
      'open-review-flag',
      'cross-role-dependency',
      'shared-resource-divergence',
    ]);
  });
});

describe('mustSurface', () => {
  it('reports surface=true with reasons for a promoted objective', () => {
    const map = new Map([['s5-water-strategy', ['open-review-flag'] as const]]);
    expect(mustSurface('s5-water-strategy', map as never)).toEqual({
      surface: true,
      reasons: ['open-review-flag'],
    });
  });

  it('reports surface=false with empty reasons for an absent objective', () => {
    expect(mustSurface('whatever', new Map())).toEqual({
      surface: false,
      reasons: [],
    });
  });
});
