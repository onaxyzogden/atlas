// @vitest-environment happy-dom
/**
 * useChronicVerdicts -- cross-store read hook (T3.2).
 *
 * Unions live co-occurrence clusters (from reviewFlagStore.byProject, filtered
 * to open + non-dormant EXACTLY as useCoOccurrenceClusters) with the historical
 * observation-log ledger (observationLogStore.records, sliced to the project)
 * and delegates to the pure detectChronicVerdicts in @ogden/shared.
 *
 *   - Live {A,B}@spring:2 + ledger {A,B}@spring:1 -> 1 chronic verdict.
 *   - Single-cycle live cluster only -> [].
 *   - No-op rerender preserves referential identity (fresh-array hazard guard).
 *   - null projectId -> stable EMPTY_VERDICTS.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChronicVerdicts } from '../chronicVerdicts.js';
import { useReviewFlagStore } from '../reviewFlagStore.js';
import { useObservationLogStore } from '../observationLogStore.js';
import type { ObjectiveReviewFlag, ObservationLogRecord } from '@ogden/shared';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROJECT = 'proj-chronic';

const FLAG_DEFAULTS: Omit<
  ObjectiveReviewFlag,
  'id' | 'raisedAt' | 'sourceTemplateId' | 'objectiveId'
> = {
  projectId: PROJECT,
  sourceActivationIds: [],
  observedCount: 3,
  deviationSign: 'under',
  depth: 'threshold',
  direction: 'tighten',
  reason: 'test flag',
  window: { season: 'spring', cycleNumber: 2 },
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

function makeRecord(
  id: string,
  sourceTemplateId: string,
  objectiveId: string,
  overrides: Partial<ObservationLogRecord> = {},
): ObservationLogRecord {
  return {
    id,
    projectId: PROJECT,
    flagId: `flag-${id}`,
    sourceTemplateId,
    objectiveId,
    bucketKey: 'spring:1',
    season: 'spring',
    cycleNumber: 1,
    depth: 'threshold',
    deviationSign: 'under',
    raisedAt: '2025-01-01T00:00:00Z',
    closedAt: '2025-02-01T00:00:00Z',
    closeKind: 'resolved',
    ...overrides,
  };
}

function seedFlags(flags: ObjectiveReviewFlag[]): void {
  useReviewFlagStore.setState({ byProject: { [PROJECT]: flags } });
}

function seedRecords(records: ObservationLogRecord[]): void {
  useObservationLogStore.setState({ records });
}

beforeEach(() => {
  useReviewFlagStore.setState({ byProject: {} });
  useObservationLogStore.setState({ records: [] });
  window.localStorage.clear();
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('useChronicVerdicts', () => {
  it('unions a live cluster with a ledger occurrence into one chronic verdict', () => {
    // Live cluster {A,B}@spring:2 (two open flags, distinct templates, same window).
    seedFlags([
      makeFlag('f1', 'A', 'obj-A'),
      makeFlag('f2', 'B', 'obj-B'),
    ]);
    // Ledger reconstructs {A,B}@spring:1 (two records, same bucketKey 'spring:1').
    seedRecords([
      makeRecord('r1', 'A', 'obj-A'),
      makeRecord('r2', 'B', 'obj-B'),
    ]);

    const { result } = renderHook(() => useChronicVerdicts(PROJECT));

    expect(result.current).toHaveLength(1);
    const verdict = result.current[0];
    expect(verdict?.templatePair).toEqual(['A', 'B']);
    expect(verdict?.cycleNumbers).toEqual([1, 2]);
    expect(verdict?.containsOpen).toBe(true);
  });

  it('returns [] for single-cycle data (live cluster only, empty ledger)', () => {
    seedFlags([
      makeFlag('f1', 'A', 'obj-A'),
      makeFlag('f2', 'B', 'obj-B'),
    ]);
    seedRecords([]);

    const { result } = renderHook(() => useChronicVerdicts(PROJECT));

    expect(result.current).toEqual([]);
  });

  it('preserves referential identity across a no-op rerender', () => {
    seedFlags([
      makeFlag('f1', 'A', 'obj-A'),
      makeFlag('f2', 'B', 'obj-B'),
    ]);
    seedRecords([
      makeRecord('r1', 'A', 'obj-A'),
      makeRecord('r2', 'B', 'obj-B'),
    ]);

    const { result, rerender } = renderHook(() => useChronicVerdicts(PROJECT));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('returns the stable EMPTY_VERDICTS reference for a null projectId', () => {
    seedFlags([
      makeFlag('f1', 'A', 'obj-A'),
      makeFlag('f2', 'B', 'obj-B'),
    ]);

    const { result, rerender } = renderHook(() => useChronicVerdicts(null));
    const first = result.current;
    expect(result.current).toEqual([]);
    rerender();
    expect(result.current).toBe(first);
  });
});
