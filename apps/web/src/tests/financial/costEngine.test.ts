/**
 * costEngine.ts — tests for cost computation functions.
 */

import { describe, it, expect } from 'vitest';
import {
  computeZoneCosts,
  computeStructureCosts,
  computeFencingCosts,
  computePathCosts,
  computeUtilityCosts,
  computeCropCosts,
  computeAllCosts,
  sumCosts,
  applyOverrides,
} from '../../features/financial/engine/costEngine.js';
import {
  emptyInput,
  regenerativeFarmScenario,
  defaultSiteContext,
} from '../helpers/mockFinancialInput.js';
import type { CostRange } from '../../features/financial/engine/types.js';

const REGION = 'us-midwest' as const;
const siteCtx = defaultSiteContext();

// ── computeZoneCosts ──

describe('computeZoneCosts', () => {
  it('returns cost items for zones with benchmarks', () => {
    const input = regenerativeFarmScenario();
    const items = computeZoneCosts(input.zones, REGION);
    expect(items.length).toBeGreaterThan(0);
  });

  it('skips zero-cost zones (access, buffer, future_expansion)', () => {
    const zones = [
      { id: 'z1', projectId: 'p1', name: 'Access Road', category: 'access' as const, areaM2: 5000 },
      { id: 'z2', projectId: 'p1', name: 'Buffer Zone', category: 'buffer' as const, areaM2: 3000 },
      { id: 'z3', projectId: 'p1', name: 'Future', category: 'future_expansion' as const, areaM2: 8000 },
    ];
    const items = computeZoneCosts(zones, REGION);
    expect(items).toHaveLength(0);
  });

  it('computes cost as acres * benchmark per acre', () => {
    const zones = [
      { id: 'z1', projectId: 'p1', name: 'Hab', category: 'habitation' as const, areaM2: 4047 }, // 1 acre
    ];
    const items = computeZoneCosts(zones, REGION);
    expect(items).toHaveLength(1);
    expect(items[0]!.cost.low).toBeGreaterThan(0);
    expect(items[0]!.cost.mid).toBeGreaterThan(items[0]!.cost.low);
    expect(items[0]!.cost.high).toBeGreaterThanOrEqual(items[0]!.cost.mid);
  });

  it('includes assumptions and unit cost', () => {
    const zones = [
      { id: 'z1', projectId: 'p1', name: 'Food', category: 'food_production' as const, areaM2: 20000 },
    ];
    const items = computeZoneCosts(zones, REGION);
    expect(items[0]!.assumptions.length).toBeGreaterThan(0);
    expect(items[0]!.unitCost).toBeDefined();
  });
});

// ── computeStructureCosts ──

describe('computeStructureCosts', () => {
  it('returns costs for known structure types', () => {
    const structures = [
      { id: 's1', projectId: 'p1', name: 'Barn', type: 'barn' as const, phase: 'Phase 1' },
    ];
    const items = computeStructureCosts(structures, REGION);
    expect(items).toHaveLength(1);
    expect(items[0]!.cost.low).toBeGreaterThan(0);
  });

  it('skips unknown structure types', () => {
    const structures = [
      { id: 's1', projectId: 'p1', name: 'Unknown', type: 'unknown_type' as any, phase: 'Phase 1' },
    ];
    const items = computeStructureCosts(structures, REGION);
    expect(items).toHaveLength(0);
  });

  it('applies regional multiplier', () => {
    const structures = [
      { id: 's1', projectId: 'p1', name: 'Barn', type: 'barn' as const, phase: 'Phase 1' },
    ];
    const midwestItems = computeStructureCosts(structures, 'us-midwest');
    const northeastItems = computeStructureCosts(structures, 'us-northeast');
    // Northeast has higher multiplier than Midwest
    expect(northeastItems[0]!.cost.mid).toBeGreaterThanOrEqual(midwestItems[0]!.cost.mid);
  });
});

// ── computeFencingCosts ──

describe('computeFencingCosts', () => {
  it('computes fencing from paddock perimeter', () => {
    const paddocks = [
      { id: 'pd1', projectId: 'p1', name: 'Paddock', areaM2: 10000, fencing: 'electric' as const, species: ['cattle'], phase: 'Phase 1' },
    ];
    const items = computeFencingCosts(paddocks, REGION);
    expect(items).toHaveLength(1);
    // 10000 m² → perimeter ≈ 4 * sqrt(10000) = 400m
    expect(items[0]!.cost.low).toBeGreaterThan(0);
  });

  it('skips fencing type "none"', () => {
    const paddocks = [
      { id: 'pd1', projectId: 'p1', name: 'Open', areaM2: 5000, fencing: 'none' as const, species: [], phase: '' },
    ];
    const items = computeFencingCosts(paddocks, REGION);
    expect(items).toHaveLength(0);
  });
});

// ── computePathCosts ──

describe('computePathCosts', () => {
  it('computes path cost from length * benchmark', () => {
    const paths = [
      { id: 'pt1', projectId: 'p1', name: 'Road', type: 'main_road' as const, lengthM: 100, phase: 'Phase 1' },
    ];
    const items = computePathCosts(paths, siteCtx, REGION);
    expect(items).toHaveLength(1);
    expect(items[0]!.cost.low).toBeGreaterThan(0);
  });

  it('applies slope difficulty factor for steep terrain', () => {
    const paths = [
      { id: 'pt1', projectId: 'p1', name: 'Road', type: 'main_road' as const, lengthM: 100, phase: 'Phase 1' },
    ];
    const flatCtx = defaultSiteContext({ meanSlopeDeg: 2 });
    const steepCtx = defaultSiteContext({ meanSlopeDeg: 20 });
    const flatItems = computePathCosts(paths, flatCtx, REGION);
    const steepItems = computePathCosts(paths, steepCtx, REGION);
    // Steep terrain should cost more
    expect(steepItems[0]!.cost.mid).toBeGreaterThan(flatItems[0]!.cost.mid);
  });
});

// ── computeUtilityCosts ──

describe('computeUtilityCosts', () => {
  it('returns costs for known utility types', () => {
    const utilities = [
      { id: 'u1', projectId: 'p1', name: 'Well Pump', type: 'well_pump' as const, phase: 'Phase 1' },
    ];
    const items = computeUtilityCosts(utilities, REGION);
    expect(items).toHaveLength(1);
    expect(items[0]!.cost.low).toBeGreaterThan(0);
  });
});

// ── computeCropCosts ──

describe('computeCropCosts', () => {
  it('computes crop establishment costs by acreage', () => {
    const crops = [
      { id: 'c1', projectId: 'p1', name: 'Orchard', type: 'orchard' as const, areaM2: 4047, phase: 'Phase 1' }, // 1 acre
    ];
    const items = computeCropCosts(crops, REGION);
    expect(items).toHaveLength(1);
    expect(items[0]!.cost.low).toBeGreaterThan(0);
  });
});

// ── computeAllCosts ──

describe('computeAllCosts', () => {
  it('aggregates all cost categories', () => {
    const input = regenerativeFarmScenario();
    const items = computeAllCosts(input, REGION, siteCtx);
    expect(items.length).toBeGreaterThan(0);

    const types = new Set(items.map((i) => i.sourceType));
    expect(types.has('zone')).toBe(true);
    expect(types.has('structure')).toBe(true);
    expect(types.has('paddock')).toBe(true);
  });

  it('returns empty for empty input', () => {
    const items = computeAllCosts(emptyInput(), REGION, siteCtx);
    expect(items).toHaveLength(0);
  });
});

// ── sumCosts ──

describe('sumCosts', () => {
  it('sums all cost ranges', () => {
    const items = computeAllCosts(regenerativeFarmScenario(), REGION, siteCtx);
    const total = sumCosts(items);
    expect(total.low).toBeGreaterThan(0);
    expect(total.mid).toBeGreaterThanOrEqual(total.low);
    expect(total.high).toBeGreaterThanOrEqual(total.mid);
  });

  it('returns {0, 0, 0} for empty items', () => {
    const total = sumCosts([]);
    expect(total).toEqual({ low: 0, mid: 0, high: 0 });
  });
});

// ── applyOverrides ──

describe('applyOverrides', () => {
  it('overrides matching cost items', () => {
    const items = computeAllCosts(regenerativeFarmScenario(), REGION, siteCtx);
    const firstId = items[0]!.id;
    const overridden = applyOverrides(items, { [firstId]: { mid: 99999 } });
    expect(overridden.find((i) => i.id === firstId)!.cost.mid).toBe(99999);
  });

  it('returns same array reference if no overrides', () => {
    const items = computeAllCosts(regenerativeFarmScenario(), REGION, siteCtx);
    expect(applyOverrides(items, {})).toBe(items);
  });

  it('leaves non-matching items unchanged', () => {
    const items = computeAllCosts(regenerativeFarmScenario(), REGION, siteCtx);
    const original = items[1]!.cost.mid;
    const overridden = applyOverrides(items, { 'nonexistent-id': { mid: 1 } });
    expect(overridden[1]!.cost.mid).toBe(original);
  });
});
