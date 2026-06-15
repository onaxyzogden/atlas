/**
 * resolveFormPrefill -- pure pre-fill resolver for the vision-form tools.
 *
 * Pins: the steward branch is field-shape-driven (hoursPerWeek leaf + a
 * laborSkillsByType repeatable), reports a roster-hours sum and a de-duplicated
 * skills union capped at the repeatable max, and stays silent on irrelevant
 * forms / empty rosters. The prior-objective branch is conservative -- single
 * text leaf OR single repeatable targets only, scoped to upstream objectives
 * (reverse feedsInto u prerequisiteObjectiveIds), self-excluding the target. It
 * NEVER reports sale/capital fields and NEVER mutates.
 */

import { describe, it, expect } from 'vitest';
import type { PlanStratumObjective } from '@ogden/shared';
import type { FormFieldSpec, FormValue } from '../../act/tier-shell/actToolCatalog.js';
import {
  resolveFormPrefill,
  buildPrefillMap,
  type PrefillContext,
  type StewardProfileLite,
} from '../resolveFormPrefill.js';

/* ----------------------------- fixtures -------------------------------- */

const LABOUR_FIELDS: readonly FormFieldSpec[] = [
  { kind: 'text', key: 'hoursPerWeek', label: 'Hours per week', required: true },
  {
    kind: 'repeatable',
    key: 'skills',
    label: 'Relevant skills',
    min: 0,
    max: 3,
    item: { kind: 'hybrid', optionSetId: 'laborSkillsByType' },
  },
];

const SINGLE_LEAF_FIELDS: readonly FormFieldSpec[] = [
  { kind: 'text', key: 'purpose', label: 'Primary purpose', multiline: true },
];

const SINGLE_REPEATABLE_FIELDS: readonly FormFieldSpec[] = [
  {
    kind: 'repeatable',
    key: 'criteria',
    label: 'Success criterion',
    min: 1,
    max: 5,
    item: { kind: 'hybrid', optionSetId: 'successCriteriaByType' },
  },
];

const MULTI_LEAF_FIELDS: readonly FormFieldSpec[] = [
  { kind: 'hybrid', key: 'foodProductionTarget', optionSetId: 'foodProductionTarget' },
  { kind: 'text', key: 'notes', label: 'Notes', multiline: true },
];

function profile(p: StewardProfileLite): StewardProfileLite {
  return p;
}

function objective(o: {
  id: string;
  title?: string;
  shortTitle?: string;
  prerequisiteObjectiveIds?: string[];
  checklist?: Array<{ id: string; feedsInto?: string[] }>;
}): PlanStratumObjective {
  return {
    id: o.id,
    title: o.title ?? o.id,
    shortTitle: o.shortTitle,
    prerequisiteObjectiveIds: o.prerequisiteObjectiveIds ?? [],
    checklist: (o.checklist ?? []).map((it) => ({
      id: it.id,
      feedsInto: it.feedsInto ?? [],
    })),
  } as unknown as PlanStratumObjective;
}

function ctx(partial: Partial<PrefillContext>): PrefillContext {
  return {
    profiles: [],
    objectives: [],
    activeObjectiveId: null,
    savedFormData: {},
    savedFormText: {},
    ...partial,
  };
}

/* ----------------------------- steward --------------------------------- */

describe('resolveFormPrefill -- steward branch', () => {
  it('sums roster hours and unions skills into the labour-shaped fields', () => {
    const r = resolveFormPrefill(LABOUR_FIELDS, 'hms-s1-c4', ctx({
      profiles: [
        profile({ maintenanceHrsInitial: 12, maintenanceHrsOngoing: 8, skills: ['Fencing', 'Irrigation'] }),
        profile({ maintenanceHrsInitial: 5, skills: ['Irrigation', 'Earthworks'] }),
      ],
    }));

    const hours = r.fromSteward.find((s) => s.fieldKey === 'hoursPerWeek');
    expect(hours?.value).toBe('25'); // 12+8+5
    expect(hours?.origin).toBe('steward');
    expect(hours?.sourceLabel).toBe('Steward roster');

    const skills = r.fromSteward.find((s) => s.fieldKey === 'skills');
    // union de-duplicated, order-stable: Fencing, Irrigation, Earthworks
    expect(skills?.value).toEqual(['Fencing', 'Irrigation', 'Earthworks']);
  });

  it('caps the skills union at the repeatable max', () => {
    const r = resolveFormPrefill(LABOUR_FIELDS, 'f', ctx({
      profiles: [profile({ skills: ['a', 'b', 'c', 'd', 'e'] })],
    }));
    const skills = r.fromSteward.find((s) => s.fieldKey === 'skills');
    expect(skills?.value).toEqual(['a', 'b', 'c']); // max 3
  });

  it('omits the hours suggestion when the roster pledges zero hours', () => {
    const r = resolveFormPrefill(LABOUR_FIELDS, 'f', ctx({
      profiles: [profile({ skills: ['Fencing'] })],
    }));
    expect(r.fromSteward.find((s) => s.fieldKey === 'hoursPerWeek')).toBeUndefined();
    expect(r.fromSteward.find((s) => s.fieldKey === 'skills')).toBeDefined();
  });

  it('returns no steward suggestions for a form without labour-shaped fields', () => {
    const r = resolveFormPrefill(MULTI_LEAF_FIELDS, 'f', ctx({
      profiles: [profile({ maintenanceHrsInitial: 20, skills: ['Fencing'] })],
    }));
    expect(r.fromSteward).toEqual([]);
  });

  it('returns no steward suggestions for an empty roster', () => {
    const r = resolveFormPrefill(LABOUR_FIELDS, 'f', ctx({ profiles: [] }));
    expect(r.fromSteward).toEqual([]);
  });
});

/* ------------------------- prior objectives ---------------------------- */

describe('resolveFormPrefill -- prior-objective branch', () => {
  const ACTIVE = 'obj-active';

  it('echoes a saved upstream answer (reverse feedsInto) into a single text leaf', () => {
    const r = resolveFormPrefill(SINGLE_LEAF_FIELDS, 'obj-active-c1', ctx({
      activeObjectiveId: ACTIVE,
      objectives: [
        objective({ id: ACTIVE, checklist: [{ id: 'obj-active-c1' }] }),
        objective({
          id: 'obj-up',
          title: 'Upstream objective',
          shortTitle: 'Upstream',
          checklist: [{ id: 'up-c1', feedsInto: [ACTIVE] }],
        }),
      ],
      savedFormText: { 'up-c1': 'A clear purpose statement.' },
    }));

    expect(r.fromPriorObjectives).toHaveLength(1);
    const s = r.fromPriorObjectives[0];
    expect(s?.fieldKey).toBe('purpose');
    expect(s?.value).toBe('A clear purpose statement.');
    expect(s?.sourceLabel).toBe('Upstream');
    expect(s?.origin).toBe('prior-objective');
  });

  it('honours prerequisiteObjectiveIds as an upstream source', () => {
    const r = resolveFormPrefill(SINGLE_LEAF_FIELDS, 'obj-active-c1', ctx({
      activeObjectiveId: ACTIVE,
      objectives: [
        objective({ id: ACTIVE, prerequisiteObjectiveIds: ['obj-prereq'], checklist: [{ id: 'obj-active-c1' }] }),
        objective({ id: 'obj-prereq', title: 'Prereq', checklist: [{ id: 'pre-c1' }] }),
      ],
      savedFormText: { 'pre-c1': 'Prereq answer' },
    }));
    expect(r.fromPriorObjectives.map((s) => s.value)).toEqual(['Prereq answer']);
  });

  it('fills a single repeatable from an upstream lone-array capture', () => {
    const savedFormData: Record<string, FormValue> = {
      'up-c1': { someList: ['10mm/hr infiltration', 'Canopy by year 2'] },
    };
    const r = resolveFormPrefill(SINGLE_REPEATABLE_FIELDS, 'obj-active-c1', ctx({
      activeObjectiveId: ACTIVE,
      objectives: [
        objective({ id: ACTIVE, checklist: [{ id: 'obj-active-c1' }] }),
        objective({ id: 'obj-up', title: 'Upstream', checklist: [{ id: 'up-c1', feedsInto: [ACTIVE] }] }),
      ],
      savedFormData,
    }));
    expect(r.fromPriorObjectives).toHaveLength(1);
    expect(r.fromPriorObjectives[0]?.fieldKey).toBe('criteria');
    expect(r.fromPriorObjectives[0]?.value).toEqual(['10mm/hr infiltration', 'Canopy by year 2']);
  });

  it('does not surface prior-objective suggestions for a multi-leaf form', () => {
    const r = resolveFormPrefill(MULTI_LEAF_FIELDS, 'obj-active-c1', ctx({
      activeObjectiveId: ACTIVE,
      objectives: [
        objective({ id: ACTIVE, checklist: [{ id: 'obj-active-c1' }] }),
        objective({ id: 'obj-up', checklist: [{ id: 'up-c1', feedsInto: [ACTIVE] }] }),
      ],
      savedFormText: { 'up-c1': 'something' },
    }));
    expect(r.fromPriorObjectives).toEqual([]);
  });

  it('returns nothing when no objective feeds into the active one', () => {
    const r = resolveFormPrefill(SINGLE_LEAF_FIELDS, 'obj-active-c1', ctx({
      activeObjectiveId: ACTIVE,
      objectives: [
        objective({ id: ACTIVE, checklist: [{ id: 'obj-active-c1' }] }),
        objective({ id: 'obj-other', checklist: [{ id: 'other-c1', feedsInto: ['someone-else'] }] }),
      ],
      savedFormText: { 'other-c1': 'unrelated' },
    }));
    expect(r.fromPriorObjectives).toEqual([]);
  });

  it('excludes the target form itself from the upstream echo', () => {
    // An upstream objective whose feeding item shares the target formId must not
    // suggest itself back into itself.
    const r = resolveFormPrefill(SINGLE_LEAF_FIELDS, 'shared-id', ctx({
      activeObjectiveId: ACTIVE,
      objectives: [
        objective({ id: ACTIVE, checklist: [{ id: 'shared-id' }] }),
        objective({ id: 'obj-up', checklist: [{ id: 'shared-id', feedsInto: [ACTIVE] }] }),
      ],
      savedFormText: { 'shared-id': 'self' },
    }));
    expect(r.fromPriorObjectives).toEqual([]);
  });
});

/* ---------------------------- public API ------------------------------- */

describe('resolveFormPrefill -- API surface', () => {
  it('returns an empty result for a fields-less (textarea) form', () => {
    const r = resolveFormPrefill(null, 'f', ctx({
      profiles: [profile({ maintenanceHrsInitial: 20 })],
    }));
    expect(r.fromSteward).toEqual([]);
    expect(r.fromPriorObjectives).toEqual([]);
  });

  it('buildPrefillMap keys non-empty results by formId and omits empties', () => {
    const tools = [
      {
        id: 'labour',
        label: 'Labour',
        icon: (() => null) as never,
        category: 'vision' as never,
        arm: { kind: 'form' as const, formId: 'hms-s1-c4', prompt: 'x', fields: LABOUR_FIELDS },
      },
      {
        id: 'food',
        label: 'Food',
        icon: (() => null) as never,
        category: 'vision' as never,
        arm: { kind: 'form' as const, formId: 'hms-s1-c2', prompt: 'y', fields: MULTI_LEAF_FIELDS },
      },
    ];
    const map = buildPrefillMap(tools, ctx({
      profiles: [profile({ maintenanceHrsInitial: 10, skills: ['Fencing'] })],
    }));
    expect(Object.keys(map)).toEqual(['hms-s1-c4']); // food form has no suggestions
    expect(map['hms-s1-c4']?.fromSteward.length).toBeGreaterThan(0);
  });
});
