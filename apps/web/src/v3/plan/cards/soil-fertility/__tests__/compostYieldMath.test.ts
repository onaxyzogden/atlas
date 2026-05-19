import { describe, expect, it } from 'vitest';
import {
  GREENS,
  BROWNS,
  aggregateCN,
  estimateYield,
  projectInventoryVolumeM3,
} from '../compostYieldMath.js';

describe('projectInventoryVolumeM3', () => {
  it('sums positive feedstock volumes and ignores <= 0', () => {
    expect(
      projectInventoryVolumeM3({ a: 2, b: 3, c: 0, d: -5 }),
    ).toBe(5);
  });

  it('is 0 for an empty inventory', () => {
    expect(projectInventoryVolumeM3({})).toBe(0);
  });
});

describe('estimateYield', () => {
  it('finished volume = feedstock * method retention', () => {
    const y = estimateYield('hot', 10);
    expect(y.method).toBe('hot');
    expect(y.feedstockM3).toBe(10);
    expect(y.finishedM3).toBeCloseTo(4.5, 5);
    expect(y.retentionPct).toBe(45);
  });

  it('is monotonic non-decreasing in feedstock volume', () => {
    const a = estimateYield('cold', 4).finishedM3;
    const b = estimateYield('cold', 8).finishedM3;
    expect(b).toBeGreaterThan(a);
  });

  it('never returns more solid compost than raw feedstock (hot/cold/vermi)', () => {
    for (const m of ['hot', 'cold', 'vermicompost'] as const) {
      expect(estimateYield(m, 12).finishedM3).toBeLessThanOrEqual(12);
    }
  });

  it('zero feedstock yields zero finished', () => {
    expect(estimateYield('vermicompost', 0).finishedM3).toBe(0);
  });
});

// ── Extraction lock: aggregateCN must reproduce SoilResourcesCard ────────────
// (the card has no colocated test; these reference cases are the gate that
// the catalog + mass-weighted C:N extraction is behaviour-identical.)
describe('aggregateCN — SoilResourcesCard extraction lock', () => {
  it('exposes the original 8-greens / 8-browns catalog', () => {
    expect(GREENS).toHaveLength(8);
    expect(BROWNS).toHaveLength(8);
    expect(GREENS.find((f) => f.id === 'green-grass')?.cn).toBe(20);
    expect(BROWNS.find((f) => f.id === 'brown-straw')?.cn).toBe(80);
  });

  it('empty inventory → ratio 0, no greens/browns', () => {
    const a = aggregateCN({});
    expect(a.ratio).toBe(0);
    expect(a.greenCount).toBe(0);
    expect(a.brownCount).toBe(0);
  });

  it('single feedstock → aggregate ratio equals its reference C:N', () => {
    expect(aggregateCN({ 'green-grass': 5 }).ratio).toBeCloseTo(20, 5);
    expect(aggregateCN({ 'brown-straw': 5 }).ratio).toBeCloseTo(80, 5);
  });

  it('equal-volume grass + straw lands in the Cornell ideal band', () => {
    const a = aggregateCN({ 'green-grass': 3, 'brown-straw': 3 });
    expect(a.ratio).toBeCloseTo(32.35, 1);
    expect(a.ratio).toBeGreaterThanOrEqual(25);
    expect(a.ratio).toBeLessThanOrEqual(35);
    expect(a.greenCount).toBe(1);
    expect(a.brownCount).toBe(1);
  });

  it('counts only feedstocks with a positive volume', () => {
    const a = aggregateCN({ 'green-grass': 2, 'brown-straw': 0 });
    expect(a.greenCount).toBe(1);
    expect(a.brownCount).toBe(0);
  });
});

describe('compostYieldMath — covenant', () => {
  it('module surface carries no financing lexicon', () => {
    const ids = [...GREENS, ...BROWNS].map((f) => f.id).join(' ');
    expect(ids.toLowerCase()).not.toMatch(
      /\b(riba|gharar|csra|salam|investor|financing)\b/,
    );
  });
});
