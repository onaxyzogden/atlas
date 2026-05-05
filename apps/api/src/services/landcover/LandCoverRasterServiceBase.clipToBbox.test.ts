/**
 * LandCoverRasterServiceBase.clipToBbox — fixture-COG integration test.
 *
 * Strategy mirrors src/tests/GaezRasterService.test.ts: mock the `geotiff`
 * module to return synthetic in-memory images so we can assert the
 * RasterClip shape (pixels, dimensions, sourceCrs, source, vintage,
 * pixelSize, nodata) without writing real .tifs. Uses WorldCover
 * (EPSG:4326) so the reprojection branch is the no-op path and pixel
 * arithmetic lines up with bbox arithmetic 1:1.
 *
 * Multi-tile stitching tests (added 2026-05-05): verify aligned-grid
 * stitching across 2 horizontal, 2 vertical, and 4 corner tiles, and
 * the three fallback paths (grid misalignment, mixed NoData, >4 tiles).
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
 * Build a synthetic WorldCover-shaped tile with configurable origin and
 * source raster. Origin is the top-left in EPSG:4326 (north-up); width
 * × height = 4×4 pixels by default with pixelSize 1×1. Pixel values come
 * from the supplied `fullRaster` (length must equal width*height).
 */
function makeFakeTiff(opts: {
  nodata?: number | null;
  origin?: [number, number];
  resolution?: [number, number];
  width?: number;
  height?: number;
  fullRaster?: Uint8Array;
} = {}) {
  const nodata = opts.nodata ?? null;
  const origin = opts.origin ?? [0, 4];
  const resolution = opts.resolution ?? [1, -1];
  const width = opts.width ?? 4;
  const height = opts.height ?? 4;
  const fullRaster = opts.fullRaster ?? new Uint8Array([
    0, 1, 2, 3,
    4, 5, 6, 7,
    8, 9, 10, 11,
    12, 13, 14, 15,
  ]);
  const image = {
    getWidth: () => width,
    getHeight: () => height,
    getOrigin: () => origin,
    getResolution: () => resolution,
    getGDALNoData: () => nodata,
    readRasters: vi.fn(async (args: { window: number[]; interleave: boolean }) => {
      const [px0, py0, px1, py1] = args.window as [number, number, number, number];
      const w = px1 - px0;
      const h = py1 - py0;
      const out = new Uint8Array(w * h);
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          out[r * w + c] = fullRaster[(py0 + r) * width + (px0 + c)]!;
        }
      }
      return [out] as unknown as Uint8Array[];
    }),
  };
  return { getImage: vi.fn(async () => image) };
}

/** Minimal default manifest (single tile covering [0,0,4,4]). */
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
        { filename: 'fake_tile.tif', bbox: [0, 0, 4, 4], vintage: 2021 },
      ],
    }),
  );
}

interface MultiTileEntry {
  filename: string;
  bbox: [number, number, number, number];
  vintage?: number;
}
function writeMultiTileManifest(entries: MultiTileEntry[]): void {
  writeFileSync(
    join(TMP, 'worldcover-manifest.json'),
    JSON.stringify({
      generated_at: new Date().toISOString(),
      source: 'WorldCover',
      vintage: 2021,
      source_crs: 4326,
      attribution: 'ESA WorldCover 2021',
      licence: 'CC BY 4.0',
      entries,
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

  // ── Single-tile cases ──────────────────────────────────────────────────

  it('returns null when manifest is unloaded', async () => {
    const svc = new WorldCoverRasterService(TMP, null);
    const clip = await svc.clipToBbox({ minLng: 1, minLat: 1, maxLng: 2, maxLat: 2 });
    expect(clip).toBeNull();
  });

  it('returns null when no tile intersects the parcel bbox', async () => {
    writeManifest();
    const svc = new WorldCoverRasterService(TMP, null);
    svc.loadManifest();
    const clip = await svc.clipToBbox({ minLng: 10, minLat: 10, maxLng: 11, maxLat: 11 });
    expect(clip).toBeNull();
    expect(mockFromFile).not.toHaveBeenCalled();
  });

  it('returns the correct RasterClip for a single-tile parcel', async () => {
    writeManifest();
    mockFromFile.mockResolvedValue(makeFakeTiff({ nodata: 255 }) as never);

    const svc = new WorldCoverRasterService(TMP, null);
    svc.loadManifest();

    // Centre 2×2 pixels: bbox [1,1,3,3] → window px0=1 px1=3 py0=1 py1=3.
    // Pixels (1,1)=5 (2,1)=6 (1,2)=9 (2,2)=10
    const clip = await svc.clipToBbox({ minLng: 1, minLat: 1, maxLng: 3, maxLat: 3 });
    expect(clip).not.toBeNull();
    expect(clip!.width).toBe(2);
    expect(clip!.height).toBe(2);
    expect(Array.from(clip!.pixels)).toEqual([5, 6, 9, 10]);
    expect(clip!.sourceCrs).toBe('EPSG:4326');
    expect(clip!.source).toBe('WorldCover');
    expect(clip!.vintage).toBe(2021);
    expect(clip!.pixelSize).toEqual([1, 1]);
    expect(clip!.nodataValue).toBe(255);
    expect(clip!.bboxSourceCrs).toEqual([1, 1, 3, 3]);
  });

  // ── Multi-tile happy paths ─────────────────────────────────────────────

  it('stitches a horizontal 2-tile parcel', async () => {
    // Tile A spans x∈[0,4], Tile B spans x∈[4,8]; both y∈[0,4]. 4×4 pixels each.
    // Tile A pixels: 0..15 (default fullRaster).
    // Tile B pixels: 100..115.
    writeMultiTileManifest([
      { filename: 'a.tif', bbox: [0, 0, 4, 4], vintage: 2021 },
      { filename: 'b.tif', bbox: [4, 0, 8, 4], vintage: 2021 },
    ]);
    const tileB = new Uint8Array([
      100, 101, 102, 103,
      104, 105, 106, 107,
      108, 109, 110, 111,
      112, 113, 114, 115,
    ]);
    mockFromFile.mockImplementation(async (path: unknown) => {
      const p = String(path);
      if (p.endsWith('a.tif')) return makeFakeTiff({ nodata: 255 }) as never;
      return makeFakeTiff({ nodata: 255, origin: [4, 4], fullRaster: tileB }) as never;
    });

    const svc = new WorldCoverRasterService(TMP, null);
    svc.loadManifest();

    // Parcel bbox [3,1,5,3]: 2×2 stitch — 1 px from A (col 3 of rows 1-2) and
    // 1 px from B (col 0 of rows 1-2).
    //   row 1 (abs row 2 — y∈[2,3]): A(3,1)=7  B(0,1)=104
    //   row 2 (abs row 3 — y∈[1,2]): A(3,2)=11 B(0,2)=108
    const clip = await svc.clipToBbox({ minLng: 3, minLat: 1, maxLng: 5, maxLat: 3 });
    expect(clip).not.toBeNull();
    expect(clip!.width).toBe(2);
    expect(clip!.height).toBe(2);
    expect(Array.from(clip!.pixels)).toEqual([7, 104, 11, 108]);
    expect(clip!.bboxSourceCrs).toEqual([3, 1, 5, 3]);
    expect(clip!.nodataValue).toBe(255);
    expect(clip!.vintage).toBe(2021);
  });

  it('stitches a vertical 2-tile parcel', async () => {
    // Tile A spans y∈[2,6] (origin [0,6]); Tile B spans y∈[-2,2] (origin [0,2]).
    writeMultiTileManifest([
      { filename: 'a.tif', bbox: [0, 2, 4, 6], vintage: 2021 },
      { filename: 'b.tif', bbox: [0, -2, 4, 2], vintage: 2021 },
    ]);
    const tileB = new Uint8Array([
      100, 101, 102, 103,
      104, 105, 106, 107,
      108, 109, 110, 111,
      112, 113, 114, 115,
    ]);
    mockFromFile.mockImplementation(async (path: unknown) => {
      const p = String(path);
      if (p.endsWith('a.tif')) return makeFakeTiff({ nodata: 255, origin: [0, 6] }) as never;
      return makeFakeTiff({ nodata: 255, origin: [0, 2], fullRaster: tileB }) as never;
    });

    const svc = new WorldCoverRasterService(TMP, null);
    svc.loadManifest();

    // Parcel bbox [1,1,3,3]: 2×2 stitch straddling y=2.
    //   A bbox-y∈[2,3]; window: cols 1-2, rows 3-3 (y maps row=originY-y=6-y; y=3→r=3, y=2→r=4)
    //     → in tile A: px0=1,py0=3,px1=3,py1=4 → pixels (1,3)=13 (2,3)=14
    //   B bbox-y∈[1,2]; window in tile B (origin y=2): y=2→r=0, y=1→r=1
    //     → px0=1,py0=0,px1=3,py1=1 → pixels (1,0)=101 (2,0)=102
    // Stitched output (top→bottom is decreasing y): row 0 = A's, row 1 = B's
    const clip = await svc.clipToBbox({ minLng: 1, minLat: 1, maxLng: 3, maxLat: 3 });
    expect(clip).not.toBeNull();
    expect(clip!.width).toBe(2);
    expect(clip!.height).toBe(2);
    expect(Array.from(clip!.pixels)).toEqual([13, 14, 101, 102]);
    expect(clip!.bboxSourceCrs).toEqual([1, 1, 3, 3]);
  });

  it('stitches a 4-tile corner parcel', async () => {
    // 2×2 grid of 4×4-pixel tiles around the (4,2) corner.
    //   A: bbox [0,2,4,6]    origin [0,6]   pixels 0..15  (default)
    //   B: bbox [4,2,8,6]    origin [4,6]   pixels 100..115
    //   C: bbox [0,-2,4,2]   origin [0,2]   pixels 200..215
    //   D: bbox [4,-2,8,2]   origin [4,2]   pixels 300..315 (use 0..15 + 300 mod 256 — keep small)
    writeMultiTileManifest([
      { filename: 'a.tif', bbox: [0, 2, 4, 6], vintage: 2021 },
      { filename: 'b.tif', bbox: [4, 2, 8, 6], vintage: 2021 },
      { filename: 'c.tif', bbox: [0, -2, 4, 2], vintage: 2021 },
      { filename: 'd.tif', bbox: [4, -2, 8, 2], vintage: 2021 },
    ]);
    const mk = (base: number) => new Uint8Array(
      Array.from({ length: 16 }, (_, i) => (base + i) & 0xff),
    );
    mockFromFile.mockImplementation(async (path: unknown) => {
      const p = String(path);
      if (p.endsWith('a.tif')) return makeFakeTiff({ nodata: 255, origin: [0, 6], fullRaster: mk(0) }) as never;
      if (p.endsWith('b.tif')) return makeFakeTiff({ nodata: 255, origin: [4, 6], fullRaster: mk(100) }) as never;
      if (p.endsWith('c.tif')) return makeFakeTiff({ nodata: 255, origin: [0, 2], fullRaster: mk(200) }) as never;
      return makeFakeTiff({ nodata: 255, origin: [4, 2], fullRaster: mk(50) }) as never;
    });

    const svc = new WorldCoverRasterService(TMP, null);
    svc.loadManifest();

    // Parcel [3,1,5,3]: 2×2 stitch — one pixel from each tile.
    //   A: bbox-x∈[3,4] y∈[2,3] → tile cols 3-3, rows 3-3 → A(3,3)=15
    //   B: bbox-x∈[4,5] y∈[2,3] → cols 0-0 rows 3-3 → B(0,3)=112
    //   C: bbox-x∈[3,4] y∈[1,2] → cols 3-3 rows 0-0 → C(3,0)=203
    //   D: bbox-x∈[4,5] y∈[1,2] → cols 0-0 rows 0-0 → D(0,0)=50
    // Stitched: top-left = A (high y, low x); top-right = B; bottom-left = C; bottom-right = D
    const clip = await svc.clipToBbox({ minLng: 3, minLat: 1, maxLng: 5, maxLat: 3 });
    expect(clip).not.toBeNull();
    expect(clip!.width).toBe(2);
    expect(clip!.height).toBe(2);
    expect(Array.from(clip!.pixels)).toEqual([15, 112, 203, 50]);
    expect(clip!.bboxSourceCrs).toEqual([3, 1, 5, 3]);
  });

  // ── Multi-tile fallbacks ───────────────────────────────────────────────

  it('returns null on grid misalignment (origin offset not a pixel multiple)', async () => {
    writeMultiTileManifest([
      { filename: 'a.tif', bbox: [0, 0, 4, 4], vintage: 2021 },
      { filename: 'b.tif', bbox: [4, 0, 8, 4], vintage: 2021 },
    ]);
    mockFromFile.mockImplementation(async (path: unknown) => {
      const p = String(path);
      if (p.endsWith('a.tif')) return makeFakeTiff({ nodata: 255 }) as never;
      // Tile B's origin is offset by 0.3 px from the reference grid.
      return makeFakeTiff({ nodata: 255, origin: [4.3, 4] }) as never;
    });

    const svc = new WorldCoverRasterService(TMP, null);
    svc.loadManifest();

    const clip = await svc.clipToBbox({ minLng: 3, minLat: 1, maxLng: 5, maxLat: 3 });
    expect(clip).toBeNull();
  });

  it('returns null on mixed NoData across tiles', async () => {
    writeMultiTileManifest([
      { filename: 'a.tif', bbox: [0, 0, 4, 4], vintage: 2021 },
      { filename: 'b.tif', bbox: [4, 0, 8, 4], vintage: 2021 },
    ]);
    mockFromFile.mockImplementation(async (path: unknown) => {
      const p = String(path);
      if (p.endsWith('a.tif')) return makeFakeTiff({ nodata: 0 }) as never;
      return makeFakeTiff({ nodata: 255, origin: [4, 4] }) as never;
    });

    const svc = new WorldCoverRasterService(TMP, null);
    svc.loadManifest();

    const clip = await svc.clipToBbox({ minLng: 3, minLat: 1, maxLng: 5, maxLat: 3 });
    expect(clip).toBeNull();
  });

  it('returns null when more than 4 tiles intersect the parcel', async () => {
    // 5 horizontally-tiled neighbours all touched by a wide AOI.
    writeMultiTileManifest([
      { filename: 't0.tif', bbox: [0, 0, 4, 4] },
      { filename: 't1.tif', bbox: [4, 0, 8, 4] },
      { filename: 't2.tif', bbox: [8, 0, 12, 4] },
      { filename: 't3.tif', bbox: [12, 0, 16, 4] },
      { filename: 't4.tif', bbox: [16, 0, 20, 4] },
    ]);
    const svc = new WorldCoverRasterService(TMP, null);
    svc.loadManifest();

    const clip = await svc.clipToBbox({ minLng: 1, minLat: 1, maxLng: 19, maxLat: 3 });
    expect(clip).toBeNull();
    // Bailed out before opening any tiff.
    expect(mockFromFile).not.toHaveBeenCalled();
  });
});
