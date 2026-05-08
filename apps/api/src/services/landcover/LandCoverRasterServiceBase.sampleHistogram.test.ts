/**
 * LandCoverRasterServiceBase.sampleHistogram — polygon-mask refinement tests.
 *
 * Strategy mirrors `LandCoverRasterServiceBase.clipToBbox.test.ts` — mock
 * the `geotiff` module to return a synthetic in-memory tile so we can
 * assert histogram counts under both bbox-only (default) and
 * polygon-masked sampling. WorldCover (EPSG:4326) keeps the
 * reprojection branch as a no-op; pixel-centre arithmetic lines up
 * with bbox arithmetic 1:1.
 *
 * The fixture is a 10×10 tile covering EPSG:4326 [0,0,10,10] with
 * pixelSize 1×1 (north-up: origin [0,10], yRes -1). Top half is
 * class 1, bottom half is class 2 — so the bbox-only sampling at
 * [0,0,10,10] yields 50/50.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Polygon } from 'geojson';

vi.mock('geotiff', () => ({
  fromFile: vi.fn(),
  fromUrl: vi.fn(),
}));

import { fromFile } from 'geotiff';
import { WorldCoverRasterService } from './WorldCoverRasterService.js';

const mockFromFile = vi.mocked(fromFile);

let TMP: string;

const WIDTH = 10;
const HEIGHT = 10;

function buildSplitTopBottomRaster(): Uint8Array {
  // Rows 0..4 (top half) → class 1; rows 5..9 (bottom half) → class 2.
  const out = new Uint8Array(WIDTH * HEIGHT);
  for (let r = 0; r < HEIGHT; r++) {
    const cls = r < HEIGHT / 2 ? 1 : 2;
    for (let c = 0; c < WIDTH; c++) {
      out[r * WIDTH + c] = cls;
    }
  }
  return out;
}

function makeFakeTiff(fullRaster: Uint8Array, nodata: number | null = 255) {
  const image = {
    getWidth: () => WIDTH,
    getHeight: () => HEIGHT,
    getOrigin: () => [0, HEIGHT],         // top-left = (0, 10)
    getResolution: () => [1, -1],         // 1° per pixel, north-up
    getGDALNoData: () => nodata,
    readRasters: vi.fn(async (args: { window: number[] }) => {
      const [px0, py0, px1, py1] = args.window as [number, number, number, number];
      const w = px1 - px0;
      const h = py1 - py0;
      const out = new Uint8Array(w * h);
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          out[r * w + c] = fullRaster[(py0 + r) * WIDTH + (px0 + c)]!;
        }
      }
      return [out] as unknown as Uint8Array[];
    }),
  };
  return { getImage: vi.fn(async () => image) };
}

function writeManifest(): void {
  writeFileSync(
    join(TMP, 'worldcover-manifest.json'),
    JSON.stringify({
      generated_at: new Date().toISOString(),
      source: 'WorldCover',
      vintage: 2021,
      source_crs: 4326,
      attribution: 'ESA WorldCover 2021',
      licence: 'CC BY 4.0',
      entries: [
        { filename: 'fake_tile.tif', bbox: [0, 0, WIDTH, HEIGHT], vintage: 2021 },
      ],
    }),
  );
}

const FULL_BBOX = { minLng: 0, minLat: 0, maxLng: WIDTH, maxLat: HEIGHT };

describe('LandCoverRasterServiceBase.sampleHistogram polygon-mask', () => {
  beforeEach(() => {
    TMP = mkdtempSync(join(tmpdir(), 'lc-hist-'));
    writeManifest();
    mockFromFile.mockResolvedValue(makeFakeTiff(buildSplitTopBottomRaster()) as never);
  });

  afterEach(() => {
    rmSync(TMP, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('bbox-only call returns the full 50/50 split (regression guard)', async () => {
    const svc = new WorldCoverRasterService(TMP);
    svc.loadManifest();
    const hist = await svc.sampleHistogram(FULL_BBOX);
    expect(hist).not.toBeNull();
    expect(hist!.totalPixels).toBe(WIDTH * HEIGHT);
    expect(hist!.counts['1']).toBe(50);
    expect(hist!.counts['2']).toBe(50);
    expect(hist!.outsidePolygonCount ?? 0).toBe(0);
  });

  it('polygon ≈ bbox returns the same histogram as the bbox-only call', async () => {
    const svc = new WorldCoverRasterService(TMP);
    svc.loadManifest();
    const polygon: Polygon = {
      type: 'Polygon',
      coordinates: [[
        [0, 0],
        [WIDTH, 0],
        [WIDTH, HEIGHT],
        [0, HEIGHT],
        [0, 0],
      ]],
    };
    const hist = await svc.sampleHistogram(FULL_BBOX, polygon);
    expect(hist).not.toBeNull();
    expect(hist!.totalPixels).toBe(WIDTH * HEIGHT);
    expect(hist!.counts['1']).toBe(50);
    expect(hist!.counts['2']).toBe(50);
    expect(hist!.outsidePolygonCount).toBe(0);
  });

  it('polygon limited to the top half drops bottom-half pixels', async () => {
    const svc = new WorldCoverRasterService(TMP);
    svc.loadManifest();
    // Rectangle covering only the top half (lat 5..10) — should keep all
    // class-1 pixels and drop all class-2 pixels.
    const polygon: Polygon = {
      type: 'Polygon',
      coordinates: [[
        [0, 5],
        [WIDTH, 5],
        [WIDTH, HEIGHT],
        [0, HEIGHT],
        [0, 5],
      ]],
    };
    const hist = await svc.sampleHistogram(FULL_BBOX, polygon);
    expect(hist).not.toBeNull();
    expect(hist!.totalPixels).toBe(50);
    expect(hist!.counts['1']).toBe(50);
    expect(hist!.counts['2'] ?? 0).toBe(0);
    expect(hist!.outsidePolygonCount).toBe(50);
  });

  it('polygon entirely outside the bbox returns null (no pixels matched)', async () => {
    const svc = new WorldCoverRasterService(TMP);
    svc.loadManifest();
    const polygon: Polygon = {
      type: 'Polygon',
      coordinates: [[
        [100, 100],
        [101, 100],
        [101, 101],
        [100, 101],
        [100, 100],
      ]],
    };
    // The bbox arg is the parcel bbox (the polygon's bbox). With a
    // disjoint bbox, pickIntersectingEntries returns no tiles → null.
    const hist = await svc.sampleHistogram(
      { minLng: 100, minLat: 100, maxLng: 101, maxLat: 101 },
      polygon,
    );
    expect(hist).toBeNull();
  });

  it('triangular polygon over a uniform raster yields ~half the pixel count', async () => {
    // Override the fixture: every pixel = class 7 — easier to assert
    // ratios without worrying about which row the triangle clips.
    mockFromFile.mockResolvedValue(
      makeFakeTiff(new Uint8Array(WIDTH * HEIGHT).fill(7)) as never,
    );
    const svc = new WorldCoverRasterService(TMP);
    svc.loadManifest();

    // Right triangle over the bottom-left half of the bbox.
    const polygon: Polygon = {
      type: 'Polygon',
      coordinates: [[
        [0, 0],
        [WIDTH, 0],
        [0, HEIGHT],
        [0, 0],
      ]],
    };
    const hist = await svc.sampleHistogram(FULL_BBOX, polygon);
    expect(hist).not.toBeNull();
    // Triangle area = 50 cells; pixel-centre ray-cast on a 10×10 grid
    // lands ~45 pixels inside (boundary side dependent — accept ±5).
    expect(hist!.totalPixels).toBeGreaterThan(40);
    expect(hist!.totalPixels).toBeLessThan(60);
    expect(hist!.counts['7']).toBe(hist!.totalPixels);
    expect(hist!.outsidePolygonCount).toBe(WIDTH * HEIGHT - hist!.totalPixels);
  });
});
