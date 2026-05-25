import { describe, it, expect } from 'vitest';
import {
  evaluateObservationRecorded,
  emptyObservationNeedRun,
  requiredLayersToModules,
  firstUnsatisfiedAnnotationSpec,
  buildRaisedNeed,
  editRaisedNeed,
  type ObservationNeed,
  type ObservationNeedRun,
  type RaiseNeedInput,
  type RaiseNeedContext,
  type EditNeedInput,
} from '../observationNeed.js';
import {
  SEED_OBSERVATION_NEEDS,
  seedObservationNeedsForProject,
} from '../seedObservationNeeds.js';
import { OBSERVE_MODULES } from '../../observe/types.js';

/** A minimal need with one required check, one required photo (min 2), and a
 *  required summary — exercises all three recording gates. */
function fixture(overrides: Partial<ObservationNeed> = {}): ObservationNeed {
  return {
    id: 'obj-test',
    projectId: 'mtc',
    stage: 'observe',
    module: 'topography',
    title: 'Test need',
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
    recordingRule: {
      requireAllRequiredChecklist: true,
      requireAllRequiredEvidence: true,
      requireSummary: true,
    },
    priority: 'medium',
    origin: 'seed',
    reason: 'Test reason',
    ...overrides,
  };
}

function run(overrides: Partial<ObservationNeedRun> = {}): ObservationNeedRun {
  return { ...emptyObservationNeedRun(), ...overrides };
}

describe('evaluateObservationRecorded', () => {
  it('reports nothing done for an empty run', () => {
    const e = evaluateObservationRecorded(fixture(), emptyObservationNeedRun());
    expect(e.checklistDone).toBe(0);
    expect(e.checklistTotal).toBe(1);
    expect(e.evidenceDone).toBe(0);
    expect(e.evidenceTotal).toBe(1);
    expect(e.summarySatisfied).toBe(false);
    expect(e.canRecord).toBe(false);
    expect(e.pct).toBe(0);
  });

  it('ignores optional checklist items in the required count', () => {
    const e = evaluateObservationRecorded(
      fixture(),
      run({ checkedChecklist: ['c2'] }),
    );
    expect(e.checklistDone).toBe(0);
    expect(e.checklistTotal).toBe(1);
  });

  it('requires the evidence min count to be met', () => {
    const oneShort = evaluateObservationRecorded(
      fixture(),
      run({
        evidence: [
          { specId: 'photos', kind: 'photo', value: 'a', capturedAt: 'x' },
        ],
      }),
    );
    expect(oneShort.evidenceDone).toBe(0);

    const met = evaluateObservationRecorded(
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

  it('only allows recording when every active gate passes', () => {
    const complete = run({
      checkedChecklist: ['c1'],
      evidence: [
        { specId: 'photos', kind: 'photo', value: 'a', capturedAt: 'x' },
        { specId: 'photos', kind: 'photo', value: 'b', capturedAt: 'y' },
      ],
      summary: 'Done.',
    });
    const e = evaluateObservationRecorded(fixture(), complete);
    expect(e.canRecord).toBe(true);
    expect(e.pct).toBe(100);
  });

  it('treats a blank summary as unsatisfied when required', () => {
    const e = evaluateObservationRecorded(
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
    expect(e.canRecord).toBe(false);
  });

  it('drops a gate from the rule and from progress when disabled', () => {
    const need = fixture({
      recordingRule: {
        requireAllRequiredChecklist: true,
        requireAllRequiredEvidence: false,
        requireSummary: false,
      },
    });
    const e = evaluateObservationRecorded(need, run({ checkedChecklist: ['c1'] }));
    expect(e.canRecord).toBe(true);
    expect(e.pct).toBe(100);
  });
});

describe('requiredLayersToModules', () => {
  it('always includes the need own module', () => {
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

  it('returns only known Observe modules for every seeded need', () => {
    for (const o of SEED_OBSERVATION_NEEDS) {
      const mods = requiredLayersToModules(o.requiredLayers, o.module);
      for (const m of mods) expect(OBSERVE_MODULES).toContain(m);
      expect(mods).toContain(o.module);
    }
  });
});

describe('firstUnsatisfiedAnnotationSpec', () => {
  /** Need with two annotation specs (one min 2) plus a non-annotation. */
  const annNeed = fixture({
    evidence: [
      { id: 'note', kind: 'note', label: 'Note', required: true },
      { id: 'a1', kind: 'annotation', label: 'Mark one', required: true },
      { id: 'a2', kind: 'annotation', label: 'Mark two', min: 2, required: true },
    ],
  });

  it('returns the first annotation spec when nothing is captured', () => {
    const spec = firstUnsatisfiedAnnotationSpec(annNeed, emptyObservationNeedRun());
    expect(spec?.id).toBe('a1');
  });

  it('skips a satisfied spec and returns the next short one', () => {
    const spec = firstUnsatisfiedAnnotationSpec(
      annNeed,
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
      annNeed,
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
      annNeed,
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

  it('returns null for a need with no annotation specs', () => {
    expect(firstUnsatisfiedAnnotationSpec(fixture(), emptyObservationNeedRun())).toBeNull();
  });
});

describe('buildRaisedNeed', () => {
  const input: RaiseNeedInput = {
    title: '  Recheck eroded bank  ',
    reason: '  Bank slumped after the storm  ',
    priority: 'high',
  };
  const ctx: RaiseNeedContext = {
    id: 'need-123',
    projectId: 'mtc',
    module: 'topography',
    target: { center: [-78.2, 44.5] },
    origin: 'follow-up',
    sourceObservationId: 'obj-parent',
  };

  it('carries origin, source link, and trimmed reason for a follow-up', () => {
    const need = buildRaisedNeed(input, ctx);
    expect(need.id).toBe('need-123');
    expect(need.origin).toBe('follow-up');
    expect(need.sourceObservationId).toBe('obj-parent');
    expect(need.reason).toBe('Bank slumped after the storm');
    expect(need.title).toBe('Recheck eroded bank');
    expect(need.priority).toBe('high');
    expect(need.stage).toBe('observe');
    expect(need.module).toBe('topography');
  });

  it('omits the source link for a manual need', () => {
    const need = buildRaisedNeed(input, {
      ...ctx,
      origin: 'manual',
      sourceObservationId: undefined,
    });
    expect(need.origin).toBe('manual');
    expect(need.sourceObservationId).toBeUndefined();
  });

  it('opens with one required summary note and is not instantly recordable', () => {
    const need = buildRaisedNeed(input, ctx);
    expect(need.checklist).toHaveLength(0);
    expect(need.requiredTools).toHaveLength(0);
    expect(need.requiredLayers).toHaveLength(0);
    expect(need.evidence).toEqual([
      { id: 'summary', kind: 'note', label: 'Summary note', required: true },
    ]);
    const e = evaluateObservationRecorded(need, emptyObservationNeedRun());
    expect(e.canRecord).toBe(false);
  });

  it('becomes recordable once the summary note is captured', () => {
    const need = buildRaisedNeed(input, ctx);
    const e = evaluateObservationRecorded(
      need,
      run({
        evidence: [
          { specId: 'summary', kind: 'note', value: 'Logged.', capturedAt: 't' },
        ],
        summary: 'Logged.',
      }),
    );
    expect(e.canRecord).toBe(true);
  });

  it('passes through optional trigger and plan impact, dropping blanks', () => {
    const withExtras = buildRaisedNeed(
      { ...input, trigger: '  after next rainfall  ', planImpact: 'likely' },
      ctx,
    );
    expect(withExtras.trigger).toBe('after next rainfall');
    expect(withExtras.planImpact).toBe('likely');

    const blankTrigger = buildRaisedNeed({ ...input, trigger: '   ' }, ctx);
    expect(blankTrigger.trigger).toBeUndefined();
    expect(blankTrigger.planImpact).toBeUndefined();
  });
});

describe('editRaisedNeed', () => {
  /** A raised follow-up need to edit. */
  const raised = buildRaisedNeed(
    { title: 'Recheck eroded bank', reason: 'Bank slumped', priority: 'high' },
    {
      id: 'need-123',
      projectId: 'mtc',
      module: 'topography',
      target: { center: [-78.2, 44.5] },
      origin: 'follow-up',
      sourceObservationId: 'obj-parent',
    },
  );

  const edits: EditNeedInput = {
    module: 'earth-water-ecology',
    title: '  New title  ',
    reason: '  New reason  ',
    priority: 'low',
    trigger: '  after thaw  ',
    planImpact: 'possible',
  };

  it('applies the form fields and trims them', () => {
    const next = editRaisedNeed(raised, edits);
    expect(next.module).toBe('earth-water-ecology');
    expect(next.title).toBe('New title');
    expect(next.reason).toBe('New reason');
    expect(next.priority).toBe('low');
    expect(next.trigger).toBe('after thaw');
    expect(next.planImpact).toBe('possible');
  });

  it('preserves identity, origin, target, and the source back-link', () => {
    const next = editRaisedNeed(raised, edits);
    expect(next.id).toBe('need-123');
    expect(next.projectId).toBe('mtc');
    expect(next.stage).toBe('observe');
    expect(next.origin).toBe('follow-up');
    expect(next.sourceObservationId).toBe('obj-parent');
    expect(next.target).toEqual(raised.target);
    expect(next.evidence).toEqual(raised.evidence);
    expect(next.recordingRule).toEqual(raised.recordingRule);
  });

  it('clears trigger and plan impact when blanked', () => {
    const next = editRaisedNeed(raised, {
      module: raised.module,
      title: raised.title,
      reason: raised.reason,
      priority: raised.priority,
      trigger: '   ',
    });
    expect(next.trigger).toBeUndefined();
    expect(next.planImpact).toBeUndefined();
  });

  it('does not mutate the original need', () => {
    const before = JSON.stringify(raised);
    editRaisedNeed(raised, edits);
    expect(JSON.stringify(raised)).toBe(before);
  });
});

describe('SEED_OBSERVATION_NEEDS shape', () => {
  it('has unique ids', () => {
    const ids = SEED_OBSERVATION_NEEDS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses only known Observe modules', () => {
    for (const o of SEED_OBSERVATION_NEEDS) {
      expect(OBSERVE_MODULES).toContain(o.module);
    }
  });

  it('gives every need a target centre and at least one required tool', () => {
    for (const o of SEED_OBSERVATION_NEEDS) {
      expect(o.target.center).toHaveLength(2);
      expect(o.requiredTools.length).toBeGreaterThan(0);
    }
  });

  it('gives every need at least one required checklist item or evidence spec', () => {
    for (const o of SEED_OBSERVATION_NEEDS) {
      const hasRequired =
        o.checklist.some((c) => c.required) || o.evidence.some((e) => e.required);
      expect(hasRequired).toBe(true);
    }
  });

  it('gives every need an origin and a reason', () => {
    for (const o of SEED_OBSERVATION_NEEDS) {
      expect(o.origin).toBe('seed');
      expect(o.reason.length).toBeGreaterThan(0);
    }
  });

  it('scopes seed lookups by project', () => {
    expect(seedObservationNeedsForProject('mtc').length).toBe(
      SEED_OBSERVATION_NEEDS.length,
    );
    expect(seedObservationNeedsForProject('nonexistent')).toHaveLength(0);
  });
});
