// @vitest-environment happy-dom
/**
 * Pins the C4 canonical-ownership split: the UtilityPointTool offers exactly
 * the 11 utility types with no Built-Environment equivalent, and excludes the
 * 4 BE-owned duplicates (solar array / water tank / well / septic). If a new
 * UtilityType is added it must be classified one way or the other — this test
 * fails until the split is reconciled.
 */

import { describe, it, expect } from 'vitest';
import {
  UTILITY_TYPE_CONFIG,
  type UtilityType,
} from '../../../../../store/utilityStore.js';
import {
  BE_OWNED_UTILITY_TYPES,
  UTILITY_POINT_TYPES,
  UTILITY_POINT_TYPE_OPTIONS,
} from '../utilityPointTypes.js';

const ALL_TYPES = Object.keys(UTILITY_TYPE_CONFIG) as UtilityType[];

const EXPECTED_NON_BE: UtilityType[] = [
  'battery_room',
  'generator',
  'greywater',
  'rain_catchment',
  'lighting',
  'firewood_storage',
  'waste_sorting',
  'compost',
  'biochar',
  'tool_storage',
  'laundry_station',
];

describe('UtilityPointTool type split (C4 canonical ownership)', () => {
  it('excludes exactly the 4 BE-owned duplicate types', () => {
    expect([...BE_OWNED_UTILITY_TYPES].sort()).toEqual(
      ['septic', 'solar_panel', 'water_tank', 'well_pump'].sort(),
    );
  });

  it('offers exactly the 11 non-BE utility types', () => {
    expect(UTILITY_POINT_TYPES).toHaveLength(11);
    expect([...UTILITY_POINT_TYPES].sort()).toEqual([...EXPECTED_NON_BE].sort());
  });

  it('partitions every UtilityType into exactly one bucket (no gaps, no overlap)', () => {
    expect(ALL_TYPES).toHaveLength(15);
    const beSet = new Set<UtilityType>(BE_OWNED_UTILITY_TYPES);
    const pointSet = new Set<UtilityType>(UTILITY_POINT_TYPES);
    for (const t of ALL_TYPES) {
      const inBe = beSet.has(t);
      const inPoint = pointSet.has(t);
      expect(inBe !== inPoint, `${t} must be in exactly one bucket`).toBe(true);
    }
  });

  it('never offers a BE-owned type', () => {
    for (const be of BE_OWNED_UTILITY_TYPES) {
      expect(UTILITY_POINT_TYPES).not.toContain(be);
    }
  });

  it('builds select options that are all valid UtilityType keys', () => {
    expect(UTILITY_POINT_TYPE_OPTIONS).toHaveLength(UTILITY_POINT_TYPES.length);
    for (const opt of UTILITY_POINT_TYPE_OPTIONS) {
      expect(UTILITY_TYPE_CONFIG[opt.value as UtilityType]).toBeDefined();
      expect(opt.label).toBe(UTILITY_TYPE_CONFIG[opt.value as UtilityType].label);
    }
  });
});
