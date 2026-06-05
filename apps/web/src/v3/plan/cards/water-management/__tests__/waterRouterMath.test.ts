import { describe, expect, it } from 'vitest';
import {
  buildParcelBox,
  computeWaterRows,
  describeWaterElement,
  translateGeometry,
  WATER_HARVEST_KINDS,
  type ParcelBox,
} from '../waterRouterMath.js';
import type { DesignElement } from '../../../../../store/designElementsStore.js';

// ~200 m square parcel near the equator. Downhill bearing 180° (south) ⇒
// uphill is due north (+lat), so elevation rises with latitude.
const PARCEL: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0.0018, 0],
            [0.0018, 0.0018],
            [0, 0.0018],
            [0, 0],
          ],
        ],
      },
    },
  ],
};

const MIN_M = 100;
const MAX_M = 200;

function box(): ParcelBox {
  const b = buildParcelBox(PARCEL, 180);
  if (!b) throw new Error('expected a parcel box');
  return b;
}

function el(
  id: string,
  kind: string,
  geometry: GeoJSON.Geometry,
  label?: string,
): DesignElement {
  return {
    id,
    category: 'water',
    kind,
    label: label ?? '',
    geometry,
    phase: 'water',
  } as DesignElement;
}

describe('WATER_HARVEST_KINDS', () => {
  it('contains the three audited kinds', () => {
    expect(WATER_HARVEST_KINDS.has('water-tank')).toBe(true);
    expect(WATER_HARVEST_KINDS.has('pond')).toBe(true);
    expect(WATER_HARVEST_KINDS.has('swale')).toBe(true);
    expect(WATER_HARVEST_KINDS.has('orchard')).toBe(false);
  });
});

describe('describeWaterElement', () => {
  it('flags a low-placed tank as low-potential with a suggestion', () => {
    const row = describeWaterElement(
      el('t-low', 'water-tank', { type: 'Point', coordinates: [0.0009, 0.0001] }),
      box(),
      MIN_M,
      MAX_M,
    );
    expect(row).not.toBeNull();
    expect(row!.tier).toBe('low-potential');
    expect(row!.headLostM).toBeGreaterThan(2);
    expect(row!.suggestion).not.toBeNull();
  });

  it('rates a high-placed tank as excellent with no suggestion', () => {
    const row = describeWaterElement(
      el('t-high', 'water-tank', { type: 'Point', coordinates: [0.0009, 0.0017] }),
      box(),
      MIN_M,
      MAX_M,
    );
    expect(row!.tier).toBe('excellent');
    expect(row!.headLostM).toBe(0);
    expect(row!.suggestion).toBeNull();
  });

  it('returns null for geometry without a centroid', () => {
    const row = describeWaterElement(
      el('bad', 'pond', { type: 'Polygon', coordinates: [] }),
      box(),
      MIN_M,
      MAX_M,
    );
    expect(row).toBeNull();
  });
});

describe('computeWaterRows', () => {
  it('filters to water-harvest kinds and sorts worst-head-lost first', () => {
    const elements: DesignElement[] = [
      el('t-high', 'water-tank', { type: 'Point', coordinates: [0.0009, 0.0017] }),
      el('t-low', 'water-tank', { type: 'Point', coordinates: [0.0009, 0.0001] }),
      el('orchard', 'orchard', { type: 'Point', coordinates: [0.0009, 0.0009] }),
    ];
    const rows = computeWaterRows(elements, box(), MIN_M, MAX_M);
    // The orchard is excluded; only the two tanks survive.
    expect(rows.map((r) => r.id)).toEqual(['t-low', 't-high']);
    // Worst (most head lost) first.
    expect(rows[0]!.headLostM).toBeGreaterThanOrEqual(rows[1]!.headLostM);
  });
});

describe('translateGeometry', () => {
  it('shifts a Point so its reference lands on the target', () => {
    const out = translateGeometry(
      { type: 'Point', coordinates: [10, 20] },
      [10, 20],
      [15, 28],
    );
    expect(out.coordinates).toEqual([15, 28]);
  });

  it('shifts every vertex of a Polygon by the same delta, preserving shape', () => {
    const poly: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [2, 0],
          [2, 2],
          [0, 2],
          [0, 0],
        ],
      ],
    };
    const out = translateGeometry(poly, [1, 1], [4, 5]); // delta (+3, +4)
    expect(out.coordinates[0]).toEqual([
      [3, 4],
      [5, 4],
      [5, 6],
      [3, 6],
      [3, 4],
    ]);
  });

  it('shifts a LineString', () => {
    const out = translateGeometry(
      { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
      [0, 0],
      [10, 10],
    );
    expect(out.coordinates).toEqual([[10, 10], [11, 11]]);
  });
});
