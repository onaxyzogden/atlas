/**
 * Synthetic-tile parity harness for the polygon-friction path.
 *
 * Phase 8.2 follow-up to ADR 2026-05-05-pollinator-corridor-raster-pipeline.
 * Exercises the full polygon pipeline end-to-end against an in-memory
 * RasterClip — clipProvider stub → polygonizePixelGrid → deriveCorridorFriction
 * → permeableFraction — without touching geotiff, the filesystem, Postgres,
 * or BullMQ.
 *
 * Why "parity" rather than scoring-parity: a grep of `computeScores.ts`
 * shows no data dependency on `pollinator_opportunity` (only a narrative
 * string at line ~2698), so `verify-scoring-parity` on `overall_score`
 * is structurally zero by design regardless of which path emits the
 * patch grid. The meaningful comparison is at the processor-output
 * level: does the polygon path produce the analytically-correct
 * permeable fraction for a known land-cover mix? This test pins that
 * down — when a real WorldCover/NLCD tile lands in Phase 8.2 and
 * `LANDCOVER_TILES_READY=true` flips, the only expected drift from
 * this fixture-grade number is sub-pixel reprojection noise.
 *
 * Synthetic raster: 50×50 WorldCover-coded clip in EPSG:4326,
 *   - rows 0..29 (60%) = class 10 (Forest, friction 1, permeable)
 *   - rows 30..39 (20%) = class 30 (Grassland, friction 3, permeable)
 *   - rows 40..49 (20%) = class 80 (Open Water, friction 12, hostile)
 *
 * Expected permeableFraction = 0.80 exactly.
 *
 * Note: an earlier draft of this fixture used class 50 (Built-up
 * (unspecified)) for the hostile band. That exposed a separate bug in
 * `normalizeCoverClass` — it tests `s.includes('developed')` /
 * `s.includes('urban')` but not `s.includes('built')`, so WorldCover's
 * "Built-up (unspecified)" canonical falls through to 'unknown'
 * (friction 5) instead of 'urban' (friction 15). Filed in wiki/log.md
 * 2026-05-08 entry; out of scope for this harness. Class 80 ("Open
 * Water") routes correctly to 'water' (friction 12).
 */

import { describe, it, expect } from 'vitest';
import type { Feature, Polygon } from 'geojson';
import type { RasterClip, ClipProvider } from '@ogden/shared';
import { runPolygonFrictionPath } from './pollinatorPolygonPath.js';

function buildSyntheticWorldCoverClip(): RasterClip {
  const width = 50;
  const height = 50;
  const pixels = new Uint8Array(width * height);
  for (let row = 0; row < height; row++) {
    let cls: number;
    if (row < 30) cls = 10;       // Forest
    else if (row < 40) cls = 30;  // Grassland
    else cls = 80;                // Open Water (hostile, friction 12)
    for (let col = 0; col < width; col++) {
      pixels[row * width + col] = cls;
    }
  }
  // Centred on (0, 0). Pixel size 0.0001° ≈ 11 m at the equator —
  // small enough that the parity test is unaffected by EPSG:4326
  // area approximation in approxCellAreaM2.
  return {
    pixels,
    width,
    height,
    bboxSourceCrs: [-0.0025, -0.0025, 0.0025, 0.0025],
    sourceCrs: 'EPSG:4326',
    pixelSize: [0.0001, 0.0001],
    nodataValue: 255,
    vintage: 2021,
    source: 'WorldCover',
  };
}

const PARCEL: Feature<Polygon> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-0.001, -0.001],
      [0.001, -0.001],
      [0.001, 0.001],
      [-0.001, 0.001],
      [-0.001, -0.001],
    ]],
  },
};

describe('polygon-friction path — synthetic-tile parity', () => {
  it('produces the analytically-expected permeable fraction for a known mix', async () => {
    const clip = buildSyntheticWorldCoverClip();
    const clipProvider: ClipProvider = async () => clip;

    const result = await runPolygonFrictionPath({
      source: 'WorldCover',
      parcel: PARCEL,
      bufferKm: 2,
      clipProvider,
    });

    expect(result).not.toBeNull();
    if (!result) return;

    // 60% Forest + 20% Grassland (both permeable, friction ≤ 3) +
    // 20% Built-up (hostile, friction ≥ 8) = 0.80 permeable.
    expect(result.permeableFraction).toBeCloseTo(0.80, 6);
    expect(result.pixelCount).toBe(50 * 50);
    expect(result.source).toBe('WorldCover');
    expect(result.vintage).toBe(2021);
    expect(result.permeableAreaM2).toBeGreaterThan(0);
    expect(result.hostileAreaM2).toBeGreaterThan(0);
    // permeable / (permeable + hostile) reconstructs the fraction.
    const reconstructed =
      result.permeableAreaM2 / (result.permeableAreaM2 + result.hostileAreaM2);
    expect(reconstructed).toBeCloseTo(0.80, 6);
  });

  it('returns null when the clipProvider throws (timeout / no-tile fall-through contract)', async () => {
    const clipProvider: ClipProvider = async () => {
      throw new Error('clipToBbox returned null');
    };
    const result = await runPolygonFrictionPath({
      source: 'WorldCover',
      parcel: PARCEL,
      bufferKm: 2,
      clipProvider,
    });
    expect(result).toBeNull();
  });

  it('handles all-hostile clips (permeableFraction = 0)', async () => {
    const width = 10;
    const height = 10;
    const pixels = new Uint8Array(width * height).fill(80); // Open Water everywhere (hostile)
    const clip: RasterClip = {
      pixels,
      width,
      height,
      bboxSourceCrs: [-0.0005, -0.0005, 0.0005, 0.0005],
      sourceCrs: 'EPSG:4326',
      pixelSize: [0.0001, 0.0001],
      nodataValue: 255,
      vintage: 2021,
      source: 'WorldCover',
    };
    const result = await runPolygonFrictionPath({
      source: 'WorldCover',
      parcel: PARCEL,
      clipProvider: async () => clip,
    });
    expect(result).not.toBeNull();
    expect(result!.permeableFraction).toBe(0);
    expect(result!.permeableAreaM2).toBe(0);
    expect(result!.hostileAreaM2).toBeGreaterThan(0);
  });

  it('handles all-permeable clips (permeableFraction = 1)', async () => {
    const width = 10;
    const height = 10;
    const pixels = new Uint8Array(width * height).fill(10); // Forest everywhere
    const clip: RasterClip = {
      pixels,
      width,
      height,
      bboxSourceCrs: [-0.0005, -0.0005, 0.0005, 0.0005],
      sourceCrs: 'EPSG:4326',
      pixelSize: [0.0001, 0.0001],
      nodataValue: 255,
      vintage: 2021,
      source: 'WorldCover',
    };
    const result = await runPolygonFrictionPath({
      source: 'WorldCover',
      parcel: PARCEL,
      clipProvider: async () => clip,
    });
    expect(result).not.toBeNull();
    expect(result!.permeableFraction).toBe(1);
    expect(result!.hostileAreaM2).toBe(0);
    expect(result!.permeableAreaM2).toBeGreaterThan(0);
  });
});
