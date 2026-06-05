/**
 * soilRegeneration — D.3 SOM trajectory unit tests.
 *
 * Covers the pure helpers (`somPctToStockTcha`, `projectSomTrajectory`) added
 * for the J-curve secondary axis. Stage labelling must mirror D.1's
 * TransitionPhase exactly so the migration-031 CHECK constraint and the web
 * JCurveChart axis use the same vocabulary.
 */

import { describe, it, expect } from 'vitest';
import {
  ESTABLISHMENT_RATE_FRACTION,
  BUILD_UP_RATE_FRACTION,
  MATURATION_RATE_FRACTION,
  projectSomTrajectory,
  projectSomTrajectoryWithZones,
  somPctToStockTcha,
} from '../soilRegeneration.js';

describe('somPctToStockTcha', () => {
  it('matches the conventional coefficient at defaults (3.0% SOM ≈ 7.308 tC/ha)', () => {
    // 3.0 × 0.58 × 1.4 × 30 × 0.1 = 7.308
    expect(somPctToStockTcha(3.0)).toBeCloseTo(7.308, 3);
  });

  it('scales with bulk density and depth overrides', () => {
    // 3.0 × 0.58 × 1.2 × 20 × 0.1 = 4.176
    expect(somPctToStockTcha(3.0, { bulkDensityGcm3: 1.2, depthCm: 20 })).toBeCloseTo(4.176, 3);
  });

  it('rounds to 3 decimal places', () => {
    const stock = somPctToStockTcha(2.71828);
    expect(stock).toBe(+stock.toFixed(3));
  });
});

describe('projectSomTrajectory — shape', () => {
  it('emits horizonYears + 1 rows starting at year 0', () => {
    const rows = projectSomTrajectory({
      baseline_pct: 2.0,
      target_pct: 4.0,
      annualSeqRate_tChaYr: 0.5,
      horizonYears: 10,
    });
    expect(rows).toHaveLength(11);
    expect(rows[0]!.year).toBe(0);
    expect(rows[10]!.year).toBe(10);
  });

  it('caps stock at target and never exceeds it', () => {
    const rows = projectSomTrajectory({
      baseline_pct: 2.0,
      target_pct: 4.0,
      annualSeqRate_tChaYr: 0.5,
      horizonYears: 10,
    });
    const targetStock = somPctToStockTcha(4.0);
    for (const row of rows) {
      expect(row.som_stock_tc).toBeLessThanOrEqual(targetStock + 1e-9);
    }
  });

  it('produces monotone non-decreasing stock across the horizon', () => {
    const rows = projectSomTrajectory({
      baseline_pct: 2.0,
      target_pct: 4.0,
      annualSeqRate_tChaYr: 0.5,
      horizonYears: 10,
    });
    for (let y = 1; y < rows.length; y++) {
      expect(rows[y]!.som_stock_tc).toBeGreaterThanOrEqual(rows[y - 1]!.som_stock_tc);
    }
  });
});

describe('projectSomTrajectory — stage labelling', () => {
  it('labels years 0-2 establishment, 3-5 build-up, 6+ maturation', () => {
    const rows = projectSomTrajectory({
      baseline_pct: 2.0,
      target_pct: 10.0,
      annualSeqRate_tChaYr: 0.5,
      horizonYears: 10,
    });
    expect(rows[0]!.j_curve_stage).toBe('establishment');
    expect(rows[1]!.j_curve_stage).toBe('establishment');
    expect(rows[2]!.j_curve_stage).toBe('establishment');
    expect(rows[3]!.j_curve_stage).toBe('build-up');
    expect(rows[5]!.j_curve_stage).toBe('build-up');
    expect(rows[6]!.j_curve_stage).toBe('maturation');
    expect(rows[10]!.j_curve_stage).toBe('maturation');
  });

  it('shifts bands when regenerationStartYear > 0', () => {
    const rows = projectSomTrajectory({
      baseline_pct: 2.0,
      target_pct: 10.0,
      annualSeqRate_tChaYr: 0.5,
      horizonYears: 12,
      regenerationStartYear: 2,
    });
    // Pre-regen: still establishment, zero seq, baseline stock.
    const baselineStock = somPctToStockTcha(2.0);
    expect(rows[0]!.j_curve_stage).toBe('establishment');
    expect(rows[0]!.sequestration_tcyr).toBe(0);
    expect(rows[0]!.som_stock_tc).toBe(baselineStock);
    expect(rows[1]!.sequestration_tcyr).toBe(0);
    // Year 2 begins effective-year 0 — establishment ramp starts.
    expect(rows[2]!.j_curve_stage).toBe('establishment');
    expect(rows[2]!.sequestration_tcyr).toBeGreaterThan(0);
    // Year 7 is effective-year 5 → build-up; year 8 → maturation.
    expect(rows[7]!.j_curve_stage).toBe('build-up');
    expect(rows[8]!.j_curve_stage).toBe('maturation');
  });
});

describe('projectSomTrajectory — band-scalar magnitudes', () => {
  it('applies establishment scalar in year 0, build-up in year 3, maturation in year 6', () => {
    const seqRate = 1.0;
    const rows = projectSomTrajectory({
      baseline_pct: 2.0,
      target_pct: 100.0, // un-binding cap so headroom never limits
      annualSeqRate_tChaYr: seqRate,
      horizonYears: 10,
    });
    expect(rows[0]!.sequestration_tcyr).toBeCloseTo(seqRate * ESTABLISHMENT_RATE_FRACTION, 3);
    expect(rows[3]!.sequestration_tcyr).toBeCloseTo(seqRate * BUILD_UP_RATE_FRACTION, 3);
    expect(rows[6]!.sequestration_tcyr).toBeCloseTo(seqRate * MATURATION_RATE_FRACTION, 3);
  });
});

describe('projectSomTrajectory — cap behaviour', () => {
  it('zeros sequestration after the target stock is reached', () => {
    const rows = projectSomTrajectory({
      baseline_pct: 3.9,
      target_pct: 4.0,
      annualSeqRate_tChaYr: 10.0, // far over headroom — must clamp
      horizonYears: 5,
    });
    const targetStock = somPctToStockTcha(4.0);
    // First emitted year saturates immediately.
    expect(rows[0]!.som_stock_tc).toBe(targetStock);
    // All subsequent years stay pinned with zero further sequestration.
    for (let y = 1; y < rows.length; y++) {
      expect(rows[y]!.som_stock_tc).toBe(targetStock);
      expect(rows[y]!.sequestration_tcyr).toBe(0);
    }
  });
});

describe('projectSomTrajectoryWithZones — F.3 per-zone variant', () => {
  it('with no zones, returns the same projectRows as projectSomTrajectory', () => {
    const inputs = {
      baseline_pct: 1.2,
      target_pct: 3.0,
      annualSeqRate_tChaYr: 0.5,
      horizonYears: 10,
    };
    const { projectRows, zoneRows } = projectSomTrajectoryWithZones(inputs);
    expect(zoneRows).toEqual([]);
    expect(projectRows).toEqual(projectSomTrajectory(inputs));
  });

  it('with no zones (empty array), is still behaviour-identical to v1', () => {
    const inputs = {
      baseline_pct: 1.2,
      target_pct: 3.0,
      annualSeqRate_tChaYr: 0.5,
      horizonYears: 10,
    };
    const { projectRows, zoneRows } = projectSomTrajectoryWithZones({ ...inputs, zones: [] });
    expect(zoneRows).toEqual([]);
    expect(projectRows).toEqual(projectSomTrajectory(inputs));
  });

  it('emits one trajectory per input zone, each with horizonYears + 1 rows', () => {
    const { projectRows, zoneRows } = projectSomTrajectoryWithZones({
      baseline_pct: 1.2,
      target_pct: 3.0,
      annualSeqRate_tChaYr: 0.5,
      horizonYears: 5,
      zones: [
        { zoneId: 'food-prod-A', baseline_pct: 1.5, target_pct: 3.5, annualSeqRate_tChaYr: 0.7 },
        { zoneId: 'livestock-B', baseline_pct: 0.8, target_pct: 2.5, annualSeqRate_tChaYr: 0.6 },
      ],
    });

    expect(projectRows).toHaveLength(6);
    expect(zoneRows).toHaveLength(12); // 2 zones × 6 years

    const zoneA = zoneRows.filter((r) => r.zoneId === 'food-prod-A');
    const zoneB = zoneRows.filter((r) => r.zoneId === 'livestock-B');
    expect(zoneA).toHaveLength(6);
    expect(zoneB).toHaveLength(6);

    // Each zone trajectory is identical to a standalone projectSomTrajectory call
    // with the same per-zone inputs.
    const standaloneA = projectSomTrajectory({
      baseline_pct: 1.5,
      target_pct: 3.5,
      annualSeqRate_tChaYr: 0.7,
      horizonYears: 5,
    });
    for (let i = 0; i < zoneA.length; i++) {
      expect(zoneA[i]!.year).toBe(standaloneA[i]!.year);
      expect(zoneA[i]!.som_stock_tc).toBe(standaloneA[i]!.som_stock_tc);
      expect(zoneA[i]!.sequestration_tcyr).toBe(standaloneA[i]!.sequestration_tcyr);
      expect(zoneA[i]!.j_curve_stage).toBe(standaloneA[i]!.j_curve_stage);
    }
  });

  it('per-zone trajectories inherit regenerationStartYear from project input', () => {
    const { zoneRows } = projectSomTrajectoryWithZones({
      baseline_pct: 1.2,
      target_pct: 3.0,
      annualSeqRate_tChaYr: 0.5,
      horizonYears: 5,
      regenerationStartYear: 2,
      zones: [
        { zoneId: 'z1', baseline_pct: 1.5, target_pct: 3.5, annualSeqRate_tChaYr: 0.7 },
      ],
    });
    // Pre-regen years emit zero sequestration even at the zone level.
    expect(zoneRows[0]!.sequestration_tcyr).toBe(0);
    expect(zoneRows[1]!.sequestration_tcyr).toBe(0);
    expect(zoneRows[2]!.sequestration_tcyr).toBeGreaterThan(0);
  });
});
