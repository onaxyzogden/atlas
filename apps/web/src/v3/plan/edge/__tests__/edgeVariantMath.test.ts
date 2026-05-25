import { describe, expect, it } from 'vitest';
import {
  generateVariants,
  polsbyPopper,
  polygonAreaM2,
  polygonPerimeterM,
  type EdgeVariantId,
} from '../edgeVariantMath.js';

// A ~200 m square near the equator. Compact (high PP) — the canonical
// "homogenized" zone the variants should make more edge-rich.
const square: GeoJSON.Polygon = {
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
};

describe('compactness helpers', () => {
  it('computes a near-1.0 Polsby-Popper for a square below the circle bound', () => {
    const area = polygonAreaM2(square);
    const perim = polygonPerimeterM(square);
    const pp = polsbyPopper(area, perim);
    // A square's PP is π/4 ≈ 0.785.
    expect(pp).toBeGreaterThan(0.75);
    expect(pp).toBeLessThan(0.8);
  });

  it('returns 0 PP for a zero-perimeter degenerate', () => {
    expect(polsbyPopper(100, 0)).toBe(0);
  });
});

describe('generateVariants', () => {
  it('returns the three variants in order', () => {
    const variants = generateVariants(square);
    expect(variants.map((v) => v.id)).toEqual<EdgeVariantId[]>([
      'peninsula',
      'scalloped',
      'keyhole',
    ]);
  });

  it('every variant increases edge length and lowers Polsby-Popper', () => {
    const srcPerim = polygonPerimeterM(square);
    const srcPp = polsbyPopper(polygonAreaM2(square), srcPerim);
    for (const v of generateVariants(square)) {
      expect(v.perimeterM).toBeGreaterThan(srcPerim);
      expect(v.edgeDeltaPct).toBeGreaterThan(0);
      // More edge ⇒ less compact ⇒ lower PP ⇒ negative delta.
      expect(v.pp).toBeLessThan(srcPp);
      expect(v.ppDelta).toBeLessThan(0);
    }
  });

  it('every variant is a closed, valid polygon ring', () => {
    for (const v of generateVariants(square)) {
      const ring = v.geometry.coordinates[0]!;
      expect(ring.length).toBeGreaterThanOrEqual(4);
      // Closed ring: first vertex equals last.
      expect(ring[0]).toEqual(ring[ring.length - 1]);
      // Area stays positive (no degeneration / inversion).
      expect(polygonAreaM2(v.geometry)).toBeGreaterThan(0);
    }
  });

  it('PP recomputed from a variant geometry matches the reported pp (parity)', () => {
    for (const v of generateVariants(square)) {
      const recomputed = polsbyPopper(
        polygonAreaM2(v.geometry),
        polygonPerimeterM(v.geometry),
      );
      expect(recomputed).toBeCloseTo(v.pp, 10);
    }
  });

  it('returns [] for non-polygon or degenerate geometry', () => {
    expect(generateVariants({ type: 'Polygon', coordinates: [] })).toEqual([]);
    expect(
      generateVariants({
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0]]],
      }),
    ).toEqual([]);
  });
});
