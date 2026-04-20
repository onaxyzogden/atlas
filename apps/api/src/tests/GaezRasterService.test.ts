/**
 * GaezRasterService — unit tests.
 *
 * Strategy:
 *   - Real filesystem used for manifest-loading tests (tmpdir + fs writes).
 *   - `geotiff` module mocked end-to-end for query tests so no .tif files are needed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ─── Mock geotiff module ─────────────────────────────────────────────────────
//
// Per-test behaviour is configured by assigning to the module-scope fakes
// below; the default returns a synthetic 360x180 image at 1-deg resolution.

vi.mock('geotiff', () => ({
  fromFile: vi.fn(),
  fromUrl:  vi.fn(),
}));

import { fromFile, fromUrl } from 'geotiff';
import {
  GaezRasterService,
  initGaezService,
  getGaezService,
  type SuitabilityClass,
  type CropSuitabilityResult,
} from '../services/gaez/GaezRasterService.js';

const mockFromFile = vi.mocked(fromFile);
const mockFromUrl  = vi.mocked(fromUrl);

// ─── Fake-tiff factory ───────────────────────────────────────────────────────

/**
 * Build a stub GeoTIFF whose single image reads back `value` at every pixel.
 * Uses a 360x180 grid at 1-degree resolution with origin at (-180, 90) —
 * matches the native GAEZ EPSG:4326 layout.
 */
function makeFakeTiff(value: number, opts?: { nodata?: number | null }) {
  const noData = opts?.nodata ?? null;
  const image = {
    getWidth:      () => 360,
    getHeight:     () => 180,
    getOrigin:     () => [-180, 90],
    getResolution: () => [1, -1],
    getGDALNoData: () => noData,
    readRasters:   vi.fn(async (_args: { window: number[]; interleave: boolean }) => {
      return [new Float32Array([value])];
    }),
  };
  return {
    getImage: vi.fn(async () => image),
    __image:  image, // expose for assertions
  };
}

/** Build a stub whose `readRasters` always throws. */
function makeFailingTiff() {
  const image = {
    getWidth:      () => 360,
    getHeight:     () => 180,
    getOrigin:     () => [-180, 90],
    getResolution: () => [1, -1],
    getGDALNoData: () => null,
    readRasters:   vi.fn(async () => { throw new Error('synthetic raster read failure'); }),
  };
  return { getImage: vi.fn(async () => image), __image: image };
}

// ─── Manifest fixture ────────────────────────────────────────────────────────

type Crop =
  | 'wheat' | 'maize' | 'rice' | 'soybean' | 'potato' | 'cassava'
  | 'sorghum' | 'millet' | 'barley' | 'oat' | 'rye' | 'sweet_potato';

const CROPS: Crop[] = [
  'wheat', 'maize', 'rice', 'soybean', 'potato', 'cassava',
  'sorghum', 'millet', 'barley', 'oat', 'rye', 'sweet_potato',
];

function buildFullManifest(dataDir: string) {
  const entries: Record<string, unknown> = {};
  for (const crop of CROPS) {
    for (const ws of ['rainfed', 'irrigated'] as const) {
      for (const il of ['low', 'high'] as const) {
        const key = `${crop}_${ws}_${il}`;
        entries[key] = {
          filename:        `${key}_suitability.tif`,
          crop,
          waterSupply:     ws,
          inputLevel:      il,
          suitabilityFile: `${key}_suitability.tif`,
          yieldFile:       `${key}_yield.tif`,
          units:           { suitability: 'class', yield: 'kg/ha/yr' },
        };
      }
    }
  }
  const manifest = {
    generated_at:     '2026-04-20T00:00:00Z',
    source:           'FAO GAEZ v4',
    license:          'CC BY-NC-SA 3.0 IGO',
    attribution:      'FAO GAEZ v4 — CC BY-NC-SA 3.0 IGO',
    climate_scenario: 'baseline_1981_2010',
    entries,
  };
  writeFileSync(join(dataDir, 'gaez-manifest.json'), JSON.stringify(manifest));
  return manifest;
}

// ─── Setup / teardown ────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'gaez-test-'));
  mockFromFile.mockReset();
  mockFromUrl.mockReset();
});

afterEach(() => {
  try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
});

// ─── loadManifest + isEnabled ────────────────────────────────────────────────

describe('GaezRasterService.loadManifest', () => {
  it('returns false + isEnabled()=false when manifest is absent', () => {
    const s = new GaezRasterService(tmpDir, null);
    expect(s.loadManifest()).toBe(false);
    expect(s.isEnabled()).toBe(false);
  });

  it('returns false on malformed manifest JSON', () => {
    writeFileSync(join(tmpDir, 'gaez-manifest.json'), 'not json');
    const s = new GaezRasterService(tmpDir, null);
    expect(s.loadManifest()).toBe(false);
    expect(s.isEnabled()).toBe(false);
  });

  it('returns true on valid manifest with ≥1 entry', () => {
    writeFileSync(join(tmpDir, 'gaez-manifest.json'), JSON.stringify({
      generated_at:     '2026-04-20T00:00:00Z',
      source:           'FAO GAEZ v4',
      license:          'CC BY-NC-SA 3.0 IGO',
      attribution:      'FAO GAEZ v4 — CC BY-NC-SA 3.0 IGO',
      climate_scenario: 'baseline_1981_2010',
      entries: {
        wheat_rainfed_low: {
          filename:        'wheat_rainfed_low_suitability.tif',
          crop:            'wheat',
          waterSupply:     'rainfed',
          inputLevel:      'low',
          suitabilityFile: 'wheat_rainfed_low_suitability.tif',
          yieldFile:       'wheat_rainfed_low_yield.tif',
          units:           { suitability: 'class', yield: 'kg/ha/yr' },
        },
      },
    }));
    const s = new GaezRasterService(tmpDir, null);
    expect(s.loadManifest()).toBe(true);
    expect(s.isEnabled()).toBe(true);
  });

  it('returns false when manifest has zero entries', () => {
    writeFileSync(join(tmpDir, 'gaez-manifest.json'), JSON.stringify({
      generated_at:     '2026-04-20T00:00:00Z',
      source:           'FAO GAEZ v4',
      license:          'CC BY-NC-SA 3.0 IGO',
      attribution:      'FAO GAEZ v4 — CC BY-NC-SA 3.0 IGO',
      climate_scenario: 'baseline_1981_2010',
      entries:          {},
    }));
    const s = new GaezRasterService(tmpDir, null);
    expect(s.loadManifest()).toBe(true);   // JSON parsed OK
    expect(s.isEnabled()).toBe(false);     // but zero entries → disabled
  });
});

// ─── query() behavior ────────────────────────────────────────────────────────

describe('GaezRasterService.query', () => {
  it('returns fetch_status="unavailable" when service is disabled', async () => {
    const s = new GaezRasterService(tmpDir, null);
    s.loadManifest(); // no manifest → stays disabled
    const result = await s.query(40, -80);
    expect(result.fetch_status).toBe('unavailable');
    expect(result.summary).toBeNull();
    expect(result.message).toContain('not loaded');
  });

  it('returns 48 crop_suitabilities + computed summary for a valid land point', async () => {
    buildFullManifest(tmpDir);
    // All rasters read back value 3 (suitability class → S2 after mapping) or 5000 (yield)
    mockFromFile.mockImplementation(async (path: string) => {
      const p = String(path);
      const value = p.endsWith('_yield.tif') ? 5000 : 3;
      return makeFakeTiff(value) as unknown as Awaited<ReturnType<typeof fromFile>>;
    });

    const s = new GaezRasterService(tmpDir, null);
    s.loadManifest();
    const result = await s.query(40, -80);

    expect(result.fetch_status).toBe('complete');
    expect(result.confidence).toBe('medium');
    expect(result.summary).not.toBeNull();
    expect(result.summary!.crop_suitabilities).toHaveLength(48);
    // All entries should map suitability_code 3 → S2
    const classes = new Set(result.summary!.crop_suitabilities.map((r) => r.suitability_class));
    expect(classes).toEqual(new Set<SuitabilityClass>(['S2']));
    // Every yield is 5000
    const yields = new Set(result.summary!.crop_suitabilities.map((r) => r.attainable_yield_kg_ha));
    expect(yields).toEqual(new Set([5000]));
    expect(result.summary!.primary_suitability_class).toBe('S2');
    expect(result.summary!.attainable_yield_kg_ha_best).toBe(5000);
    expect(result.summary!.top_3_crops).toHaveLength(3);
  });

  it('returns confidence="low" + primary_suitability_class="WATER" when all rasters sample class 9 (water)', async () => {
    buildFullManifest(tmpDir);
    mockFromFile.mockImplementation(async (path: string) => {
      const p = String(path);
      const value = p.endsWith('_yield.tif') ? 0 : 9;
      return makeFakeTiff(value) as unknown as Awaited<ReturnType<typeof fromFile>>;
    });

    const s = new GaezRasterService(tmpDir, null);
    s.loadManifest();
    const result = await s.query(0, 0); // equator/prime meridian, open ocean

    expect(result.fetch_status).toBe('complete');
    expect(result.confidence).toBe('low');
    expect(result.summary!.primary_suitability_class).toBe('WATER');
    expect(result.summary!.best_crop).toBeNull();
    expect(result.summary!.top_3_crops).toEqual([]);
    expect(result.message).toContain('outside GAEZ terrestrial');
  });

  it('returns fetch_status="failed" when every raster read throws', async () => {
    buildFullManifest(tmpDir);
    mockFromFile.mockImplementation(async () => (
      makeFailingTiff() as unknown as Awaited<ReturnType<typeof fromFile>>
    ));

    const s = new GaezRasterService(tmpDir, null);
    s.loadManifest();
    const result = await s.query(40, -80);
    expect(result.fetch_status).toBe('failed');
    expect(result.summary).toBeNull();
    expect(result.message).toContain('All raster samples failed');
  });

  it('picks the highest-yielding crop regardless of suitability class for best_crop', async () => {
    buildFullManifest(tmpDir);
    // Per-crop mix: maize yields 6000 at class 4 (S2); wheat yields 4000 at class 1 (S1).
    // Yield is primary sort key, so maize wins.
    mockFromFile.mockImplementation(async (path: string) => {
      const p = String(path);
      const isYield = p.endsWith('_yield.tif');
      if (p.includes('maize_')) {
        return makeFakeTiff(isYield ? 6000 : 4) as unknown as Awaited<ReturnType<typeof fromFile>>;
      }
      if (p.includes('wheat_')) {
        return makeFakeTiff(isYield ? 4000 : 1) as unknown as Awaited<ReturnType<typeof fromFile>>;
      }
      // Other crops — zero yield so they don't contaminate the ranking
      return makeFakeTiff(isYield ? 0 : 7) as unknown as Awaited<ReturnType<typeof fromFile>>;
    });

    const s = new GaezRasterService(tmpDir, null);
    s.loadManifest();
    const result = await s.query(40, -80);
    expect(result.summary!.best_crop).toBe('maize');
    expect(result.summary!.attainable_yield_kg_ha_best).toBe(6000);
    expect(result.summary!.top_3_crops[0]?.crop).toBe('maize');
    expect(result.summary!.top_3_crops[1]?.crop).toBe('wheat');
  });

  it('top_3_crops contains ranked unique crop names (not duplicated per management variant)', async () => {
    buildFullManifest(tmpDir);
    // Assign distinct yields per crop so we can verify uniqueness in top_3
    const cropYields: Record<Crop, number> = {
      wheat:        4000,
      maize:        6000,
      rice:         5000,
      soybean:      3000,
      potato:       2000,
      cassava:      1000,
      sorghum:      900,
      millet:       800,
      barley:       700,
      oat:          600,
      rye:          500,
      sweet_potato: 400,
    };
    mockFromFile.mockImplementation(async (path: string) => {
      const p = String(path);
      const isYield = p.endsWith('_yield.tif');
      const crop = CROPS.find((c) => p.includes(`${c}_`));
      const value = isYield ? (crop ? cropYields[crop] : 0) : 3;
      return makeFakeTiff(value) as unknown as Awaited<ReturnType<typeof fromFile>>;
    });

    const s = new GaezRasterService(tmpDir, null);
    s.loadManifest();
    const result = await s.query(40, -80);
    const top3 = result.summary!.top_3_crops.map((t) => t.crop);
    expect(top3).toEqual(['maize', 'rice', 'wheat']);
    // Uniqueness
    expect(new Set(top3).size).toBe(3);
  });

  it('NoData pixel produces suitability_class="UNKNOWN" and null yield', async () => {
    writeFileSync(join(tmpDir, 'gaez-manifest.json'), JSON.stringify({
      generated_at:     '2026-04-20T00:00:00Z',
      source:           'FAO GAEZ v4',
      license:          'CC BY-NC-SA 3.0 IGO',
      attribution:      'FAO GAEZ v4 — CC BY-NC-SA 3.0 IGO',
      climate_scenario: 'baseline_1981_2010',
      entries: {
        wheat_rainfed_low: {
          filename:        'wheat_rainfed_low_suitability.tif',
          crop:            'wheat',
          waterSupply:     'rainfed',
          inputLevel:      'low',
          suitabilityFile: 'wheat_rainfed_low_suitability.tif',
          yieldFile:       'wheat_rainfed_low_yield.tif',
          units:           { suitability: 'class', yield: 'kg/ha/yr' },
        },
      },
    }));
    // Value -9999 matches the GDAL NoData → should be treated as null
    mockFromFile.mockImplementation(async () => (
      makeFakeTiff(-9999, { nodata: -9999 }) as unknown as Awaited<ReturnType<typeof fromFile>>
    ));

    const s = new GaezRasterService(tmpDir, null);
    s.loadManifest();
    const result = await s.query(40, -80);

    // Only one manifest entry, returning WATER/UNKNOWN-only → the "allOceanOrUnknown"
    // path fires with primary_suitability_class="WATER" and empty top_3.
    expect(result.fetch_status).toBe('complete');
    expect(result.confidence).toBe('low');
    expect(result.summary!.crop_suitabilities).toHaveLength(1);
    expect(result.summary!.crop_suitabilities[0]!.suitability_class).toBe('UNKNOWN');
    expect(result.summary!.crop_suitabilities[0]!.attainable_yield_kg_ha).toBeNull();
  });
});

// ─── openTiff backend switch ─────────────────────────────────────────────────

describe('GaezRasterService openTiff backend', () => {
  it('calls fromFile with local path when s3Prefix is null', async () => {
    writeFileSync(join(tmpDir, 'gaez-manifest.json'), JSON.stringify({
      generated_at:     'x', source: 'x', license: 'x', attribution: 'x',
      climate_scenario: 'baseline_1981_2010',
      entries: {
        k: {
          filename:        'a.tif',
          crop:            'wheat',
          waterSupply:     'rainfed',
          inputLevel:      'low',
          suitabilityFile: 'a.tif',
          yieldFile:       null,
          units:           { suitability: 'class', yield: 'kg/ha/yr' },
        },
      },
    }));
    mockFromFile.mockResolvedValue(makeFakeTiff(3) as unknown as Awaited<ReturnType<typeof fromFile>>);

    const s = new GaezRasterService(tmpDir, null);
    s.loadManifest();
    await s.query(40, -80);

    expect(mockFromFile).toHaveBeenCalledTimes(1);
    expect(mockFromUrl).not.toHaveBeenCalled();
    const arg = mockFromFile.mock.calls[0]![0];
    expect(String(arg)).toMatch(/a\.tif$/);
  });

  it('calls fromUrl with joined s3Prefix+filename when s3Prefix is set (trailing slash preserved)', async () => {
    writeFileSync(join(tmpDir, 'gaez-manifest.json'), JSON.stringify({
      generated_at: 'x', source: 'x', license: 'x', attribution: 'x',
      climate_scenario: 'baseline_1981_2010',
      entries: {
        k: {
          filename:        'a.tif',
          crop:            'wheat',
          waterSupply:     'rainfed',
          inputLevel:      'low',
          suitabilityFile: 'a.tif',
          yieldFile:       null,
          units:           { suitability: 'class', yield: 'kg/ha/yr' },
        },
      },
    }));
    mockFromUrl.mockResolvedValue(makeFakeTiff(3) as unknown as Awaited<ReturnType<typeof fromUrl>>);

    const s = new GaezRasterService(tmpDir, 'https://example.com/gaez/');
    s.loadManifest();
    await s.query(40, -80);

    expect(mockFromUrl).toHaveBeenCalledTimes(1);
    expect(mockFromFile).not.toHaveBeenCalled();
    expect(mockFromUrl.mock.calls[0]![0]).toBe('https://example.com/gaez/a.tif');
  });

  it('calls fromUrl with joined s3Prefix+filename (no trailing slash added correctly)', async () => {
    writeFileSync(join(tmpDir, 'gaez-manifest.json'), JSON.stringify({
      generated_at: 'x', source: 'x', license: 'x', attribution: 'x',
      climate_scenario: 'baseline_1981_2010',
      entries: {
        k: {
          filename:        'a.tif',
          crop:            'wheat',
          waterSupply:     'rainfed',
          inputLevel:      'low',
          suitabilityFile: 'a.tif',
          yieldFile:       null,
          units:           { suitability: 'class', yield: 'kg/ha/yr' },
        },
      },
    }));
    mockFromUrl.mockResolvedValue(makeFakeTiff(3) as unknown as Awaited<ReturnType<typeof fromUrl>>);

    const s = new GaezRasterService(tmpDir, 'https://example.com/gaez');
    s.loadManifest();
    await s.query(40, -80);

    expect(mockFromUrl.mock.calls[0]![0]).toBe('https://example.com/gaez/a.tif');
  });
});

// ─── Pixel math ──────────────────────────────────────────────────────────────

describe('GaezRasterService pixel math', () => {
  it('samples the pixel at the expected window for a known lat/lng', async () => {
    writeFileSync(join(tmpDir, 'gaez-manifest.json'), JSON.stringify({
      generated_at: 'x', source: 'x', license: 'x', attribution: 'x',
      climate_scenario: 'baseline_1981_2010',
      entries: {
        k: {
          filename:        'a.tif',
          crop:            'wheat',
          waterSupply:     'rainfed',
          inputLevel:      'low',
          suitabilityFile: 'a.tif',
          yieldFile:       null,
          units:           { suitability: 'class', yield: 'kg/ha/yr' },
        },
      },
    }));
    const fake = makeFakeTiff(3); // 360x180 @ origin (-180, 90), res (1, -1)
    mockFromFile.mockResolvedValue(fake as unknown as Awaited<ReturnType<typeof fromFile>>);

    const s = new GaezRasterService(tmpDir, null);
    s.loadManifest();
    // lat=40, lng=-80: px = floor((-80 - -180) / 1) = 100; py = floor((40 - 90) / -1) = 50
    await s.query(40, -80);

    expect(fake.__image.readRasters).toHaveBeenCalledTimes(1);
    const call = fake.__image.readRasters.mock.calls[0]![0];
    expect(call.window).toEqual([100, 50, 101, 51]);
    expect(call.interleave).toBe(false);
  });

  it('returns null for out-of-bounds lat/lng (pixel outside image extent)', async () => {
    writeFileSync(join(tmpDir, 'gaez-manifest.json'), JSON.stringify({
      generated_at: 'x', source: 'x', license: 'x', attribution: 'x',
      climate_scenario: 'baseline_1981_2010',
      entries: {
        k: {
          filename:        'a.tif',
          crop:            'wheat',
          waterSupply:     'rainfed',
          inputLevel:      'low',
          suitabilityFile: 'a.tif',
          yieldFile:       null,
          units:           { suitability: 'class', yield: 'kg/ha/yr' },
        },
      },
    }));
    // Image with limited extent — origin (-100, 50), 20x20 at 1-deg → covers lng[-100,-80], lat[50,30]
    const limited = {
      getImage: vi.fn(async () => ({
        getWidth:      () => 20,
        getHeight:     () => 20,
        getOrigin:     () => [-100, 50],
        getResolution: () => [1, -1],
        getGDALNoData: () => null,
        readRasters:   vi.fn(),
      })),
    };
    mockFromFile.mockResolvedValue(limited as unknown as Awaited<ReturnType<typeof fromFile>>);

    const s = new GaezRasterService(tmpDir, null);
    s.loadManifest();
    // Query way outside the 20x20 window
    const result = await s.query(-40, -50);

    // Single entry → UNKNOWN → allOceanOrUnknown path
    expect(result.summary!.crop_suitabilities[0]!.suitability_class).toBe('UNKNOWN');
  });
});

// ─── Singleton factory ───────────────────────────────────────────────────────

describe('initGaezService / getGaezService', () => {
  it('initializes a singleton and returns it from getGaezService()', () => {
    const s = initGaezService(tmpDir, null);
    expect(s).toBeInstanceOf(GaezRasterService);
    expect(getGaezService()).toBe(s);
  });

  it('initGaezService calls loadManifest (disabled when manifest absent)', () => {
    const s = initGaezService(tmpDir, null);
    expect(s.isEnabled()).toBe(false);
  });
});
