import { describe, it, expect } from 'vitest';
import { generateHabitatCorridors } from '../algorithms/habitatCorridors.js';
import {
  metresPerDegLat,
  metresPerDegLon,
  type LineString,
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

function horizontalLine(lengthM: number, northingM: number): LineString {
  const half = lengthM / 2;
  return [
    [ANCHOR_LON - half / M_LON, ANCHOR_LAT + northingM / M_LAT],
    [ANCHOR_LON + half / M_LON, ANCHOR_LAT + northingM / M_LAT],
  ];
}

describe('generateHabitatCorridors', () => {
  it('warns and emits nothing on a degenerate boundary', () => {
    const out = generateHabitatCorridors({
      parcel: { boundary: [[0, 0], [1, 1]] },
    });
    expect(out.features).toEqual([]);
    expect(out.corridorCount).toBe(0);
    expect(out.warnings[0]).toMatch(/parcel boundary too small/);
  });

  it('emits a perimeter corridor with a polygon-with-hole geometry', () => {
    const out = generateHabitatCorridors({
      parcel: { boundary: squareParcel(900) },
    });
    expect(out.corridorCount).toBe(1);
    const f = out.features[0]!;
    expect(f.featureType).toBe('zone');
    expect(f.subtype).toBe('conservation');
    expect(f.phaseTag).toBe('habitat');
    const geom = f.geometry as { type: string; coordinates: number[][][] };
    expect(geom.type).toBe('Polygon');
    expect(geom.coordinates).toHaveLength(2); // outer + hole
    expect((f.properties as { corridorType: string }).corridorType).toBe(
      'perimeter',
    );
  });

  it('perimeter corridor area scales roughly with the buffer width', () => {
    const narrow = generateHabitatCorridors({
      parcel: { boundary: squareParcel(900) },
      options: { perimeterBufferM: 10 },
    });
    const wide = generateHabitatCorridors({
      parcel: { boundary: squareParcel(900) },
      options: { perimeterBufferM: 30 },
    });
    // 30 m / 10 m → ~3× the band area on a square that's much bigger
    // than the buffer width.
    expect(wide.totalCorridorAcres).toBeGreaterThan(
      narrow.totalCorridorAcres * 2.5,
    );
    expect(wide.totalCorridorAcres).toBeLessThan(
      narrow.totalCorridorAcres * 3.5,
    );
  });

  it('drops the perimeter corridor when it falls under minCorridorAcres', () => {
    const out = generateHabitatCorridors({
      parcel: { boundary: squareParcel(900) },
      options: { perimeterBufferM: 1, minCorridorAcres: 5 },
    });
    expect(out.corridorCount).toBe(0);
    expect(out.warnings).toContain(
      'perimeter corridor smaller than minCorridorAcres',
    );
    expect(out.warnings).toContain('no habitat corridors generated');
  });

  it('emits a riparian corridor per provided LineString', () => {
    const out = generateHabitatCorridors({
      parcel: { boundary: squareParcel(900) },
      riparianLines: [horizontalLine(500, 100), horizontalLine(500, -100)],
    });
    expect(out.corridorCount).toBe(3); // 1 perimeter + 2 riparian
    const riparian = out.features.filter(
      (f) =>
        (f.properties as { corridorType: string }).corridorType === 'riparian',
    );
    expect(riparian).toHaveLength(2);
    for (const f of riparian) {
      expect(f.subtype).toBe('conservation');
      const props = f.properties as { lengthM: number; bufferWidthM: number };
      expect(props.lengthM).toBeGreaterThan(450);
      expect(props.bufferWidthM).toBe(20);
    }
  });

  it('riparian corridor area increases with the buffer width', () => {
    const narrow = generateHabitatCorridors({
      parcel: { boundary: squareParcel(900) },
      riparianLines: [horizontalLine(500, 0)],
      options: { riparianBufferM: 10 },
    });
    const wide = generateHabitatCorridors({
      parcel: { boundary: squareParcel(900) },
      riparianLines: [horizontalLine(500, 0)],
      options: { riparianBufferM: 40 },
    });
    const narrowRiparian = narrow.features.find(
      (f) =>
        (f.properties as { corridorType: string }).corridorType === 'riparian',
    )!;
    const wideRiparian = wide.features.find(
      (f) =>
        (f.properties as { corridorType: string }).corridorType === 'riparian',
    )!;
    const narrowAcres = (narrowRiparian.properties as { areaAcres: number })
      .areaAcres;
    const wideAcres = (wideRiparian.properties as { areaAcres: number })
      .areaAcres;
    // Width 4× → area 4× (length stays the same).
    expect(wideAcres).toBeGreaterThan(narrowAcres * 3.5);
    expect(wideAcres).toBeLessThan(narrowAcres * 4.5);
  });

  it('skips empty / single-point riparian lines', () => {
    const out = generateHabitatCorridors({
      parcel: { boundary: squareParcel(900) },
      riparianLines: [[], [[ANCHOR_LON, ANCHOR_LAT]]],
    });
    // Only the perimeter corridor.
    expect(out.corridorCount).toBe(1);
  });
});
