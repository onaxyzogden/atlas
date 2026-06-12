import { describe, expect, it } from 'vitest';
import type { LivestockWorkRule } from '../../schemas/livestockWork/livestockWork.schema.js';
import {
  MAX_INSTANCES_PER_RULE,
  addDaysISO,
  expandRecurrence,
  seasonWindowMonths,
} from '../expandRecurrence.js';

function rule(overrides: Partial<LivestockWorkRule> = {}): LivestockWorkRule {
  return {
    key: 'lvp__husbandry__welfare-daily',
    kind: 'feed-water-check',
    title: 'Daily feed & water check',
    sourceKind: 'husbandry',
    sourceId: 'welfare-daily',
    recurrence: 'daily',
    inputsHash: 'abc12345',
    ...overrides,
  };
}

const SOUTH = { isSouthernHemisphere: true };
const NORTH = { isSouthernHemisphere: false };

describe('addDaysISO', () => {
  it('adds days across month and year boundaries (UTC)', () => {
    expect(addDaysISO('2026-06-11', 90)).toBe('2026-09-09');
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysISO('2024-02-28', 1)).toBe('2024-02-29'); // leap year
  });

  it('returns empty string on garbage input', () => {
    expect(addDaysISO('not-a-date', 5)).toBe('');
    expect(addDaysISO('', 5)).toBe('');
  });
});

describe('expandRecurrence — calendar anchoring', () => {
  it('daily emits one instance per day, inclusive of both ends', () => {
    const out = expandRecurrence(rule(), '2026-06-11', '2026-06-15', SOUTH);
    expect(out.map((i) => i.dueDate)).toEqual([
      '2026-06-11',
      '2026-06-12',
      '2026-06-13',
      '2026-06-14',
      '2026-06-15',
    ]);
  });

  it('weekly anchors to Mondays regardless of the range start', () => {
    // 2026-06-11 is a Thursday; Mondays in range: 06-15, 06-22.
    const out = expandRecurrence(
      rule({ recurrence: 'weekly' }),
      '2026-06-11',
      '2026-06-25',
      SOUTH,
    );
    expect(out.map((i) => i.dueDate)).toEqual(['2026-06-15', '2026-06-22']);
  });

  it('monthly anchors to the 1st', () => {
    const out = expandRecurrence(
      rule({ recurrence: 'monthly' }),
      '2026-06-11',
      '2026-09-09',
      SOUTH,
    );
    expect(out.map((i) => i.dueDate)).toEqual([
      '2026-07-01',
      '2026-08-01',
      '2026-09-01',
    ]);
  });

  it('quarterly anchors to Jan/Apr/Jul/Oct 1st', () => {
    const out = expandRecurrence(
      rule({ recurrence: 'quarterly' }),
      '2026-06-11',
      '2026-12-31',
      SOUTH,
    );
    expect(out.map((i) => i.dueDate)).toEqual(['2026-07-01', '2026-10-01']);
  });

  it('annual anchors to Jan 1st; biennial to even years; every-3-years to %3===0', () => {
    expect(
      expandRecurrence(rule({ recurrence: 'annual' }), '2026-06-11', '2027-02-01', SOUTH).map(
        (i) => i.dueDate,
      ),
    ).toEqual(['2027-01-01']);
    expect(
      expandRecurrence(rule({ recurrence: 'biennial' }), '2025-06-01', '2029-01-02', SOUTH).map(
        (i) => i.dueDate,
      ),
    ).toEqual(['2026-01-01', '2028-01-01']);
    expect(
      expandRecurrence(
        rule({ recurrence: 'every-3-years' }),
        '2025-06-01',
        '2031-01-02',
        SOUTH,
      ).map((i) => i.dueDate),
    ).toEqual(['2028-01-01', '2031-01-01']); // years divisible by 3
  });

  it('keys are stable when the rolling horizon advances a day (regeneration)', () => {
    const today = expandRecurrence(rule(), '2026-06-11', '2026-06-20', SOUTH);
    const tomorrow = expandRecurrence(rule(), '2026-06-12', '2026-06-21', SOUTH);
    const todayKeys = new Set(today.map((i) => i.key));
    const overlap = tomorrow.filter((i) => i.dueDate <= '2026-06-20');
    // Every overlapping date re-emits the SAME key.
    for (const inst of overlap) expect(todayKeys.has(inst.key)).toBe(true);
  });

  it('is deterministic: identical inputs produce identical output', () => {
    const a = expandRecurrence(rule({ recurrence: 'weekly' }), '2026-01-01', '2026-12-31', SOUTH);
    const b = expandRecurrence(rule({ recurrence: 'weekly' }), '2026-01-01', '2026-12-31', SOUTH);
    expect(a).toEqual(b);
  });
});

describe('expandRecurrence — bounds and caps', () => {
  it('returns [] on invalid or inverted ranges', () => {
    expect(expandRecurrence(rule(), 'garbage', '2026-06-15', SOUTH)).toEqual([]);
    expect(expandRecurrence(rule(), '2026-06-15', 'garbage', SOUTH)).toEqual([]);
    expect(expandRecurrence(rule(), '2026-06-15', '2026-06-11', SOUTH)).toEqual([]);
  });

  it('caps a runaway range at MAX_INSTANCES_PER_RULE', () => {
    const out = expandRecurrence(rule(), '2020-01-01', '2030-01-01', SOUTH);
    expect(out).toHaveLength(MAX_INSTANCES_PER_RULE);
  });

  it('denormalises rule display fields onto each instance', () => {
    const out = expandRecurrence(
      rule({
        detail: 'Check troughs',
        scopeNotes: 'VERBATIM caution',
        suggestedCarer: 'Yousef',
        species: 'sheep',
        sourceProtocolId: 'lvo-water-access',
        sourceObjectiveId: 'silv-sec-s4-husbandry-framework',
      }),
      '2026-06-11',
      '2026-06-11',
      SOUTH,
    );
    expect(out).toHaveLength(1);
    const inst = out[0]!;
    expect(inst.key).toBe('lvp__husbandry__welfare-daily__2026-06-11');
    expect(inst.detail).toBe('Check troughs');
    expect(inst.scopeNotes).toBe('VERBATIM caution');
    expect(inst.suggestedCarer).toBe('Yousef');
    expect(inst.species).toBe('sheep');
    expect(inst.sourceProtocolId).toBe('lvo-water-access');
    expect(inst.sourceObjectiveId).toBe('silv-sec-s4-husbandry-framework');
    expect(inst.inputsHash).toBe('abc12345');
  });
});

describe('expandRecurrence — seasonal windows + hemisphere', () => {
  const seasonal = rule({
    key: 'lvp__husbandry__breeding',
    kind: 'breeding-event',
    recurrence: 'annual',
    seasonalWindow: { season: 'autumn' },
  });

  it('resolves southern autumn to Apr-Jun (matches the grazing capture badges)', () => {
    expect(seasonWindowMonths('autumn', true)).toEqual({ startMonth: 4, endMonth: 6 });
    expect(seasonWindowMonths('winter', true)).toEqual({ startMonth: 7, endMonth: 9 });
    expect(seasonWindowMonths('spring', true)).toEqual({ startMonth: 10, endMonth: 12 });
    expect(seasonWindowMonths('summer', true)).toEqual({ startMonth: 1, endMonth: 3 });
  });

  it('resolves northern seasons six months shifted', () => {
    expect(seasonWindowMonths('autumn', false)).toEqual({ startMonth: 10, endMonth: 12 });
    expect(seasonWindowMonths('winter', false)).toEqual({ startMonth: 1, endMonth: 3 });
  });

  it('emits one instance per overlapping window, due on the window start', () => {
    // Southern autumn window 2027: Apr 1 - Jun 30. Horizon ends inside it.
    const out = expandRecurrence(seasonal, '2027-03-01', '2027-05-30', SOUTH);
    expect(out).toHaveLength(1);
    expect(out[0]!.dueDate).toBe('2027-04-01');
    expect(out[0]!.windowEnd).toBe('2027-06-30');
    expect(out[0]!.key).toBe('lvp__husbandry__breeding__2027-04-01');
  });

  it('keeps a past-dated stable key when the window is already underway', () => {
    // Range starts mid-window (May): the instance still surfaces with the
    // Apr 1 key rather than re-keying to the range start.
    const out = expandRecurrence(seasonal, '2027-05-15', '2027-08-01', SOUTH);
    expect(out.map((i) => i.dueDate)).toContain('2027-04-01');
  });

  it('skips windows entirely outside the range', () => {
    // Southern autumn = Apr-Jun; an Aug-Oct range has no autumn overlap.
    const out = expandRecurrence(seasonal, '2027-08-01', '2027-10-31', SOUTH);
    expect(out).toEqual([]);
  });

  it('flips the same rule to Oct-Dec on a northern site (hemisphere-neutral storage)', () => {
    const out = expandRecurrence(seasonal, '2027-09-01', '2027-12-31', NORTH);
    expect(out).toHaveLength(1);
    expect(out[0]!.dueDate).toBe('2027-10-01');
    expect(out[0]!.windowEnd).toBe('2027-12-31');
  });

  it('handles the summer window year-rollover (southern Jan-Mar)', () => {
    const out = expandRecurrence(
      rule({
        key: 'lvp__grazing__grazeRest-summer',
        kind: 'graze-rest-review',
        recurrence: 'annual',
        seasonalWindow: { season: 'summer' },
      }),
      '2026-12-01',
      '2027-02-28',
      SOUTH,
    );
    expect(out.map((i) => i.dueDate)).toEqual(['2027-01-01']);
    expect(out[0]!.windowEnd).toBe('2027-03-31');
  });
});
