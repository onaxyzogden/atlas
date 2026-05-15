import { describe, expect, it } from 'vitest';
import { allocateZones } from '../zoneAllocator.js';
import { ACRE_M2 } from '../types.js';
import { makeZone } from './fixtures.js';
import type { Intervention } from '../../../data/goalCompassTypes.js';

function ivn(over: Partial<Intervention>): Intervention {
  return {
    id: 'test',
    name: 'Test',
    description: '',
    category: 'livestock',
    yeomansPhase: 'subdivision',
    prerequisites: [],
    siteRequirements: [],
    costRangeUSD: { low: 1, mid: 2, high: 3 },
    materials: [],
    durationMonths: 1,
    maturityCurve: [],
    criterionContributions: [],
    sources: [],
    ...over,
  };
}

describe('allocateZones', () => {
  it('returns [] when no zoneAffinity', () => {
    const out = allocateZones(ivn({}), [makeZone('z1', {})], 5);
    expect(out).toEqual([]);
  });

  it('vetoes avoided categories', () => {
    const out = allocateZones(
      ivn({ zoneAffinity: { preferredCategories: ['livestock'], avoidedCategories: ['conservation'] } }),
      [makeZone('z1', { category: 'conservation' })],
      5,
    );
    expect(out).toEqual([]);
  });

  it('score increases with each matched preferred list', () => {
    const aff = {
      preferredCategories: ['livestock' as const],
      preferredSuccession: ['mid' as const],
      preferredGroundCover: ['thriving-grasses' as const],
    };
    const weak = makeZone('weak', { category: 'livestock', sideDeg: 0.02 });
    const strong = makeZone('strong', {
      category: 'livestock',
      successionStage: 'mid',
      groundCover: 'thriving-grasses',
      sideDeg: 0.02,
    });
    // Budget large enough to spill into both zones so ordering shows.
    const out = allocateZones(ivn({ zoneAffinity: aff }), [weak, strong], 100_000);
    // strong (score 3) sorts before weak (score 1)
    expect(out[0]!.zoneId).toBe('strong');
    expect(out[0]!.score).toBe(3);
    expect(out[1]!.score).toBe(1);
  });

  it('respects permacultureRingRange as a veto', () => {
    const aff = { preferredCategories: ['livestock' as const], permacultureRingRange: [3, 4] as [3, 4] };
    const inBand = makeZone('in', { category: 'livestock', permacultureZone: 3 });
    const outBand = makeZone('out', { category: 'livestock', permacultureZone: 1 });
    const out = allocateZones(ivn({ zoneAffinity: aff }), [inBand, outBand], 1000);
    expect(out.map((a) => a.zoneId)).toEqual(['in']);
  });

  it('never exceeds the acreage budget', () => {
    const z = makeZone('z1', { areaM2: 100 * ACRE_M2, sideDeg: 0.05 });
    const out = allocateZones(
      ivn({ zoneAffinity: { preferredCategories: ['food_production'] } }),
      [z],
      3,
    );
    const total = out.reduce((s, a) => s + a.areaM2, 0);
    expect(total).toBeCloseTo(3 * ACRE_M2, 0);
  });

  it('clamps allocation to zone area when budget exceeds it', () => {
    const small = makeZone('small', {
      category: 'food_production',
      areaM2: 1 * ACRE_M2,
    });
    const out = allocateZones(
      ivn({ zoneAffinity: { preferredCategories: ['food_production'] } }),
      [small],
      10,
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.areaM2).toBeCloseTo(1 * ACRE_M2, 0);
  });

  it('is deterministic and tie-breaks by area then id', () => {
    const a = makeZone('aaa', { category: 'food_production', areaM2: 5 * ACRE_M2 });
    const b = makeZone('bbb', { category: 'food_production', areaM2: 5 * ACRE_M2 });
    const c = makeZone('ccc', { category: 'food_production', areaM2: 9 * ACRE_M2 });
    const iv = ivn({ zoneAffinity: { preferredCategories: ['food_production'] } });
    const r1 = allocateZones(iv, [a, b, c], 100);
    const r2 = allocateZones(iv, [c, b, a], 100);
    expect(r1).toEqual(r2);
    // largest area first, then id ascending among equal-area
    expect(r1.map((x) => x.zoneId)).toEqual(['ccc', 'aaa', 'bbb']);
  });
});
