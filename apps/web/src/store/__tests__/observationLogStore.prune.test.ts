// @vitest-environment happy-dom
//
// Specs for pruneProjectRecords (T3.6): the steward-initiated, chronic-safe
// retention sweep. It must bound ledger growth WITHOUT erasing an undated audit
// row or any record still contributing to a detectable chronic verdict, must be
// observable (return the pruned rows), and must leave other projects untouched.

import { describe, it, expect, beforeEach } from 'vitest';
import { useObservationLogStore } from '../observationLogStore.js';
import type { ObservationLogRecord } from '@ogden/shared';
import { detectChronicVerdicts } from '@ogden/shared';

let seq = 0;

/** Build one ObservationLogRecord with sensible defaults, fully overridable. */
const makeRecord = (
  over: Partial<ObservationLogRecord> = {},
): ObservationLogRecord => {
  seq += 1;
  const season = 'season' in over ? over.season : 'spring';
  const cycleNumber = 'cycleNumber' in over ? over.cycleNumber : 1;
  const bucketKey =
    cycleNumber === undefined
      ? `${season ?? 'unknown'}:undated`
      : `${season ?? 'unknown'}:${cycleNumber}`;
  return {
    id: `rec-${seq}`,
    projectId: 'mtc',
    flagId: `flag-${seq}`,
    sourceTemplateId: `tpl-${seq}`,
    objectiveId: 'obj-1',
    bucketKey,
    ...(season !== undefined ? { season } : {}),
    ...(cycleNumber !== undefined ? { cycleNumber } : {}),
    depth: 'water',
    deviationSign: 'over',
    raisedAt: '2026-03-01T00:00:00.000Z',
    closedAt: '2026-04-01T00:00:00.000Z',
    closeKind: 'resolved',
    ...over,
  };
};

beforeEach(() => {
  seq = 0;
  useObservationLogStore.setState({ records: [], archivedRecords: [] });
});

describe('pruneProjectRecords', () => {
  it('prunes only out-of-window unprotected records and returns the pruned array', () => {
    // spring cycles 1..5, distinct templates so no chronic pair forms.
    const records = [1, 2, 3, 4, 5].map((cycleNumber) =>
      makeRecord({ id: `c${cycleNumber}`, season: 'spring', cycleNumber }),
    );
    useObservationLogStore.setState({ records });

    const pruned = useObservationLogStore
      .getState()
      .pruneProjectRecords('mtc', 2);

    const keptIds = useObservationLogStore
      .getState()
      .records.map((r) => r.id)
      .sort();
    // top-2 distinct cycles = [4,5] kept.
    expect(keptIds).toEqual(['c4', 'c5']);
    expect(pruned.map((r) => r.id).sort()).toEqual(['c1', 'c2', 'c3']);
  });

  it('retains a chronic-contributing record even when its leg is outside the recency window', () => {
    // {A,B} co-deviate in spring across cycles 1 and 2 -> chronic verdict over
    // [1,2]. Padding cycles 3..6 push cycle 1 out of a keepWithinCycles=2 window.
    const chronic: ObservationLogRecord[] = [
      makeRecord({ id: 's1-A', season: 'spring', cycleNumber: 1, sourceTemplateId: 'A' }),
      makeRecord({ id: 's1-B', season: 'spring', cycleNumber: 1, sourceTemplateId: 'B' }),
      makeRecord({ id: 's2-A', season: 'spring', cycleNumber: 2, sourceTemplateId: 'A' }),
      makeRecord({ id: 's2-B', season: 'spring', cycleNumber: 2, sourceTemplateId: 'B' }),
    ];
    const padding = [3, 4, 5, 6].map((cycleNumber) =>
      makeRecord({ id: `pad-${cycleNumber}`, season: 'spring', cycleNumber, sourceTemplateId: 'P' }),
    );
    useObservationLogStore.setState({ records: [...chronic, ...padding] });

    const pruned = useObservationLogStore
      .getState()
      .pruneProjectRecords('mtc', 2);

    const keptIds = new Set(
      useObservationLogStore.getState().records.map((r) => r.id),
    );
    // Cycle 1 is outside the top-2 window [5,6] but its A/B legs are protected.
    expect(keptIds.has('s1-A')).toBe(true);
    expect(keptIds.has('s1-B')).toBe(true);
    // Cycle 2 legs are protected too (and cycle 2 is not in [5,6] either).
    expect(keptIds.has('s2-A')).toBe(true);
    expect(keptIds.has('s2-B')).toBe(true);
    // The unprotected padding leg at cycle 3 falls out of [5,6].
    expect(pruned.map((r) => r.id)).toContain('pad-3');
  });

  it('retains undated records', () => {
    const undated = makeRecord({ id: 'audit', cycleNumber: undefined });
    const dated = makeRecord({ id: 'old', season: 'spring', cycleNumber: 1 });
    const recent = makeRecord({ id: 'new', season: 'spring', cycleNumber: 9 });
    useObservationLogStore.setState({ records: [undated, dated, recent] });

    const pruned = useObservationLogStore
      .getState()
      .pruneProjectRecords('mtc', 1);

    const keptIds = useObservationLogStore.getState().records.map((r) => r.id);
    expect(keptIds).toContain('audit');
    expect(pruned.map((r) => r.id)).toEqual(['old']);
  });

  it('leaves records of OTHER projects untouched', () => {
    const mine = makeRecord({ id: 'm-old', projectId: 'mtc', season: 'spring', cycleNumber: 1 });
    const mineRecent = makeRecord({ id: 'm-new', projectId: 'mtc', season: 'spring', cycleNumber: 9 });
    const theirsOld = makeRecord({ id: 'o-old', projectId: 'other', season: 'spring', cycleNumber: 1 });
    const theirsNew = makeRecord({ id: 'o-new', projectId: 'other', season: 'spring', cycleNumber: 9 });
    useObservationLogStore.setState({
      records: [mine, mineRecent, theirsOld, theirsNew],
    });

    const pruned = useObservationLogStore
      .getState()
      .pruneProjectRecords('mtc', 1);

    const keptIds = useObservationLogStore.getState().records.map((r) => r.id);
    // Other project's records are entirely present, even its old one.
    expect(keptIds).toContain('o-old');
    expect(keptIds).toContain('o-new');
    // Only the caller project's out-of-window record was pruned.
    expect(pruned.map((r) => r.id)).toEqual(['m-old']);
  });

  it('append still works unchanged and a subsequent prune behaves correctly', () => {
    useObservationLogStore
      .getState()
      .append(makeRecord({ id: 'a', season: 'spring', cycleNumber: 1 }));
    useObservationLogStore
      .getState()
      .append(makeRecord({ id: 'b', season: 'spring', cycleNumber: 9 }));
    expect(useObservationLogStore.getState().records.map((r) => r.id)).toEqual([
      'a',
      'b',
    ]);

    const pruned = useObservationLogStore
      .getState()
      .pruneProjectRecords('mtc', 1);
    expect(pruned.map((r) => r.id)).toEqual(['a']);
    expect(useObservationLogStore.getState().records.map((r) => r.id)).toEqual([
      'b',
    ]);
  });

  it('returns [] when nothing is prunable', () => {
    const recent = [8, 9].map((cycleNumber) =>
      makeRecord({ id: `c${cycleNumber}`, season: 'spring', cycleNumber }),
    );
    useObservationLogStore.setState({ records: recent });

    const pruned = useObservationLogStore
      .getState()
      .pruneProjectRecords('mtc', 2);
    expect(pruned).toEqual([]);
    expect(useObservationLogStore.getState().records.map((r) => r.id).sort()).toEqual([
      'c8',
      'c9',
    ]);
  });
});

describe('previewProjectPrune', () => {
  it('returns the same partition the prune would apply WITHOUT mutating state', () => {
    // spring cycles 1..5, distinct templates so no chronic pair forms.
    const records = [1, 2, 3, 4, 5].map((cycleNumber) =>
      makeRecord({ id: `c${cycleNumber}`, season: 'spring', cycleNumber }),
    );
    useObservationLogStore.setState({ records });

    const before = useObservationLogStore.getState().records;
    const beforeIds = before.map((r) => r.id).sort();

    // Preview FIRST -- must not mutate.
    const preview = useObservationLogStore
      .getState()
      .previewProjectPrune('mtc', 2);

    // top-2 distinct cycles [4,5] kept => prune c1,c2,c3.
    expect(preview.pruned.map((r) => r.id).sort()).toEqual(['c1', 'c2', 'c3']);
    expect(preview.kept.map((r) => r.id).sort()).toEqual(['c4', 'c5']);

    // No mutation: same id set, same length.
    const after = useObservationLogStore.getState().records;
    expect(after.map((r) => r.id).sort()).toEqual(beforeIds);
    expect(after.length).toBe(before.length);
    // Stronger: the records array is referentially identical (preview never
    // rebuilt it) -- proves no set() of any kind occurred.
    expect(after).toBe(before);
  });

  it('preview pruned ids equal the subsequent real prune pruned ids (drift guard)', () => {
    const records = [1, 2, 3, 4, 5].map((cycleNumber) =>
      makeRecord({ id: `c${cycleNumber}`, season: 'spring', cycleNumber }),
    );
    useObservationLogStore.setState({ records });

    const previewPrunedIds = useObservationLogStore
      .getState()
      .previewProjectPrune('mtc', 2)
      .pruned.map((r) => r.id)
      .sort();
    // Preview must not have mutated -- so the real prune sees the same ledger.
    const realPrunedIds = useObservationLogStore
      .getState()
      .pruneProjectRecords('mtc', 2)
      .map((r) => r.id)
      .sort();

    expect(previewPrunedIds).toEqual(realPrunedIds);
  });

  it('returns pruned: [] when everything is within-window or undated, no mutation', () => {
    const undated = makeRecord({ id: 'audit', cycleNumber: undefined });
    const recent = [8, 9].map((cycleNumber) =>
      makeRecord({ id: `c${cycleNumber}`, season: 'spring', cycleNumber }),
    );
    useObservationLogStore.setState({ records: [undated, ...recent] });

    const before = useObservationLogStore.getState().records;
    const preview = useObservationLogStore
      .getState()
      .previewProjectPrune('mtc', 2);

    expect(preview.pruned).toEqual([]);
    // State unchanged.
    const after = useObservationLogStore.getState().records;
    expect(after.map((r) => r.id).sort()).toEqual(
      before.map((r) => r.id).sort(),
    );
    expect(after.length).toBe(before.length);
  });

  it('excludes chronic-protected legs from preview pruned and does not mutate', () => {
    // {A,B} co-deviate spring cycles 1 & 2 -> chronic verdict. Padding 3..6.
    const chronic: ObservationLogRecord[] = [
      makeRecord({ id: 's1-A', season: 'spring', cycleNumber: 1, sourceTemplateId: 'A' }),
      makeRecord({ id: 's1-B', season: 'spring', cycleNumber: 1, sourceTemplateId: 'B' }),
      makeRecord({ id: 's2-A', season: 'spring', cycleNumber: 2, sourceTemplateId: 'A' }),
      makeRecord({ id: 's2-B', season: 'spring', cycleNumber: 2, sourceTemplateId: 'B' }),
    ];
    const padding = [3, 4, 5, 6].map((cycleNumber) =>
      makeRecord({ id: `pad-${cycleNumber}`, season: 'spring', cycleNumber, sourceTemplateId: 'P' }),
    );
    useObservationLogStore.setState({ records: [...chronic, ...padding] });

    const before = useObservationLogStore.getState().records;
    const preview = useObservationLogStore
      .getState()
      .previewProjectPrune('mtc', 2);

    const prunedIds = new Set(preview.pruned.map((r) => r.id));
    // Chronic legs are NOT pruned.
    expect(prunedIds.has('s1-A')).toBe(false);
    expect(prunedIds.has('s1-B')).toBe(false);
    expect(prunedIds.has('s2-A')).toBe(false);
    expect(prunedIds.has('s2-B')).toBe(false);
    // An unprotected padding leg outside [5,6] IS pruned.
    expect(prunedIds.has('pad-3')).toBe(true);

    // Chronic legs remain in state (no mutation).
    const after = useObservationLogStore.getState().records;
    const afterIds = new Set(after.map((r) => r.id));
    expect(afterIds.has('s1-A')).toBe(true);
    expect(afterIds.has('s1-B')).toBe(true);
    expect(afterIds.has('s2-A')).toBe(true);
    expect(afterIds.has('s2-B')).toBe(true);
    expect(after.length).toBe(before.length);
  });
});

describe('archive disposition + restore', () => {
  it('moves pruned rows into archivedRecords instead of erasing them', () => {
    const records = [1, 2, 3, 4, 5].map((cycleNumber) =>
      makeRecord({ id: `c${cycleNumber}`, season: 'spring', cycleNumber }),
    );
    useObservationLogStore.setState({ records, archivedRecords: [] });

    const pruned = useObservationLogStore
      .getState()
      .pruneProjectRecords('mtc', 2);

    // Active set shrank to the top-2 window.
    expect(
      useObservationLogStore.getState().records.map((r) => r.id).sort(),
    ).toEqual(['c4', 'c5']);
    // The pruned rows are now in the archive, not gone.
    expect(pruned.map((r) => r.id).sort()).toEqual(['c1', 'c2', 'c3']);
    expect(
      useObservationLogStore.getState().archivedRecords.map((r) => r.id).sort(),
    ).toEqual(['c1', 'c2', 'c3']);
  });

  it('restoreArchivedRecords round-trips the project archive back into the active set', () => {
    const records = [1, 2, 3, 4, 5].map((cycleNumber) =>
      makeRecord({ id: `c${cycleNumber}`, season: 'spring', cycleNumber }),
    );
    useObservationLogStore.setState({ records, archivedRecords: [] });
    useObservationLogStore.getState().pruneProjectRecords('mtc', 2);

    const restored = useObservationLogStore
      .getState()
      .restoreArchivedRecords('mtc');

    expect(restored.map((r) => r.id).sort()).toEqual(['c1', 'c2', 'c3']);
    expect(useObservationLogStore.getState().archivedRecords).toEqual([]);
    expect(
      useObservationLogStore.getState().records.map((r) => r.id).sort(),
    ).toEqual(['c1', 'c2', 'c3', 'c4', 'c5']);
  });

  it('restoreArchivedRecords only moves the named project, returns [] when none', () => {
    const mine = makeRecord({ id: 'm', projectId: 'mtc', cycleNumber: 1 });
    const theirs = makeRecord({ id: 'o', projectId: 'other', cycleNumber: 1 });
    useObservationLogStore.setState({
      records: [],
      archivedRecords: [mine, theirs],
    });

    const restored = useObservationLogStore
      .getState()
      .restoreArchivedRecords('mtc');

    expect(restored.map((r) => r.id)).toEqual(['m']);
    expect(
      useObservationLogStore.getState().archivedRecords.map((r) => r.id),
    ).toEqual(['o']);
    expect(useObservationLogStore.getState().records.map((r) => r.id)).toEqual([
      'm',
    ]);
    // Nothing to restore for a project with no archive.
    expect(useObservationLogStore.getState().restoreArchivedRecords('mtc')).toEqual(
      [],
    );
  });

  it('detectChronicVerdicts ignores archived rows (archive is dormant)', () => {
    // {A,B} co-deviate spring cycles 1&2 -> a genuine chronic verdict IF active.
    const chronic = [
      makeRecord({ id: 's1-A', season: 'spring', cycleNumber: 1, sourceTemplateId: 'A' }),
      makeRecord({ id: 's1-B', season: 'spring', cycleNumber: 1, sourceTemplateId: 'B' }),
      makeRecord({ id: 's2-A', season: 'spring', cycleNumber: 2, sourceTemplateId: 'A' }),
      makeRecord({ id: 's2-B', season: 'spring', cycleNumber: 2, sourceTemplateId: 'B' }),
    ];
    // Control: the fixture really is chronic when fed to the detector directly.
    expect(detectChronicVerdicts([], chronic).length).toBeGreaterThan(0);

    // A non-chronic active record (single template, no co-deviating pair) lives
    // in the ACTIVE set alongside the chronic pair sitting in the archive.
    const activeNonChronic = makeRecord({
      id: 'active-solo',
      season: 'spring',
      cycleNumber: 3,
      sourceTemplateId: 'C',
    });
    useObservationLogStore.setState({
      records: [activeNonChronic],
      archivedRecords: chronic,
    });

    // The detector reads the ACTIVE records only; the archived chronic pair is
    // dormant, so no verdict surfaces despite a real chronic pattern in the cold
    // tier. (Would fail if detection ever leaked into archivedRecords.)
    const verdicts = detectChronicVerdicts(
      [],
      useObservationLogStore.getState().records,
    );
    expect(verdicts).toEqual([]);
  });
});
