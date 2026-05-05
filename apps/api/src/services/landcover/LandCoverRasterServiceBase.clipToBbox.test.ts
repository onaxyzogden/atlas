/**
 * LandCoverRasterServiceBase.clipToBbox — fixture-COG integration test.
 *
 * Strategy mirrors src/tests/GaezRasterService.test.ts: mock the `geotiff`
 * module to return a synthetic in-memory image so we can assert the
 * RasterClip shape (pixels, dimensions, sourceCrs, source, vintage,
 * pixelSize, nodata) without writing a real .tif. Uses WorldCover
 * (EPSG:4326) so the reprojection branch is the no-op path and pixel
 * arithmetic lines up with bbox arithmetic 1:1.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('geotiff', () => ({
  fromFile: vi.fn(),
  fromUrl: vi.fn(),
}));

import { fromFile } from 'geotiff';
import { WorldCoverRasterService } from './WorldCoverRasterService.js';

const mockFromFile = vi.mocked(fromFile);

let TMP: string;

/**
 * Synthetic WorldCover-shaped tile: 4×4 pixel grid covering [0,0,4,4] in
 * EPSG:4326 with origin at (0, 4) (north-up), pixelSize 1×1. Pixel values
 * encode their flat index so window reads are easy to verify.
 *   row 0 (y∈[3,4]): 0 1 2 3
 *   row 1 (y∈[2,3]): 4 5 6 7
 *   row 2 (y∈[1,2]): 8 9 10 11
 *   row 3 (y∈[0,1]): 12 13 14 15
 */
function makeFakeTiff(opts?: { nodata?: number | null }) {
  const nodata = opts?.nodata ?? null;
  const fullRaster = new Uint8Array([
    0, 1, 2, 3,
    4, 5, 6, 7,
    8, 9, 10, 11,
    12, 13, 14, 15,
  ]);
  const image = {
    getWidth: () => 4,
    getHeight: () => 4,
    getOrigin: () => [0, 4],
    getResolution: () => [1, -1],
    getGDALNoData: () => nodata,
    readRasters: vi.fn(async (args: { window: number[]; interleave: boolean }) => {
      const [px0, py0, px1, py1] = args.window as [number, number, number, number];
      const w = px1 - px0;
      const h = py1 - py0;
      const out = new Uint8Array(w * h);
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          out[r * w + c] = fullRaster[(py0 + r) * 4 + (px0 + c)]!;
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
        {
          filename: 'fake_tile.tif',
          bbox: [0, 0, 4, 4],
          vintage: 2021,
        },
      ],
    }),
  );
}

describe('LandCoverRasterServiceBase.clipToBbox', () => {
  beforeEach(() => {
    TMP = mkdtempSync(join(tmpdir(), 'lc-clip-'));
    mockFromFile.mockReset();
  });
  afterEach(() => {
    try { rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it('returns null when manifest is unloaded', async () => {
    const svc = new WorldCoverRasterService(TMP, null);
    // Don't loadManifest — service starts disabled.
    const clip = await svc.clipToBbox({
      minLng: 1, minLat: 1, maxLng: 2, maxLat: 2,
    });
    expect(clip).toBeNull();
  });

  it('returns null when no tile intersects the parcel bbox', async () => {
    writeManifest();
    const svc = new WorldCoverRasterService(TMP, null);
    svc.loadManifest();
    // Bbox far from the [0,0,4,4] tile.
    const clip = await svc.clipToBbox({
      minLng: 10, minLat: 10, maxLng: 11, maxLat: 11,
    });
    expect(clip).toBeNull();
    expect(mockFromFile).not.toHaveBeenCalled();
  });

  it('returns the correct RasterClip for a single-tile parcel', async () => {
    writeManifest();
    mockFromFile.mockResolvedValue(makeFakeTiff({ nodata: 255 }) as never);

    const svc = new WorldCoverRasterService(TMP, null);
    svc.loadManifest();

    // Request the centre 2×2 pixels: bbox [1,1,3,3] in source CRS.
    // Expected window: px0=1, px1=3, py0=1, py1=3
    //   pixel (1,1)=5, (2,1)=6, (1,2)=9, (2,2)=10
    const clip = await svc.clipToBbox({
      minLng: 1, minLat: 1, maxLng: 3, maxLat: 3,
    });

    expect(clip).not.toBeNull();
    expect(clip!.width).toBe(2);
    expect(clip!.height).toBe(2);
    expect(Array.from(clip!.pixels)).toEqual([5, 6, 9, 10]);
    expect(clip!.sourceCrs).toBe('EPSG:4326');
    expect(clip!.source).toBe('WorldCover');
    expect(clip!.vintage).toBe(2021);
    expect(clip!.pixelSize).toEqual([1, 1]);
    expect(clip!.nodataValue).toBe(255);
    // bboxSourceCrs reflects the actual pixel-aligned window:
    //   x: originX + px0*xRes .. originX + px1*xRes  → 1..3
    //   y (north-up, yRes=-1): originY + py1*yRes .. originY + py0*yRes → 1..3
    expect(clip!.bboxSourceCrs).toEqual([1, 1, 3, 3]);
  });

  it('returns null when the parcel spans multiple tiles', async () => {
    // Two adjacent tiles; parcel bbox spans both.
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
          { filename: 't1.tif', bbox: [0, 0, 4, 4] },
          { filename: 't2.tif', bbox: [4, 0, 8, 4] },
        ],
      }),
    );
    const svc = new WorldCoverRasterService(TMP, null);
    svc.loadManifest();

    const clip = await svc.clipToBbox({
      minLng: 3, minLat: 1, maxLng: 5, maxLat: 3,
    });
    expect(clip).toBeNull();
  });
});
