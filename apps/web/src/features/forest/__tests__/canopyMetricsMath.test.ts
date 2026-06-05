import { describe, expect, it } from 'vitest';
import {
  maturityFactor,
  lightByLayer,
  speciesFromIds,
  layerCountsFromSpecies,
  speciesRichnessByLayer,
  biomassDistribution,
  productivityByLayer,
  canopyClosurePct,
  understoryLightPct,
  shadeHoursEstimate,
  distinctFunctionCount,
  productivityIndex,
  canopyMetrics,
  CANOPY_MATURITY_YEARS,
} from '../canopyMetricsMath.js';

// Real catalog ids spanning five niches.
const CANOPY = 'black_walnut';
const SUB = 'apple';
const SHRUB = 'blueberry';
const HERB = 'comfrey';
const GROUND = 'clover';
const FULL_SET = [CANOPY, SUB, SHRUB, HERB, GROUND];

describe('maturityFactor', () => {
  it('is 0 at year 0 and rises linearly', () => {
    expect(maturityFactor(0)).toBe(0);
    expect(maturityFactor(CANOPY_MATURITY_YEARS / 2)).toBeCloseTo(0.5);
  });
  it('caps at 1 past the maturity ceiling', () => {
    expect(maturityFactor(CANOPY_MATURITY_YEARS)).toBe(1);
    expect(maturityFactor(30)).toBe(1);
  });
});

describe('lightByLayer', () => {
  it('starts at full light above the canopy', () => {
    const light = lightByLayer({ canopy: 2 }, 30);
    expect(light.canopy).toBe(1);
  });
  it('is monotonically non-increasing down the stack', () => {
    const counts = layerCountsFromSpecies(speciesFromIds(FULL_SET));
    const light = lightByLayer(counts, 30);
    const order = ['canopy', 'sub_canopy', 'shrub', 'herbaceous', 'ground_cover'];
    for (let i = 1; i < order.length; i++) {
      expect(light[order[i]!]!).toBeLessThanOrEqual(light[order[i - 1]!]!);
    }
  });
  it('leaves full light at every band when nothing is planted', () => {
    const light = lightByLayer({}, 30);
    expect(light.canopy).toBe(1);
    expect(light.ground_cover).toBe(1);
  });
});

describe('speciesRichnessByLayer', () => {
  it('counts distinct niches filled out of seven', () => {
    const r = speciesRichnessByLayer(speciesFromIds(FULL_SET));
    expect(r.nicheCount).toBe(7);
    expect(r.nichesFilled).toBe(5);
    expect(r.byLayer.canopy).toBe(1);
  });
  it('reports zero niches for an empty set', () => {
    const r = speciesRichnessByLayer([]);
    expect(r.nichesFilled).toBe(0);
  });
});

describe('biomassDistribution', () => {
  it('returns shares that sum to ~100', () => {
    const dist = biomassDistribution(speciesFromIds(FULL_SET), 30);
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(99);
    expect(total).toBeLessThan(101);
  });
  it('is empty for no species', () => {
    expect(biomassDistribution([], 30)).toEqual({});
  });
});

describe('productivityByLayer', () => {
  it('normalises the most productive layer to 1.0', () => {
    const p = productivityByLayer(speciesFromIds(FULL_SET), 30);
    expect(Math.max(...Object.values(p))).toBe(1);
  });
  it('is empty for no species', () => {
    expect(productivityByLayer([], 30)).toEqual({});
  });
});

describe('canopy closure & understory light', () => {
  const counts = layerCountsFromSpecies(speciesFromIds(FULL_SET));

  it('closure rises with maturity (more years → more closure)', () => {
    expect(canopyClosurePct(counts, 30)).toBeGreaterThan(canopyClosurePct(counts, 5));
  });
  it('closure and understory light are bounded 0..100', () => {
    for (const y of [1, 5, 10, 20, 30]) {
      const c = canopyClosurePct(counts, y);
      const u = understoryLightPct(counts, y);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(100);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThanOrEqual(100);
    }
  });
  it('closure is the complement of understory light', () => {
    expect(canopyClosurePct(counts, 20) + understoryLightPct(counts, 20)).toBe(100);
  });
  it('is full sun (0 closure) on bare ground', () => {
    expect(canopyClosurePct({}, 30)).toBe(0);
    expect(understoryLightPct({}, 30)).toBe(100);
  });
});

describe('shadeHoursEstimate', () => {
  it('is bounded by peak sun-hours and rises with closure', () => {
    const counts = layerCountsFromSpecies(speciesFromIds(FULL_SET));
    expect(shadeHoursEstimate({}, 30)).toBe(0);
    expect(shadeHoursEstimate(counts, 30)).toBeGreaterThanOrEqual(
      shadeHoursEstimate(counts, 5),
    );
    expect(shadeHoursEstimate(counts, 30)).toBeLessThanOrEqual(12);
  });
});

describe('productivityIndex', () => {
  it('is 0 for an empty set', () => {
    expect(productivityIndex([], 30)).toBe(0);
  });
  it('rises with maturity and stays within 0..100', () => {
    const sp = speciesFromIds(FULL_SET);
    const young = productivityIndex(sp, 1);
    const old = productivityIndex(sp, 30);
    expect(old).toBeGreaterThanOrEqual(young);
    expect(old).toBeLessThanOrEqual(100);
    expect(young).toBeGreaterThanOrEqual(0);
  });
});

describe('distinctFunctionCount', () => {
  it('counts unique ecological functions across the set', () => {
    expect(distinctFunctionCount(speciesFromIds(FULL_SET))).toBeGreaterThan(0);
    expect(distinctFunctionCount([])).toBe(0);
  });
});

describe('canopyMetrics aggregator', () => {
  it('returns a consistent bundle', () => {
    const m = canopyMetrics(speciesFromIds(FULL_SET), 20);
    expect(m.year).toBe(20);
    expect(m.nicheCount).toBe(7);
    expect(m.closurePct + m.understoryLightPct).toBe(100);
    expect(m.productivityIndex).toBeGreaterThanOrEqual(0);
    expect(m.productivityIndex).toBeLessThanOrEqual(100);
  });
});
