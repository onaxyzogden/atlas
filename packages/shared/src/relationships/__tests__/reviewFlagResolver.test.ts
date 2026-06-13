// reviewFlagResolver.test.ts
//
// Verifies the reverse, data-derived cyclical-review trigger: given a set of
// diverged Observe domains, which Plan objectives go amber "Review" and why
// (the `via` / `domains` attribution). Exercises each of the three signals in
// isolation (membership / downstream / upstream), their union, project
// scoping (dangling feedsInto targets dropped), and the empty-domain clear.

import { describe, it, expect } from 'vitest';
import { resolveReviewFlaggedObjectives } from '../reviewFlagResolver.js';
import type { PlanStratumObjective } from '../../schemas/plan/planStratumObjective.schema.js';
import type { PlanDecisionChecklistItem } from '../../schemas/plan/planStratumObjective.schema.js';
import { PLAN_STRATUM_OBJECTIVES } from '../../constants/plan/stratumObjectives.js';

function item(
  id: string,
  feedsInto: string[] = [],
): PlanDecisionChecklistItem {
  return {
    id,
    label: id,
    feedsInto,
    optional: false,
  };
}

function objective(
  patch: Partial<PlanStratumObjective> &
    Pick<PlanStratumObjective, 'id' | 'stratumId'>,
): PlanStratumObjective {
  return {
    id: patch.id,
    stratumId: patch.stratumId,
    title: patch.title ?? 'Test Objective',
    focusedQuestion: patch.focusedQuestion ?? 'Q?',
    prerequisiteObjectiveIds: patch.prerequisiteObjectiveIds ?? [],
    defaultOverlayBundle: patch.defaultOverlayBundle ?? [],
    checklist: patch.checklist ?? [],
    decisionGroups: patch.decisionGroups ?? [],
    outputKind: patch.outputKind ?? 'plan-decision-record',
    legacyCardSectionId: patch.legacyCardSectionId,
    parallelGroupId: patch.parallelGroupId,
  };
}

// A small synthetic project graph:
//   s2-land-baseline  (footprint includes 'soil' via override)  --feeds-->  s5-water
//   s5-water          (s5 tier default: hydrology/risk/soil/...)
//   s7-phasing        (economics/monitoring/people) --feeds--> s2? no
// We use real ids so getObjectiveObserveDomains resolves their footprints.
const sLand = objective({
  id: 's2-land-baseline',
  stratumId: 's2-land-reading',
  checklist: [item('c1', ['s5-water-strategy']), item('c2', [])],
});
const sWater = objective({
  id: 's5-water-strategy',
  stratumId: 's5-system-design',
  checklist: [item('w1', [])],
});
const sUpstream = objective({
  // s1-vision footprint = ['vision-intent'] (override) — does NOT overlap soil,
  // so it is only ever flagged via the upstream edge below.
  id: 's1-vision',
  stratumId: 's1-project-foundation',
  checklist: [item('v1', ['s2-land-baseline'])],
});
const PROJECT = [sLand, sWater, sUpstream];

describe('resolveReviewFlaggedObjectives', () => {
  it('returns an empty map when no domains diverged', () => {
    const out = resolveReviewFlaggedObjectives({
      objectives: PROJECT,
      divergedDomains: [],
    });
    expect(out.size).toBe(0);
  });

  it('returns an empty map for an empty objective set', () => {
    const out = resolveReviewFlaggedObjectives({
      objectives: [],
      divergedDomains: ['soil'],
    });
    expect(out.size).toBe(0);
  });

  it('flags membership: an objective whose footprint overlaps a diverged domain', () => {
    const out = resolveReviewFlaggedObjectives({
      objectives: PROJECT,
      divergedDomains: ['soil'],
    });
    // s2-land-baseline footprint includes 'soil' -> membership.
    const land = out.get('s2-land-baseline');
    expect(land).toBeDefined();
    expect(land!.via).toContain('membership');
    expect(land!.domains).toContain('soil');
  });

  it('flags downstream: the feedsInto target of a membership objective', () => {
    const out = resolveReviewFlaggedObjectives({
      objectives: PROJECT,
      divergedDomains: ['soil'],
    });
    // s2-land-baseline (membership) feeds s5-water-strategy -> downstream.
    const water = out.get('s5-water-strategy');
    expect(water).toBeDefined();
    expect(water!.via).toContain('downstream');
    // inherits the feeder's diverged domain
    expect(water!.domains).toContain('soil');
  });

  it('flags upstream: an objective whose item feeds INTO a membership objective', () => {
    const out = resolveReviewFlaggedObjectives({
      objectives: PROJECT,
      divergedDomains: ['soil'],
    });
    // s1-vision feeds s2-land-baseline (membership) -> upstream.
    const vision = out.get('s1-vision');
    expect(vision).toBeDefined();
    expect(vision!.via).toContain('upstream');
    expect(vision!.domains).toContain('soil');
  });

  it('unions via tags when an objective is reached by more than one signal', () => {
    // s5-water-strategy footprint includes 'hydrology' AND 'soil'; it is also
    // a downstream feedsInto target of s2-land-baseline. Diverging both soil
    // (membership for land + s5) gives s5 BOTH membership and downstream.
    const out = resolveReviewFlaggedObjectives({
      objectives: PROJECT,
      divergedDomains: ['soil'],
    });
    const water = out.get('s5-water-strategy');
    expect(water).toBeDefined();
    expect(water!.via).toEqual(
      expect.arrayContaining(['membership', 'downstream']),
    );
    // via is deduped + in canonical order
    expect(new Set(water!.via).size).toBe(water!.via.length);
  });

  it('project-scopes: a dangling feedsInto target is never flagged', () => {
    const lone = objective({
      id: 's2-land-baseline',
      stratumId: 's2-land-reading',
      checklist: [item('c1', ['not-in-this-project'])],
    });
    const out = resolveReviewFlaggedObjectives({
      objectives: [lone],
      divergedDomains: ['soil'],
    });
    expect(out.has('not-in-this-project')).toBe(false);
    // the membership objective itself is still flagged
    expect(out.get('s2-land-baseline')!.via).toContain('membership');
  });

  it('returns empty when no objective footprint touches a diverged domain', () => {
    // 'vision-intent' is s1-vision's footprint; diverging an orthogonal domain
    // with no membership objective yields no edges to follow.
    const out = resolveReviewFlaggedObjectives({
      objectives: [sWater], // footprint: hydrology/risk/soil/access/built
      divergedDomains: ['ummah' as never], // not a real domain -> no overlap
    });
    expect(out.size).toBe(0);
  });
});

// Real-catalogue analogue of the Act -> Observe -> Plan as-built gate
// (planRevisionFlag.asBuilt.test.ts): the s6-yield-flows objective carries
// 'plants-food' in its footprint, so a plants-food divergence (what
// recordAsBuiltDeviation emits for a crop area) must flag it via MEMBERSHIP
// through the resolver path now used by usePlanRevisionFlagSync. Pins the
// real-data wiring, not just the synthetic graph above.
describe('resolveReviewFlaggedObjectives (real spine)', () => {
  it('flags s6-yield-flows via membership on a plants-food divergence', () => {
    const out = resolveReviewFlaggedObjectives({
      objectives: PLAN_STRATUM_OBJECTIVES,
      divergedDomains: ['plants-food'],
    });
    const yieldFlows = out.get('s6-yield-flows');
    expect(yieldFlows).toBeDefined();
    expect(yieldFlows!.via).toContain('membership');
    expect(yieldFlows!.domains).toContain('plants-food');
  });

  it('flags nothing when no domain has diverged', () => {
    const out = resolveReviewFlaggedObjectives({
      objectives: PLAN_STRATUM_OBJECTIVES,
      divergedDomains: [],
    });
    expect(out.size).toBe(0);
  });
});
