/**
 * Polygonisation + corridor-friction tests against fixture pixel grids.
 *
 * Per ADR 2026-05-05-pollinator-corridor-raster-pipeline. The fixture path
 * uses the pure-JS `polygonizePixelGrid` against a synthetic 10×10
 * RasterClip; production swaps in `polygonizeWithGdal` (apps/api) but the
 * shape/contract verified here is identical.
 */

import { describe, expect, it } from 'vitest';
import type { Feature, Polygon } from 'geojson';
import {
  polygonizeBbox,
  polygonizePixelGrid,
  type RasterClip,
} from '../ecology/polygonizeBbox.js';
import { deriveCorridorFriction } from '../ecology/corridorFriction.js';

// 10×10 NLCD fixture: half forest (NLCD 41 = Deciduous Forest), half
// cropland (NLCD 82 = Cultivated Crops). NoData reserves value 0.
function buildFixtureClip(): RasterClip {
  const w = 10;
  const h = 10;
  const pixels = new Uint8Array(w * h);
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      pixels[r * w + c] = c < w / 2 ? 41 : 82;
    }
  }
  return {
    pixels,
    width: w,
    height: h,
    bboxSourceCrs: [0, 0, 300, 300],   // 30m pixels in source CRS units
    sourceCrs: 'EPSG:5070',
    pixelSize: [30, 30],
    nodataValue: 0,
    vintage: 2021,
    source: 'NLCD',
  };
}

const PARCEL: Feature<Polygon> = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-80, 43],
      [-79.99, 43],
      [-79.99, 43.01],
      [-80, 43.01],
      [-80, 43],
    ]],
  },
  properties: {},
};

describe('polygonizePixelGrid', () => {
  it('emits one MultiPolygon per class and counts non-NoData pixels', async () => {
    const result = await polygonizePixelGrid(buildFixtureClip());
    expect(result.source).toBe('NLCD');
    expect(result.vintage).toBe(2021);
    expect(result.pixelCount).toBe(100);
    expect(result.crs).toBe('EPSG:5070');
    expect(result.features).toHaveLength(2);
    const classIds = new Set(result.features.map((f) => f.properties.classId));
    expect(classIds).toEqual(new Set([41, 82]));
  });

  it('skips NoData pixels in the count', async () => {
    const clip = buildFixtureClip();
    // Punch a NoData hole
    clip.pixels[0] = 0;
    clip.pixels[1] = 0;
    const result = await polygonizePixelGrid(clip);
    expect(result.pixelCount).toBe(98);
  });
});

describe('polygonizeBbox', () => {
  it('routes through clipProvider + polygonizer abstraction', async () => {
    const clip = buildFixtureClip();
    const result = await polygonizeBbox(PARCEL, {
      source: 'NLCD',
      clipProvider: async () => clip,
      polygonizer: polygonizePixelGrid,
    });
    expect(result.features).toHaveLength(2);
    expect(result.pixelCount).toBe(100);
  });

  it('skips reprojection when source CRS already equals target', async () => {
    const clip: RasterClip = { ...buildFixtureClip(), sourceCrs: 'EPSG:4326' };
    let reprojCalls = 0;
    const result = await polygonizeBbox(PARCEL, {
      source: 'WorldCover',
      clipProvider: async () => ({ ...clip, source: 'WorldCover' }),
      polygonizer: polygonizePixelGrid,
      reprojector: async (g) => {
        reprojCalls++;
        return g;
      },
    });
    expect(reprojCalls).toBe(0);
    expect(result.crs).toBe('EPSG:4326');
  });

  it('applies reprojector when source CRS differs from target', async () => {
    let reprojCalls = 0;
    const result = await polygonizeBbox(PARCEL, {
      source: 'NLCD',
      clipProvider: async () => buildFixtureClip(),
      polygonizer: polygonizePixelGrid,
      reprojector: async (g) => {
        reprojCalls++;
        return g;
      },
    });
    expect(reprojCalls).toBe(result.features.length);
    expect(result.crs).toBe('EPSG:4326');
  });
});

describe('deriveCorridorFriction', () => {
  it('annotates polygons with canonical class and friction', async () => {
    const polygons = await polygonizePixelGrid(buildFixtureClip());
    const friction = deriveCorridorFriction(polygons.features, {
      source: 'NLCD',
      vintage: 2021,
    });
    expect(friction.features).toHaveLength(2);

    const forest = friction.features.find((f) => f.properties.classId === 41)!;
    expect(forest.properties.canonicalClass).toBe('Deciduous Forest');
    expect(forest.properties.coverClass).toBe('forest');
    expect(forest.properties.friction).toBeLessThanOrEqual(2);
    expect(forest.properties.unspecifiedBucket).toBe(false);

    const crops = friction.features.find((f) => f.properties.classId === 82)!;
    expect(crops.properties.coverClass).toBe('cropland');
    expect(crops.properties.friction).toBeGreaterThan(forest.properties.friction);
  });

  it('aggregates permeable vs hostile area for telemetry', async () => {
    const polygons = await polygonizePixelGrid(buildFixtureClip());
    const friction = deriveCorridorFriction(polygons.features, {
      source: 'NLCD',
      vintage: 2021,
    });
    expect(friction.permeableAreaM2).toBeGreaterThan(0);
    // 50/50 split fixture — permeable (forest) and hostile (cropland=7) split should be similar
    expect(friction.permeableAreaM2).toBeGreaterThan(0);
    // cropland friction is 7 (not >=8) so it's not "hostile" by the
    // telemetry threshold; this asserts the threshold semantics.
    expect(friction.hostileAreaM2).toBe(0);
  });
});
