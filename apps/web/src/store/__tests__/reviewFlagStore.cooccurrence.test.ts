// @vitest-environment happy-dom
/**
 * reviewFlagStore -- useCoOccurrenceClusters stable hook (T2).
 *
 * Mirrors useReviewFlagCountsByObjective: select the stable byProject map,
 * derive open + non-dormant flags in useMemo, then delegate clustering to the
 * pure detectCoOccurrenceClusters from @ogden/shared.
 *
 *   - 2 OPEN flags, distinct sourceTemplateId, same season + cycleNumber -> 1 cluster.
 *   - Resolving one flag drops it from the open set -> no cluster (only 1 open left).
 *   - currentBucket two cycles ahead with per='cycle' -> both flags dormant -> [].
 *   - null projectId -> stable empty array.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useReviewFlagStore,
  useCoOccurrenceClusters,
} from '../reviewFlagStore.js';
import type { ObjectiveReviewFlag } from '@ogden/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROJECT = 'proj-cooccur';

const FLAG_DEFAULTS: Omit<
  ObjectiveReviewFlag,
  'id' | 'raisedAt' | 'sourceTemplateId' | 'objectiveId'
> = {
  projectId: PROJECT,
  sourceActivationIds: ['act-1'],
  observedCount: 3,
  deviationSign: 'under',
  depth: 'threshold',
  direction: 'tighten',
  reason: 'test flag',
  window: { season: 'summer', cycleNumber: 1 },
  expectedRate: { count: 5, per: 'season' },
};

function makeFlag(
  id: string,
  sourceTemplateId: string,
  objectiveId: string,
  overrides: Partial<ObjectiveReviewFlag> = {},
): ObjectiveReviewFlag {
  return {
    ...FLAG_DEFAULTS,
    id,
    raisedAt: '2026-01-01T00:00:00Z',
    sourceTemplateId,
    objectiveId,
    ...overrides,
  };
}

function seed(flags: ObjectiveReviewFlag[]): void {
  useReviewFlagStore.setState({ byProject: { [PROJECT]: flags } });
}

function reset(): void {
  useReviewFlagStore.setState({ byProject: {} });
  window.localStorage.clear();
}

beforeEach(reset);

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('useCoOccurrenceClusters', () => {
  it('returns 1 cluster for 2 open flags with distinct templates in the same bucket', () => {
    seed([
      makeFlag('f1', 'tmpl-A', 'obj-A'),
      makeFlag('f2', 'tmpl-B', 'obj-B'),
    ]);

    const { result } = renderHook(() => useCoOccurrenceClusters(PROJECT));

    expect(result.current).toHaveLength(1);
    expect(result.current[0]?.templateIds).toHaveLength(2);
    expect([...(result.current[0]?.templateIds ?? [])].sort()).toEqual([
      'tmpl-A',
      'tmpl-B',
    ]);
  });

  it('drops a resolved flag from the open set (no cluster when only 1 open remains)', () => {
    seed([
      makeFlag('f1', 'tmpl-A', 'obj-A', { resolvedAt: '2026-02-01T00:00:00Z' }),
      makeFlag('f2', 'tmpl-B', 'obj-B'),
    ]);

    const { result } = renderHook(() => useCoOccurrenceClusters(PROJECT));

    expect(result.current).toEqual([]);
  });

  it('excludes dormant-by-window flags (currentBucket two cycles ahead, per=cycle)', () => {
    seed([
      makeFlag('f1', 'tmpl-A', 'obj-A', {
        window: { season: 'summer', cycleNumber: 1 },
        expectedRate: { count: 5, per: 'cycle' },
      }),
      makeFlag('f2', 'tmpl-B', 'obj-B', {
        window: { season: 'summer', cycleNumber: 1 },
        expectedRate: { count: 5, per: 'cycle' },
      }),
    ]);

    const { result } = renderHook(() =>
      useCoOccurrenceClusters(PROJECT, { season: 'summer', cycleNumber: 3 }),
    );

    expect(result.current).toEqual([]);
  });

  it('returns a stable empty array for a null projectId', () => {
    seed([
      makeFlag('f1', 'tmpl-A', 'obj-A'),
      makeFlag('f2', 'tmpl-B', 'obj-B'),
    ]);

    const { result, rerender } = renderHook(() =>
      useCoOccurrenceClusters(null),
    );
    const first = result.current;
    rerender();
    expect(result.current).toEqual([]);
    expect(result.current).toBe(first);
  });
});
