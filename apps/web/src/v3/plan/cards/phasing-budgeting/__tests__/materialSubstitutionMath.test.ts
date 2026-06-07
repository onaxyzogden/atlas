import { describe, expect, it } from 'vitest';
import {
  SUBSTITUTION_CATALOG,
  matchSubstitution,
  appliedCostRange,
  type Primitive,
} from '../substitutionCatalog.js';
import {
  REGION_MULTIPLIERS,
  BASELINE_REGION,
  resolveCostMultiplier,
  sumEcoUplift,
  establishmentDeltaByItemId,
  ECO_UPLIFT_MAX_POINTS,
  ECO_UPLIFT_POINT_SCALE,
  type SubstitutionMetaEntry,
} from '../materialSubstitutionMath.js';
import { computeMissionScore } from '../../../../../features/financial/engine/missionScoring.js';
import type {
  AllFeaturesInput,
  BreakEvenResult,
  CostLineItem,
  CostRange,
  CostRegion,
  MissionWeights,
} from '../../../../../features/financial/engine/types.js';

// ── Fixtures ────────────────────────────────────────────────────────────────

function item(id: string, sourceType: CostLineItem['sourceType']): CostLineItem {
  return {
    id,
    name: id,
    sourceType,
    sourceId: id,
    category: 'test',
    phase: 'water',
    phaseName: 'Water',
    cost: { low: 1000, mid: 2000, high: 3000 },
    confidence: 'medium',
    assumptions: [],
  };
}

// Each v2 pair, keyed to a primitive that should resolve it.
const V2_CASES: Array<{ subId: string; item: CostLineItem; primitive: Primitive }> = [
  {
    subId: 'electric-fence-to-coppice-living-post',
    item: item('f1', 'paddock'),
    primitive: { kind: 'paddock', fencing: 'electric' },
  },
  {
    subId: 'livestock-lane-to-mycelium-woodchip-pad',
    item: item('p1', 'path'),
    primitive: { kind: 'path', type: 'animal_corridor' },
  },
  {
    subId: 'hard-drainage-to-swale-infiltration',
    item: item('u1', 'utility'),
    primitive: { kind: 'utility', type: 'rain_catchment' },
  },
  {
    subId: 'orchard-floor-to-insectary-understory',
    item: item('c1', 'crop'),
    primitive: { kind: 'crop', type: 'orchard' },
  },
  {
    subId: 'market-garden-bed-to-hugelkultur',
    item: item('c2', 'crop'),
    primitive: { kind: 'crop', type: 'market_garden' },
  },
];

// ── Catalog: 5 new cited pairs ───────────────────────────────────────────────

describe('substitutionCatalog v2 expansion', () => {
  it('ships 13 pairs total (8 v1 + 5 v2)', () => {
    expect(SUBSTITUTION_CATALOG.length).toBe(13);
  });

  it('every v2 pair resolves via matchSubstitution against its primitive', () => {
    for (const c of V2_CASES) {
      const sub = matchSubstitution(c.item, c.primitive);
      expect(sub, `expected ${c.subId} to resolve`).not.toBeNull();
      expect(sub!.id).toBe(c.subId);
    }
  });

  it('every v2 pair carries >=1 full citation with a year and source', () => {
    for (const c of V2_CASES) {
      const sub = SUBSTITUTION_CATALOG.find((s) => s.id === c.subId)!;
      expect(sub.citations.length).toBeGreaterThanOrEqual(1);
      for (const cite of sub.citations) {
        expect(cite.source.length).toBeGreaterThan(10);
        expect(cite.year).toBeGreaterThan(1900);
      }
    }
  });

  it('every catalog id is unique', () => {
    const ids = SUBSTITUTION_CATALOG.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── Region cost realism ──────────────────────────────────────────────────────

describe('resolveCostMultiplier', () => {
  const base: CostRange = { low: 0.3, mid: 0.4, high: 0.5 };

  it('is a no-op at the baseline region (factor 1.00)', () => {
    expect(REGION_MULTIPLIERS[BASELINE_REGION]).toBe(1);
    expect(resolveCostMultiplier(base, BASELINE_REGION)).toEqual(base);
  });

  it('scales by the region factor', () => {
    const region: CostRegion = 'us-west'; // 1.18
    const out = resolveCostMultiplier(base, region);
    expect(out.mid).toBeCloseTo(0.4 * 1.18, 10);
    expect(out.low).toBeCloseTo(0.3 * 1.18, 10);
  });

  it('defines a multiplier for every CostRegion', () => {
    const regions: CostRegion[] = [
      'us-midwest', 'us-northeast', 'us-southeast', 'us-west',
      'ca-ontario', 'ca-bc', 'ca-prairies',
    ];
    for (const r of regions) expect(typeof REGION_MULTIPLIERS[r]).toBe('number');
  });
});

// ── Eco uplift + establishment ───────────────────────────────────────────────

describe('sumEcoUplift', () => {
  it('sums uplift estimates into ecological points', () => {
    const meta: Record<string, SubstitutionMetaEntry> = {
      a: { upliftEstimate: 0.1, establishmentMonths: 12 },
      b: { upliftEstimate: 0.05, establishmentMonths: 6 },
    };
    expect(sumEcoUplift(meta)).toBe(Math.round(0.15 * ECO_UPLIFT_POINT_SCALE)); // 15
  });

  it('clamps to ECO_UPLIFT_MAX_POINTS', () => {
    const meta: Record<string, SubstitutionMetaEntry> = {
      a: { upliftEstimate: 0.5, establishmentMonths: 0 },
      b: { upliftEstimate: 0.5, establishmentMonths: 0 },
    };
    expect(sumEcoUplift(meta)).toBe(ECO_UPLIFT_MAX_POINTS);
  });

  it('returns 0 for an empty meta map', () => {
    expect(sumEcoUplift({})).toBe(0);
  });
});

describe('establishmentDeltaByItemId', () => {
  it('maps each item id to its establishment months', () => {
    const meta: Record<string, SubstitutionMetaEntry> = {
      a: { upliftEstimate: 0.1, establishmentMonths: 24 },
      b: { upliftEstimate: 0.05, establishmentMonths: 6 },
    };
    expect(establishmentDeltaByItemId(meta)).toEqual({ a: 24, b: 6 });
  });
});

// ── COVENANT GUARD ───────────────────────────────────────────────────────────
// The substitution eco-uplift MUST route to the ecological mission component
// ONLY. scoreFinancial is a financial-return surface; its contribution to the
// MissionScore must be byte-identical with or without any uplift.

describe('covenant: eco uplift never touches the financial component', () => {
  const emptyInput: AllFeaturesInput = {
    zones: [], structures: [], paddocks: [], paths: [], utilities: [], crops: [],
  };
  const breakEven: BreakEvenResult = {
    breakEvenYear: { low: 4, mid: 5, high: 6 },
    tenYearROI: { low: 0, mid: 0, high: 0 },
    peakNegativeCashflow: { low: 0, mid: 0, high: 0 },
  };
  const weights: MissionWeights = { financial: 0.4, ecological: 0.25, spiritual: 0.2, community: 0.15 };

  it('financial score is identical with and without uplift', () => {
    const without = computeMissionScore(emptyInput, breakEven, weights, 0);
    const withUplift = computeMissionScore(emptyInput, breakEven, weights, ECO_UPLIFT_MAX_POINTS);
    expect(withUplift.financial).toBe(without.financial);
  });

  it('uplift raises the ecological component (clamped at 100)', () => {
    const without = computeMissionScore(emptyInput, breakEven, weights, 0);
    const withUplift = computeMissionScore(emptyInput, breakEven, weights, 20);
    expect(withUplift.ecological).toBe(Math.min(100, without.ecological + 20));
    expect(withUplift.ecological).toBeGreaterThan(without.ecological);
  });

  it('the applied multiplier still produces a valid scaled cost range', () => {
    const sub = SUBSTITUTION_CATALOG.find((s) => s.id === 'hard-drainage-to-swale-infiltration')!;
    const out = appliedCostRange({ low: 1000, mid: 2000, high: 3000 }, sub.alternative.costMultiplier);
    expect(out.mid).toBeLessThan(2000);
    expect(out.low).toBeGreaterThan(0);
  });
});
