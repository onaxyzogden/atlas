// observationLogRetention.test.ts
//
// Specs for the pure, store-free retention-partition helper (T3.5). This is the
// safety mechanism for slice #3's deliberate amendment of slice #2's
// unbounded-retention covenant: it must NEVER erase an undated audit row and
// NEVER erase a record still in protectedRecordIds (a chronic-contributing leg).

import { describe, it, expect } from 'vitest';
import type { SeasonName } from '../../../schemas/protocol/protocol.schema.js';
import type { ObservationLogRecord } from '../../../schemas/protocol/observationLogRecord.schema.js';
import { temporalBucketKey } from '../deviationPolicy.js';
import type { ChronicVerdict } from '../chronicDetection.js';
import {
  partitionExpiredRecords,
  chronicProtectedRecordIds,
  OBSERVATION_LOG_RETENTION_CYCLES,
} from '../observationLogRetention.js';

// ---------------------------------------------------------------------------
// Fixture factory.
// ---------------------------------------------------------------------------

let seq = 0;

interface RecordOpts {
  id?: string;
  season?: SeasonName | undefined;
  cycleNumber?: number;
}

/** Build one ObservationLogRecord with all required fields, overridable. */
function makeRecord(over: RecordOpts = {}): ObservationLogRecord {
  seq += 1;
  const season: SeasonName | undefined =
    'season' in over ? over.season : 'spring';
  const cycleNumber = 'cycleNumber' in over ? over.cycleNumber : 1;
  return {
    id: over.id ?? `rec-${seq}`,
    projectId: 'proj-1',
    flagId: `flag-${seq}`,
    sourceTemplateId: `tmpl-${seq}`,
    objectiveId: 'obj-a',
    bucketKey: temporalBucketKey(season, cycleNumber),
    ...(season !== undefined ? { season } : {}),
    ...(cycleNumber !== undefined ? { cycleNumber } : {}),
    depth: 'threshold',
    deviationSign: 'over',
    raisedAt: '2026-06-01T00:00:00.000Z',
    closedAt: '2026-06-02T00:00:00.000Z',
    closeKind: 'resolved',
  } satisfies ObservationLogRecord;
}

const NONE: ReadonlySet<string> = new Set<string>();

// ---------------------------------------------------------------------------
// Tests.
// ---------------------------------------------------------------------------

describe('partitionExpiredRecords', () => {
  it('exposes the default retention window constant', () => {
    expect(OBSERVATION_LOG_RETENTION_CYCLES).toBe(12);
  });

  // 1.
  it('returns empty kept/pruned for empty input', () => {
    const result = partitionExpiredRecords([], 12, NONE);
    expect(result).toEqual({ kept: [], pruned: [] });
  });

  // 2.
  it('always keeps undated records even with keepWithinCycles 0 and not protected', () => {
    const undated = makeRecord({ cycleNumber: undefined });
    const result = partitionExpiredRecords([undated], 0, NONE);
    expect(result.kept).toEqual([undated]);
    expect(result.pruned).toEqual([]);
  });

  // 3.
  it('keeps only the most-recent keepWithinCycles distinct cycles per season', () => {
    const records = [1, 2, 3, 4, 5].map((cycleNumber) =>
      makeRecord({ season: 'spring', cycleNumber }),
    );
    const result = partitionExpiredRecords(records, 2, NONE);
    const keptCycles = result.kept.map((r) => r.cycleNumber).sort();
    const prunedCycles = result.pruned.map((r) => r.cycleNumber).sort();
    expect(keptCycles).toEqual([4, 5]);
    expect(prunedCycles).toEqual([1, 2, 3]);
  });

  // 4. Covenant-safety: a chronic leg past the horizon must NOT be erased.
  it('keeps an out-of-window record whose id is protected (straddle boundary)', () => {
    const old = makeRecord({ id: 'chronic-leg', season: 'spring', cycleNumber: 1 });
    const recent = [4, 5].map((cycleNumber) =>
      makeRecord({ season: 'spring', cycleNumber }),
    );
    const protectedIds = new Set<string>(['chronic-leg']);
    const result = partitionExpiredRecords([old, ...recent], 2, protectedIds);
    expect(result.kept).toContain(old);
    expect(result.pruned).not.toContain(old);
  });

  // 5. Season-scoped recency.
  it('scopes the recency window per season (old cycle in one season survives on its own)', () => {
    const springRecent = [10, 11].map((cycleNumber) =>
      makeRecord({ season: 'spring', cycleNumber }),
    );
    const autumnOld = makeRecord({ season: 'autumn', cycleNumber: 1 });
    const result = partitionExpiredRecords(
      [...springRecent, autumnOld],
      2,
      NONE,
    );
    // autumn only has cycle 1 -> it is within autumn's own top-2 -> kept.
    expect(result.kept).toContain(autumnOld);
    expect(result.pruned).not.toContain(autumnOld);
  });

  it('does not let recent cycles in season Y protect an old cycle in season X', () => {
    const springOld = makeRecord({ id: 'spring-1', season: 'spring', cycleNumber: 1 });
    const springRecent = [5, 6, 7].map((cycleNumber) =>
      makeRecord({ season: 'spring', cycleNumber }),
    );
    const autumnOnly = makeRecord({ id: 'autumn-1', season: 'autumn', cycleNumber: 1 });
    const result = partitionExpiredRecords(
      [springOld, ...springRecent, autumnOnly],
      2,
      NONE,
    );
    // spring top-2 = [6,7]; spring cycle 1 is out -> pruned.
    expect(result.pruned).toContain(springOld);
    // autumn has only cycle 1 -> kept.
    expect(result.kept).toContain(autumnOnly);
  });

  // 6. Multiple records same season+cycle share the cycle's fate.
  it('makes all records at the same season+cycle share the in-window fate', () => {
    const inWindowA = makeRecord({ season: 'spring', cycleNumber: 3 });
    const inWindowB = makeRecord({ season: 'spring', cycleNumber: 3 });
    const newer = makeRecord({ season: 'spring', cycleNumber: 4 });
    const keptResult = partitionExpiredRecords(
      [inWindowA, inWindowB, newer],
      2,
      NONE,
    );
    expect(keptResult.kept).toEqual([inWindowA, inWindowB, newer]);
    expect(keptResult.pruned).toEqual([]);

    const outA = makeRecord({ season: 'spring', cycleNumber: 1 });
    const outB = makeRecord({ season: 'spring', cycleNumber: 1 });
    const recent = [4, 5].map((cycleNumber) =>
      makeRecord({ season: 'spring', cycleNumber }),
    );
    const prunedResult = partitionExpiredRecords(
      [outA, outB, ...recent],
      2,
      NONE,
    );
    expect(prunedResult.pruned).toEqual([outA, outB]);
    expect(prunedResult.kept).toEqual(recent);
  });

  it('keeps an individually-protected record at a shared out-of-window cycle', () => {
    const outProtected = makeRecord({ id: 'keep-me', season: 'spring', cycleNumber: 1 });
    const outPruned = makeRecord({ id: 'drop-me', season: 'spring', cycleNumber: 1 });
    const recent = [4, 5].map((cycleNumber) =>
      makeRecord({ season: 'spring', cycleNumber }),
    );
    const result = partitionExpiredRecords(
      [outProtected, outPruned, ...recent],
      2,
      new Set<string>(['keep-me']),
    );
    expect(result.kept).toContain(outProtected);
    expect(result.pruned).toEqual([outPruned]);
  });

  // 7. Stable order.
  it('preserves input order within kept and within pruned', () => {
    const r5 = makeRecord({ id: 'r5', season: 'spring', cycleNumber: 5 });
    const r1 = makeRecord({ id: 'r1', season: 'spring', cycleNumber: 1 });
    const r4 = makeRecord({ id: 'r4', season: 'spring', cycleNumber: 4 });
    const r2 = makeRecord({ id: 'r2', season: 'spring', cycleNumber: 2 });
    const result = partitionExpiredRecords([r5, r1, r4, r2], 2, NONE);
    // window = top-2 distinct = [4,5] -> kept r5, r4 (input order).
    expect(result.kept.map((r) => r.id)).toEqual(['r5', 'r4']);
    expect(result.pruned.map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it('groups undated records under the same season-key convention (season ?? unknown)', () => {
    // An undated record has no season AND no cycle -> always kept regardless.
    const undatedNoSeason = makeRecord({ season: undefined, cycleNumber: undefined });
    const result = partitionExpiredRecords([undatedNoSeason], 0, NONE);
    expect(result.kept).toEqual([undatedNoSeason]);
    expect(result.pruned).toEqual([]);
  });

  // 8. Negative keepWithinCycles treated as 0.
  it('treats negative keepWithinCycles as 0 (only undated + protected survive)', () => {
    const undated = makeRecord({ cycleNumber: undefined });
    const protectedDated = makeRecord({ id: 'safe', season: 'spring', cycleNumber: 9 });
    const doomed = makeRecord({ id: 'doomed', season: 'spring', cycleNumber: 8 });
    const result = partitionExpiredRecords(
      [undated, protectedDated, doomed],
      -5,
      new Set<string>(['safe']),
    );
    expect(result.kept).toEqual([undated, protectedDated]);
    expect(result.pruned).toEqual([doomed]);
  });

  it('keepWithinCycles 0 prunes every dated unprotected record', () => {
    const a = makeRecord({ season: 'spring', cycleNumber: 3 });
    const b = makeRecord({ season: 'autumn', cycleNumber: 7 });
    const result = partitionExpiredRecords([a, b], 0, NONE);
    expect(result.kept).toEqual([]);
    expect(result.pruned).toEqual([a, b]);
  });
});

// ---------------------------------------------------------------------------
// chronicProtectedRecordIds (T3.6 -- pure verdict -> protected-id mapper).
// ---------------------------------------------------------------------------

/** Build a minimal ChronicVerdict carrying only the fields the mapper reads. */
function makeVerdict(over: {
  season?: SeasonName | undefined;
  cycleNumbers: number[];
  templatePair: [string, string];
}): ChronicVerdict {
  const season: SeasonName | undefined =
    'season' in over ? over.season : 'spring';
  const [a, b] = over.templatePair;
  const seasonScope = season ?? 'unknown';
  return {
    signatureKey: `${seasonScope}:${a}+${b}`,
    ...(season !== undefined ? { season } : {}),
    templatePair: over.templatePair,
    templateIds: [...over.templatePair],
    objectiveIds: ['obj-a'],
    cycleNumbers: over.cycleNumbers,
    occurrenceCount: over.cycleNumbers.length,
    consecutive: true,
    spanCycles: over.cycleNumbers.length,
    dominantDepth: 'threshold',
    theme: 'theme',
    containsExistential: false,
    containsOpen: false,
    weight: 1,
    summary: 'summary',
  } satisfies ChronicVerdict;
}

describe('chronicProtectedRecordIds', () => {
  it('protects a record matching season + cycle membership + a templatePair leg', () => {
    const rec = makeRecord({ season: 'spring', cycleNumber: 2 });
    rec.sourceTemplateId = 'tmpl-A';
    const verdict = makeVerdict({
      season: 'spring',
      cycleNumbers: [1, 2],
      templatePair: ['tmpl-A', 'tmpl-B'],
    });
    const result = chronicProtectedRecordIds([rec], [verdict]);
    expect(result.has(rec.id)).toBe(true);
  });

  it('does NOT protect a record whose season differs from the verdict', () => {
    const rec = makeRecord({ season: 'autumn', cycleNumber: 2 });
    rec.sourceTemplateId = 'tmpl-A';
    const verdict = makeVerdict({
      season: 'spring',
      cycleNumbers: [1, 2],
      templatePair: ['tmpl-A', 'tmpl-B'],
    });
    expect(chronicProtectedRecordIds([rec], [verdict]).has(rec.id)).toBe(false);
  });

  it('does NOT protect a record whose cycleNumber is not in cycleNumbers', () => {
    const rec = makeRecord({ season: 'spring', cycleNumber: 9 });
    rec.sourceTemplateId = 'tmpl-A';
    const verdict = makeVerdict({
      season: 'spring',
      cycleNumbers: [1, 2],
      templatePair: ['tmpl-A', 'tmpl-B'],
    });
    expect(chronicProtectedRecordIds([rec], [verdict]).has(rec.id)).toBe(false);
  });

  it('does NOT protect a third template C in the same bucket (not in the pair)', () => {
    const rec = makeRecord({ season: 'spring', cycleNumber: 2 });
    rec.sourceTemplateId = 'tmpl-C';
    const verdict = makeVerdict({
      season: 'spring',
      cycleNumbers: [1, 2],
      templatePair: ['tmpl-A', 'tmpl-B'],
    });
    expect(chronicProtectedRecordIds([rec], [verdict]).has(rec.id)).toBe(false);
  });

  it('does NOT protect an undated record (cycleNumber undefined)', () => {
    const rec = makeRecord({ season: 'spring', cycleNumber: undefined });
    rec.sourceTemplateId = 'tmpl-A';
    const verdict = makeVerdict({
      season: 'spring',
      cycleNumbers: [1, 2],
      templatePair: ['tmpl-A', 'tmpl-B'],
    });
    expect(chronicProtectedRecordIds([rec], [verdict]).has(rec.id)).toBe(false);
  });

  it('returns an empty set when there are no verdicts', () => {
    const rec = makeRecord({ season: 'spring', cycleNumber: 2 });
    rec.sourceTemplateId = 'tmpl-A';
    expect(chronicProtectedRecordIds([rec], []).size).toBe(0);
  });

  it('matches the undated-season scope via (season ?? unknown) on both sides', () => {
    // A dated record with no season and a verdict with no season both map to the
    // 'unknown' scope key -> they CAN match.
    const rec = makeRecord({ season: undefined, cycleNumber: 2 });
    rec.sourceTemplateId = 'tmpl-A';
    const verdict = makeVerdict({
      season: undefined,
      cycleNumbers: [1, 2],
      templatePair: ['tmpl-A', 'tmpl-B'],
    });
    expect(chronicProtectedRecordIds([rec], [verdict]).has(rec.id)).toBe(true);
  });
});
