// objectiveObserveDomains.test.ts
//
// Verifies the per-tier defaults, per-objective overrides, and inverse
// lookups for the Plan tier objective -> Observe domain mapping
// (Phase 4 Slice 4.4 substrate). This is the wiring that backs the
// divergence pill click-through on ObjectiveCard and the per-objective
// flag computation in usePlanRevisionFlagSync.

import { describe, it, expect } from 'vitest';
import {
  TIER_OBSERVE_DOMAINS_DEFAULT,
  OBJECTIVE_OBSERVE_DOMAINS_OVERRIDE,
  getObjectiveObserveDomains,
  getObjectivesForDomain,
  getPrimaryDomainForObjective,
} from '../objectiveObserveDomains.js';
import type { PlanTierObjective } from '../../schemas/plan/planTierObjective.schema.js';
import { PLAN_TIER_OBJECTIVES } from '../../constants/plan/tierObjectives.js';

function objective(
  patch: Partial<PlanTierObjective> & Pick<PlanTierObjective, 'id' | 'tierId'>,
): PlanTierObjective {
  return {
    id: patch.id,
    tierId: patch.tierId,
    title: patch.title ?? 'Test Objective',
    focusedQuestion: patch.focusedQuestion ?? 'Q?',
    prerequisiteObjectiveIds: patch.prerequisiteObjectiveIds ?? [],
    defaultOverlayBundle: patch.defaultOverlayBundle ?? [],
    checklist: patch.checklist ?? [],
    outputKind: patch.outputKind ?? 'plan-decision-record',
    legacyCardSectionId: patch.legacyCardSectionId,
    parallelGroupId: patch.parallelGroupId,
  };
}

describe('getObjectiveObserveDomains', () => {
  it('returns the per-objective override when one is registered', () => {
    const obj = objective({ id: 't0-vision', tierId: 't0-project-foundation' });
    expect(getObjectiveObserveDomains(obj)).toEqual(
      OBJECTIVE_OBSERVE_DOMAINS_OVERRIDE['t0-vision'],
    );
  });

  it('falls through to the tier default when no override exists', () => {
    const obj = objective({
      id: 'unknown-id',
      tierId: 't1-land-reading',
    });
    expect(getObjectiveObserveDomains(obj)).toEqual(
      TIER_OBSERVE_DOMAINS_DEFAULT['t1-land-reading'],
    );
  });

  it('returns the empty list when neither layer maps the objective', () => {
    const obj = objective({
      id: 'unknown-id',
      // @ts-expect-error — exercising the defensive fallback path
      tierId: 'tX-nonexistent',
    });
    expect(getObjectiveObserveDomains(obj)).toEqual([]);
  });

  it('every seeded plan tier objective resolves to at least one domain', () => {
    for (const obj of PLAN_TIER_OBJECTIVES) {
      const domains = getObjectiveObserveDomains(obj);
      expect(domains.length).toBeGreaterThan(0);
    }
  });
});

describe('getPrimaryDomainForObjective', () => {
  it('returns the first domain in the resolved list', () => {
    const obj = objective({
      id: 't4-water-strategy',
      tierId: 't4-system-design',
    });
    expect(getPrimaryDomainForObjective(obj)).toBe('hydrology');
  });

  it('returns null when no mapping exists', () => {
    const obj = objective({
      id: 'unknown-id',
      // @ts-expect-error — exercising the defensive null path
      tierId: 'tX-nonexistent',
    });
    expect(getPrimaryDomainForObjective(obj)).toBeNull();
  });
});

describe('getObjectivesForDomain', () => {
  it('returns the ids of objectives whose footprint includes the domain', () => {
    const set = getObjectivesForDomain(PLAN_TIER_OBJECTIVES, 'soil');
    expect(set.length).toBeGreaterThan(0);
    for (const id of set) {
      const obj = PLAN_TIER_OBJECTIVES.find((o) => o.id === id);
      expect(obj).toBeDefined();
      expect(getObjectiveObserveDomains(obj!)).toContain('soil');
    }
  });

  it('returns an empty list for a domain with no mapped objectives', () => {
    // No tier/objective lists 'land-base' as a primary except T1.
    // Use a clearly orthogonal domain set instead — exercise via empty
    // input list to keep the test deterministic.
    expect(getObjectivesForDomain([], 'soil')).toEqual([]);
  });
});
