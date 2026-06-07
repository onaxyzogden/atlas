// chronicDetection.test.ts
//
// Specs for the pure chronic structural-verdict detector (T3): unions live
// co-occurrence clusters (present) with the historical closure ledger (past)
// to surface protocol pairs co-deviating in the same season across >= 2 cycles.

import { describe, it, expect } from 'vitest';
import type { SeasonName } from '../../../schemas/protocol/protocol.schema.js';
import type { FlagDepth } from '../../../schemas/protocol/reviewFlag.schema.js';
import type { ObservationLogRecord } from '../../../schemas/protocol/observationLogRecord.schema.js';
import type { CoOccurrenceCluster } from '../coOccurrence.js';
import { DEPTH_THEME } from '../coOccurrence.js';
import { temporalBucketKey } from '../deviationPolicy.js';
import {
  detectChronicVerdicts,
  CHRONIC_RECURRENCE_THRESHOLD,
} from '../chronicDetection.js';

const IHSAN_PREFIX =
  'Animal welfare implicated (ihsan): a carrying-capacity assumption ' +
  'may have cost stock. ';

// ---------------------------------------------------------------------------
// Fixture factories.
// ---------------------------------------------------------------------------

let seq = 0;

interface BucketOpts {
  templates: string[];
  cycleNumber?: number;
  season?: SeasonName | undefined;
  objectiveIds?: string[];
  depth?: FlagDepth;
  existential?: boolean;
}

/**
 * Build one ledger record per (template) for a season:cycle bucket. Each record
 * shares the bucketKey so the detector groups them as one historical bucket.
 */
function makeRecords(opts: BucketOpts): ObservationLogRecord[] {
  const {
    templates,
    cycleNumber,
    objectiveIds,
    depth = 'threshold',
    existential = false,
  } = opts;
  const season: SeasonName | undefined =
    'season' in opts ? opts.season : 'spring';
  return templates.map((sourceTemplateId, idx) => {
    seq += 1;
    const objectiveId = objectiveIds?.[idx] ?? objectiveIds?.[0] ?? 'obj-a';
    return {
      id: `rec-${seq}`,
      projectId: 'proj-1',
      flagId: `flag-${seq}`,
      sourceTemplateId,
      objectiveId,
      bucketKey: temporalBucketKey(season, cycleNumber),
      ...(season !== undefined ? { season } : {}),
      ...(cycleNumber !== undefined ? { cycleNumber } : {}),
      depth,
      deviationSign: existential ? 'existential' : 'over',
      raisedAt: '2026-06-01T00:00:00.000Z',
      closedAt: '2026-06-02T00:00:00.000Z',
      closeKind: 'resolved',
    } satisfies ObservationLogRecord;
  });
}

/** Build a live CoOccurrenceCluster fixture. */
function makeCluster(opts: BucketOpts): CoOccurrenceCluster {
  const {
    templates,
    cycleNumber,
    objectiveIds = ['obj-a'],
    depth = 'threshold',
    existential = false,
  } = opts;
  const season: SeasonName | undefined =
    'season' in opts ? opts.season : 'spring';
  return {
    bucketKey: temporalBucketKey(season, cycleNumber),
    ...(season !== undefined ? { season } : {}),
    ...(cycleNumber !== undefined ? { cycleNumber } : {}),
    templateIds: [...templates],
    objectiveIds: [...objectiveIds],
    flagIds: templates.map((_, idx) => `cflag-${idx}`),
    dominantDepth: depth,
    theme: DEPTH_THEME[depth],
    containsExistential: existential,
    weight: 0,
    summary: 'test cluster',
  };
}

// ---------------------------------------------------------------------------
// Specs
// ---------------------------------------------------------------------------

describe('detectChronicVerdicts', () => {
  it('returns [] for empty input', () => {
    expect(detectChronicVerdicts([], [])).toEqual([]);
  });

  it('returns [] when a live cluster has only one cycle and no history', () => {
    const verdicts = detectChronicVerdicts(
      [makeCluster({ templates: ['A', 'B'], cycleNumber: 1 })],
      [],
    );
    expect(verdicts).toEqual([]);
  });

  it('surfaces a chronic verdict across two cycles of the same season', () => {
    const verdicts = detectChronicVerdicts(
      [],
      [
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: 1 }),
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: 2 }),
      ],
    );
    expect(verdicts).toHaveLength(1);
    const v = verdicts[0]!;
    expect(v.templatePair).toEqual(['A', 'B']);
    expect(v.cycleNumbers).toEqual([1, 2]);
    expect(v.occurrenceCount).toBe(2);
    expect(v.consecutive).toBe(true);
  });

  it('does not surface a pair present in only one cycle', () => {
    const verdicts = detectChronicVerdicts(
      [],
      makeRecords({ templates: ['A', 'B'], cycleNumber: 1 }),
    );
    expect(verdicts).toEqual([]);
  });

  it('isolates seasons: same pair once per season is not chronic', () => {
    const verdicts = detectChronicVerdicts(
      [],
      [
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: 1, season: 'spring' }),
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: 1, season: 'summer' }),
      ],
    );
    expect(verdicts).toEqual([]);
  });

  it('excludes undated records (cycleNumber undefined)', () => {
    const allUndated = detectChronicVerdicts(
      [],
      [
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: undefined }),
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: undefined }),
      ],
    );
    expect(allUndated).toEqual([]);

    const oneDatedOneUndated = detectChronicVerdicts(
      [],
      [
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: 1 }),
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: undefined }),
      ],
    );
    expect(oneDatedOneUndated).toEqual([]);
  });

  it('merges a live cluster and a historical bucket of the same cycle once', () => {
    const verdicts = detectChronicVerdicts(
      [makeCluster({ templates: ['A', 'B'], cycleNumber: 2 })],
      [
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: 2 }),
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: 1 }),
      ],
    );
    expect(verdicts).toHaveLength(1);
    const v = verdicts[0]!;
    expect(v.cycleNumbers).toEqual([1, 2]);
    expect(v.containsOpen).toBe(true);
  });

  it('does not transitively over-merge distinct pairs in one season', () => {
    const verdicts = detectChronicVerdicts(
      [],
      [
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: 1 }),
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: 2 }),
        ...makeRecords({ templates: ['B', 'C'], cycleNumber: 3 }),
        ...makeRecords({ templates: ['B', 'C'], cycleNumber: 4 }),
      ],
    );
    expect(verdicts).toHaveLength(2);
    const ab = verdicts.find((v) => v.templatePair.join('+') === 'A+B')!;
    const bc = verdicts.find((v) => v.templatePair.join('+') === 'B+C')!;
    expect(ab.cycleNumbers).toEqual([1, 2]);
    expect(bc.cycleNumbers).toEqual([3, 4]);
    // No {A,B,C} merge and nothing spans 1..4.
    expect(
      verdicts.some((v) => v.templatePair.join('+') === 'A+C'),
    ).toBe(false);
    expect(verdicts.every((v) => v.spanCycles <= 2)).toBe(true);
  });

  it('enumerates all pairs of a 3-template bucket recurring across cycles', () => {
    const verdicts = detectChronicVerdicts(
      [],
      [
        ...makeRecords({ templates: ['A', 'B', 'C'], cycleNumber: 1 }),
        ...makeRecords({ templates: ['A', 'B', 'C'], cycleNumber: 2 }),
      ],
    );
    expect(verdicts).toHaveLength(3);
    const pairs = verdicts.map((v) => v.templatePair.join('+')).sort();
    expect(pairs).toEqual(['A+B', 'A+C', 'B+C']);
    for (const v of verdicts) {
      expect(v.cycleNumbers).toEqual([1, 2]);
    }
  });

  it('attributes pair objectiveIds/depth/existential to ONLY the two templates', () => {
    // 3-template bucket each cycle: A->obj-a/water, B->obj-b/water,
    // C->obj-c/structural/existential. Pair A+B must NOT inherit C's
    // objective, depth, or existential flag.
    function bucket(cycleNumber: number): ObservationLogRecord[] {
      return [
        ...makeRecords({
          templates: ['A'],
          cycleNumber,
          objectiveIds: ['obj-a'],
          depth: 'water',
        }),
        ...makeRecords({
          templates: ['B'],
          cycleNumber,
          objectiveIds: ['obj-b'],
          depth: 'water',
        }),
        ...makeRecords({
          templates: ['C'],
          cycleNumber,
          objectiveIds: ['obj-c'],
          depth: 'structural',
          existential: true,
        }),
      ];
    }
    const verdicts = detectChronicVerdicts([], [...bucket(1), ...bucket(2)]);
    expect(verdicts).toHaveLength(3);
    const ab = verdicts.find((v) => v.templatePair.join('+') === 'A+B')!;
    const ac = verdicts.find((v) => v.templatePair.join('+') === 'A+C')!;
    const bc = verdicts.find((v) => v.templatePair.join('+') === 'B+C')!;

    expect(ab.objectiveIds).toEqual(['obj-a', 'obj-b']);
    expect(ab.dominantDepth).toBe('water');
    expect(ab.containsExistential).toBe(false);
    expect(ab.summary.startsWith(IHSAN_PREFIX)).toBe(false);

    expect(ac.objectiveIds).toEqual(['obj-a', 'obj-c']);
    expect(ac.dominantDepth).toBe('structural');
    expect(ac.containsExistential).toBe(true);
    expect(ac.summary.startsWith(IHSAN_PREFIX)).toBe(true);

    expect(bc.objectiveIds).toEqual(['obj-b', 'obj-c']);
    expect(bc.dominantDepth).toBe('structural');
    expect(bc.containsExistential).toBe(true);
    expect(bc.summary.startsWith(IHSAN_PREFIX)).toBe(true);
  });

  it('live-path flat fallback: a live-only pair surfaces its cluster objectiveIds', () => {
    // Live clusters carry no per-template breakdown, so a pair derived purely
    // from live clusters falls back to the cluster's flat objectiveIds.
    const verdicts = detectChronicVerdicts(
      [
        makeCluster({
          templates: ['A', 'B'],
          cycleNumber: 1,
          objectiveIds: ['obj-a', 'obj-b'],
        }),
        makeCluster({
          templates: ['A', 'B'],
          cycleNumber: 2,
          objectiveIds: ['obj-a', 'obj-b'],
        }),
      ],
      [],
    );
    expect(verdicts).toHaveLength(1);
    const v = verdicts[0]!;
    expect(v.templatePair).toEqual(['A', 'B']);
    expect(v.objectiveIds).toEqual(['obj-a', 'obj-b']);
    expect(v.containsOpen).toBe(true);
  });

  it('computes consecutive / spanCycles correctly', () => {
    const contiguous = detectChronicVerdicts(
      [],
      [
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: 1 }),
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: 2 }),
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: 3 }),
      ],
    );
    expect(contiguous).toHaveLength(1);
    const c = contiguous[0]!;
    expect(c.consecutive).toBe(true);
    expect(c.spanCycles).toBe(3);
    expect(c.occurrenceCount).toBe(3);

    const gapped = detectChronicVerdicts(
      [],
      [
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: 1 }),
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: 3 }),
      ],
    );
    expect(gapped).toHaveLength(1);
    const g = gapped[0]!;
    expect(g.consecutive).toBe(false);
    expect(g.spanCycles).toBe(3);
    expect(g.occurrenceCount).toBe(2);
  });

  it('sorts an existential 2-cycle verdict before a non-existential 4-cycle verdict', () => {
    const verdicts = detectChronicVerdicts(
      [],
      [
        // Non-existential pair C+D recurring 4 cycles (own season to avoid
        // sharing a season:cycle bucket with the existential pair below).
        ...makeRecords({ templates: ['C', 'D'], cycleNumber: 1, season: 'summer' }),
        ...makeRecords({ templates: ['C', 'D'], cycleNumber: 2, season: 'summer' }),
        ...makeRecords({ templates: ['C', 'D'], cycleNumber: 3, season: 'summer' }),
        ...makeRecords({ templates: ['C', 'D'], cycleNumber: 4, season: 'summer' }),
        // Existential pair A+B recurring 2 cycles, in spring.
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: 1, existential: true }),
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: 2, existential: true }),
      ],
    );
    expect(verdicts).toHaveLength(2);
    const first = verdicts[0]!;
    expect(first.containsExistential).toBe(true);
    expect(first.templatePair).toEqual(['A', 'B']);
    expect(first.summary.startsWith(IHSAN_PREFIX)).toBe(true);
  });

  it('honours the containsOpen tiebreak and existential-over-open priority', () => {
    // Two non-existential verdicts equal on count + depth, one open. The pairs
    // live in separate seasons so they never share a season:cycle bucket.
    const tiebreak = detectChronicVerdicts(
      [makeCluster({ templates: ['A', 'B'], cycleNumber: 2 })],
      [
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: 1 }),
        // Closed pair, equal occurrenceCount + depth, no open occurrence.
        ...makeRecords({ templates: ['C', 'D'], cycleNumber: 1, season: 'summer' }),
        ...makeRecords({ templates: ['C', 'D'], cycleNumber: 2, season: 'summer' }),
      ],
    );
    expect(tiebreak).toHaveLength(2);
    expect(tiebreak[0]!.containsOpen).toBe(true);
    expect(tiebreak[0]!.templatePair).toEqual(['A', 'B']);

    // A closed existential verdict still sorts before an open non-existential
    // one. Pairs are in separate seasons so buckets never merge.
    const priority = detectChronicVerdicts(
      [makeCluster({ templates: ['C', 'D'], cycleNumber: 2, season: 'summer' })],
      [
        // Open non-existential pair (summer).
        ...makeRecords({ templates: ['C', 'D'], cycleNumber: 1, season: 'summer' }),
        // Closed existential pair (spring).
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: 1, existential: true }),
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: 2, existential: true }),
      ],
    );
    expect(priority).toHaveLength(2);
    expect(priority[0]!.containsExistential).toBe(true);
    expect(priority[0]!.containsOpen).toBe(false);
    expect(priority[0]!.templatePair).toEqual(['A', 'B']);
  });

  it('unions depth across cycles, taking the deepest', () => {
    const verdicts = detectChronicVerdicts(
      [],
      [
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: 1, depth: 'water' }),
        ...makeRecords({ templates: ['A', 'B'], cycleNumber: 2, depth: 'structural' }),
      ],
    );
    expect(verdicts).toHaveLength(1);
    const v = verdicts[0]!;
    expect(v.dominantDepth).toBe('structural');
    expect(v.theme).toBe(DEPTH_THEME.structural);
  });

  it('unions objectiveIds across contributing occurrences, distinct and sorted', () => {
    const verdicts = detectChronicVerdicts(
      [],
      [
        ...makeRecords({
          templates: ['A', 'B'],
          cycleNumber: 1,
          objectiveIds: ['o1'],
        }),
        ...makeRecords({
          templates: ['A', 'B'],
          cycleNumber: 2,
          objectiveIds: ['o2'],
        }),
      ],
    );
    expect(verdicts).toHaveLength(1);
    expect(verdicts[0]!.objectiveIds).toEqual(['o1', 'o2']);
  });

  it('always sorts the template pair ascending regardless of input order', () => {
    const verdicts = detectChronicVerdicts(
      [],
      [
        ...makeRecords({ templates: ['B', 'A'], cycleNumber: 1 }),
        ...makeRecords({ templates: ['B', 'A'], cycleNumber: 2 }),
      ],
    );
    expect(verdicts).toHaveLength(1);
    const v = verdicts[0]!;
    expect(v.templatePair).toEqual(['A', 'B']);
    expect(v.signatureKey).toBe('spring:A+B');
  });

  it('exposes the recurrence threshold constant', () => {
    expect(CHRONIC_RECURRENCE_THRESHOLD).toBe(2);
  });
});
