/**
 * SoilGrids routes — integration tests against a test Fastify app.
 *
 * DB + Redis plugins mocked (same pattern as gaezRoutes.test.ts). The
 * SoilGridsRasterService module is mocked per-test so route behavior is
 * exercised in isolation from disk I/O.
 *
 * Unlike GAEZ, /raster is NOT JWT-gated (SoilGrids is CC BY 4.0).
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';

// ── Mock DB + Redis plugins ─────────────────────────────────────────────────

vi.mock('../plugins/database.js', async () => {
  const { default: fp } = await import('fastify-plugin');
  return {
    default: fp(async (fastify: FastifyInstance) => {
      // @ts-expect-error — test mock does not implement full postgres.Sql interface
      fastify.decorate('db', (_s: TemplateStringsArray, ..._v: unknown[]) => Promise.resolve([]));
      fastify.addHook('onClose', async () => {});
    }),
  };
});

vi.mock('../plugins/redis.js', async () => {
  const { default: fp } = await import('fastify-plugin');
  return {
    default: fp(async (fastify: FastifyInstance) => {
      // @ts-expect-error — test mock does not implement full ioredis.Redis interface
      fastify.decorate('redis', { quit: vi.fn().mockResolvedValue('OK') });
      fastify.addHook('onClose', async () => {});
    }),
  };
});

// ── Mock SoilGridsRasterService ─────────────────────────────────────────────

const soilFake = {
  isEnabled: vi.fn<() => boolean>(),
  query:     vi.fn(),
  getManifestEntries: vi.fn<() => Array<{ property: string; label: string; unit: string; range: [number, number]; rampId: string; filename: string }>>(),
  getAttribution:     vi.fn<() => string>(),
  resolveLocalFilePath: vi.fn<(property: string) => string | null>(),
};

vi.mock('../services/soilgrids/SoilGridsRasterService.js', () => ({
  initSoilGridsService: vi.fn(() => soilFake),
  getSoilGridsService:  vi.fn(() => soilFake),
  SoilGridsRasterService: class { /* stub */ },
}));

// ── App bootstrap ───────────────────────────────────────────────────────────

import { buildApp } from '../app.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  soilFake.isEnabled.mockReset();
  soilFake.query.mockReset();
  soilFake.getManifestEntries.mockReset();
  soilFake.getAttribution.mockReset();
  soilFake.resolveLocalFilePath.mockReset();
  soilFake.getAttribution.mockReturnValue('ISRIC SoilGrids v2.0 — CC BY 4.0');
});

// ── /query validation ───────────────────────────────────────────────────────

describe('GET /api/v1/soilgrids/query — validation', () => {
  it('422s on missing lat', async () => {
    soilFake.isEnabled.mockReturnValue(true);
    const res = await app.inject({ method: 'GET', url: '/api/v1/soilgrids/query?lng=-80' });
    expect(res.statusCode).toBe(422);
  });

  it('422s on lat outside [-90, 90]', async () => {
    soilFake.isEnabled.mockReturnValue(true);
    const res = await app.inject({ method: 'GET', url: '/api/v1/soilgrids/query?lat=91&lng=-80' });
    expect(res.statusCode).toBe(422);
  });

  it('422s on non-numeric lat/lng', async () => {
    soilFake.isEnabled.mockReturnValue(true);
    const res = await app.inject({ method: 'GET', url: '/api/v1/soilgrids/query?lat=foo&lng=bar' });
    expect(res.statusCode).toBe(422);
  });
});

// ── /query service interaction ──────────────────────────────────────────────

describe('GET /api/v1/soilgrids/query — service interaction', () => {
  it('returns 200 + unavailable when service is disabled', async () => {
    soilFake.isEnabled.mockReturnValue(false);
    const res = await app.inject({ method: 'GET', url: '/api/v1/soilgrids/query?lat=40&lng=-80' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.error).toBeNull();
    expect(body.data.fetch_status).toBe('unavailable');
    expect(body.data.summary).toBeNull();
    expect(body.data.message).toMatch(/soilgrids/i);
    expect(soilFake.query).not.toHaveBeenCalled();
  });

  it('returns 200 + complete with readings for a valid point', async () => {
    soilFake.isEnabled.mockReturnValue(true);
    soilFake.query.mockResolvedValue({
      fetch_status: 'complete',
      confidence:   'medium',
      source_api:   'ISRIC SoilGrids v2.0 (self-hosted)',
      attribution:  'ISRIC SoilGrids v2.0 — CC BY 4.0',
      summary: {
        readings: [
          { property: 'bedrock_depth', value: 120, unit: 'cm' },
          { property: 'ph',            value: 6.5, unit: 'pH' },
        ],
      },
    });

    const res = await app.inject({ method: 'GET', url: '/api/v1/soilgrids/query?lat=40&lng=-80' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.error).toBeNull();
    expect(body.data.fetch_status).toBe('complete');
    expect(body.data.summary.readings).toHaveLength(2);
    expect(soilFake.query).toHaveBeenCalledWith(40, -80);
  });

  it('returns 200 + failed when service.query throws', async () => {
    soilFake.isEnabled.mockReturnValue(true);
    soilFake.query.mockRejectedValue(new Error('synthetic GDAL failure'));

    const res = await app.inject({ method: 'GET', url: '/api/v1/soilgrids/query?lat=40&lng=-80' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.error).toBeNull();
    expect(body.data.fetch_status).toBe('failed');
    expect(body.data.summary).toBeNull();
    expect(body.data.message).toBe('SoilGrids raster query failed');
  });

  it('response wrapper is always { data, error }', async () => {
    soilFake.isEnabled.mockReturnValue(false);
    const res = await app.inject({ method: 'GET', url: '/api/v1/soilgrids/query?lat=0&lng=0' });
    const body = JSON.parse(res.body);
    expect(Object.keys(body).sort()).toEqual(['data', 'error']);
  });
});

// ── /catalog ────────────────────────────────────────────────────────────────

describe('GET /api/v1/soilgrids/catalog', () => {
  it('returns manifest entries with property/label/unit/range/rampId', async () => {
    soilFake.getManifestEntries.mockReturnValue([
      { property: 'bedrock_depth', label: 'Depth to bedrock', unit: 'cm', range: [0, 200],  rampId: 'sequential_earth',  filename: 'bedrock_depth.tif' },
      { property: 'ph',            label: 'Soil pH',          unit: 'pH', range: [4, 9],    rampId: 'diverging_ph',      filename: 'ph_0_30cm.tif' },
      { property: 'clay',          label: 'Clay content',     unit: '%',  range: [0, 60],   rampId: 'sequential_clay',   filename: 'clay_0_30cm.tif' },
    ]);

    const res = await app.inject({ method: 'GET', url: '/api/v1/soilgrids/catalog' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.error).toBeNull();
    expect(body.data.count).toBe(3);
    expect(body.data.entries).toHaveLength(3);
    expect(body.data.entries[0]).toMatchObject({
      property: 'bedrock_depth',
      rampId: 'sequential_earth',
    });
    expect(body.data.attribution).toMatch(/SoilGrids/);
  });

  it('returns empty list with 200 when service has no manifest', async () => {
    soilFake.getManifestEntries.mockReturnValue([]);
    const res = await app.inject({ method: 'GET', url: '/api/v1/soilgrids/catalog' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.count).toBe(0);
    expect(body.data.entries).toEqual([]);
  });
});

// ── /raster streaming with Range support ────────────────────────────────────

import { promises as fsp } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as pjoin } from 'node:path';

describe('GET /api/v1/soilgrids/raster/:property', () => {
  let tmpFile: string;
  const TOTAL = 4096;

  beforeAll(async () => {
    tmpFile = pjoin(tmpdir(), `soilgrids-test-${Date.now()}.tif`);
    const buf = Buffer.alloc(TOTAL);
    for (let i = 0; i < TOTAL; i++) buf[i] = i & 0xff;
    await fsp.writeFile(tmpFile, buf);
  });

  afterAll(async () => {
    try { await fsp.unlink(tmpFile); } catch { /* ignore */ }
  });

  it('streams full file with Accept-Ranges: bytes when no Range header', async () => {
    soilFake.isEnabled.mockReturnValue(true);
    soilFake.resolveLocalFilePath.mockReturnValue(tmpFile);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/soilgrids/raster/bedrock_depth',
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['accept-ranges']).toBe('bytes');
    expect(res.headers['content-type']).toMatch(/image\/tiff/);
    expect(Number(res.headers['content-length'])).toBe(TOTAL);
    expect(res.rawPayload.length).toBe(TOTAL);
  });

  it('returns 206 + correct Content-Range for a byte range', async () => {
    soilFake.isEnabled.mockReturnValue(true);
    soilFake.resolveLocalFilePath.mockReturnValue(tmpFile);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/soilgrids/raster/bedrock_depth',
      headers: { range: 'bytes=0-1023' },
    });
    expect(res.statusCode).toBe(206);
    expect(res.headers['content-range']).toBe(`bytes 0-1023/${TOTAL}`);
    expect(Number(res.headers['content-length'])).toBe(1024);
    expect(res.rawPayload.length).toBe(1024);
  });

  it('supports open-ended range (bytes=START-)', async () => {
    soilFake.isEnabled.mockReturnValue(true);
    soilFake.resolveLocalFilePath.mockReturnValue(tmpFile);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/soilgrids/raster/bedrock_depth',
      headers: { range: 'bytes=4000-' },
    });
    expect(res.statusCode).toBe(206);
    expect(res.headers['content-range']).toBe(`bytes 4000-${TOTAL - 1}/${TOTAL}`);
    expect(res.rawPayload.length).toBe(TOTAL - 4000);
  });

  it('returns 416 for malformed Range', async () => {
    soilFake.isEnabled.mockReturnValue(true);
    soilFake.resolveLocalFilePath.mockReturnValue(tmpFile);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/soilgrids/raster/bedrock_depth',
      headers: { range: 'pages=0-10' },
    });
    expect(res.statusCode).toBe(416);
  });

  it('returns 416 when range is past EOF', async () => {
    soilFake.isEnabled.mockReturnValue(true);
    soilFake.resolveLocalFilePath.mockReturnValue(tmpFile);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/soilgrids/raster/bedrock_depth',
      headers: { range: `bytes=${TOTAL}-${TOTAL + 100}` },
    });
    expect(res.statusCode).toBe(416);
  });

  it('returns 404 when manifest lookup fails (unknown property)', async () => {
    soilFake.isEnabled.mockReturnValue(true);
    soilFake.resolveLocalFilePath.mockReturnValue(null);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/soilgrids/raster/not_a_property',
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when service is disabled', async () => {
    soilFake.isEnabled.mockReturnValue(false);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/soilgrids/raster/bedrock_depth',
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when the manifest-resolved file is missing on disk', async () => {
    soilFake.isEnabled.mockReturnValue(true);
    soilFake.resolveLocalFilePath.mockReturnValue(pjoin(tmpdir(), 'does-not-exist-xyz.tif'));
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/soilgrids/raster/bedrock_depth',
    });
    expect(res.statusCode).toBe(404);
  });

  // SoilGrids is CC BY 4.0 — permissive. No JWT gate (unlike GAEZ).
  it('serves /raster without Authorization header (no auth gate)', async () => {
    soilFake.isEnabled.mockReturnValue(true);
    soilFake.resolveLocalFilePath.mockReturnValue(tmpFile);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/soilgrids/raster/bedrock_depth',
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['accept-ranges']).toBe('bytes');
  });
});
