import { describe, expect, it } from 'vitest';
import * as turf from '@turf/turf';
import { stripSubdivide } from '../stampers/stripSubdivide.js';
import { centroidPoint } from '../stampers/centroidPoint.js';
import { fillPolygon } from '../stampers/fillPolygon.js';
import { bboxRect } from '../stampers/bboxRect.js';
import { edgeLine } from '../stampers/edgeLine.js';
import { contourLine } from '../stampers/contourLine.js';
import { lowPointFill } from '../stampers/lowPointFill.js';
import { squarePoly } from './fixtures.js';
import { ACRE_M2, type TerrainView } from '../types.js';

const ZONE = squarePoly(0, 0, 0.02);
const ZONE_F = turf.feature(ZONE);
const ZONE_AREA = turf.area(ZONE_F);

function within(geom: GeoJSON.Polygon): boolean {
  // Allow a tiny epsilon buffer for floating-point edges.
  const padded = turf.buffer(ZONE_F, 0.001, { units: 'kilometers' })!;
  return turf.booleanWithin(turf.feature(geom), padded);
}

describe('stripSubdivide', () => {
  it('produces 2–12 strips all inside the zone', () => {
    const strips = stripSubdivide(ZONE, ZONE_AREA);
    expect(strips.length).toBeGreaterThanOrEqual(2);
    expect(strips.length).toBeLessThanOrEqual(12);
    for (const s of strips) expect(within(s)).toBe(true);
  });

  it('strip areas sum to roughly the zone area (±3%)', () => {
    const strips = stripSubdivide(ZONE, ZONE_AREA);
    const sum = strips.reduce((a, s) => a + turf.area(turf.feature(s)), 0);
    expect(sum).toBeGreaterThan(ZONE_AREA * 0.97);
    expect(sum).toBeLessThan(ZONE_AREA * 1.03);
  });

  it('is deterministic', () => {
    expect(stripSubdivide(ZONE, ZONE_AREA)).toEqual(
      stripSubdivide(ZONE, ZONE_AREA),
    );
  });

  // Right triangle: the old equal-bbox-width slices collapsed to a
  // sliver at the apex. Equal-area cutting must keep cells uniform.
  const TRI: GeoJSON.Polygon = {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [0.04, 0],
        [0, 0.04],
        [0, 0],
      ],
    ],
  };
  const TRI_AREA = turf.area(turf.feature(TRI));

  it('keeps cell areas within 10% on an irregular polygon', () => {
    const strips = stripSubdivide(TRI, TRI_AREA);
    expect(strips.length).toBeGreaterThanOrEqual(2);
    const areas = strips.map((s) => turf.area(turf.feature(s)));
    const max = Math.max(...areas);
    const min = Math.min(...areas);
    expect((max - min) / max).toBeLessThanOrEqual(0.1);
  });

  it('strip count still follows the ~1-acre formula', () => {
    // 0.5-acre allocation clamps to the floor of 2 strips.
    expect(stripSubdivide(ZONE, 0.5 * ACRE_M2).length).toBe(2);
  });

  it('is deterministic on an irregular polygon', () => {
    expect(stripSubdivide(TRI, TRI_AREA)).toEqual(
      stripSubdivide(TRI, TRI_AREA),
    );
  });
});

describe('centroidPoint', () => {
  it('returns one point inside the zone', () => {
    const [pt] = centroidPoint(ZONE);
    expect(pt!.type).toBe('Point');
    expect(turf.booleanPointInPolygon(turf.point(pt!.coordinates), ZONE_F)).toBe(
      true,
    );
  });
});

describe('fillPolygon', () => {
  it('returns the zone polygon', () => {
    const [poly] = fillPolygon(ZONE);
    expect(turf.area(turf.feature(poly!))).toBeCloseTo(ZONE_AREA, -1);
  });
});

describe('bboxRect', () => {
  it('is contained and not larger than the target area', () => {
    const target = ZONE_AREA * 0.25;
    const [rect] = bboxRect(ZONE, target);
    expect(rect).toBeDefined();
    expect(within(rect!)).toBe(true);
    expect(turf.area(turf.feature(rect!))).toBeLessThanOrEqual(target * 1.05);
  });
});

describe('edgeLine', () => {
  it('returns a closed-ish ring LineString', () => {
    const [line] = edgeLine(ZONE);
    expect(line!.type).toBe('LineString');
    expect(line!.coordinates.length).toBeGreaterThanOrEqual(4);
  });
});

describe('contourLine', () => {
  it('no-ops with empty terrain', () => {
    expect(contourLine(ZONE, { contours: [], points: [] })).toEqual([]);
  });

  it('clips a crossing contour to the zone', () => {
    const terrain: TerrainView = {
      contours: [
        {
          id: 'c1',
          geometry: {
            type: 'LineString',
            coordinates: [
              [-0.01, 0.01],
              [0.03, 0.01],
            ],
          },
        },
      ],
      points: [],
    };
    const out = contourLine(ZONE, terrain);
    expect(out.length).toBeGreaterThan(0);
    for (const seg of out) {
      const mid = seg.coordinates[Math.floor(seg.coordinates.length / 2)]!;
      expect(turf.booleanPointInPolygon(turf.point(mid), ZONE_F)).toBe(true);
    }
  });
});

describe('lowPointFill', () => {
  it('falls back to a centroid basin without terrain', () => {
    const [pond] = lowPointFill(ZONE, ZONE_AREA * 0.1, {
      contours: [],
      points: [],
    });
    expect(pond).toBeDefined();
    expect(within(pond!)).toBe(true);
  });

  it('places the basin at the in-zone low point', () => {
    const terrain: TerrainView = {
      contours: [],
      points: [
        { id: 'lo', position: [0.005, 0.005], kind: 'low', elevationM: 90 },
        { id: 'hi', position: [0.015, 0.015], kind: 'high', elevationM: 120 },
      ],
    };
    const [pond] = lowPointFill(ZONE, ZONE_AREA * 0.05, terrain);
    expect(pond).toBeDefined();
    const c = turf.centroid(turf.feature(pond!)).geometry.coordinates;
    // basin centroid should be near the low point, not the zone centre
    expect(Math.abs(c[0]! - 0.005)).toBeLessThan(0.004);
    expect(Math.abs(c[1]! - 0.005)).toBeLessThan(0.004);
  });
});
