import { describe, it, expect } from 'vitest';
import {
  generateOrchardOnContour,
  type OrchardOnContourInput,
} from '../algorithms/orchardOnContour.js';
import {
  metresPerDegLat,
  metresPerDegLon,
  type LonLat,
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

/** Horizontal (east–west) line at the given northing-offset from the anchor. */
function horizontalLine(northingM: number, halfWidthM: number, vertexCount = 9): LonLat[] {
  const lat = ANCHOR_LAT + northingM / M_LAT;
  const pts: LonLat[] = [];
  for (let i = 0; i < vertexCount; i++) {
    const t = i / (vertexCount - 1);
    const xM = -halfWidthM + t * 2 * halfWidthM;
    pts.push([ANCHOR_LON + xM / M_LON, lat]);
  }
  return pts;
}

describe('generateOrchardOnContour', () => {
  const parcel = { boundary: squareParcel(900) };

  it('emits a warning when no contours are supplied', () => {
    const out = generateOrchardOnContour({ parcel, contours: [] });
    expect(out.features).toEqual([]);
    expect(out.rowCount).toBe(0);
    expect(out.warnings[0]).toMatch(/no contours provided/);
  });

  it('creates one row per contour that lies entirely inside the parcel', () => {
    const input: OrchardOnContourInput = {
      parcel,
      contours: [
        { line: horizontalLine(-200, 400), elevationM: 100 },
        { line: horizontalLine(0, 400), elevationM: 105 },
        { line: horizontalLine(200, 400), elevationM: 110 },
      ],
    };
    const out = generateOrchardOnContour(input);
    expect(out.rowCount).toBe(3);
    expect(out.features).toHaveLength(3);
    for (const f of out.features) {
      expect(f.featureType).toBe('path');
      expect(f.subtype).toBe('farm_lane');
      expect(f.phaseTag).toBe('orchard');
      expect((f.properties as { generator: string }).generator).toBe(
        'orchardOnContour',
      );
    }
  });

  it('estimatedTreeCount scales with row length (~800 m row at 6 m spacing ≈ 134 trees)', () => {
    const input: OrchardOnContourInput = {
      parcel,
      contours: [{ line: horizontalLine(0, 400), elevationM: 100 }],
    };
    const out = generateOrchardOnContour(input);
    expect(out.estimatedTreeCount).toBeGreaterThan(120);
    expect(out.estimatedTreeCount).toBeLessThan(150);
  });

  it('drops contours with meanSlopePct above maxSlopePct', () => {
    const input: OrchardOnContourInput = {
      parcel,
      contours: [
        { line: horizontalLine(-200, 400), meanSlopePct: 10 },
        { line: horizontalLine(0, 400), meanSlopePct: 40 },
        { line: horizontalLine(200, 400), meanSlopePct: 18 },
      ],
      options: { maxSlopePct: 25 },
    };
    const out = generateOrchardOnContour(input);
    expect(out.rowCount).toBe(2);
  });

  it('drops clipped rows shorter than minRowLengthM', () => {
    const input: OrchardOnContourInput = {
      parcel,
      contours: [
        { line: horizontalLine(0, 400) }, // ~800 m — kept
        { line: horizontalLine(100, 10) }, // ~20 m — too short
      ],
      options: { minRowLengthM: 50 },
    };
    const out = generateOrchardOnContour(input);
    expect(out.rowCount).toBe(1);
  });

  it('clips contour to parcel extent (long contour extending beyond is trimmed)', () => {
    const longContour: LonLat[] = horizontalLine(0, 1500, 31); // extends past parcel
    const input: OrchardOnContourInput = {
      parcel,
      contours: [{ line: longContour }],
    };
    const out = generateOrchardOnContour(input);
    expect(out.rowCount).toBe(1);
    const lenM = (out.features[0]!.properties as { lengthM: number }).lengthM;
    // Parcel is 900 m wide → clipped row sits well under 900 m.
    expect(lenM).toBeLessThan(900);
    expect(lenM).toBeGreaterThan(700);
  });

  it('emits a "no orchard rows generated" warning when every contour is filtered out', () => {
    const input: OrchardOnContourInput = {
      parcel,
      contours: [{ line: horizontalLine(0, 5) }], // ~10 m — below default minRowLengthM
    };
    const out = generateOrchardOnContour(input);
    expect(out.rowCount).toBe(0);
    expect(out.warnings).toContain('no orchard rows generated');
  });
});
