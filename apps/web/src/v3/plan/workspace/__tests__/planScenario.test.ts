import { describe, it, expect } from 'vitest';
import {
  adoptScenarioIntoDecision,
  emptyPlanDecision,
  emptyScenarioOption,
  PLAN_SCENARIO_EFFORTS,
  PLAN_SCENARIO_EFFORT_LABEL,
  PLAN_SCENARIO_HORIZONS,
  PLAN_SCENARIO_HORIZON_LABEL,
  PLAN_SCENARIO_REVERSIBILITIES,
  PLAN_SCENARIO_REVERSIBILITY_LABEL,
  type PlanDecision,
  type PlanScenarioOption,
} from '../../decisions/planDecision.js';

function option(overrides: Partial<PlanScenarioOption> = {}): PlanScenarioOption {
  return { ...emptyScenarioOption(), ...overrides };
}

function decision(overrides: Partial<PlanDecision> = {}): PlanDecision {
  return { ...emptyPlanDecision('mtc'), ...overrides };
}

describe('emptyScenarioOption', () => {
  it('starts blank with mid-point axis defaults', () => {
    const o = emptyScenarioOption();
    expect(o.id).toBeTruthy();
    expect(o.label).toBe('');
    expect(o.summary).toBe('');
    expect(o.pros).toBe('');
    expect(o.cons).toBe('');
    expect(o.effort).toBe('medium');
    expect(o.reversibility).toBe('moderate');
    expect(o.horizon).toBe('season');
  });

  it('mints a fresh id each call', () => {
    expect(emptyScenarioOption().id).not.toBe(emptyScenarioOption().id);
  });
});

describe('adoptScenarioIntoDecision', () => {
  const opt = option({
    id: 'opt-1',
    label: 'Move livestock off the bank',
    summary: 'Rotate the herd to the north paddock for the season.',
    pros: 'Stops the trampling immediately',
    cons: 'North paddock has less shade',
  });
  const d = decision({ scenarioOptions: [opt] });

  it('maps the option into the decision authored fields', () => {
    const patch = adoptScenarioIntoDecision(d, 'opt-1');
    expect(patch.headline).toBe('Move livestock off the bank');
    expect(patch.rationale).toBe(
      'Rotate the herd to the north paddock for the season.',
    );
    expect(patch.chosenScenarioId).toBe('opt-1');
  });

  it('combines pros and cons into the trade-offs block', () => {
    const patch = adoptScenarioIntoDecision(d, 'opt-1');
    expect(patch.tradeoffs).toContain('Stops the trampling immediately');
    expect(patch.tradeoffs).toContain('North paddock has less shade');
    expect(patch.tradeoffs).toContain('Pros:');
    expect(patch.tradeoffs).toContain('Cons:');
  });

  it('does not mutate the input decision', () => {
    const snapshot = JSON.stringify(d);
    adoptScenarioIntoDecision(d, 'opt-1');
    expect(JSON.stringify(d)).toBe(snapshot);
  });

  it('returns an empty patch for an unknown option id', () => {
    expect(adoptScenarioIntoDecision(d, 'nope')).toEqual({});
  });

  it('returns an empty patch when the decision has no options', () => {
    expect(adoptScenarioIntoDecision(decision(), 'opt-1')).toEqual({});
  });

  it('omits a missing pros/cons line from the trade-offs block', () => {
    const onlyPros = decision({
      scenarioOptions: [option({ id: 'p', pros: 'Cheap', cons: '' })],
    });
    const patch = adoptScenarioIntoDecision(onlyPros, 'p');
    expect(patch.tradeoffs).toBe('Pros: Cheap');
    expect(patch.tradeoffs).not.toContain('Cons:');
  });
});

describe('scenario axis labels', () => {
  it('has a label for every effort level', () => {
    for (const v of PLAN_SCENARIO_EFFORTS) {
      expect(PLAN_SCENARIO_EFFORT_LABEL[v]).toBeTruthy();
    }
  });

  it('has a label for every reversibility level', () => {
    for (const v of PLAN_SCENARIO_REVERSIBILITIES) {
      expect(PLAN_SCENARIO_REVERSIBILITY_LABEL[v]).toBeTruthy();
    }
  });

  it('has a label for every horizon', () => {
    for (const v of PLAN_SCENARIO_HORIZONS) {
      expect(PLAN_SCENARIO_HORIZON_LABEL[v]).toBeTruthy();
    }
  });
});
