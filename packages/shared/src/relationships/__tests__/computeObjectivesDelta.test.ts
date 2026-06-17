import { describe, it, expect } from 'vitest';
import { computeObjectivesDelta } from '../computeObjectivesDelta.js';
import type { SecondaryCatalogue } from '../../constants/plan/catalogues/index.js';
import { ck, obj, patch } from '../../constants/plan/catalogues/authoring.js';

describe('computeObjectivesDelta - adding residential to regenerative_farm', () => {
  // regen_farm primary resolves universal+primary (32); adding residential is
  // an M pairing: 5 additive objectives (res-s3-water-quality is excluded from
  // resolution; its content was relocated into the s3-hydrology/s3-soil patches)
  // + 6 patches (one of which amends the s3-hydrology completion gate).
  const before = {
    primaryTypeId: 'regenerative_farm',
    secondaryTypeIds: [],
  } as const;
  const after = {
    primaryTypeId: 'regenerative_farm',
    secondaryTypeIds: ['residential'],
  } as const;
  const delta = computeObjectivesDelta(before, after);

  it('reports the 5 residential additive objectives as new', () => {
    expect(delta.newObjectiveIds).toHaveLength(5);
    expect(delta.newObjectives).toHaveLength(5);
    // every reported new objective is a residential secondary objective
    expect(
      delta.newObjectives.every(
        (o) => o.source === 'secondary' && o.sourceTypeId === 'residential',
      ),
    ).toBe(true);
    // ids and objects line up
    expect(delta.newObjectives.map((o) => o.id)).toEqual(delta.newObjectiveIds);
  });

  it('reports s3-hydrology among objectives that gained checklist items', () => {
    expect(delta.objectivesWithNewItems).toContain('s3-hydrology');
    const hydroItems = delta.injectedItems.filter(
      (i) => i.objectiveId === 's3-hydrology',
    );
    expect(hydroItems).toHaveLength(6);
    expect(
      hydroItems.every((i) => i.item.expandedBySecondaryId === 'residential'),
    ).toBe(true);
  });

  it('reports the s3-hydrology gate amendment (before != after)', () => {
    expect(delta.objectivesWithGateAmendments).toContain('s3-hydrology');
    const gate = delta.gateAmendments.find((g) => g.objectiveId === 's3-hydrology');
    expect(gate?.after).toContain(
      'source potability status and treatment requirements defined',
    );
    expect(gate?.before ?? '').not.toContain(
      'source potability status and treatment requirements defined',
    );
  });

  it('never lists a new objective as also gaining items (disjoint sets)', () => {
    const newSet = new Set(delta.newObjectiveIds);
    expect(delta.objectivesWithNewItems.some((id) => newSet.has(id))).toBe(false);
    expect(
      delta.objectivesWithGateAmendments.some((id) => newSet.has(id)),
    ).toBe(false);
  });
});

describe('computeObjectivesDelta - identical records yield an empty delta', () => {
  const same = {
    primaryTypeId: 'regenerative_farm',
    secondaryTypeIds: ['residential'],
  } as const;
  const delta = computeObjectivesDelta(same, same);

  it('is empty across every axis', () => {
    expect(delta.newObjectiveIds).toEqual([]);
    expect(delta.newObjectives).toEqual([]);
    expect(delta.objectivesWithNewItems).toEqual([]);
    expect(delta.injectedItems).toEqual([]);
    expect(delta.objectivesWithGateAmendments).toEqual([]);
    expect(delta.gateAmendments).toEqual([]);
  });
});

describe('computeObjectivesDelta - additive-only secondary (synthetic deps)', () => {
  // A synthetic residential catalogue that ONLY adds one objective and patches
  // nothing: the delta should report exactly one new objective and zero item
  // injections / gate amendments.
  const added = obj({
    id: 'syn-s5-extra',
    stratumId: 's5-system-design',
    ref: 'RES-S5.9',
    source: 'secondary',
    sourceTypeId: 'residential',
    secondaryClass: 'additive',
    title: 'Synthetic additive objective',
    focusedQuestion: 'Does the delta surface a pure additive?',
    checklist: [ck('syn-s5-extra-1', 'placeholder item')],
    completionGate: 'n/a',
    actHandoff: 'n/a',
  });
  const deps = {
    getSecondaryCatalogue: (id: string): SecondaryCatalogue | undefined =>
      id === 'residential' ? { additive: [added], patches: [] } : undefined,
  };

  const delta = computeObjectivesDelta(
    { primaryTypeId: 'regenerative_farm', secondaryTypeIds: [] },
    { primaryTypeId: 'regenerative_farm', secondaryTypeIds: ['residential'] },
    deps,
  );

  it('reports exactly the one new objective and no patches', () => {
    expect(delta.newObjectiveIds).toEqual(['syn-s5-extra']);
    expect(delta.objectivesWithNewItems).toEqual([]);
    expect(delta.injectedItems).toEqual([]);
    expect(delta.objectivesWithGateAmendments).toEqual([]);
    expect(delta.gateAmendments).toEqual([]);
  });
});

describe('computeObjectivesDelta - missing patch target (synthetic deps)', () => {
  // A patch whose target is absent is skipped by the resolver (never thrown),
  // so the delta sees no item injection and no gate amendment for it.
  const orphanPatch = patch({
    secondaryTypeId: 'residential',
    targetObjectiveId: 'does-not-exist-xyz',
    ref: 'RES>U-S10.9',
    injectedItems: [ck('orphan-1', 'item for a missing target')],
    completionGateAmendment: 'This gate amendment should never land.',
  });
  const deps = {
    getSecondaryCatalogue: (id: string): SecondaryCatalogue | undefined =>
      id === 'residential' ? { additive: [], patches: [orphanPatch] } : undefined,
  };

  const delta = computeObjectivesDelta(
    { primaryTypeId: 'regenerative_farm', secondaryTypeIds: [] },
    { primaryTypeId: 'regenerative_farm', secondaryTypeIds: ['residential'] },
    deps,
  );

  it('produces an empty delta - the orphan patch lands nowhere', () => {
    expect(delta.newObjectiveIds).toEqual([]);
    expect(delta.objectivesWithNewItems).toEqual([]);
    expect(delta.injectedItems).toEqual([]);
    expect(delta.objectivesWithGateAmendments).toEqual([]);
    expect(delta.gateAmendments).toEqual([]);
  });
});
