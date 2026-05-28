// observeFreshness.ts
//
// Per-domain freshness classifier for the OLOS Observe Dashboard
// (Dashboard Spec §2.3). The spec ships four buckets — current,
// ageing, stale, missing — driven entirely by the wall-clock age of
// the most recent active capture against per-domain thresholds.
//
// Thresholds come from the domain catalog
// (`packages/shared/src/constants/observe/domains.ts`). The dashboard
// reads them at render time so soil (annual) and climate (seasonal)
// classify on the right cadence without recompiling the helper.
//
// Pure I/O-free so it can run on the server (presentation share
// viewer + future digest emails) without dragging a store along.

import type { ObserveDataPoint } from '../schemas/observe/dataPoint.schema.js';

export type ObserveFreshness = 'current' | 'ageing' | 'stale' | 'missing';

export interface FreshnessThresholds {
  /** Captures younger than this read as `current`. */
  currentMaxDays: number;
  /** Captures younger than this (but older than current) read as
   *  `ageing`. Older than this read as `stale`. */
  ageingMaxDays: number;
}

const MS_PER_DAY = 86_400_000;

/**
 * Classify a single capture against its domain's thresholds. A `null`
 * point — or any input without a parseable `capturedAt` — reads as
 * `missing`, never as `stale`, so the dashboard distinguishes "no one
 * has ever observed this" from "the last observation has aged out."
 */
export function computeFreshness(
  point: Pick<ObserveDataPoint, 'capturedAt'> | null | undefined,
  now: Date | number,
  thresholds: FreshnessThresholds,
): ObserveFreshness {
  if (!point || !point.capturedAt) return 'missing';
  const capturedAtMs = Date.parse(point.capturedAt);
  if (!Number.isFinite(capturedAtMs)) return 'missing';
  const nowMs = typeof now === 'number' ? now : now.getTime();
  const ageDays = (nowMs - capturedAtMs) / MS_PER_DAY;
  if (ageDays <= thresholds.currentMaxDays) return 'current';
  if (ageDays <= thresholds.ageingMaxDays) return 'ageing';
  return 'stale';
}

/**
 * Pick the most recent active (non-superseded) capture for a domain
 * and classify it. Returns `missing` when the domain has zero active
 * captures — superseded rows do not rescue freshness because the
 * spec treats them as withdrawn (§4.3).
 */
export function computeDomainFreshness(
  points: readonly ObserveDataPoint[],
  now: Date | number,
  thresholds: FreshnessThresholds,
): ObserveFreshness {
  let latest: ObserveDataPoint | null = null;
  let latestMs = -Infinity;
  for (const p of points) {
    if (p.isSuperseded) continue;
    const ms = Date.parse(p.capturedAt);
    if (!Number.isFinite(ms)) continue;
    if (ms > latestMs) {
      latest = p;
      latestMs = ms;
    }
  }
  return computeFreshness(latest, now, thresholds);
}
