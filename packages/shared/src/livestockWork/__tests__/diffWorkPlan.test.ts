import { describe, expect, it } from 'vitest';
import type { LivestockWorkInstance } from '../../schemas/livestockWork/livestockWork.schema.js';
import { diffWorkPlan, type WorkPlanEntry } from '../diffWorkPlan.js';

function instance(key: string, inputsHash = 'hash0001'): LivestockWorkInstance {
  return {
    key,
    ruleKey: key.slice(0, key.lastIndexOf('__')),
    dueDate: key.slice(key.lastIndexOf('__') + 2),
    kind: 'welfare-check',
    title: 'Weekly welfare & condition check',
    sourceKind: 'husbandry',
    inputsHash,
  };
}

function entry(
  key: string,
  status: WorkPlanEntry['status'],
  inputsHash = 'hash0001',
): WorkPlanEntry {
  return { key, status, inputsHash };
}

const K1 = 'lvp__husbandry__welfare-weekly__2026-06-15';
const K2 = 'lvp__husbandry__welfare-weekly__2026-06-22';

describe('diffWorkPlan — the eight transition rows', () => {
  it('row 1: new key → insert as proposed', () => {
    const diff = diffWorkPlan([], [instance(K1)]);
    expect(diff.insert.map((i) => i.key)).toEqual([K1]);
    expect(diff.overwrite).toEqual([]);
    expect(diff.remove).toEqual([]);
    expect(diff.needsReview).toEqual([]);
  });

  it('row 2: proposed + present → overwrite (changed or not — idempotent)', () => {
    const unchanged = diffWorkPlan([entry(K1, 'proposed')], [instance(K1)]);
    expect(unchanged.overwrite.map((i) => i.key)).toEqual([K1]);
    expect(unchanged.insert).toEqual([]);

    const changed = diffWorkPlan(
      [entry(K1, 'proposed', 'oldhash1')],
      [instance(K1, 'newhash1')],
    );
    expect(changed.overwrite.map((i) => i.inputsHash)).toEqual(['newhash1']);
  });

  it('row 3: proposed + absent → remove', () => {
    const diff = diffWorkPlan([entry(K1, 'proposed')], []);
    expect(diff.remove).toEqual([K1]);
    expect(diff.needsReview).toEqual([]);
  });

  it('row 4: dismissed + present → stays dismissed, NEVER resurrected', () => {
    const diff = diffWorkPlan([entry(K1, 'dismissed')], [instance(K1)]);
    expect(diff.keepDismissed).toEqual([K1]);
    expect(diff.insert).toEqual([]);
    expect(diff.overwrite).toEqual([]);
  });

  it('row 5: dismissed + absent → remove (window passed, key retires)', () => {
    const diff = diffWorkPlan([entry(K1, 'dismissed')], []);
    expect(diff.remove).toEqual([K1]);
  });

  it('row 6: confirmed + unchanged hash → untouched', () => {
    const diff = diffWorkPlan([entry(K1, 'confirmed')], [instance(K1)]);
    expect(diff.untouchedConfirmed).toEqual([K1]);
    expect(diff.overwrite).toEqual([]);
    expect(diff.needsReview).toEqual([]);
  });

  it('row 7: confirmed + changed hash → needsReview "changed" with the regenerated instance', () => {
    const diff = diffWorkPlan(
      [entry(K1, 'confirmed', 'oldhash1')],
      [instance(K1, 'newhash1')],
    );
    expect(diff.needsReview).toHaveLength(1);
    expect(diff.needsReview[0]).toMatchObject({ key: K1, reason: 'changed' });
    expect(diff.needsReview[0]!.next?.inputsHash).toBe('newhash1');
    expect(diff.overwrite).toEqual([]); // confirmed is NEVER auto-overwritten
  });

  it('row 8: confirmed + absent → needsReview "orphaned"', () => {
    const diff = diffWorkPlan([entry(K1, 'confirmed')], []);
    expect(diff.needsReview).toEqual([{ key: K1, reason: 'orphaned' }]);
    expect(diff.remove).toEqual([]); // never silently deleted
  });
});

describe('diffWorkPlan — composition', () => {
  it('classifies a mixed prior state in one pass', () => {
    const diff = diffWorkPlan(
      [
        entry(K1, 'dismissed'),
        entry(K2, 'confirmed'),
        entry('lvp__husbandry__records__2026-07-01', 'proposed'),
      ],
      [instance(K1), instance(K2), instance('lvp__grazing__contingency__2026-07-01')],
    );
    expect(diff.keepDismissed).toEqual([K1]);
    expect(diff.untouchedConfirmed).toEqual([K2]);
    expect(diff.remove).toEqual(['lvp__husbandry__records__2026-07-01']);
    expect(diff.insert.map((i) => i.key)).toEqual([
      'lvp__grazing__contingency__2026-07-01',
    ]);
  });

  it('is idempotent: applying the same generation twice yields the same classification', () => {
    const next = [instance(K1), instance(K2)];
    const first = diffWorkPlan([], next);
    // Simulate the store applying the diff: all inserts become proposed.
    const after: WorkPlanEntry[] = first.insert.map((i) =>
      entry(i.key, 'proposed', i.inputsHash),
    );
    const second = diffWorkPlan(after, next);
    expect(second.insert).toEqual([]);
    expect(second.overwrite.map((i) => i.key).sort()).toEqual([K1, K2].sort());
    expect(second.remove).toEqual([]);
    expect(second.needsReview).toEqual([]);
  });
});
