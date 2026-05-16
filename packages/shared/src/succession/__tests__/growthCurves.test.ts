import { describe, expect, it } from 'vitest';
import {
  canopyAtAge,
  canopyFromCurve,
  matureCanopyM,
  resolveGrowthCurve,
} from '../growthCurves.js';
import { GENERIC_GROWTH_CURVES, SPECIES_GROWTH } from '../speciesData.js';

describe('canopyAtAge', () => {
  it('returns the first sample for ages below the seed range', () => {
    const c = canopyAtAge('oak-tree', 0);
    expect(c.canopyM).toBe(SPECIES_GROWTH['oak-tree']!.samples[0]!.c);
  });

  it('clamps to the mature canopy above matureAtYears', () => {
    // Year 100 should equal the canopy at matureAtYears (40 for oak),
    // not whatever is in the last seed sample (y=50). The plateau IS
    // matureAtYears.
    const matureValue = canopyAtAge(
      'oak-tree',
      SPECIES_GROWTH['oak-tree']!.matureAtYears,
    ).canopyM;
    const c100 = canopyAtAge('oak-tree', 100);
    expect(c100.canopyM).toBeCloseTo(matureValue, 5);
  });

  it('interpolates linearly between two adjacent samples', () => {
    // Apple samples: y=5 c=3, y=15 c=6 → at y=10 expect c=4.5
    const c = canopyAtAge('apple-tree', 10);
    expect(c.canopyM).toBeCloseTo(4.5, 5);
  });

  it('canopy is monotonically non-decreasing across the curve', () => {
    const ages = [1, 2, 3, 5, 8, 10, 15, 20, 30, 40, 50];
    let prev = 0;
    for (const a of ages) {
      const c = canopyAtAge('oak-tree', a);
      expect(c.canopyM).toBeGreaterThanOrEqual(prev);
      prev = c.canopyM;
    }
  });

  it('falls back to the generic medium curve for unknown species', () => {
    const generic = canopyFromCurve(GENERIC_GROWTH_CURVES.medium, 10);
    const unknown = canopyAtAge('does-not-exist', 10);
    expect(unknown.canopyM).toBeCloseTo(generic.canopyM, 5);
  });
});

describe('matureCanopyM', () => {
  it('matches the canopy at matureAtYears for a seeded species', () => {
    const oak = SPECIES_GROWTH['oak-tree']!;
    const expected = canopyFromCurve(oak, oak.matureAtYears).canopyM;
    expect(matureCanopyM('oak-tree')).toBeCloseTo(expected, 5);
  });
});

describe('resolveGrowthCurve', () => {
  it('returns the seed curve for a known kind', () => {
    expect(resolveGrowthCurve('shrub')).toBe(SPECIES_GROWTH['shrub']);
  });
  it('returns the generic medium curve for unknown kinds', () => {
    expect(resolveGrowthCurve('unknown')).toBe(GENERIC_GROWTH_CURVES.medium);
  });
});
