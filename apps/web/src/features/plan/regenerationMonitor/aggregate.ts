/**
 * Pure aggregation for the Regeneration Monitor dashboard (Sub-project A1).
 *
 * Turns a flat list of regeneration_events into per-metric, per-zone
 * trajectories plus an on-track / lagging verdict against the
 * regenerative-farm goal tree. No network, no React, no store access —
 * everything here is deterministic and unit-tested.
 *
 * "Year 0" is the earliest dated sample for a metric (the MDPI study's
 * baseline convention). A goal criterion's `deadlineYear` is interpreted
 * as years after that baseline; expected progress is linear from
 * baseline → target over the deadline window.
 */

import type { RegenerationEvent } from '@ogden/shared';
import {
  MONITORED_METRICS,
  MONITORED_METRIC_KEYS,
  metricKeysForDomain,
  readTypedObservations,
  type MetricDomain,
  type MonitoredMetricKey,
} from '@ogden/shared';

export const SITE_WIDE_ZONE = 'Site-wide';

export type Verdict = 'on-track' | 'lagging' | 'no-target' | 'insufficient-data';

export interface SamplePoint {
  /** YYYY-MM-DD. */
  date: string;
  value: number;
}

export interface ZoneSeries {
  zoneRef: string;
  points: SamplePoint[];
}

export interface MetricTrajectory {
  key: MonitoredMetricKey;
  label: string;
  unit: string;
  higherIsBetter: boolean;
  /** Goal criterion target value, if this metric is scored. */
  target: number | null;
  /** Years after baseline the target is due, if scored. */
  deadlineYear: number | null;
  /** Earliest sample across all zones (the year-0 anchor). */
  baseline: SamplePoint | null;
  /** Latest sample across all zones. */
  latest: SamplePoint | null;
  /** One series per zoneRef, each sorted ascending by date. */
  series: ZoneSeries[];
  verdict: Verdict;
  /**
   * Linear-interpolated value the metric *should* have reached by the
   * latest sample date to stay on pace. `null` when not scored or
   * insufficient data.
   */
  expectedNow: number | null;
}

export interface GoalCriterionTarget {
  target: number;
  deadlineYear: number;
}

/** criterionId → { target, deadlineYear }, flattened from a GoalTree. */
export type GoalTargetLookup = Record<string, GoalCriterionTarget>;

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

function parseLocalDate(isoDate: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(isoDate);
  return d.getTime();
}

function yearsBetween(fromIso: string, toIso: string): number {
  return (parseLocalDate(toIso) - parseLocalDate(fromIso)) / MS_PER_YEAR;
}

function computeVerdict(
  traj: Omit<MetricTrajectory, 'verdict' | 'expectedNow'>,
): { verdict: Verdict; expectedNow: number | null } {
  if (traj.target == null || traj.deadlineYear == null || traj.deadlineYear <= 0) {
    return { verdict: 'no-target', expectedNow: null };
  }
  const { baseline, latest } = traj;
  // Need a baseline and a strictly-later sample to judge a trajectory.
  if (
    !baseline ||
    !latest ||
    baseline.date === latest.date ||
    yearsBetween(baseline.date, latest.date) <= 0
  ) {
    return { verdict: 'insufficient-data', expectedNow: null };
  }

  const elapsed = yearsBetween(baseline.date, latest.date);
  const fractionDue = Math.min(elapsed / traj.deadlineYear, 1);
  const expectedNow =
    baseline.value + (traj.target - baseline.value) * fractionDue;

  // Small tolerance so floating-point noise doesn't flip a verdict.
  const eps = Math.abs(traj.target - baseline.value) * 1e-6 + 1e-9;
  const onTrack = traj.higherIsBetter
    ? latest.value >= expectedNow - eps
    : latest.value <= expectedNow + eps;

  return { verdict: onTrack ? 'on-track' : 'lagging', expectedNow };
}

/**
 * Build the full set of metric trajectories. Every monitored metric is
 * always returned (even with zero samples) so the dashboard can render a
 * stable, complete grid; `series` is simply empty when nothing is logged.
 *
 * `domain` scopes the result to one dashboard family (the A1
 * Regeneration Monitor passes `'regeneration'`, the A3 Biodiversity
 * Outcome Monitor passes `'biodiversity'`). Omitting it preserves the
 * original all-keys behaviour for back-compat.
 */
export function buildTrajectories(
  events: RegenerationEvent[],
  goalTargets: GoalTargetLookup,
  domain?: MetricDomain,
): MetricTrajectory[] {
  const keys = domain ? metricKeysForDomain(domain) : MONITORED_METRIC_KEYS;

  // metricKey → zoneRef → points
  const byMetric = new Map<MonitoredMetricKey, Map<string, SamplePoint[]>>();
  for (const key of keys) byMetric.set(key, new Map());

  for (const ev of events) {
    if (!ev.eventDate) continue;
    const { metrics, zoneRef } = readTypedObservations(ev.observations);
    const zone = zoneRef ?? SITE_WIDE_ZONE;
    for (const key of keys) {
      const value = metrics[key];
      if (value == null) continue;
      const zoneMap = byMetric.get(key)!;
      const points = zoneMap.get(zone) ?? [];
      points.push({ date: ev.eventDate, value });
      zoneMap.set(zone, points);
    }
  }

  return keys.map((key) => {
    const meta = MONITORED_METRICS[key];
    const zoneMap = byMetric.get(key)!;

    const series: ZoneSeries[] = [...zoneMap.entries()]
      .map(([zoneRef, points]) => ({
        zoneRef,
        points: points
          .slice()
          .sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date)),
      }))
      .sort((a, b) => a.zoneRef.localeCompare(b.zoneRef));

    const allPoints = series.flatMap((s) => s.points);
    let baseline: SamplePoint | null = null;
    let latest: SamplePoint | null = null;
    for (const p of allPoints) {
      if (!baseline || parseLocalDate(p.date) < parseLocalDate(baseline.date)) {
        baseline = p;
      }
      if (!latest || parseLocalDate(p.date) > parseLocalDate(latest.date)) {
        latest = p;
      }
    }

    const goal = meta.goalCriterionId
      ? goalTargets[meta.goalCriterionId] ?? null
      : null;

    const partial: Omit<MetricTrajectory, 'verdict' | 'expectedNow'> = {
      key,
      label: meta.label,
      unit: meta.unit,
      higherIsBetter: meta.higherIsBetter,
      target: goal?.target ?? null,
      deadlineYear: goal?.deadlineYear ?? null,
      baseline,
      latest,
      series,
    };

    const { verdict, expectedNow } = computeVerdict(partial);
    return { ...partial, verdict, expectedNow };
  });
}

/** Flatten a goal tree's criteria into the lookup the aggregator needs. */
export function flattenGoalTargets(
  subGoals: { criteria: { id: string; target: number; deadlineYear: number }[] }[],
): GoalTargetLookup {
  const out: GoalTargetLookup = {};
  for (const sg of subGoals) {
    for (const c of sg.criteria) {
      out[c.id] = { target: c.target, deadlineYear: c.deadlineYear };
    }
  }
  return out;
}
