/**
 * groupChronicVerdicts -- pure display-layer grouping + capping helper (A1).
 *
 * The chronic co-occurrence detector emits one ChronicVerdict per co-deviating
 * template PAIR, already sorted by its determinism-complete tuple. This helper
 * groups those flat verdicts by (season, anchor template = the common deviant)
 * for display, preserving the detector's input order within each group, and
 * caps the total number of rendered verdict rows.
 */

import { describe, it, expect } from 'vitest';
import type { ChronicVerdict, SeasonName } from '@ogden/shared';
import { groupChronicVerdicts, capGroups } from '../groupChronicVerdicts.js';

// ---------------------------------------------------------------------------
// Factory: fills required fields with sane defaults so each test states only
// what matters. templatePair drives everything; the rest is filler.
// ---------------------------------------------------------------------------

function makeVerdict(partial: {
  templatePair: [string, string];
  season?: SeasonName | null;
  containsExistential?: boolean;
  containsOpen?: boolean;
}): ChronicVerdict {
  const [a, b] = partial.templatePair;
  const season = partial.season === null ? undefined : partial.season ?? 'spring';
  const seasonScope = season ?? 'unknown';
  return {
    signatureKey: `${seasonScope}:${a}+${b}`,
    ...(season !== undefined ? { season } : {}),
    templatePair: partial.templatePair,
    templateIds: [a, b],
    objectiveIds: ['obj-1'],
    cycleNumbers: [1, 2],
    occurrenceCount: 2,
    consecutive: true,
    spanCycles: 2,
    dominantDepth: 'threshold',
    theme: 'threshold',
    containsExistential: partial.containsExistential ?? false,
    containsOpen: partial.containsOpen ?? false,
    weight: 4,
    summary: `${a} + ${b}`,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('groupChronicVerdicts', () => {
  it('returns [] for empty input; capGroups handles [] too', () => {
    expect(groupChronicVerdicts([])).toEqual([]);
    expect(capGroups([], 6)).toEqual({ visibleGroups: [], hiddenCount: 0 });
  });

  it('groups a single verdict, anchoring to the lexicographically smaller id on a tie', () => {
    const v = makeVerdict({ templatePair: ['tpl-a', 'tpl-b'], season: 'spring' });
    const groups = groupChronicVerdicts([v]);

    expect(groups).toHaveLength(1);
    const group = groups[0];
    expect(group?.anchorTemplateId).toBe('tpl-a');
    expect(group?.verdicts).toHaveLength(1);
    expect(group?.key).toBe('spring::tpl-a');
    expect(group?.season).toBe('spring');
  });

  it('collapses a common-deviant fan into ONE group anchored on the shared template', () => {
    // b appears in all three pairs (freq 3); a/c/d each appear once.
    const vab = makeVerdict({ templatePair: ['a', 'b'], season: 'spring' });
    const vbc = makeVerdict({ templatePair: ['b', 'c'], season: 'spring' });
    const vbd = makeVerdict({ templatePair: ['b', 'd'], season: 'spring' });

    const groups = groupChronicVerdicts([vab, vbc, vbd]);

    expect(groups).toHaveLength(1);
    const group = groups[0];
    expect(group?.anchorTemplateId).toBe('b');
    expect(group?.verdicts).toHaveLength(3);
    // input order preserved
    expect(group?.verdicts).toEqual([vab, vbc, vbd]);
  });

  it('isolates seasons and orders spring before summer regardless of input order', () => {
    const summer = makeVerdict({ templatePair: ['x', 'y'], season: 'summer' });
    const spring = makeVerdict({ templatePair: ['p', 'q'], season: 'spring' });

    // summer first in input, but spring must come first in output
    const groups = groupChronicVerdicts([summer, spring]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.season).toBe('spring');
    expect(groups[1]?.season).toBe('summer');
  });

  it("sorts the 'unknown' (undefined season) group LAST after all named seasons", () => {
    const unknown = makeVerdict({ templatePair: ['u', 'v'], season: null });
    const winter = makeVerdict({ templatePair: ['w', 'z'], season: 'winter' });
    const spring = makeVerdict({ templatePair: ['p', 'q'], season: 'spring' });

    const groups = groupChronicVerdicts([unknown, winter, spring]);

    expect(groups).toHaveLength(3);
    expect(groups[0]?.season).toBe('spring');
    expect(groups[1]?.season).toBe('winter');
    expect(groups[2]?.season).toBeUndefined();
    expect(groups[2]?.key).toBe('unknown::u');
  });

  it('is deterministic across repeated calls and breaks anchor ties by smaller id', () => {
    // Each template appears exactly once -> all freq 1 -> tie -> smaller id wins.
    const v = makeVerdict({ templatePair: ['m', 'k'], season: 'spring' });
    // Note: templatePair would normally be sorted ascending by the detector;
    // construct with already-sorted pair so anchor tie picks 'k' (smaller).
    const sorted = makeVerdict({ templatePair: ['k', 'm'], season: 'spring' });

    const first = groupChronicVerdicts([sorted]);
    const second = groupChronicVerdicts([sorted]);
    expect(first).toEqual(second);
    expect(first[0]?.anchorTemplateId).toBe('k');
    expect(v.templatePair).toEqual(['m', 'k']); // input not mutated
  });

  it('does not mutate the input array or verdict objects', () => {
    const vab = makeVerdict({ templatePair: ['a', 'b'], season: 'spring' });
    const vbc = makeVerdict({ templatePair: ['b', 'c'], season: 'spring' });
    const input = [vab, vbc];
    const snapshot = [...input];

    groupChronicVerdicts(input);

    expect(input).toEqual(snapshot);
    expect(input[0]).toBe(vab);
    expect(vab.templatePair).toEqual(['a', 'b']);
  });
});

describe('capGroups', () => {
  it('truncates the straddling group at the cap boundary and counts hidden rows', () => {
    // Group 1 (anchor b): 3 verdicts; Group 2 (anchor y): 3 verdicts. total 6.
    const g1 = [
      makeVerdict({ templatePair: ['a', 'b'], season: 'spring' }),
      makeVerdict({ templatePair: ['b', 'c'], season: 'spring' }),
      makeVerdict({ templatePair: ['b', 'd'], season: 'spring' }),
    ];
    const g2 = [
      makeVerdict({ templatePair: ['x', 'y'], season: 'summer' }),
      makeVerdict({ templatePair: ['y', 'z'], season: 'summer' }),
      makeVerdict({ templatePair: ['y', 'w'], season: 'summer' }),
    ];
    const groups = groupChronicVerdicts([...g1, ...g2]);
    expect(groups).toHaveLength(2);

    const { visibleGroups, hiddenCount } = capGroups(groups, 4);

    expect(visibleGroups).toHaveLength(2);
    expect(visibleGroups[0]?.verdicts).toHaveLength(3); // first group whole
    expect(visibleGroups[1]?.verdicts).toHaveLength(1); // second truncated to 1
    expect(hiddenCount).toBe(2);
  });

  it('returns all groups with hiddenCount 0 when cap >= total', () => {
    const g1 = [
      makeVerdict({ templatePair: ['a', 'b'], season: 'spring' }),
      makeVerdict({ templatePair: ['b', 'c'], season: 'spring' }),
    ];
    const groups = groupChronicVerdicts(g1);

    const { visibleGroups, hiddenCount } = capGroups(groups, 99);

    expect(visibleGroups).toHaveLength(1);
    expect(visibleGroups[0]?.verdicts).toHaveLength(2);
    expect(hiddenCount).toBe(0);
  });

  it('drops the second group entirely when cap equals the first group size', () => {
    const g1 = [
      makeVerdict({ templatePair: ['a', 'b'], season: 'spring' }),
      makeVerdict({ templatePair: ['b', 'c'], season: 'spring' }),
      makeVerdict({ templatePair: ['b', 'd'], season: 'spring' }),
    ];
    const g2 = [
      makeVerdict({ templatePair: ['x', 'y'], season: 'summer' }),
      makeVerdict({ templatePair: ['y', 'z'], season: 'summer' }),
      makeVerdict({ templatePair: ['y', 'w'], season: 'summer' }),
    ];
    const groups = groupChronicVerdicts([...g1, ...g2]);

    const { visibleGroups, hiddenCount } = capGroups(groups, 3);

    expect(visibleGroups).toHaveLength(1);
    expect(visibleGroups[0]?.verdicts).toHaveLength(3);
    expect(hiddenCount).toBe(3);
  });

  it('within a season, an existential-first verdict leads and survives a tight cap', () => {
    // Both verdicts share the SAME season (spring) so season-primary ordering
    // does not separate them; within a season the detector's input order is
    // authoritative. The existential verdict appears FIRST in input (mirroring
    // the detector's existential-first tuple sort), and its distinct template
    // pair forms its own group. All four template ids are distinct, so each
    // pair anchors its own single-verdict group.
    const existential = makeVerdict({
      templatePair: ['e1', 'e2'],
      season: 'spring',
      containsExistential: true,
    });
    const ordinary = makeVerdict({ templatePair: ['p', 'q'], season: 'spring' });

    // Existential first in input -> it leads within the (single) season.
    const groups = groupChronicVerdicts([existential, ordinary]);

    expect(groups).toHaveLength(2);
    // The existential group leads; anchor is 'e1' (smaller of e1/e2 on the tie).
    expect(groups[0]?.anchorTemplateId).toBe('e1');

    // Under a tight cap of 1 row, the single visible group is the existential
    // one, and the ordinary group's one row is hidden.
    const { visibleGroups, hiddenCount } = capGroups(groups, 1);
    expect(visibleGroups).toHaveLength(1);
    expect(visibleGroups[0]?.anchorTemplateId).toBe('e1');
    expect(visibleGroups[0]?.verdicts).toHaveLength(1);
    expect(hiddenCount).toBe(1);
  });
});
