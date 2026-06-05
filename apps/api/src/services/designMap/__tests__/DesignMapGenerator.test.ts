import { describe, it, expect } from 'vitest';
import {
  generateDesignMap,
  DEFAULT_ENTERPRISES,
} from '../DesignMapGenerator.js';
import type { Ring } from '../geometry.js';
import { metresPerDegLat, metresPerDegLon } from '../geometry.js';

const ANCHOR_LAT = 43;
const ANCHOR_LON = -79;

function squareParcel(sideM: number): Ring {
  const half = sideM / 2;
  const mLat = metresPerDegLat();
  const mLon = metresPerDegLon(ANCHOR_LAT);
  const w = ANCHOR_LON - half / mLon;
  const e = ANCHOR_LON + half / mLon;
  const s = ANCHOR_LAT - half / mLat;
  const n = ANCHOR_LAT + half / mLat;
  return [
    [w, s],
    [e, s],
    [e, n],
    [w, n],
    [w, s],
  ];
}

describe('generateDesignMap — orchestrator', () => {
  it('runs the orchard algorithm and surfaces its "no contours" warning when contours are absent', () => {
    const out = generateDesignMap({
      parcel: { boundary: squareParcel(900) },
      acres: 200,
      enterprises: ['orchard'],
    });
    expect(out.summary.orchardRows).toBe(0);
    expect(out.summary.estimatedTreeCount).toBe(0);
    expect(
      out.warnings.some((w) => w.includes('no contours provided')),
    ).toBe(true);
  });

  it('skips the orchard algorithm when "orchard" is not in the enterprise mix', () => {
    const out = generateDesignMap({
      parcel: { boundary: squareParcel(900) },
      acres: 200,
      enterprises: [],
    });
    expect(out.summary.orchardRows).toBe(0);
    expect(
      out.warnings.some((w) => w.includes('no contours provided')),
    ).toBe(false);
  });

  it('runs the paddock-grid algorithm when "livestock" is in the enterprise mix', () => {
    const out = generateDesignMap({
      parcel: { boundary: squareParcel(900) },
      acres: 200,
      enterprises: ['livestock'],
    });
    expect(out.summary.paddocks).toBeGreaterThan(0);
    expect(out.summary.totalPaddockAuDays).toBeGreaterThan(0);
    expect(
      out.features.some((f) => f.subtype === 'livestock'),
    ).toBe(true);
  });

  it('skips the paddock-grid algorithm when "livestock" is absent from the enterprise mix', () => {
    const out = generateDesignMap({
      parcel: { boundary: squareParcel(900) },
      acres: 200,
      enterprises: ['orchard'],
    });
    expect(out.summary.paddocks).toBe(0);
    expect(out.summary.totalPaddockAuDays).toBe(0);
  });

  it('rejects a parcel with fewer than 3 boundary vertices', () => {
    const out = generateDesignMap({
      parcel: { boundary: [[0, 0], [1, 1]] },
      acres: 10,
    });
    expect(out.features).toEqual([]);
    expect(out.warnings).toContain('parcel boundary missing or invalid');
  });

  it('rejects non-positive acreage', () => {
    const out = generateDesignMap({
      parcel: { boundary: squareParcel(900) },
      acres: 0,
    });
    expect(out.warnings).toContain('parcel acres must be positive');
  });

  it('exposes a default enterprise mix of orchard + livestock', () => {
    expect(DEFAULT_ENTERPRISES).toContain('orchard');
    expect(DEFAULT_ENTERPRISES).toContain('livestock');
  });

  it('always emits a perimeter habitat corridor on a valid parcel', () => {
    const out = generateDesignMap({
      parcel: { boundary: squareParcel(900) },
      acres: 200,
      enterprises: [],
    });
    expect(out.summary.corridors).toBeGreaterThan(0);
    expect(out.summary.totalCorridorAcres).toBeGreaterThan(0);
    expect(
      out.features.some(
        (f) => f.subtype === 'conservation' && f.phaseTag === 'habitat',
      ),
    ).toBe(true);
  });

  it('gate: a 900 m square fixture with contours yields orchards + paddocks + corridors together', () => {
    const mLat = metresPerDegLat();
    const mLon = metresPerDegLon(ANCHOR_LAT);
    // Two horizontal contour lines inside the parcel.
    const contour = (northingM: number) => ({
      line: [
        [ANCHOR_LON - 350 / mLon, ANCHOR_LAT + northingM / mLat],
        [ANCHOR_LON + 350 / mLon, ANCHOR_LAT + northingM / mLat],
      ] as [number, number][],
      elevationM: 100 + northingM / 10,
      meanSlopePct: 6,
    });
    const out = generateDesignMap({
      parcel: { boundary: squareParcel(900) },
      acres: 200,
      contours: [contour(-150), contour(0), contour(150)],
      enterprises: ['orchard', 'livestock'],
    });
    expect(out.summary.orchardRows).toBeGreaterThan(0);
    expect(out.summary.estimatedTreeCount).toBeGreaterThan(0);
    expect(out.summary.paddocks).toBeGreaterThan(0);
    expect(out.summary.corridors).toBeGreaterThan(0);
    // Three algorithm families represented in the feature set.
    const subtypes = new Set(out.features.map((f) => f.subtype));
    expect(subtypes.has('farm_lane')).toBe(true); // orchard rows
    expect(subtypes.has('livestock')).toBe(true); // paddocks
    expect(subtypes.has('conservation')).toBe(true); // corridors
  });

  it('aggregates feature output and warnings across all four algorithms in a full run', () => {
    const mLat = metresPerDegLat();
    const mLon = metresPerDegLon(ANCHOR_LAT);
    const contour = (northingM: number) => ({
      line: [
        [ANCHOR_LON - 350 / mLon, ANCHOR_LAT + northingM / mLat],
        [ANCHOR_LON + 350 / mLon, ANCHOR_LAT + northingM / mLat],
      ] as [number, number][],
      elevationM: 100 + northingM / 10,
      meanSlopePct: 6,
    });
    const swaleCandidate = {
      start: [ANCHOR_LON - 200 / mLon, ANCHOR_LAT - 50 / mLat] as [
        number,
        number,
      ],
      end: [ANCHOR_LON + 200 / mLon, ANCHOR_LAT - 50 / mLat] as [
        number,
        number,
      ],
      lengthCells: 20,
      meanSlope: 6,
      elevation: 100,
      suitabilityScore: 0.8,
    };
    const riparianLine: [number, number][] = [
      [ANCHOR_LON - 200 / mLon, ANCHOR_LAT + 50 / mLat],
      [ANCHOR_LON + 200 / mLon, ANCHOR_LAT + 50 / mLat],
    ];
    const out = generateDesignMap({
      parcel: { boundary: squareParcel(900) },
      acres: 200,
      contours: [contour(-150), contour(0), contour(150)],
      swaleCandidates: [swaleCandidate],
      riparianLines: [riparianLine],
      enterprises: ['orchard', 'livestock'],
    });
    expect(out.summary.orchardRows).toBeGreaterThan(0);
    expect(out.summary.swales).toBe(1);
    expect(out.summary.paddocks).toBeGreaterThan(0);
    expect(out.summary.corridors).toBeGreaterThan(1); // perimeter + 1 riparian
    expect(out.summary.totalSpongeCapacityM3).toBeGreaterThan(0);
    expect(out.summary.totalPaddockAuDays).toBeGreaterThan(0);
    expect(out.summary.totalCorridorAcres).toBeGreaterThan(0);
    expect(out.summary.estimatedTreeCount).toBeGreaterThan(0);
  });

  it('preserves a stable sortOrder ordering across algorithm families', () => {
    const mLat = metresPerDegLat();
    const mLon = metresPerDegLon(ANCHOR_LAT);
    const contour = {
      line: [
        [ANCHOR_LON - 350 / mLon, ANCHOR_LAT],
        [ANCHOR_LON + 350 / mLon, ANCHOR_LAT],
      ] as [number, number][],
      elevationM: 100,
      meanSlopePct: 6,
    };
    const out = generateDesignMap({
      parcel: { boundary: squareParcel(900) },
      acres: 200,
      contours: [contour],
      enterprises: ['orchard', 'livestock'],
    });
    // Each algorithm reserves its own sortOrder band:
    //   orchard 100s, swale 200s, paddock 300s, corridor 400s.
    const ordersByGenerator: Record<string, number[]> = {};
    for (const f of out.features) {
      const gen = (f.properties as { generator: string }).generator;
      const order = f.sortOrder ?? 0;
      (ordersByGenerator[gen] ??= []).push(order);
    }
    for (const o of ordersByGenerator.orchardOnContour ?? []) {
      expect(o).toBeGreaterThanOrEqual(100);
      expect(o).toBeLessThan(200);
    }
    for (const o of ordersByGenerator.paddockGrid ?? []) {
      expect(o).toBeGreaterThanOrEqual(300);
      expect(o).toBeLessThan(400);
    }
    for (const o of ordersByGenerator.habitatCorridors ?? []) {
      expect(o).toBeGreaterThanOrEqual(400);
      expect(o).toBeLessThan(500);
    }
  });

  it('aggregates "no candidates / no contours" warnings without dropping any', () => {
    // No contours, no swale candidates, no enterprises beyond defaults.
    const out = generateDesignMap({
      parcel: { boundary: squareParcel(900) },
      acres: 200,
      enterprises: ['orchard'],
    });
    // Orchard warns about contours; corridor still runs and won't warn.
    expect(
      out.warnings.filter((w) => w.includes('no contours provided')),
    ).toHaveLength(1);
  });

  it('runs swales when candidates are present, regardless of enterprise mix', () => {
    const mLat = metresPerDegLat();
    const mLon = metresPerDegLon(ANCHOR_LAT);
    const swaleCandidate = {
      start: [ANCHOR_LON - 200 / mLon, ANCHOR_LAT] as [number, number],
      end: [ANCHOR_LON + 200 / mLon, ANCHOR_LAT] as [number, number],
      lengthCells: 20,
      meanSlope: 6,
      elevation: 100,
      suitabilityScore: 0.8,
    };
    const out = generateDesignMap({
      parcel: { boundary: squareParcel(900) },
      acres: 200,
      enterprises: [], // no enterprises at all
      swaleCandidates: [swaleCandidate],
    });
    expect(out.summary.swales).toBe(1);
    expect(out.summary.totalSpongeCapacityM3).toBeGreaterThan(0);
    expect(out.features[0]?.subtype).toBe('farm_lane');
  });
});
