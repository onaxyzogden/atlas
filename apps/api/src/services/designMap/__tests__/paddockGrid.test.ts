import { describe, it, expect } from 'vitest';
import {
  generatePaddockGrid,
  PADDOCK_M2_PER_ACRE,
} from '../algorithms/paddockGrid.js';
import {
  metresPerDegLat,
  metresPerDegLon,
  type Ring,
} from '../geometry.js';

const ANCHOR_LAT = 43;
const ANCHOR_LON = -79;
const M_LAT = metresPerDegLat();
const M_LON = metresPerDegLon(ANCHOR_LAT);

function squareParcel(sideM: number): Ring {
  const half = sideM / 2;
  const w = ANCHOR_LON - half / M_LON;
  const e = ANCHOR_LON + half / M_LON;
  const s = ANCHOR_LAT - half / M_LAT;
  const n = ANCHOR_LAT + half / M_LAT;
  return [
    [w, s],
    [e, s],
    [e, n],
    [w, n],
    [w, s],
  ];
}

describe('generatePaddockGrid', () => {
  it('warns and returns nothing when the parcel boundary is degenerate', () => {
    const out = generatePaddockGrid({
      parcel: { boundary: [[0, 0], [1, 1]] },
      acres: 10,
    });
    expect(out.features).toEqual([]);
    expect(out.paddockCount).toBe(0);
    expect(out.warnings[0]).toMatch(/parcel boundary too small/);
  });

  it('generates the full 4×3 grid on a ~200-acre square parcel by default', () => {
    const out = generatePaddockGrid({
      parcel: { boundary: squareParcel(900) },
      acres: 200,
    });
    expect(out.paddockCount).toBe(12);
    expect(out.features).toHaveLength(12);
    for (const f of out.features) {
      expect(f.featureType).toBe('zone');
      expect(f.subtype).toBe('livestock');
      expect(f.phaseTag).toBe('grazing');
      expect((f.properties as { generator: string }).generator).toBe(
        'paddockGrid',
      );
    }
  });

  it('honours cols/rows overrides', () => {
    const out = generatePaddockGrid({
      parcel: { boundary: squareParcel(900) },
      acres: 200,
      options: { cols: 2, rows: 2 },
    });
    expect(out.paddockCount).toBe(4);
  });

  it('drops paddocks below minPaddockAcres', () => {
    // 900 m square at 4×3 ≈ 16.7 ac/cell; require 50 ac → all dropped.
    const out = generatePaddockGrid({
      parcel: { boundary: squareParcel(900) },
      acres: 200,
      options: { minPaddockAcres: 50 },
    });
    expect(out.paddockCount).toBe(0);
    expect(out.warnings).toContain('no paddocks generated');
  });

  it('scales AU-days linearly with carryingCapacityAuPerAcre', () => {
    const base = generatePaddockGrid({
      parcel: { boundary: squareParcel(900) },
      acres: 200,
      options: { carryingCapacityAuPerAcre: 0.5 },
    });
    const doubled = generatePaddockGrid({
      parcel: { boundary: squareParcel(900) },
      acres: 200,
      options: { carryingCapacityAuPerAcre: 1.0 },
    });
    expect(doubled.totalPaddockAuDays).toBeGreaterThan(
      base.totalPaddockAuDays * 1.9,
    );
    expect(doubled.totalPaddockAuDays).toBeLessThan(
      base.totalPaddockAuDays * 2.1,
    );
  });

  it('AU-day math matches acres × capacity × 365', () => {
    const out = generatePaddockGrid({
      parcel: { boundary: squareParcel(900) },
      acres: 200,
      options: { carryingCapacityAuPerAcre: 0.5 },
    });
    const totalAcres = out.features.reduce((sum, f) => {
      const props = f.properties as { areaAcres: number };
      return sum + props.areaAcres;
    }, 0);
    const expectedAuDays = totalAcres * 0.5 * 365;
    expect(out.totalPaddockAuDays).toBeGreaterThan(expectedAuDays * 0.98);
    expect(out.totalPaddockAuDays).toBeLessThan(expectedAuDays * 1.02);
  });

  it('larger perimeter buffer drops cells whose centroid lands in the buffered margin', () => {
    const noBuffer = generatePaddockGrid({
      parcel: { boundary: squareParcel(900) },
      acres: 200,
      options: { perimeterBufferM: 0, cols: 10, rows: 10 },
    });
    const bigBuffer = generatePaddockGrid({
      parcel: { boundary: squareParcel(900) },
      acres: 200,
      options: { perimeterBufferM: 200, cols: 10, rows: 10 },
    });
    expect(bigBuffer.paddockCount).toBeLessThan(noBuffer.paddockCount);
  });

  it('exposes the acres-per-m² conversion used internally', () => {
    expect(PADDOCK_M2_PER_ACRE).toBeCloseTo(4046.8564224, 4);
  });
});
