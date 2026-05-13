import { describe, expect, it } from 'vitest';
import { findOverlaps, overlappingIds } from '../temporalCoherenceMath.js';
import type { DesignElement } from '../../../../../store/designElementsStore.js';

function apple(id: string, lng: number, lat: number, label: string): DesignElement {
  return {
    id,
    category: 'vegetation',
    kind: 'apple-tree',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    phase: 'trees',
    label,
    createdAt: new Date(0).toISOString(),
  };
}

// ~5 m apart at lat 43.5: 1° lat ≈ 111 km, so 5 m ≈ 0.000045°.
const A = apple('a', -79.7, 43.5, 'Apple A');
const B = apple('b', -79.7, 43.50004495, 'Apple B');

describe('findOverlaps', () => {
  it('reports no overlap for two apples 5 m apart at Year 5 (combined ≈ 3 m)', () => {
    const out = findOverlaps([A, B], 5, 5);
    expect(out).toHaveLength(0);
  });

  it('reports an overlap by Year 15 for two apples 5 m apart (combined ≈ 6 m)', () => {
    const out = findOverlaps([A, B], 10, 5);
    expect(out).toHaveLength(1);
    const o = out[0]!;
    expect(o.aId).toBe('a');
    expect(o.bId).toBe('b');
    expect(o.yearOfOverlap).toBeLessThanOrEqual(15);
    expect(o.combinedRadiusM).toBeGreaterThan(o.separationM);
  });

  it('skips non-Point elements gracefully', () => {
    const polygon: DesignElement = {
      id: 'p',
      category: 'water',
      kind: 'pond',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]] },
      phase: 'water',
      createdAt: new Date(0).toISOString(),
    };
    const out = findOverlaps([A, B, polygon], 10, 5);
    expect(out).toHaveLength(1);
  });
});

describe('overlappingIds', () => {
  it('returns a set of every id that participates in an overlap', () => {
    const out = findOverlaps([A, B], 10, 5);
    const ids = overlappingIds(out);
    expect(ids.has('a')).toBe(true);
    expect(ids.has('b')).toBe(true);
    expect(ids.size).toBe(2);
  });
});
