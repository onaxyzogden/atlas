import { describe, it, expect } from 'vitest';
import {
  EMPTY_PLAN_INPUT,
  PLAN_OBJECTIVES,
  evaluateModule,
  evaluatePlan,
  type PlanProgressInput,
} from '../objectives.js';
import { PLAN_MODULES } from '../../types.js';

function input(patch: Partial<PlanProgressInput>): PlanProgressInput {
  return { ...EMPTY_PLAN_INPUT, ...patch };
}

/** The four core-design-essentials modules carry one required objective each. */
const REQUIRED_MODULE_COUNT = 4;

/** Flip every required objective on so the gate opens. */
const ALL_REQUIRED_MET: PlanProgressInput = input({
  waterNodeCount: 1,
  zoneCount: 1,
  cropAreaCount: 1,
  phaseCount: 1,
});

describe('evaluateModule', () => {
  it('marks tasks plan_to_do when nothing is done', () => {
    const m = evaluateModule(
      PLAN_OBJECTIVES['hydrology'],
      EMPTY_PLAN_INPUT,
      'hydrology',
    );
    expect(m.doneCount).toBe(0);
    expect(m.complete).toBe(false);
    expect(m.tasks.every((t) => t.columnId === 'plan_to_do')).toBe(true);
  });

  it('completes when the required objective is met, regardless of optional', () => {
    const m = evaluateModule(
      PLAN_OBJECTIVES['hydrology'],
      input({ waterNodeCount: 1 }),
      'hydrology',
    );
    expect(m.complete).toBe(true);
    expect(m.requiredDone).toBe(m.requiredTotal);
    // optional "three-node network" still pending → not all tasks done
    expect(m.doneCount).toBeLessThan(m.total);
    const nodeTask = m.tasks.find((t) => t.id === 'water-management.node');
    expect(nodeTask?.columnId).toBe('plan_done');
  });

  it('an optional objective alone does not complete the module', () => {
    // plant-systems: succession is optional and independent of the required
    // (guild or crop area) predicate.
    const m = evaluateModule(
      PLAN_OBJECTIVES['plants-food'],
      input({ successionPlanned: true }),
      'plants-food',
    );
    expect(m.doneCount).toBe(1);
    expect(m.complete).toBe(false);
  });

  it('treats zone OR path as satisfying the zone-circulation required objective', () => {
    const viaPath = evaluateModule(
      PLAN_OBJECTIVES['access-circulation'],
      input({ pathCount: 1 }),
      'access-circulation',
    );
    expect(viaPath.complete).toBe(true);
  });

  it('an optional-only module with nothing done still evaluates complete', () => {
    // structures-subsystems carries no required objective → never gates.
    const m = evaluateModule(
      PLAN_OBJECTIVES['built-infrastructure'],
      EMPTY_PLAN_INPUT,
      'built-infrastructure',
    );
    expect(m.requiredTotal).toBe(0);
    expect(m.complete).toBe(true);
  });
});

describe('evaluatePlan', () => {
  it('empty input → 0% and gate closed', () => {
    const r = evaluatePlan(EMPTY_PLAN_INPUT);
    expect(r.overall.percent).toBe(0);
    expect(r.overall.doneCount).toBe(0);
    expect(r.overall.requiredComplete).toBe(false);
    expect(r.overall.remainingRequired).toHaveLength(REQUIRED_MODULE_COUNT);
  });

  it('all required objectives met → gate opens', () => {
    const r = evaluatePlan(ALL_REQUIRED_MET);
    expect(r.overall.requiredComplete).toBe(true);
    expect(r.overall.remainingRequired).toHaveLength(0);
    for (const mod of PLAN_MODULES) {
      expect(r.byModule[mod].complete).toBe(true);
    }
  });

  it('optional objectives raise the percent but a missing required keeps the gate closed', () => {
    // succession is optional in plant-systems; no required objective met.
    const r = evaluatePlan(input({ successionPlanned: true }));
    expect(r.overall.doneCount).toBe(1);
    expect(r.overall.percent).toBeGreaterThan(0);
    expect(r.overall.requiredComplete).toBe(false);
  });

  it('percent reaches 100 only when every objective (incl. optional) is done', () => {
    const everything = input({
      waterNodeCount: 3,
      zoneCount: 1,
      pathCount: 1,
      guildCount: 1,
      cropAreaCount: 1,
      successionPlanned: true,
      phaseCount: 1,
      workItemCount: 1,
      builtProposedCount: 1,
      soilFlowCount: 1,
      paddockCount: 1,
      principleMetCount: 1,
    });
    const r = evaluatePlan(everything);
    expect(r.overall.percent).toBe(100);
    expect(r.overall.doneCount).toBe(r.overall.total);
  });
});
