/**
 * temporalSeries — Phase 4 Slice 4.5 helper that normalises a cluster's
 * ObserveDataPoint stream into the shape the inline-SVG chart consumes.
 *
 * Two display modes per Observe Dashboard Spec §5.4:
 *
 *   - `numeric` — when every point's `measurementValue` is a finite
 *     number, the y-axis renders the numeric series with min/max scale.
 *   - `status` — fallback: y-axis renders ordinal status outputs
 *     (clear → potential_disqualifier) so domains without a numeric
 *     measurement still get a meaningful trend track.
 *
 * Empty-state predicate matches the spec ("trends require ≥2
 * observations at the same location"): callers branch on
 * `points.length < 2` BEFORE calling this — `buildSeries` itself
 * tolerates short series so tests can introspect single-point behaviour.
 */

import type { ObserveDataPoint, ObserveStatusOutput } from '@ogden/shared';

export type TemporalChartMode = 'numeric' | 'status';

export interface TemporalPoint {
  /** Original data point for tooltips + downstream lookups. */
  point: ObserveDataPoint;
  /** Capture time in ms (Date.parse(capturedAt)). */
  timeMs: number;
  /** Numeric y-value mapped from measurement OR status ordinal. */
  yValue: number;
}

export interface TemporalSeries {
  mode: TemporalChartMode;
  points: readonly TemporalPoint[];
  yMin: number;
  yMax: number;
  /** Status ordinal labels in y-axis order (top → bottom). status mode only. */
  statusLabels?: readonly ObserveStatusOutput[];
}

/** Worst-to-best ordering — higher ordinal = more divergent. */
export const STATUS_ORDINAL: Record<ObserveStatusOutput, number> = {
  clear: 0,
  unknown: 1,
  needs_investigation: 2,
  major_constraint: 3,
  potential_disqualifier: 4,
};

const STATUS_AXIS_LABELS: readonly ObserveStatusOutput[] = [
  'potential_disqualifier',
  'major_constraint',
  'needs_investigation',
  'unknown',
  'clear',
];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function readNumericMeasurement(point: ObserveDataPoint): number | null {
  const value = point.measurementValue as unknown;
  if (isFiniteNumber(value)) return value;
  // Handle `{ value: number }` shape that some logged_result captures use.
  if (
    value &&
    typeof value === 'object' &&
    'value' in (value as Record<string, unknown>)
  ) {
    const inner = (value as Record<string, unknown>).value;
    if (isFiniteNumber(inner)) return inner;
  }
  return null;
}

export function buildSeries(
  points: readonly ObserveDataPoint[],
): TemporalSeries {
  const sortedAsc = [...points].sort(
    (a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt),
  );
  const numericValues = sortedAsc.map(readNumericMeasurement);
  const allNumeric =
    numericValues.length > 0 && numericValues.every((v) => v !== null);

  if (allNumeric) {
    const built: TemporalPoint[] = sortedAsc.map((point, i) => ({
      point,
      timeMs: Date.parse(point.capturedAt),
      yValue: numericValues[i] as number,
    }));
    const yValues = built.map((p) => p.yValue);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    return {
      mode: 'numeric',
      points: built,
      yMin,
      yMax: yMax === yMin ? yMax + 1 : yMax,
    };
  }

  const built: TemporalPoint[] = sortedAsc.map((point) => ({
    point,
    timeMs: Date.parse(point.capturedAt),
    yValue: STATUS_ORDINAL[point.statusOutput] ?? 0,
  }));
  return {
    mode: 'status',
    points: built,
    yMin: 0,
    yMax: STATUS_ORDINAL.potential_disqualifier,
    statusLabels: STATUS_AXIS_LABELS,
  };
}
