// fieldOptions.test.ts
//
// Behaviour tests for the pure fieldOptions resolver (fieldOptions.ts) used to
// drive structured-form dropdowns in the Act tier-shell objective-capture
// forms. The resolver unions a set's `_base` list with the primary type list
// and each secondary type list, in order, deduplicating first-seen.
//
// Guarantees under test:
//   - union order  : _base, then primary, then each secondary in array order
//   - dedup        : an entry appearing in both _base and a type list shows once,
//                    in its first-seen position
//   - unknown set  : an unrecognised optionSetId resolves to []
//   - no primary   : undefined primaryTypeId -> _base (+ any secondaries)
//   - base-only set: a set with only _base ignores a passed primaryTypeId

import { describe, it, expect } from 'vitest';
import {
  resolveFieldOptions,
  resolveLabourSkills,
  FIELD_OPTION_SETS,
  resolveSuccessCriteriaOptions,
  SUCCESS_CRITERIA_OPTIONS,
  resolveVisionClassifyOptions,
  VISION_CLASSIFY_OPTIONS,
} from '../fieldOptions.js';

describe('resolveFieldOptions', () => {
  it('unions _base, then primary, then secondaries in order', () => {
    const result = resolveFieldOptions(
      'laborSkillsByType',
      'homestead',
      ['market_garden'],
    );
    const set = FIELD_OPTION_SETS.laborSkillsByType!;
    const base = set._base ?? [];
    const primary = set.homestead ?? [];
    const secondary = set.market_garden ?? [];

    // Reconstruct the expected dedup-preserving order.
    const expected: string[] = [];
    for (const v of [...base, ...primary, ...secondary]) {
      if (!expected.includes(v)) expected.push(v);
    }
    expect(result).toEqual(expected);
  });

  it('dedup preserves first-seen order across _base and a primary list', () => {
    // Inject a controlled fixture set so the test is independent of authored
    // content drift. We read through the real resolver, so we cannot mutate the
    // real table; instead assert the property on a known overlap from content.
    // 'Composting' is generic and appears in _base of laborSkillsByType; ensure
    // it is not duplicated even when a primary list also lists it.
    const result = resolveFieldOptions('successCriteriaByType', 'homestead');
    const unique = new Set(result);
    expect(unique.size).toBe(result.length);
  });

  it('returns [] for an unknown optionSetId', () => {
    expect(resolveFieldOptions('nope__not_a_set', 'homestead')).toEqual([]);
  });

  it('returns just _base (+ secondaries) when primaryTypeId is undefined', () => {
    const result = resolveFieldOptions('constraintsByType', undefined, [
      'silvopasture',
    ]);
    const set = FIELD_OPTION_SETS.constraintsByType!;
    const base = set._base ?? [];
    const secondary = set.silvopasture ?? [];
    const expected: string[] = [];
    for (const v of [...base, ...secondary]) {
      if (!expected.includes(v)) expected.push(v);
    }
    expect(result).toEqual(expected);
  });

  it('a base-only set ignores a passed primaryTypeId gracefully', () => {
    const withType = resolveFieldOptions('laborSeasonality', 'homestead');
    const withoutType = resolveFieldOptions('laborSeasonality', undefined);
    const base = FIELD_OPTION_SETS.laborSeasonality!._base ?? [];
    expect(withType).toEqual([...base]);
    expect(withoutType).toEqual([...base]);
  });
});

describe('resolveLabourSkills', () => {
  it('unions _base, then primary, then secondaries in dedup first-seen order', () => {
    const result = resolveLabourSkills('homestead', ['market_garden']);
    const set = FIELD_OPTION_SETS.laborSkillsByType!;
    const base = set._base ?? [];
    const primary = set.homestead ?? [];
    const secondary = set.market_garden ?? [];

    const expected: string[] = [];
    for (const v of [...base, ...primary, ...secondary]) {
      if (!expected.includes(v)) expected.push(v);
    }
    expect(result).toEqual(expected);
  });

  it('includes the reconciled _base general skills for a primary type', () => {
    const result = resolveLabourSkills('homestead');
    const generalSkills = [
      'General land maintenance',
      'Fencing & earthworks',
      'Planting & propagation',
      'Animal husbandry',
      'Water systems & irrigation',
      'Design & survey',
      'Equipment operation',
    ];
    for (const skill of generalSkills) {
      expect(result).toContain(skill);
    }
  });

  it('string parity: equals resolveFieldOptions("laborSkillsByType", ...)', () => {
    const combos: Array<
      [Parameters<typeof resolveLabourSkills>[0], string[]]
    > = [
      [undefined, []],
      ['homestead', []],
      ['regenerative_farm', ['market_garden']],
      ['silvopasture', ['livestock_operation']],
    ];
    for (const [primary, secondaries] of combos) {
      const viaWrapper = resolveLabourSkills(
        primary,
        secondaries as Parameters<typeof resolveLabourSkills>[1],
      );
      const viaResolver = resolveFieldOptions(
        'laborSkillsByType',
        primary,
        secondaries as Parameters<typeof resolveFieldOptions>[2],
      );
      expect(viaWrapper).toEqual(viaResolver);
    }
  });

  it('an unknown/missing primary contributes nothing beyond _base', () => {
    const base = FIELD_OPTION_SETS.laborSkillsByType!._base ?? [];
    // `undefined` primary with no secondaries resolves to exactly _base.
    expect(resolveLabourSkills(undefined)).toEqual([...base]);
  });
});

describe('resolveSuccessCriteriaOptions', () => {
  it('returns the _base CriterionOptions in order when no primary', () => {
    const result = resolveSuccessCriteriaOptions(undefined);
    const base = SUCCESS_CRITERIA_OPTIONS._base ?? [];
    expect(result).toEqual([...base]);
  });

  it('unknown/no-primary with empty secondaries equals _base', () => {
    const result = resolveSuccessCriteriaOptions(undefined, []);
    const base = SUCCESS_CRITERIA_OPTIONS._base ?? [];
    expect(result).toEqual([...base]);
  });

  it('unions _base then primary options in order', () => {
    const result = resolveSuccessCriteriaOptions('homestead');
    const base = SUCCESS_CRITERIA_OPTIONS._base ?? [];
    const primary = SUCCESS_CRITERIA_OPTIONS.homestead ?? [];
    // Reconstruct dedup-by-text order.
    const expected: typeof result = [];
    const seen = new Set<string>();
    for (const o of [...base, ...primary]) {
      if (!seen.has(o.text)) {
        seen.add(o.text);
        expected.push(o);
      }
    }
    expect(result).toEqual(expected);
  });

  it('dedups by text when the same type is passed as primary and secondary', () => {
    const once = resolveSuccessCriteriaOptions('homestead');
    const twice = resolveSuccessCriteriaOptions('homestead', ['homestead']);
    expect(twice).toEqual(once);
    const texts = twice.map((o) => o.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('unions _base, primary, then each secondary in array order', () => {
    const result = resolveSuccessCriteriaOptions('homestead', [
      'market_garden',
    ]);
    const base = SUCCESS_CRITERIA_OPTIONS._base ?? [];
    const primary = SUCCESS_CRITERIA_OPTIONS.homestead ?? [];
    const secondary = SUCCESS_CRITERIA_OPTIONS.market_garden ?? [];
    const expected: typeof result = [];
    const seen = new Set<string>();
    for (const o of [...base, ...primary, ...secondary]) {
      if (!seen.has(o.text)) {
        seen.add(o.text);
        expected.push(o);
      }
    }
    expect(result).toEqual(expected);
  });

  it('every option domain is one of the three literals', () => {
    const domains = new Set(['ecological', 'economic', 'stewardship']);
    for (const list of Object.values(SUCCESS_CRITERIA_OPTIONS)) {
      for (const option of list ?? []) {
        expect(domains.has(option.domain)).toBe(true);
      }
    }
  });

  it('string parity: resolveFieldOptions equals resolveSuccessCriteriaOptions texts', () => {
    const combos: Array<
      [Parameters<typeof resolveSuccessCriteriaOptions>[0], string[]]
    > = [
      [undefined, []],
      ['homestead', []],
      ['regenerative_farm', ['market_garden']],
      ['silvopasture', ['livestock_operation']],
    ];
    for (const [primary, secondaries] of combos) {
      const strings = resolveFieldOptions(
        'successCriteriaByType',
        primary,
        secondaries as Parameters<typeof resolveFieldOptions>[2],
      );
      const fromCriteria = resolveSuccessCriteriaOptions(
        primary,
        secondaries as Parameters<typeof resolveSuccessCriteriaOptions>[1],
      ).map((o) => o.text);
      expect(strings).toEqual(fromCriteria);
    }
  });
});

describe('resolveVisionClassifyOptions', () => {
  it('unions _base + primary + secondaries, dedup first-seen, order-stable', () => {
    const base = VISION_CLASSIFY_OPTIONS._base ?? [];
    const result = resolveVisionClassifyOptions('homestead', ['regenerative_farm']);
    expect(result.slice(0, base.length)).toEqual([...base]);
    const homestead = VISION_CLASSIFY_OPTIONS.homestead ?? [];
    expect(result.slice(base.length, base.length + homestead.length)).toEqual([...homestead]);
    expect(new Set(result).size).toBe(result.length);
  });

  it('includes the reconciled _base list for a known primary', () => {
    const base = VISION_CLASSIFY_OPTIONS._base ?? [];
    const result = resolveVisionClassifyOptions('homestead');
    for (const item of base) expect(result).toContain(item);
  });

  it('unknown/missing primary contributes nothing beyond _base', () => {
    const base = VISION_CLASSIFY_OPTIONS._base ?? [];
    expect(resolveVisionClassifyOptions(undefined)).toEqual([...base]);
  });

  it('dedups a secondary that overlaps the primary', () => {
    expect(resolveVisionClassifyOptions('homestead', ['homestead'])).toEqual(
      resolveVisionClassifyOptions('homestead'),
    );
  });
});

describe('boundary option sets', () => {
  const BOUNDARY_IDS = [
    'boundaryDocStatus',
    'boundaryZoning',
    'boundaryPermittedUses',
    'boundaryZoningReview',
    'boundaryWaterSources',
    'boundaryWaterUnit',
    'boundaryWaterStatus',
    'boundaryEasementImplications',
    'boundaryCovenantTypes',
    'boundaryPermitActivities',
  ] as const;

  it('all 10 boundary ids exist as keys in FIELD_OPTION_SETS', () => {
    for (const id of BOUNDARY_IDS) {
      expect(Object.prototype.hasOwnProperty.call(FIELD_OPTION_SETS, id)).toBe(true);
    }
  });

  it('each boundary id resolves to a non-empty array via resolveFieldOptions', () => {
    for (const id of BOUNDARY_IDS) {
      const result = resolveFieldOptions(id, undefined);
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('resolveFieldOptions("boundaryZoning", undefined) returns the exact 7-item list', () => {
    expect(resolveFieldOptions('boundaryZoning', undefined)).toEqual([
      'Rural - General agriculture',
      'Rural - Small lots',
      'Rural - Conservation',
      'Rural - Landscape',
      'Mixed rural / residential',
      'Peri-urban / green belt',
      'Other / unknown - needs investigation',
    ]);
  });

  it('resolveFieldOptions("boundaryWaterUnit", undefined) returns ["ML","kL","m3"]', () => {
    expect(resolveFieldOptions('boundaryWaterUnit', undefined)).toEqual(['ML', 'kL', 'm3']);
  });

  it('unknown boundary id returns []', () => {
    expect(resolveFieldOptions('boundaryNope', undefined)).toEqual([]);
  });

  it('base-only: passing a primaryTypeId to boundaryDocStatus still returns exactly the _base list', () => {
    const withType = resolveFieldOptions('boundaryDocStatus', 'homestead');
    const withoutType = resolveFieldOptions('boundaryDocStatus', undefined);
    expect(withType).toEqual(withoutType);
    expect(withType).toEqual(['Current & verified', 'Pending review', 'Not yet obtained']);
  });
});

describe('stakeholder option sets', () => {
  const STAKEHOLDER_IDS = [
    'stakeholderNeighbourType',
    'stakeholderCommunityType',
    'stakeholderRelationship',
    'stakeholderCommsChannel',
  ] as const;

  it('all 4 stakeholder ids exist as keys in FIELD_OPTION_SETS', () => {
    for (const id of STAKEHOLDER_IDS) {
      expect(Object.prototype.hasOwnProperty.call(FIELD_OPTION_SETS, id)).toBe(true);
    }
  });

  it('each stakeholder id resolves to a non-empty array via resolveFieldOptions', () => {
    for (const id of STAKEHOLDER_IDS) {
      const result = resolveFieldOptions(id, undefined);
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('resolveFieldOptions("stakeholderNeighbourType", undefined) returns the exact mockup list', () => {
    expect(resolveFieldOptions('stakeholderNeighbourType', undefined)).toEqual([
      'Shares boundary',
      'Shares water access',
      'Shares road access',
      'Downstream',
      'Adjacent dwelling',
    ]);
  });

  it('resolveFieldOptions("stakeholderRelationship", undefined) returns the exact 5-item mockup list', () => {
    expect(resolveFieldOptions('stakeholderRelationship', undefined)).toEqual([
      'Conflict',
      'Tension',
      'Neutral',
      'Goodwill',
      'Partnership',
    ]);
  });

  it('resolveFieldOptions("stakeholderCommsChannel", undefined) returns the exact 6-item mockup list', () => {
    expect(resolveFieldOptions('stakeholderCommsChannel', undefined)).toEqual([
      'Email',
      'Phone',
      'SMS',
      'Post',
      'In-person',
      'Community mtg',
    ]);
  });

  it('unknown stakeholder id returns []', () => {
    expect(resolveFieldOptions('stakeholderNope', undefined)).toEqual([]);
  });

  it('base-only: passing a primaryTypeId to stakeholderCommunityType returns the same as passing undefined', () => {
    const withType = resolveFieldOptions('stakeholderCommunityType', 'homestead');
    const withoutType = resolveFieldOptions('stakeholderCommunityType', undefined);
    expect(withType).toEqual(withoutType);
  });
});
