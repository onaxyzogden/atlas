// @vitest-environment happy-dom
/**
 * cyclicalReviewStore - Stratum-rename persistence migration tests (Slice 4.2).
 *
 * The v1 -> v2 `migrate` renumbers the objective-id KEYS that index each
 * project's review map (t{n}- -> s{n+1}-, via remapId) while preserving the
 * record VALUES (timestamps + forcedTrigger) verbatim and leaving projectId
 * keys opaque. Idempotent on already-migrated s{n} keys; null/garbage tolerant.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useCyclicalReviewStore,
  migrateCyclicalReview,
  type CyclicalReviewRecord,
} from '../cyclicalReviewStore.js';

const PERSIST_KEY = 'ogden-cyclical-review';

interface LooseReviewState {
  byProject: Record<string, Record<string, CyclicalReviewRecord>>;
}

function reset(): void {
  useCyclicalReviewStore.setState({ byProject: {} });
  window.localStorage.clear();
}

describe('migrateCyclicalReview (v1 -> v2): objective-key renumber', () => {
  const recA: CyclicalReviewRecord = {
    lastReviewedAt: '2026-01-01T00:00:00.000Z',
    lastDecisionConfirmedAt: '2026-01-02T00:00:00.000Z',
    forcedTrigger: false,
    triggerContext: null,
  };
  const recB: CyclicalReviewRecord = {
    lastReviewedAt: '2026-03-01T00:00:00.000Z',
    lastDecisionConfirmedAt: null,
    forcedTrigger: true,
    triggerContext: null,
  };
  const v1 = {
    byProject: {
      'proj-A': {
        't0-vision': recA,
        't4-water-strategy': recB,
      },
    },
  };

  it('renumbers objective KEYS via remapId', () => {
    const out = migrateCyclicalReview(v1, 1) as unknown as LooseReviewState;
    expect(Object.keys(out.byProject['proj-A']!).sort()).toEqual([
      's1-vision',
      's5-water-strategy',
    ]);
  });

  it('preserves record VALUES verbatim', () => {
    const out = migrateCyclicalReview(v1, 1) as unknown as LooseReviewState;
    expect(out.byProject['proj-A']!['s1-vision']).toEqual(recA);
    expect(out.byProject['proj-A']!['s5-water-strategy']).toEqual(recB);
  });

  it('preserves projectId keys and the objective count', () => {
    const out = migrateCyclicalReview(v1, 1) as unknown as LooseReviewState;
    expect(Object.keys(out.byProject)).toEqual(['proj-A']);
    expect(Object.keys(out.byProject['proj-A']!)).toHaveLength(2);
  });
});

describe('migrateCyclicalReview - idempotency + safety', () => {
  it('is a no-op on already-migrated s{n} keys', () => {
    const rec: CyclicalReviewRecord = {
      lastReviewedAt: '2026-01-01T00:00:00.000Z',
      lastDecisionConfirmedAt: null,
      forcedTrigger: false,
      triggerContext: null,
    };
    const out = migrateCyclicalReview(
      { byProject: { p: { 's1-vision': rec } } },
      1,
    ) as unknown as LooseReviewState;
    expect(out.byProject.p!['s1-vision']).toEqual(rec);
  });

  it('passes v2 input through (version gate) and tolerates null', () => {
    const v2 = {
      byProject: {
        p: {
          's2-land-baseline': {
            lastReviewedAt: null,
            lastDecisionConfirmedAt: null,
            forcedTrigger: false,
          },
        },
      },
    };
    const out = migrateCyclicalReview(v2, 2) as unknown as LooseReviewState;
    expect(Object.keys(out.byProject.p!)).toEqual(['s2-land-baseline']);
    const fromNull = migrateCyclicalReview(null, 1) as unknown as LooseReviewState;
    expect(fromNull.byProject).toEqual({});
  });
});

describe('migrateCyclicalReview (v2 -> v3): triggerContext backfill', () => {
  it('backfills triggerContext: null on a v2 record that lacks the field', () => {
    const v2 = {
      byProject: {
        p: {
          's5-water-strategy': {
            lastReviewedAt: '2026-04-01T00:00:00.000Z',
            lastDecisionConfirmedAt: null,
            forcedTrigger: true,
          },
        },
      },
    };
    const out = migrateCyclicalReview(v2, 2) as unknown as LooseReviewState;
    const rec = out.byProject.p!['s5-water-strategy']!;
    // additive: prior values preserved verbatim
    expect(rec.lastReviewedAt).toBe('2026-04-01T00:00:00.000Z');
    expect(rec.forcedTrigger).toBe(true);
    // new field present and null
    expect(rec.triggerContext).toBeNull();
  });

  it('preserves an existing triggerContext (idempotent on v3 shape)', () => {
    const ctx = { via: ['membership' as const], domains: ['soil' as const] };
    const v3 = {
      byProject: {
        p: {
          's2-land-baseline': {
            lastReviewedAt: null,
            lastDecisionConfirmedAt: null,
            forcedTrigger: true,
            triggerContext: ctx,
          },
        },
      },
    };
    const out = migrateCyclicalReview(v3, 3) as unknown as LooseReviewState;
    expect(out.byProject.p!['s2-land-baseline']!.triggerContext).toEqual(ctx);
  });
});

describe('cyclicalReviewStore persist lifecycle: v1 blob -> rehydrate', () => {
  beforeEach(() => reset());

  it('rehydrates so the review record survives under the renamed slug', async () => {
    window.localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({
        state: {
          byProject: {
            'proj-A': {
              't0-vision': {
                lastReviewedAt: '2026-01-01T00:00:00.000Z',
                lastDecisionConfirmedAt: null,
                forcedTrigger: true,
              },
            },
          },
        },
        version: 1,
      }),
    );

    await useCyclicalReviewStore.persist.rehydrate();

    const s = useCyclicalReviewStore.getState();
    expect(s.getRecord('proj-A', 's1-vision').lastReviewedAt).toBe(
      '2026-01-01T00:00:00.000Z',
    );
    expect(s.isForced('proj-A', 's1-vision')).toBe(true);
    // old slug no longer resolves
    expect(s.getRecord('proj-A', 't0-vision').lastReviewedAt).toBeNull();
  });
});
