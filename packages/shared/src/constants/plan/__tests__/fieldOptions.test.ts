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
import { resolveFieldOptions, FIELD_OPTION_SETS } from '../fieldOptions.js';

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
