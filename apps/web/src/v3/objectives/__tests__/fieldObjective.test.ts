import { describe, it, expect } from 'vitest';
import {
  evaluateObjectiveCompletion,
  emptyObjectiveRun,
  requiredLayersToModules,
  firstUnsatisfiedAnnotationSpec,
  type FieldObjective,
  type ObjectiveRun,
} from '../fieldObjective.js';
import {
  SEED_FIELD_OBJECTIVES,
  seedObjectivesForProject,
} from '../seedObjectives.js';
import { OBSERVE_MODULES } from '../../observe/types.js';

/** A minimal objective with one required check, one required photo (min 2),
 *  and a required summary — exercises all three completion gates. */
function fixture(overrides: Partial<FieldObjective> = {}): FieldObjective {
  return {
    id: 'obj-test',
    projectId: 'mtc',
    stage: 'observe',
    module: 'topography',
    title: 'Test objective',
    target: { center: [-78.2, 44.5] },
    requiredTools: [],
    requiredLayers: [],
    checklist: [
      { id: 'c1', label: 'Required check', required: true },
      { id: 'c2', label: 'Optional check', required: false },
    ],
    evidence: [
      { id: 'photos', kind: 'photo', label: 'Photos', min: 2, required: true },
    ],
    completionRule: {
      requireAllRequiredChecklist: true,
      requireAllRequiredEvidence: true,
      requireSummary: true,
    },
    priority: 'medium',
    ...overrides,
  };
}

function run(overrides: Partial<ObjectiveRun> = {}): ObjectiveRun {
  return { ...emptyObjectiveRun(), ...overrides };
}

describe('evaluateObjectiveCompletion', () => {
  it('reports nothing done for an empty run', () => {
    const e = evaluateObjectiveCompletion(fixture(), emptyObjectiveRun());
    expect(e.checklistDone).toBe(0);
    expect(e.checklistTotal).toBe(1);
    expect(e.evidenceDone).toBe(0);
    expect(e.evidenceTotal).toBe(1);
    expect(e.summarySatisfied).toBe(false);
    expect(e.canSubmit).toBe(false);
    expect(e.pct).toBe(0);
  });

  it('ignores optional checklist items in the required count', () => {
    const e = evaluateObjectiveCompletion(
      fixture(),
      run({ checkedChecklist: ['c2'] }),
    );
    expect(e.checklistDone).toBe(0);
    expect(e.checklistTotal).toBe(1);
  });

  it('requires the evidence min count to be met', () => {
    const oneShort = evaluateObjectiveCompletion(
      fixture(),
      run({
        evidence: [
          { specId: 'photos', kind: 'photo', value: 'a', capturedAt: 'x' },
        ],
      }),
    );
    expect(oneShort.evidenceDone).toBe(0);

    const met = evaluateObjectiveCompletion(
      fixture(),
      run({
        evidence: [
          { specId: 'photos', kind: 'photo', value: 'a', capturedAt: 'x' },
          { specId: 'photos', kind: 'photo', value: 'b', capturedAt: 'y' },
        ],
      }),
    );
    expect(met.evidenceDone).toBe(1);
  });

  it('only allows submit when every active gate passes', () => {
    const complete = run({
      checkedChecklist: ['c1'],
      evidence: [
        { specId: 'photos', kind: 'photo', value: 'a', capturedAt: 'x' },
        { specId: 'photos', kind: 'photo', value: 'b', capturedAt: 'y' },
      ],
      summary: 'Done.',
    });
    const e = evaluateObjectiveCompletion(fixture(), complete);
    expect(e.canSubmit).toBe(true);
    expect(e.pct).toBe(100);
  });

  it('treats a blank summary as unsatisfied when required', () => {
    const e = evaluateObjectiveCompletion(
      fixture(),
      run({
        checkedChecklist: ['c1'],
        evidence: [
          { specId: 'photos', kind: 'photo', value: 'a', capturedAt: 'x' },
          { specId: 'photos', kind: 'photo', value: 'b', capturedAt: 'y' },
        ],
        summary: '   ',
      }),
    );
    expect(e.summarySatisfied).toBe(false);
    expect(e.canSubmit).toBe(false);
  });

  it('drops a gate from the rule and from progress when disabled', () => {
    const obj = fixture({
      completionRule: {
        requireAllRequiredChecklist: true,
        requireAllRequiredEvidence: false,
        requireSummary: false,
      },
    });
    const e = evaluateObjectiveCompletion(obj, run({ checkedChecklist: ['c1'] }));
    expect(e.canSubmit).toBe(true);
    expect(e.pct).toBe(100);
  });
});

describe('requiredLayersToModules', () => {
  it('always includes the objective own module', () => {
    expect(requiredLayersToModules([], 'topography')).toEqual(['topography']);
  });

  it('resolves the hydrology alias to earth-water-ecology', () => {
    const mods = requiredLayersToModules(['topography', 'hydrology'], 'topography');
    expect(mods).toContain('topography');
    expect(mods).toContain('earth-water-ecology');
    expect(mods).toHaveLength(2);
  });

  it('passes through valid module tokens and de-duplicates', () => {
    const mods = requiredLayersToModules(
      ['earth-water-ecology', 'hydrology'],
      'earth-water-ecology',
    );
    // own module + the valid token + the alias all collapse to one
    expect(mods).toEqual(['earth-water-ecology']);
  });

  it('drops unknown tokens', () => {
    const mods = requiredLayersToModules(['not-a-module', 'built-environment'], 'topography');
    expect(mods).toContain('topography');
    expect(mods).toContain('built-environment');
    expect(mods).not.toContain('not-a-module' as never);
    expect(mods).toHaveLength(2);
  });

  it('returns only known Observe modules for every seeded objective', () => {
    for (const o of SEED_FIELD_OBJECTIVES) {
      const mods = requiredLayersToModules(o.requiredLayers, o.module);
      for (const m of mods) expect(OBSERVE_MODULES).toContain(m);
      expect(mods).toContain(o.module);
    }
  });
});

describe('firstUnsatisfiedAnnotationSpec', () => {
  /** Objective with two annotation specs (one min 2) plus a non-annotation. */
  const annObjective = fixture({
    evidence: [
      { id: 'note', kind: 'note', label: 'Note', required: true },
      { id: 'a1', kind: 'annotation', label: 'Mark one', required: true },
      { id: 'a2', kind: 'annotation', label: 'Mark two', min: 2, required: true },
    ],
  });

  it('returns the first annotation spec when nothing is captured', () => {
    const spec = firstUnsatisfiedAnnotationSpec(annObjective, emptyObjectiveRun());
    expect(spec?.id).toBe('a1');
  });

  it('skips a satisfied spec and returns the next short one', () => {
    const spec = firstUnsatisfiedAnnotationSpec(
      annObjective,
      run({
        evidence: [
          { specId: 'a1', kind: 'annotation', value: 'x', capturedAt: 't' },
        ],
      }),
    );
    expect(spec?.id).toBe('a2');
  });

  it('respects a spec min greater than 1', () => {
    const oneShort = firstUnsatisfiedAnnotationSpec(
      annObjective,
      run({
        evidence: [
          { specId: 'a1', kind: 'annotation', value: 'x', capturedAt: 't' },
          { specId: 'a2', kind: 'annotation', value: 'y', capturedAt: 't' },
        ],
      }),
    );
    expect(oneShort?.id).toBe('a2');
  });

  it('returns null when every annotation spec is satisfied', () => {
    const spec = firstUnsatisfiedAnnotationSpec(
      annObjective,
      run({
        evidence: [
          { specId: 'a1', kind: 'annotation', value: 'x', capturedAt: 't' },
          { specId: 'a2', kind: 'annotation', value: 'y', capturedAt: 't' },
          { specId: 'a2', kind: 'annotation', value: 'z', capturedAt: 't' },
        ],
      }),
    );
    expect(spec).toBeNull();
  });

  it('returns null for an objective with no annotation specs', () => {
    expect(firstUnsatisfiedAnnotationSpec(fixture(), emptyObjectiveRun())).toBeNull();
  });
});

describe('SEED_FIELD_OBJECTIVES shape', () => {
  it('has unique ids', () => {
    const ids = SEED_FIELD_OBJECTIVES.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses only known Observe modules', () => {
    for (const o of SEED_FIELD_OBJECTIVES) {
      expect(OBSERVE_MODULES).toContain(o.module);
    }
  });

  it('gives every objective a target centre and at least one required tool', () => {
    for (const o of SEED_FIELD_OBJECTIVES) {
      expect(o.target.center).toHaveLength(2);
      expect(o.requiredTools.length).toBeGreaterThan(0);
    }
  });

  it('gives every objective at least one required checklist item or evidence spec', () => {
    for (const o of SEED_FIELD_OBJECTIVES) {
      const hasRequired =
        o.checklist.some((c) => c.required) || o.evidence.some((e) => e.required);
      expect(hasRequired).toBe(true);
    }
  });

  it('scopes seed lookups by project', () => {
    expect(seedObjectivesForProject('mtc').length).toBe(
      SEED_FIELD_OBJECTIVES.length,
    );
    expect(seedObjectivesForProject('nonexistent')).toHaveLength(0);
  });
});
