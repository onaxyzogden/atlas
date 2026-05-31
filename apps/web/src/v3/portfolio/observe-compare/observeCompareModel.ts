/**
 * observeCompareModel — pure helpers for the cross-project Observe comparison
 * surface (OLOS Portfolio Home Spec §6, plan P6). Strictly READ-ONLY: every
 * function derives from the client-side Phase-4 `ObserveDataPoint` store
 * (`useObserveDataPointStore.byProject`) — the source of truth for numeric
 * measurements + capture timestamps. No backend read, no mutation.
 *
 * Design notes:
 *   - The comparison axis is **calendar date** (`capturedAt`), NOT observe
 *     cycle — two projects on different cadences must still align in real
 *     time (§6, §9.3).
 *   - Domain availability is the **intersection** of domains present in the
 *     active points of EVERY selected project; a domain only one project has
 *     is not comparable (§9.3).
 *   - Metric mode is auto-detected: `numeric` when every active point across
 *     all selected projects (for the chosen domain) carries a finite numeric
 *     measurement; otherwise `status` (ordinal track), mirroring
 *     `temporalSeries.buildSeries`.
 *   - Each series carries a climate context (P4 `deriveClimateContext`) so a
 *     reading is read in seasonal/hemispheric context.
 */

import type { ObserveDataPoint, ObserveStatusOutput, UniversalDomain } from '@ogden/shared';
import { deriveClimateContext, type ClimateContext } from '@ogden/shared';
import { STATUS_ORDINAL } from '../../observe/dashboard/temporal/temporalSeries.js';

export type CompareMetricMode = 'numeric' | 'status';
export type CompareTrend = 'up' | 'down' | 'flat';

/** Minimal project descriptor the comparison needs (id, name, map anchor). */
export interface CompareProjectMeta {
  id: string;
  name: string;
  /** [lng, lat] map centroid, or null when the project has no location. */
  centroid: [number, number] | null;
}

/** A single plotted observation within a project's series. */
export interface ComparePoint {
  timeMs: number;
  /** Numeric measurement OR status ordinal depending on mode. */
  yValue: number;
  point: ObserveDataPoint;
}

/** One project's full comparison series + summary stats + climate badge. */
export interface CompareSeries {
  projectId: string;
  projectName: string;
  color: string;
  points: ComparePoint[];
  /** Earliest reading (chronological). */
  baseline: ComparePoint | null;
  /** Latest reading (chronological). */
  current: ComparePoint | null;
  /** Signed numeric delta (numeric mode) or ordinal delta (status mode). */
  change: number | null;
  /** Value direction current-vs-baseline (interpretation is display's job). */
  trend: CompareTrend;
  /** Climate context at the latest reading's date + project latitude. */
  climate: ClimateContext | null;
}

export interface CompareResult {
  mode: CompareMetricMode;
  series: CompareSeries[];
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  /** Status-axis ordinal labels (top → bottom); status mode only. */
  statusLabels?: readonly ObserveStatusOutput[];
}

/**
 * Distinguishable line colours for up to the §6 cap of 5 projects. Tuned for
 * the dark Observe-chart canvas (mirrors TemporalChart's warm palette but
 * spreads hue so overlapping lines stay separable).
 */
export const COMPARE_PROJECT_COLORS: readonly string[] = [
  '#c4a265', // estate gold (primary line, matches TemporalChart POINT_STROKE)
  '#6c8294', // flint blue
  '#4a7c59', // conifer green
  '#d9a036', // loam amber
  '#a87fb0', // muted lilac
];

/** Worst-to-best status order for the y-axis (status mode). */
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

/** Read a finite numeric measurement, tolerating the `{ value: number }` shape. */
export function readNumericMeasurement(point: ObserveDataPoint): number | null {
  const value = point.measurementValue as unknown;
  if (isFiniteNumber(value)) return value;
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

/** Active (non-superseded) points for a project from the store's byProject map. */
function activePoints(
  byProject: Record<string, readonly ObserveDataPoint[]>,
  projectId: string,
): readonly ObserveDataPoint[] {
  return (byProject[projectId] ?? []).filter((p) => !p.isSuperseded);
}

/**
 * Projects that have at least one active data point — the only ones eligible
 * to enter a comparison (projects with no Observe data are excluded with a
 * notice in the UI, §9.3).
 */
export function selectableProjectIds(
  byProject: Record<string, readonly ObserveDataPoint[]>,
  candidateIds: readonly string[],
): string[] {
  return candidateIds.filter((id) => activePoints(byProject, id).length > 0);
}

/**
 * Domains present in the active points of EVERY selected project — the
 * comparable set. Empty when the selected projects share no domain.
 */
export function domainIntersection(
  byProject: Record<string, readonly ObserveDataPoint[]>,
  projectIds: readonly string[],
): UniversalDomain[] {
  if (projectIds.length === 0) return [];
  const perProject = projectIds.map((id) => {
    const set = new Set<UniversalDomain>();
    for (const p of activePoints(byProject, id)) set.add(p.domainId);
    return set;
  });
  const [first, ...rest] = perProject;
  if (!first) return [];
  const result: UniversalDomain[] = [];
  for (const domain of first) {
    if (rest.every((s) => s.has(domain))) result.push(domain);
  }
  return result;
}

/**
 * True when every active point (across all selected projects, for the chosen
 * domain) carries a finite numeric measurement — selects `numeric` mode.
 */
function detectNumericMode(
  byProject: Record<string, readonly ObserveDataPoint[]>,
  projectIds: readonly string[],
  domainId: UniversalDomain,
): boolean {
  let sawPoint = false;
  for (const id of projectIds) {
    for (const p of activePoints(byProject, id)) {
      if (p.domainId !== domainId) continue;
      sawPoint = true;
      if (readNumericMeasurement(p) === null) return false;
    }
  }
  return sawPoint;
}

function trendOf(change: number | null): CompareTrend {
  if (change === null || change === 0) return 'flat';
  return change > 0 ? 'up' : 'down';
}

/**
 * Build the full comparison for the chosen domain across the selected
 * projects. Series are chronologically sorted by capture time; baseline =
 * earliest, current = latest. Climate context is derived from each project's
 * latitude (centroid[1]) at its latest reading's date.
 */
export function buildComparison(
  metas: readonly CompareProjectMeta[],
  byProject: Record<string, readonly ObserveDataPoint[]>,
  projectIds: readonly string[],
  domainId: UniversalDomain,
): CompareResult {
  const mode: CompareMetricMode = detectNumericMode(byProject, projectIds, domainId)
    ? 'numeric'
    : 'status';

  const metaById = new Map(metas.map((m) => [m.id, m]));

  const series: CompareSeries[] = projectIds.map((id, i) => {
    const meta = metaById.get(id);
    const raw = activePoints(byProject, id)
      .filter((p) => p.domainId === domainId)
      .slice()
      .sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));

    const points: ComparePoint[] = raw.map((point) => ({
      timeMs: Date.parse(point.capturedAt),
      yValue:
        mode === 'numeric'
          ? (readNumericMeasurement(point) ?? 0)
          : (STATUS_ORDINAL[point.statusOutput] ?? 0),
      point,
    }));

    const baseline = points[0] ?? null;
    const current = points[points.length - 1] ?? null;
    const change =
      baseline && current ? current.yValue - baseline.yValue : null;

    let climate: ClimateContext | null = null;
    if (meta?.centroid && current) {
      const lat = meta.centroid[1];
      const date = new Date(current.point.capturedAt);
      if (Number.isFinite(lat) && !Number.isNaN(date.getTime())) {
        climate = deriveClimateContext(lat, date);
      }
    }

    return {
      projectId: id,
      projectName: meta?.name ?? 'Project',
      color:
        COMPARE_PROJECT_COLORS[i % COMPARE_PROJECT_COLORS.length] ??
        COMPARE_PROJECT_COLORS[0]!,
      points,
      baseline,
      current,
      change,
      trend: trendOf(change),
      climate,
    };
  });

  const allPoints = series.flatMap((s) => s.points);
  const times = allPoints.map((p) => p.timeMs);
  const xMin = times.length ? Math.min(...times) : 0;
  const xMax = times.length ? Math.max(...times) : 1;

  if (mode === 'numeric') {
    const ys = allPoints.map((p) => p.yValue);
    const yMin = ys.length ? Math.min(...ys) : 0;
    const yMaxRaw = ys.length ? Math.max(...ys) : 1;
    return {
      mode,
      series,
      xMin,
      xMax: xMax === xMin ? xMin + 1 : xMax,
      yMin,
      yMax: yMaxRaw === yMin ? yMaxRaw + 1 : yMaxRaw,
    };
  }

  return {
    mode,
    series,
    xMin,
    xMax: xMax === xMin ? xMin + 1 : xMax,
    yMin: 0,
    yMax: STATUS_ORDINAL.potential_disqualifier,
    statusLabels: STATUS_AXIS_LABELS,
  };
}
