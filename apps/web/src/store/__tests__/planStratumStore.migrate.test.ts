// @vitest-environment happy-dom
/**
 * planStratumStore - Stratum-rename persistence migration tests (Slice 4.2).
 *
 * Covers the v2 -> v3 (and composed v1 -> v3) `migrate` that renumbers the
 * Plan tier spine to Stratum 1-7:
 *   - byProject objective-id KEYS + completed item-id VALUES via remapId
 *   - celebratedByProject full-tier slugs via remapTierId
 *   - projectId keys + counts preserved; idempotent on already-migrated s{n}
 *     data; null/garbage tolerant
 *   - a full persist.rehydrate round-trip proving saved progress survives the
 *     rename (Definition-of-Done: "no progress lost").
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  usePlanStratumProgressStore,
  migratePlanStratumProgress,
} from '../planStratumStore.js';

const PERSIST_KEY = 'ogden-plan-tier-progress';

type ByObjective = Record<string, string[]>;
interface LoosePlanState {
  byProject: Record<string, ByObjective>;
  celebratedByProject: Record<string, string[]>;
}

function reset(): void {
  usePlanStratumProgressStore.setState({ byProject: {}, celebratedByProject: {} });
  window.localStorage.clear();
}

describe('migratePlanStratumProgress (v2 -> v3): Stratum slug renumber', () => {
  // Realistic pre-rename blob: skeleton + per-type slugs, completed items,
  // celebrated full-tier slugs, two projects.
  const v2 = {
    byProject: {
      'proj-A': {
        't0-vision': ['t0-vision-c1', 't0-vision-c2'],
        't1-land-baseline': ['t1-land-baseline-c1'],
        'rf-t1-landscape-context': ['rf-t1-landscape-context-pres-1'],
      },
      'proj-B': {
        't6-phasing': ['t6-phasing-c1'],
      },
    },
    celebratedByProject: {
      'proj-A': ['t0-project-foundation', 't1-land-reading'],
      'proj-B': ['t6-phasing-resourcing'],
    },
  };

  it('renumbers objective KEYS and completed item VALUES under byProject', () => {
    const out = migratePlanStratumProgress(v2, 2) as unknown as LoosePlanState;
    const a = out.byProject['proj-A']!;
    expect(Object.keys(a).sort()).toEqual([
      'rf-s2-landscape-context',
      's1-vision',
      's2-land-baseline',
    ]);
    expect(a['s1-vision']).toEqual(['s1-vision-c1', 's1-vision-c2']);
    expect(a['s2-land-baseline']).toEqual(['s2-land-baseline-c1']);
    expect(a['rf-s2-landscape-context']).toEqual([
      'rf-s2-landscape-context-pres-1',
    ]);
    expect(out.byProject['proj-B']!['s7-phasing']).toEqual(['s7-phasing-c1']);
  });

  it('renumbers celebrated full-tier slugs via remapTierId', () => {
    const out = migratePlanStratumProgress(v2, 2) as unknown as LoosePlanState;
    expect(out.celebratedByProject['proj-A']).toEqual([
      's1-project-foundation',
      's2-land-reading',
    ]);
    expect(out.celebratedByProject['proj-B']).toEqual(['s7-phasing-resourcing']);
  });

  it('preserves projectId keys and per-project objective + item counts', () => {
    const out = migratePlanStratumProgress(v2, 2) as unknown as LoosePlanState;
    expect(Object.keys(out.byProject).sort()).toEqual(['proj-A', 'proj-B']);
    expect(Object.keys(out.byProject['proj-A']!)).toHaveLength(3);
    const items = Object.values(out.byProject['proj-A']!).flat();
    expect(items).toHaveLength(4);
  });
});

describe('migratePlanStratumProgress - idempotency + safety', () => {
  it('is a no-op on already-migrated s{n} data (no double-bump)', () => {
    // Even if mislabeled as pre-v3, remapId/remapTierId are no-ops on s{n}.
    const v3 = {
      byProject: { p: { 's1-vision': ['s1-vision-c1'] } },
      celebratedByProject: { p: ['s1-project-foundation'] },
    };
    const out = migratePlanStratumProgress(v3, 2) as unknown as LoosePlanState;
    expect(out.byProject.p!['s1-vision']).toEqual(['s1-vision-c1']);
    expect(out.celebratedByProject.p).toEqual(['s1-project-foundation']);
  });

  it('passes v3 input through untouched (version gate skips the remap)', () => {
    const v3 = {
      byProject: { p: { 's3-systems-baseline': ['s3-systems-baseline-c1'] } },
      celebratedByProject: {},
    };
    const out = migratePlanStratumProgress(v3, 3) as unknown as LoosePlanState;
    expect(out.byProject.p!['s3-systems-baseline']).toEqual([
      's3-systems-baseline-c1',
    ]);
  });

  it('tolerates null + empty persisted state', () => {
    const fromNull = migratePlanStratumProgress(
      null,
      2,
    ) as unknown as LoosePlanState;
    expect(fromNull.byProject).toEqual({});
    expect(fromNull.celebratedByProject).toEqual({});
    const fromEmpty = migratePlanStratumProgress({}, 2) as unknown as LoosePlanState;
    expect(fromEmpty.byProject).toEqual({});
    expect(fromEmpty.celebratedByProject).toEqual({});
  });
});

describe('migratePlanStratumProgress (v1 -> v3): composite', () => {
  it('backfills celebratedByProject ({}) and still renumbers byProject', () => {
    // v1 predates celebratedByProject (added v2); only byProject exists.
    const v1 = {
      byProject: { p: { 't0-vision': ['t0-vision-c1'] } },
    };
    const out = migratePlanStratumProgress(v1, 1) as unknown as LoosePlanState;
    expect(out.byProject.p!['s1-vision']).toEqual(['s1-vision-c1']);
    expect(out.celebratedByProject).toEqual({});
  });
});

describe('planStratumStore persist lifecycle: v2 blob -> rehydrate', () => {
  beforeEach(() => reset());

  it('rehydrates renamed progress so completion + celebration survive', async () => {
    window.localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({
        state: {
          byProject: {
            'proj-A': {
              't0-vision': ['t0-vision-c1', 't0-vision-c2'],
              't4-water-strategy': ['t4-water-strategy-c1'],
            },
          },
          celebratedByProject: { 'proj-A': ['t0-project-foundation'] },
        },
        version: 2,
      }),
    );

    await usePlanStratumProgressStore.persist.rehydrate();

    const s = usePlanStratumProgressStore.getState();
    expect(s.getCompletedItemIds('proj-A', 's1-vision')).toEqual([
      's1-vision-c1',
      's1-vision-c2',
    ]);
    expect(
      s.isCompleted('proj-A', 's5-water-strategy', 's5-water-strategy-c1'),
    ).toBe(true);
    // old slug no longer resolves
    expect(s.getCompletedItemIds('proj-A', 't0-vision')).toEqual([]);
    expect(s.hasCelebratedStratum('proj-A', 's1-project-foundation')).toBe(true);
    expect(s.hasCelebratedStratum('proj-A', 't0-project-foundation')).toBe(false);
  });
});
