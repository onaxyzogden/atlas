// temporalBuilders.ts -- read-side builder for the Timeline (TemporalView)
// series: one charted metric per lens, derived from REAL captured proof items.
//
// Sibling of specialisedBuilders.ts and built on the same slot-binding
// contract: a proof SLOT declares (design-time) which lens viz field its
// captures feed via `measurementBinding`; a proof ITEM (runtime) points back
// at the slot by `slotId`. Two candidate sources feed a temporal series:
//
//   1. Bound `logged_result` rows whose viz field carries an honest scalar
//      trend (infiltration rate, soil pH, capacity %, wind speed). Other viz
//      fields (water.sources, topography.elevationZones/slopeBreakdown,
//      climate.microclimates, human.consentItems, infrastructure
//      .suggestedTasks) are categorical/structural inventories -- charting
//      them as a line would fabricate a measurement, so they are excluded.
//   2. Scalar `measurement` items with a finite `measurementValue` whose slot
//      resolves through `getSlot` (i.e. is bound to a known schema). Unbound
//      items are SKIPPED: slotIds are not globally unique, so charting
//      unresolved slots together could stitch unrelated readings into a
//      fabricated trend.
//
// Unlike specialisedBuilders (which flattens proof items), this walks the
// carrying ObserveDataPoint per item because two series fields live on the
// POINT, not the proof: the cycle label comes from `point.cycleId` and the
// scalar fallback location from `point.domainId`.
//
// One series per lens: the metric with the most points wins (tie -> earliest
// first capture); points sort ascending by capture time; null unless >= 2
// points (matches TemporalView's ">= 2 observations" empty copy). Never
// fabricate.
//
// PURE: no React, no stores. The slot resolver is injected (`getSlot`), same
// seam as specialisedBuilders.ts.

import {
  InfiltrationReadingSchema,
  SoilPhReadingSchema,
  CapacityReadingSchema,
  WindObservationSchema,
  UNIVERSAL_DOMAIN_LABELS,
  type MeasurementVizField as MeasurementVizFieldT,
  type ObserveDataPoint,
  type ObserveLensId,
} from '@ogden/shared';
import { format } from 'date-fns';
import type { LensTemporal, TemporalSeriesPoint } from '../types.js';
import type { SlotResolver } from './specialisedBuilders.js';

// One scalar-trend extractor for a bound logged_result viz field.
interface TrendExtractor {
  vizField: MeasurementVizFieldT;
  metric: string;
  extract: (row: Record<string, unknown>) => { value: number; location: string } | null;
}

// The viz fields that carry an honest scalar trend, per lens. See the module
// comment for why the remaining viz fields are excluded.
const LOGGED_TRENDS: Partial<Record<ObserveLensId, readonly TrendExtractor[]>> = {
  water: [
    {
      vizField: 'water.infiltrationData',
      metric: 'Infiltration rate (mm/hr)',
      extract: (row) => {
        const p = InfiltrationReadingSchema.safeParse(row);
        return p.success ? { value: p.data.rate, location: p.data.zone } : null;
      },
    },
  ],
  living: [
    {
      vizField: 'soil.phData',
      metric: 'Soil pH',
      extract: (row) => {
        const p = SoilPhReadingSchema.safeParse(row);
        return p.success ? { value: p.data.ph, location: p.data.zone } : null;
      },
    },
  ],
  climate: [
    {
      vizField: 'climate.windRose',
      metric: 'Wind speed (km/h)',
      extract: (row) => {
        const p = WindObservationSchema.safeParse(row);
        // m/s -> km/h, same conversion as the specialised wind rose.
        return p.success
          ? { value: Math.round(p.data.speedMs * 3.6), location: p.data.dir }
          : null;
      },
    },
  ],
  human: [
    {
      vizField: 'human.capacityBars',
      metric: 'Capacity (%)',
      extract: (row) => {
        const p = CapacityReadingSchema.safeParse(row);
        return p.success ? { value: p.data.pct, location: p.data.label } : null;
      },
    },
  ],
};

/** 'Baseline' for cycle 0, else 'Cycle N'. (DataPointRow labels the same id
 *  `Cycle ${cycleId + 1}` -- a known divergence of conventions, not unified
 *  here; the Timeline keeps the Baseline-anchored mock vocabulary.) */
function cycleLabel(cycleId: number): string {
  return cycleId === 0 ? 'Baseline' : `Cycle ${cycleId}`;
}

function parseMs(iso: string): number | null {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

interface MutableSeries {
  metric: string;
  pts: Array<TemporalSeriesPoint & { ms: number }>;
}

/**
 * Build the Timeline series for one lens from its active data points, or null
 * when no candidate metric has >= 2 readings (honest empty state).
 */
export function buildTemporalForLens(
  lensId: ObserveLensId,
  points: readonly ObserveDataPoint[],
  getSlot: SlotResolver,
): LensTemporal | null {
  const extractors = LOGGED_TRENDS[lensId] ?? [];
  const byMetric = new Map<string, MutableSeries>();

  const push = (
    metric: string,
    ms: number,
    cycleId: number,
    value: number,
    location: string,
  ): void => {
    const pt = { cycle: cycleLabel(cycleId), date: format(ms, 'MMM yy'), value, location, ms };
    const series = byMetric.get(metric);
    if (series) series.pts.push(pt);
    else byMetric.set(metric, { metric, pts: [pt] });
  };

  for (const point of points) {
    for (const item of point.proofItems ?? []) {
      const ms = parseMs(item.capturedAt);
      if (ms === null || !item.slotId) continue;
      const slot = getSlot(item.slotId);
      if (!slot) continue;

      if (item.proofType === 'logged_result') {
        const binding = slot.measurementBinding;
        if (!binding) continue;
        const ex = extractors.find((e) => e.vizField === binding.vizField);
        if (!ex) continue;
        const row =
          item.loggedResult && typeof item.loggedResult === 'object'
            ? (item.loggedResult as Record<string, unknown>)
            : {};
        const got = ex.extract(row);
        if (got) push(ex.metric, ms, point.cycleId, got.value, got.location);
      } else if (
        item.proofType === 'measurement' &&
        typeof item.measurementValue === 'number' &&
        Number.isFinite(item.measurementValue)
      ) {
        const unit = item.measurementUnit ?? slot.measurementUnit;
        const metric = unit ? `${slot.label} (${unit})` : slot.label;
        // Scalar slots carry no per-reading zone; the carrying point's domain
        // is the most honest "where" available.
        push(
          metric,
          ms,
          point.cycleId,
          item.measurementValue,
          UNIVERSAL_DOMAIN_LABELS[point.domainId],
        );
      }
    }
  }

  // One series per lens: most points wins; tie -> earliest first capture.
  const firstMs = (s: MutableSeries): number => Math.min(...s.pts.map((p) => p.ms));
  let best: MutableSeries | null = null;
  for (const s of byMetric.values()) {
    if (s.pts.length < 2) continue;
    if (
      !best ||
      s.pts.length > best.pts.length ||
      (s.pts.length === best.pts.length && firstMs(s) < firstMs(best))
    ) {
      best = s;
    }
  }
  if (!best) return null;

  const sorted = [...best.pts].sort((a, b) => a.ms - b.ms);
  return {
    metric: best.metric,
    points: sorted.map(({ ms: _ms, ...pt }) => pt),
  };
}
