// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useObservationLogStore,
  useObservationLog,
} from '../observationLogStore.js';
import type { ObservationLogRecord } from '@ogden/shared';

const rec = (over: Partial<ObservationLogRecord> = {}): ObservationLogRecord => ({
  id: 'rec-1',
  projectId: 'mtc',
  flagId: 'flag-1',
  sourceTemplateId: 'tpl-a',
  objectiveId: 'obj-1',
  bucketKey: 'spring:1',
  season: 'spring',
  cycleNumber: 1,
  depth: 'water',
  deviationSign: 'over',
  raisedAt: '2026-03-01T00:00:00.000Z',
  closedAt: '2026-04-01T00:00:00.000Z',
  closeKind: 'resolved',
  ...over,
});

beforeEach(() => {
  useObservationLogStore.setState({ records: [] });
});

describe('observationLogStore', () => {
  it('append adds one row (and is additive, never replacing)', () => {
    useObservationLogStore.getState().append(rec({ id: 'a' }));
    useObservationLogStore.getState().append(rec({ id: 'b' }));
    expect(useObservationLogStore.getState().records.map((r) => r.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('getProjectRecords filters by projectId', () => {
    useObservationLogStore.getState().append(rec({ id: 'a', projectId: 'mtc' }));
    useObservationLogStore.getState().append(rec({ id: 'b', projectId: 'other' }));
    expect(
      useObservationLogStore.getState().getProjectRecords('mtc').map((r) => r.id),
    ).toEqual(['a']);
  });

  it('exposes no update or remove API (append-only covenant)', () => {
    const s = useObservationLogStore.getState() as unknown as Record<
      string,
      unknown
    >;
    expect(s.update).toBeUndefined();
    expect(s.remove).toBeUndefined();
  });

  it('useObservationLog returns the project rows and a stable empty for null', () => {
    useObservationLogStore.getState().append(rec({ id: 'a', projectId: 'mtc' }));
    const { result: hit } = renderHook(() => useObservationLog('mtc'));
    expect(hit.current.map((r) => r.id)).toEqual(['a']);
    const { result: a } = renderHook(() => useObservationLog(null));
    const { result: b } = renderHook(() => useObservationLog(null));
    expect(a.current).toBe(b.current); // same module-level EMPTY reference
  });

  it('useObservationLog keeps the populated slice referentially stable across re-renders', () => {
    // Pins the reason the hook memoizes: a re-render with unchanged records must
    // return the SAME array reference (an inline-filter selector would not).
    useObservationLogStore.getState().append(rec({ id: 'a', projectId: 'mtc' }));
    const { result, rerender } = renderHook(() => useObservationLog('mtc'));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
