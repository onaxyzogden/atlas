/**
 * somAppreciation — D.4 unit tests.
 *
 * Covers the pure helper that converts a D.3 SOM trajectory into the
 * cumulative USD natural-capital appreciation series consumed by the
 * J-curve secondary axis.
 */

import { describe, it, expect } from 'vitest';
import {
  USD_PER_TC_DEFAULT,
  naturalCapitalAppreciationByYear,
  type SomYearRow,
} from '../somAppreciation.js';

function row(year: number, seq: number): SomYearRow {
  return {
    year,
    som_stock_tc: 7.308 + year * 0.1,
    sequestration_tcyr: seq,
    j_curve_stage: year <= 2 ? 'establishment' : year <= 5 ? 'build-up' : 'maturation',
  };
}

describe('naturalCapitalAppreciationByYear', () => {
  it('returns an empty record on empty trajectory', () => {
    expect(naturalCapitalAppreciationByYear({ trajectory: [], acres: 200 })).toEqual({});
  });

  it('cumulative is monotone non-decreasing across the horizon', () => {
    const trajectory = [row(0, 0), row(1, 0), row(2, 0.25), row(3, 0.6), row(6, 1.0)];
    const out = naturalCapitalAppreciationByYear({ trajectory, acres: 200 });
    const years = Object.keys(out).map(Number).sort((a, b) => a - b);
    for (let i = 1; i < years.length; i++) {
      expect(out[years[i]!]).toBeGreaterThanOrEqual(out[years[i - 1]!]!);
    }
  });

  it('respects usdPerTc override', () => {
    const trajectory = [row(0, 1.0)];
    const a = naturalCapitalAppreciationByYear({ trajectory, acres: 100, usdPerTc: 100 });
    const b = naturalCapitalAppreciationByYear({ trajectory, acres: 100, usdPerTc: 50 });
    expect(a[0]).toBeCloseTo(b[0]! * 2, 2);
  });

  it('uses USD_PER_TC_DEFAULT when no override is supplied', () => {
    const trajectory = [row(0, 1.0)];
    const expected = +(1.0 * 100 * 0.4047 * USD_PER_TC_DEFAULT).toFixed(2);
    const out = naturalCapitalAppreciationByYear({ trajectory, acres: 100 });
    expect(out[0]).toBeCloseTo(expected, 2);
  });

  it('pre-regen zero-sequestration years do not advance the cumulative', () => {
    const trajectory = [row(0, 0), row(1, 0), row(2, 0.5)];
    const out = naturalCapitalAppreciationByYear({ trajectory, acres: 200 });
    expect(out[0]).toBe(0);
    expect(out[1]).toBe(0);
    expect(out[2]).toBeGreaterThan(0);
  });
});
