// actObjectiveTaskBridge.test.ts
//
// Verifies the pure core of the Act-completion unification bridge: a
// PlanStratumObjective (tier-shell unit of work) resolves to the UNIVERSAL
// catalogue Act objective id (the id space ActTask.objectiveId lives in), via
// its primary Observe domain. The link is domain-only — never id-equality
// between the per-project stratum objective id and the catalogue objective id.

import { describe, it, expect } from 'vitest';
import { resolveActObjectiveId } from '../actObjectiveTaskBridge.js';
import { OBJECTIVE_OBSERVE_DOMAINS_OVERRIDE } from '../objectiveObserveDomains.js';
import { getObjective } from '../../constants/olos/objectives.js';
import type { PlanStratumObjective } from '../../schemas/plan/planStratumObjective.schema.js';

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

describe('resolveActObjectiveId', () => {
  it('resolves via a per-objective override domain to the catalogue Act objective for that domain', () => {
    // s1-vision overrides to ['vision-intent']; primary domain => vision-intent.
    const obj = objective({ id: 's1-vision', stratumId: 's1-project-foundation' });
    expect(OBJECTIVE_OBSERVE_DOMAINS_OVERRIDE['s1-vision']).toEqual([
      'vision-intent',
    ]);
    expect(resolveActObjectiveId(obj)).toBe('vision-intent--act');
    // Sanity: the catalogue genuinely carries that Act objective.
    expect(getObjective('act', 'vision-intent')?.id).toBe('vision-intent--act');
  });

  it('resolves via the tier default when no override exists', () => {
    // Unknown id => falls through to the s6 tier default, whose first
    // domain is 'plants-food'.
    const obj = objective({
      id: 'unmapped-objective',
      stratumId: 's6-integration-design',
    });
    expect(resolveActObjectiveId(obj)).toBe('plants-food--act');
  });

  it('returns null when the objective maps to no domain (defensive)', () => {
    const obj = objective({
      id: 'unmapped-objective',
      // @ts-expect-error — exercising the defensive no-domain path
      stratumId: 'sX-nonexistent',
    });
    expect(resolveActObjectiveId(obj)).toBeNull();
  });

  it('never returns a stratum objective id (different id space from ActTask.objectiveId)', () => {
    const obj = objective({ id: 's6-yield-flows', stratumId: 's6-integration-design' });
    const resolved = resolveActObjectiveId(obj);
    expect(resolved).not.toBe('s6-yield-flows');
    expect(resolved).toMatch(/--act$/);
  });
});
