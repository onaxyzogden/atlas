/**
 * Phase 4 Slice 4.5 — temporalSeries unit specs.
 *
 * Locks the empty / single-point / numeric / status discrimination the
 * Observe Dashboard Spec §5.4 chart depends on. The chart itself short-
 * circuits on `series.points.length < 2`; these specs verify that
 * `buildSeries` produces the right shape so that branch fires.
 */

import { describe, it, expect } from 'vitest';
import type { ObserveDataPoint, UniversalDomain } from '@ogden/shared';
import { buildSeries, STATUS_ORDINAL } from '../temporalSeries.js';

const HYDRO: UniversalDomain = 'hydrology';

function point(
  overrides: Partial<ObserveDataPoint> = {},
): ObserveDataPoint {
  return {
    id: 'pt-1',
    projectId: 'proj-1',
    domainId: HYDRO,
    sourceType: 'task_verification',
    sourceActionId: null,
    sourceFeedEntryId: null,
    sourceObjectiveId: null,
    locationGeometry: null,
    cycleId: 1,
    isSuperseded: false,
    supersededBy: null,
    statusOutput: 'clear',
    measurementValue: null,
    proofItems: [],
    capturedAt: '2026-05-15T10:00:00.000Z',
    capturedBy: 'user-1',
    ...overrides,
  };
}

describe('buildSeries', () => {
  it('returns an empty status-mode series when given no points', () => {
    const series = buildSeries([]);
    expect(series.points).toHaveLength(0);
    expect(series.mode).toBe('status');
  });

  it('preserves the empty-state predicate the chart checks (length < 2)', () => {
    const empty = buildSeries([]);
    const one = buildSeries([point()]);
    expect(empty.points.length).toBeLessThan(2);
    expect(one.points.length).toBeLessThan(2);
  });

  it('picks numeric mode when every measurement is a finite number', () => {
    const series = buildSeries([
      point({
        id: 'a',
        capturedAt: '2026-05-01T10:00:00.000Z',
        measurementValue: 6.4,
      }),
      point({
        id: 'b',
        capturedAt: '2026-05-15T10:00:00.000Z',
        measurementValue: 7.1,
      }),
      point({
        id: 'c',
        capturedAt: '2026-05-28T10:00:00.000Z',
        measurementValue: 6.9,
      }),
    ]);
    expect(series.mode).toBe('numeric');
    expect(series.points).toHaveLength(3);
    expect(series.yMin).toBe(6.4);
    expect(series.yMax).toBe(7.1);
    expect(series.points.map((p) => p.yValue)).toEqual([6.4, 7.1, 6.9]);
  });

  it('falls back to status mode when any measurement is non-numeric', () => {
    const series = buildSeries([
      point({
        id: 'a',
        capturedAt: '2026-05-01T10:00:00.000Z',
        statusOutput: 'clear',
        measurementValue: null,
      }),
      point({
        id: 'b',
        capturedAt: '2026-05-15T10:00:00.000Z',
        statusOutput: 'major_constraint',
        measurementValue: 'qualitative-note' as unknown as number,
      }),
    ]);
    expect(series.mode).toBe('status');
    expect(series.statusLabels?.length).toBe(5);
    expect(series.points[0]?.yValue).toBe(STATUS_ORDINAL.clear);
    expect(series.points[1]?.yValue).toBe(STATUS_ORDINAL.major_constraint);
  });

  it('sorts points by capturedAt ascending so the chart polyline reads left-to-right', () => {
    const series = buildSeries([
      point({
        id: 'late',
        capturedAt: '2026-05-28T10:00:00.000Z',
        measurementValue: 3,
      }),
      point({
        id: 'early',
        capturedAt: '2026-05-01T10:00:00.000Z',
        measurementValue: 1,
      }),
      point({
        id: 'mid',
        capturedAt: '2026-05-15T10:00:00.000Z',
        measurementValue: 2,
      }),
    ]);
    expect(series.points.map((p) => p.point.id)).toEqual([
      'early',
      'mid',
      'late',
    ]);
  });

  it('unpacks `{ value: n }` logged-result shapes as numeric', () => {
    const series = buildSeries([
      point({
        id: 'a',
        capturedAt: '2026-05-01T10:00:00.000Z',
        measurementValue: { value: 12.5, unit: 'mm/hr' } as unknown as number,
      }),
      point({
        id: 'b',
        capturedAt: '2026-05-15T10:00:00.000Z',
        measurementValue: { value: 18.2, unit: 'mm/hr' } as unknown as number,
      }),
    ]);
    expect(series.mode).toBe('numeric');
    expect(series.points.map((p) => p.yValue)).toEqual([12.5, 18.2]);
  });

  it('avoids a zero y-range when min === max (yMax bumped so the chart can still scale)', () => {
    const series = buildSeries([
      point({
        id: 'a',
        capturedAt: '2026-05-01T10:00:00.000Z',
        measurementValue: 5,
      }),
      point({
        id: 'b',
        capturedAt: '2026-05-15T10:00:00.000Z',
        measurementValue: 5,
      }),
    ]);
    expect(series.yMin).toBe(5);
    expect(series.yMax).toBeGreaterThan(series.yMin);
  });
});
