/**
 * livestockRevenue — Phase C.7 bridge between the rotation engine and the
 * cashflow engine.
 *
 * Apricot Lane Validation Protocol Phase C closes the
 * rotation → revenue pipeline. `rotationEngine.computeRotationCalendar(...)`
 * produces an annual AU-day mob-occupancy figure; this module turns that
 * figure into a `RevenueStream` shaped exactly like the streams that
 * `cashflowEngine.computeCashflow(...)` already consumes. No engine change
 * is required: the new stream slots into the existing
 * `RevenueStream[]` array.
 *
 * Pricing is left to the caller (USD per AU-day, low/mid/high band). The
 * 5-year herd build-up ramp is the protocol default — confidence-medium,
 * not a forecast.
 */

import type { CostRange, RevenueStream } from './types.js';
import type { RotationCalendar } from '../../livestock/engine/rotationEngine.js';

export interface LivestockPricing {
  /** USD per AU-day. Caller picks the band; engine multiplies by annualAuDays. */
  pricePerAuDay: CostRange;
  /** First cashflow year revenue is non-zero (default 1 — herd arrives in Y1). */
  startYear?: number;
  /** Year the ramp reaches 1.0 (default startYear + 4 → 5-year build-up). */
  maturityYear?: number;
  confidence?: 'low' | 'medium' | 'high';
  /** Free-text assumption lines appended to the stream's `assumptions[]`. */
  assumptions?: string[];
  /** Stable id override (default `'revenue-livestock-rotation'`). */
  id?: string;
  /** Human-readable name (default `'Livestock — rotational grazing'`). */
  name?: string;
}

/** Default 5-year herd build-up: 20% → 40% → 65% → 85% → 100%. */
const DEFAULT_BUILDUP_CURVE: readonly number[] = [0.2, 0.4, 0.65, 0.85, 1.0];

export function buildLivestockRevenueStream(
  calendar: RotationCalendar,
  pricing: LivestockPricing,
): RevenueStream {
  const startYear = pricing.startYear ?? 1;
  const maturityYear = pricing.maturityYear ?? startYear + DEFAULT_BUILDUP_CURVE.length - 1;
  const auDays = Math.max(0, calendar.annualAuDays);

  const annualRevenue: CostRange = {
    low: Math.round(pricing.pricePerAuDay.low * auDays),
    mid: Math.round(pricing.pricePerAuDay.mid * auDays),
    high: Math.round(pricing.pricePerAuDay.high * auDays),
  };

  const rampSchedule: Record<number, number> = {};
  for (let y = 0; y <= 10; y++) {
    if (y < startYear) {
      rampSchedule[y] = 0;
      continue;
    }
    const offset = y - startYear;
    const curveIdx = Math.min(offset, DEFAULT_BUILDUP_CURVE.length - 1);
    rampSchedule[y] = DEFAULT_BUILDUP_CURVE[curveIdx] ?? 1.0;
  }

  const assumptions: string[] = [
    `${calendar.inputs.herdSize} AU mob × 365 days = ${auDays.toLocaleString()} AU-days/yr`,
    `Rotation cycle: ${calendar.cycleDays} days across ${calendar.inputs.paddockCount} paddocks (${calendar.inputs.grazeDaysPerPaddock} d graze each)`,
    calendar.parasiteBreakCompliant
      ? `Parasite-break floor met (${calendar.inputs.parasiteBreakDays}d minimum rest)`
      : `WARNING: parasite-break floor NOT met — recovery ${calendar.cycleDays - calendar.inputs.grazeDaysPerPaddock}d < ${calendar.inputs.parasiteBreakDays}d`,
    `Utilization: ${calendar.utilizationPct}% (${calendar.status})`,
    `Herd build-up ramp: 5-year curve (20/40/65/85/100%)`,
    ...(pricing.assumptions ?? []),
  ];

  return {
    id: pricing.id ?? 'revenue-livestock-rotation',
    name: pricing.name ?? 'Livestock — rotational grazing',
    enterprise: 'livestock',
    description: 'Annual mob-grazing revenue derived from rotation calendar AU-days.',
    annualRevenue,
    rampSchedule,
    startYear,
    maturityYear,
    confidence: pricing.confidence ?? 'medium',
    assumptions,
  };
}
