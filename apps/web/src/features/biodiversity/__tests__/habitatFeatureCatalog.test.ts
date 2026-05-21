/**
 * @vitest-environment happy-dom
 *
 * habitatFeatureCatalog — Slice 6 (S6-A) of the 2026-05-21 habitat-
 * feature unification. Invariants for the catalog table that drives
 * `seedHabitatFeatureWorkItems` ⇒ `materialsAuto` writes and the
 * upcoming `seedHabitatFeatureCosts` ⇒ `costRangeAuto` writes.
 */

import { describe, it, expect } from 'vitest';
import {
  HABITAT_FEATURE_CATALOG,
  habitatCatalogEntryFor,
  habitatElementScale,
  scaledCostBand,
  scaledMaterials,
} from '../habitatFeatureCatalog.js';
import {
  HABITAT_FEATURE_KINDS,
  type HabitatFeatureKind,
} from '../habitatFeatureSpineSync.js';
import type { DesignElement } from '../../../store/designElementsStore.js';

const POINT_KINDS: HabitatFeatureKind[] = [
  'owl-box',
  'raptor-perch',
  'nest-box',
  'brush-pile',
  'snag',
];

describe('HABITAT_FEATURE_CATALOG — shape invariants', () => {
  it('has exactly one entry per declared habitat-feature kind', () => {
    expect(HABITAT_FEATURE_CATALOG).toHaveLength(HABITAT_FEATURE_KINDS.length);
    const catalogKinds = HABITAT_FEATURE_CATALOG.map((e) => e.kind).sort();
    const declaredKinds = [...HABITAT_FEATURE_KINDS].sort();
    expect(catalogKinds).toEqual(declaredKinds);
  });

  it('every entry resolves via habitatCatalogEntryFor', () => {
    for (const k of HABITAT_FEATURE_KINDS) {
      expect(habitatCatalogEntryFor(k)).toBeDefined();
    }
  });

  it('unknown kind resolves to undefined', () => {
    expect(habitatCatalogEntryFor('hedgerow')).toBeUndefined();
    expect(habitatCatalogEntryFor('pond')).toBeUndefined();
    expect(habitatCatalogEntryFor('')).toBeUndefined();
  });

  it('every entry has at least one citation source', () => {
    for (const entry of HABITAT_FEATURE_CATALOG) {
      expect(entry.sources.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('NRCS practice sources carry a CP-prefixed practice code', () => {
    for (const entry of HABITAT_FEATURE_CATALOG) {
      for (const src of entry.sources) {
        if (src.kind === 'nrcs-practice') {
          expect(src.code).toMatch(/^CP\d{3}$/);
          expect(src.ref.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('extension sources name a known organization', () => {
    const allowed = new Set([
      'cornell-nestwatch',
      'xerces',
      'uc-ipm',
      'audubon',
      'usda-forest-service',
      'nrcs-whc',
    ]);
    for (const entry of HABITAT_FEATURE_CATALOG) {
      for (const src of entry.sources) {
        if (src.kind === 'extension') {
          expect(allowed.has(src.org)).toBe(true);
          expect(src.ref.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('cost band is non-negative and sorted low ≤ mid ≤ high', () => {
    for (const entry of HABITAT_FEATURE_CATALOG) {
      expect(entry.costUSD.low).toBeGreaterThanOrEqual(0);
      expect(entry.costUSD.low).toBeLessThanOrEqual(entry.costUSD.mid);
      expect(entry.costUSD.mid).toBeLessThanOrEqual(entry.costUSD.high);
    }
  });

  it('install labor is non-negative', () => {
    for (const entry of HABITAT_FEATURE_CATALOG) {
      expect(entry.installLaborHrs).toBeGreaterThanOrEqual(0);
    }
  });

  it('all five point-kinds carry geometry="point"', () => {
    for (const k of POINT_KINDS) {
      expect(habitatCatalogEntryFor(k)?.geometry).toBe('point');
    }
  });

  it('insectary-strip is geometry="line"', () => {
    expect(habitatCatalogEntryFor('insectary-strip')?.geometry).toBe('line');
  });

  it('wetland-edge is geometry="polygon"', () => {
    expect(habitatCatalogEntryFor('wetland-edge')?.geometry).toBe('polygon');
  });

  it('snag carries no procured material (designates existing dead tree)', () => {
    expect(habitatCatalogEntryFor('snag')?.materialsKit).toEqual([]);
  });

  it('brush-pile carries no procured material (uses on-site woody material)', () => {
    expect(habitatCatalogEntryFor('brush-pile')?.materialsKit).toEqual([]);
  });

  it('zero-cost kinds (snag) still carry labor — labor is the steward\'s work', () => {
    const snag = habitatCatalogEntryFor('snag');
    expect(snag?.costUSD).toEqual({ low: 0, mid: 0, high: 0 });
    expect(snag?.installLaborHrs).toBeGreaterThan(0);
  });
});

// ── Scale & projection helpers ────────────────────────────────────────

function pointEl(): Pick<DesignElement, 'geometry'> {
  return { geometry: { type: 'Point', coordinates: [0, 0] } } as Pick<DesignElement, 'geometry'>;
}
// 100 m line along an approximate equatorial latitude window
function lineEl100m(): Pick<DesignElement, 'geometry'> {
  return {
    geometry: {
      type: 'LineString',
      coordinates: [
        [0, 0],
        // ~0.000898° latitude ≈ 100 m at the equator
        [0, 0.0008983],
      ],
    },
  } as Pick<DesignElement, 'geometry'>;
}
// ~10 m × 10 m square ≈ 100 m²
function polyEl100m2(): Pick<DesignElement, 'geometry'> {
  // 0.0000898° ≈ 10 m
  const d = 0.0000898;
  return {
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [d, 0],
          [d, d],
          [0, d],
          [0, 0],
        ],
      ],
    },
  } as Pick<DesignElement, 'geometry'>;
}

describe('habitatElementScale', () => {
  it('point geometry → 1 regardless of element geometry', () => {
    expect(habitatElementScale(pointEl(), 'point')).toBe(1);
    expect(habitatElementScale(lineEl100m(), 'point')).toBe(1);
  });

  it('line geometry → polyline length in metres (≈100 m ±5 m)', () => {
    const m = habitatElementScale(lineEl100m(), 'line');
    expect(m).toBeGreaterThan(95);
    expect(m).toBeLessThan(105);
  });

  it('polygon geometry → polygon area in m² (≈100 m² ±20 m²)', () => {
    const a = habitatElementScale(polyEl100m2(), 'polygon');
    expect(a).toBeGreaterThan(80);
    expect(a).toBeLessThan(120);
  });

  it('bad / missing geometry → 0 (graceful)', () => {
    const empty = { geometry: undefined } as unknown as Pick<DesignElement, 'geometry'>;
    expect(habitatElementScale(empty, 'line')).toBe(0);
    expect(habitatElementScale(empty, 'polygon')).toBe(0);
  });
});

describe('scaledCostBand', () => {
  it('owl-box × 1 → catalog band verbatim', () => {
    const entry = habitatCatalogEntryFor('owl-box')!;
    expect(scaledCostBand(entry, 1)).toEqual({ low: 15, mid: 45, high: 150 });
  });

  it('insectary-strip × 100 → 100× per-meter band', () => {
    const entry = habitatCatalogEntryFor('insectary-strip')!;
    const scaled = scaledCostBand(entry, 100);
    expect(scaled.low).toBeCloseTo(50, 5);
    expect(scaled.mid).toBeCloseTo(120, 5);
    expect(scaled.high).toBeCloseTo(300, 5);
  });

  it('preserves band ordering after scaling', () => {
    for (const entry of HABITAT_FEATURE_CATALOG) {
      const s = scaledCostBand(entry, 42.5);
      expect(s.low).toBeLessThanOrEqual(s.mid);
      expect(s.mid).toBeLessThanOrEqual(s.high);
    }
  });

  it('scale of 0 → degenerate zero band', () => {
    const entry = habitatCatalogEntryFor('wetland-edge')!;
    expect(scaledCostBand(entry, 0)).toEqual({ low: 0, mid: 0, high: 0 });
  });
});

describe('scaledMaterials', () => {
  it('point entry → flat "1" note per kit line', () => {
    const entry = habitatCatalogEntryFor('owl-box')!;
    const mats = scaledMaterials(entry, 1);
    expect(mats).toHaveLength(1);
    expect(mats[0]?.unit).toBe('kit');
    expect(mats[0]?.notes).toBe('1');
  });

  it('line entry → quantity in declared per-unit (m)', () => {
    const entry = habitatCatalogEntryFor('insectary-strip')!;
    const mats = scaledMaterials(entry, 100);
    expect(mats[0]?.unit).toBe('m');
    expect(mats[0]?.notes).toBe('100 m');
  });

  it('polygon entry → quantity in declared per-unit (m²)', () => {
    const entry = habitatCatalogEntryFor('wetland-edge')!;
    const mats = scaledMaterials(entry, 250);
    expect(mats[0]?.unit).toBe('m²');
    expect(mats[0]?.notes).toBe('250 m²');
  });

  it('empty kit entry → empty array (snag, brush-pile)', () => {
    expect(scaledMaterials(habitatCatalogEntryFor('snag')!, 1)).toEqual([]);
    expect(scaledMaterials(habitatCatalogEntryFor('brush-pile')!, 1)).toEqual([]);
  });
});
