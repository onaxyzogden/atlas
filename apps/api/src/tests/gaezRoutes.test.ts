/**
 * GAEZ routes â€” integration tests against a test Fastify app.
 *
 * DB and Redis plugins are mocked (same pattern as smoke.test.ts).
 * The GaezRasterService module is mocked per-test by stubbing getGaezService()
 * to return a hand-built fake, so the route layer is exercised in isolation.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';

// â”€â”€â”€ Mock DB + Redis plugins (copy of smoke.test.ts pattern) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

vi.mock('../plugins/database.js', async () => {
  const { default: fp } = await import('fastify-plugin');
  return {
    default: fp(async (fastify: FastifyInstance) => {
      // @ts-expect-error â€” test mock does not implement full postgres.Sql interface
      fastify.decorate('db', (_s: TemplateStringsArray, ..._v: unknown[]) => Promise.resolve([]));
      fastify.addHook('onClose', async () => {});
    }),
  };
});

vi.mock('../plugins/redis.js', async () => {
  const { default: fp } = await import('fastify-plugin');
  return {
    default: fp(async (fastify: FastifyInstance) => {
      // @ts-expect-error â€” test mock does not implement full ioredis.Redis interface
      fastify.decorate('redis', { quit: vi.fn().mockResolvedValue('OK') });
      fastify.addHook('onClose', async () => {});
    }),
  };
});

// â”€â”€â”€ Mock GaezRasterService â€” the unit under test is the route, not the service

const gaezFake = {
  isEnabled: vi.fn<() => boolean>(),
  query:     vi.fn(),
  getManifestEntries: vi.fn<(scenario?: string) => Array<{ crop: string; waterSupply: string; inputLevel: string; scenario?: string; variables: string[] }>>(),
  getAttribution:     vi.fn<() => string>(),
  resolveLocalFilePath: vi.fn<(s: string, c: string, w: string, i: string, v: string) => string | null>(),
};

vi.mock('../services/gaez/GaezRasterService.js', () => ({
  initGaezService: vi.fn(() => gaezFake),
  getGaezService:  vi.fn(() => gaezFake),
  // The real file exports the class too, but the route only consumes the factory.
  GaezRasterService: class { /* stub */ },
}));

// â”€â”€â”€ App bootstrap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  gaezFake.isEnabled.mockReset();
  gaezFake.query.mockReset();
  gaezFake.getManifestEntries.mockReset();
  gaezFake.getAttribution.mockReset();
  gaezFake.resolveLocalFilePath.mockReset();
  gaezFake.getAttribution.mockReturnValue('FAO GAEZ v4 — CC BY-NC-SA 3.0 IGO');
});

// â”€â”€â”€ Validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('GET /api/v1/gaez/query â€” validation', () => {
  it('422s on missing lat', async () => {
    gaezFake.isEnabled.mockReturnValue(true);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/gaez/query?lng=-80',
    });
    expect(res.statusCode).toBe(422);
  });

  it('422s on missing lng', async () => {
    gaezFake.isEnabled.mockReturnValue(true);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/gaez/query?lat=40',
    });
    expect(res.statusCode).toBe(422);
  });

  it('422s on lat outside [-90, 90]', async () => {
    gaezFake.isEnabled.mockReturnValue(true);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/gaez/query?lat=91&lng=-80',
    });
    expect(res.statusCode).toBe(422);
  });

  it('422s on lng outside [-180, 180]', async () => {
    gaezFake.isEnabled.mockReturnValue(true);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/gaez/query?lat=40&lng=200',
    });
    expect(res.statusCode).toBe(422);
  });

  it('422s on non-numeric lat/lng', async () => {
    gaezFake.isEnabled.mockReturnValue(true);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/gaez/query?lat=foo&lng=bar',
    });
    expect(res.statusCode).toBe(422);
  });
});

// â”€â”€â”€ Happy + disabled + failure paths â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('GET /api/v1/gaez/query â€” service interaction', () => {
  it('returns 200 + unavailable when service is disabled', async () => {
    gaezFake.isEnabled.mockReturnValue(false);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/gaez/query?lat=40&lng=-80',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.error).toBeNull();
    expect(body.data.fetch_status).toBe('unavailable');
    expect(body.data.summary).toBeNull();
    expect(body.data.message).toMatch(/ingest:gaez/);
    expect(gaezFake.query).not.toHaveBeenCalled();
  });

  it('returns 200 + complete with summary for a valid point', async () => {
    gaezFake.isEnabled.mockReturnValue(true);
    gaezFake.query.mockResolvedValue({
      fetch_status: 'complete',
      confidence:   'medium',
      source_api:   'FAO GAEZ v4 (self-hosted)',
      attribution:  'FAO GAEZ v4 â€” CC BY-NC-SA 3.0 IGO',
      summary: {
        best_crop:                    'maize',
        best_management:              'rainfed_high',
        primary_suitability_class:    'S2',
        attainable_yield_kg_ha_best:  6000,
        top_3_crops: [
          { crop: 'maize', yield_kg_ha: 6000, suitability: 'S2' },
          { crop: 'wheat', yield_kg_ha: 4000, suitability: 'S1' },
          { crop: 'rice',  yield_kg_ha: 5000, suitability: 'S2' },
        ],
        crop_suitabilities: [],
      },
    });

    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/gaez/query?lat=40&lng=-80',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.error).toBeNull();
    expect(body.data.fetch_status).toBe('complete');
    expect(body.data.summary.best_crop).toBe('maize');
    expect(gaezFake.query).toHaveBeenCalledWith(40, -80, undefined);
  });

  it('returns 200 + failed when service.query throws', async () => {
    gaezFake.isEnabled.mockReturnValue(true);
    gaezFake.query.mockRejectedValue(new Error('synthetic GDAL failure'));

    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/gaez/query?lat=40&lng=-80',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.error).toBeNull();
    expect(body.data.fetch_status).toBe('failed');
    expect(body.data.summary).toBeNull();
    expect(body.data.message).toBe('GAEZ raster query failed');
  });

  it('response wrapper is always { data, error }', async () => {
    gaezFake.isEnabled.mockReturnValue(false);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/gaez/query?lat=0&lng=0',
    });
    const body = JSON.parse(res.body);
    expect(Object.keys(body).sort()).toEqual(['data', 'error']);
  });
});

// ─── Sprint CB: catalog ─────────────────────────────────────────────────────

describe('GET /api/v1/gaez/catalog', () => {
  it('returns manifest entries with crop/waterSupply/inputLevel/variables', async () => {
    gaezFake.getManifestEntries.mockReturnValue([
      { crop: 'maize', waterSupply: 'rainfed',   inputLevel: 'high', variables: ['suitability', 'yield'] },
      { crop: 'maize', waterSupply: 'irrigated', inputLevel: 'high', variables: ['suitability', 'yield'] },
      { crop: 'wheat', waterSupply: 'rainfed',   inputLevel: 'low',  variables: ['suitability'] },
    ]);

    const res = await app.inject({ method: 'GET', url: '/api/v1/gaez/catalog' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.error).toBeNull();
    expect(body.data.count).toBe(3);
    expect(body.data.entries).toHaveLength(3);
    expect(body.data.entries[0]).toMatchObject({
      crop: 'maize',
      waterSupply: 'rainfed',
      inputLevel: 'high',
      variables: ['suitability', 'yield'],
    });
    expect(body.data.attribution).toMatch(/FAO GAEZ v4/);
  });

  it('returns empty list with 200 when service is disabled (manifest absent)', async () => {
    gaezFake.getManifestEntries.mockReturnValue([]);
    const res = await app.inject({ method: 'GET', url: '/api/v1/gaez/catalog' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.count).toBe(0);
    expect(body.data.entries).toEqual([]);
  });
});

// ─── Sprint CB: raster streaming with Range support ─────────────────────────

import { promises as fsp } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as pjoin } from 'node:path';

describe('GET /api/v1/gaez/raster/:crop/:waterSupply/:inputLevel/:variable', () => {
  let tmpFile: string;
  const TOTAL = 4096;
  // Sprint CC: route is auth-gated; every request past the auth middleware
  // carries this header. Minted inside `it` bodies (buildApp-registered
  // fastify-jwt is only available after app.ready()).
  const authHeader = () => ({
    authorization: `Bearer ${app.jwt.sign({ sub: 'test-user', email: 't@t' })}`,
  });

  beforeAll(async () => {
    tmpFile = pjoin(tmpdir(), `gaez-test-${Date.now()}.tif`);
    // Fixture: 4096 bytes, each byte = index % 256 so we can verify slices.
    const buf = Buffer.alloc(TOTAL);
    for (let i = 0; i < TOTAL; i++) buf[i] = i & 0xff;
    await fsp.writeFile(tmpFile, buf);
  });

  afterAll(async () => {
    try { await fsp.unlink(tmpFile); } catch { /* ignore */ }
  });

  it('streams full file with Accept-Ranges: bytes when no Range header', async () => {
    gaezFake.isEnabled.mockReturnValue(true);
    gaezFake.resolveLocalFilePath.mockReturnValue(tmpFile);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/gaez/raster/baseline_1981_2010/maize/rainfed/high/suitability',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['accept-ranges']).toBe('bytes');
    expect(res.headers['content-type']).toMatch(/image\/tiff/);
    expect(Number(res.headers['content-length'])).toBe(TOTAL);
    expect(res.rawPayload.length).toBe(TOTAL);
    expect(res.rawPayload[0]).toBe(0);
    expect(res.rawPayload[255]).toBe(255);
  });

  it('returns 206 + correct Content-Range for a byte range', async () => {
    gaezFake.isEnabled.mockReturnValue(true);
    gaezFake.resolveLocalFilePath.mockReturnValue(tmpFile);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/gaez/raster/baseline_1981_2010/maize/rainfed/high/suitability',
      headers: { ...authHeader(), range: 'bytes=0-1023' },
    });
    expect(res.statusCode).toBe(206);
    expect(res.headers['content-range']).toBe(`bytes 0-1023/${TOTAL}`);
    expect(Number(res.headers['content-length'])).toBe(1024);
    expect(res.rawPayload.length).toBe(1024);
    expect(res.rawPayload[0]).toBe(0);
    expect(res.rawPayload[1023]).toBe(1023 & 0xff);
  });

  it('supports open-ended range (bytes=START-)', async () => {
    gaezFake.isEnabled.mockReturnValue(true);
    gaezFake.resolveLocalFilePath.mockReturnValue(tmpFile);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/gaez/raster/baseline_1981_2010/maize/rainfed/high/suitability',
      headers: { ...authHeader(), range: 'bytes=4000-' },
    });
    expect(res.statusCode).toBe(206);
    expect(res.headers['content-range']).toBe(`bytes 4000-${TOTAL - 1}/${TOTAL}`);
    expect(res.rawPayload.length).toBe(TOTAL - 4000);
  });

  it('returns 416 for malformed Range', async () => {
    gaezFake.isEnabled.mockReturnValue(true);
    gaezFake.resolveLocalFilePath.mockReturnValue(tmpFile);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/gaez/raster/baseline_1981_2010/maize/rainfed/high/suitability',
      headers: { ...authHeader(), range: 'pages=0-10' },
    });
    expect(res.statusCode).toBe(416);
  });

  it('returns 416 when range is past EOF', async () => {
    gaezFake.isEnabled.mockReturnValue(true);
    gaezFake.resolveLocalFilePath.mockReturnValue(tmpFile);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/gaez/raster/baseline_1981_2010/maize/rainfed/high/suitability',
      headers: { ...authHeader(), range: `bytes=${TOTAL}-${TOTAL + 100}` },
    });
    expect(res.statusCode).toBe(416);
  });

  it('returns 404 for unknown variable (rejects path-traversal before service lookup)', async () => {
    gaezFake.isEnabled.mockReturnValue(true);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/gaez/raster/baseline_1981_2010/maize/rainfed/high/malware',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(404);
    expect(gaezFake.resolveLocalFilePath).not.toHaveBeenCalled();
  });

  it('returns 404 when manifest lookup fails (unknown crop)', async () => {
    gaezFake.isEnabled.mockReturnValue(true);
    gaezFake.resolveLocalFilePath.mockReturnValue(null);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/gaez/raster/baseline_1981_2010/nope/rainfed/high/suitability',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when service is disabled', async () => {
    gaezFake.isEnabled.mockReturnValue(false);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/gaez/raster/baseline_1981_2010/maize/rainfed/high/suitability',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when the manifest-resolved file is missing on disk', async () => {
    gaezFake.isEnabled.mockReturnValue(true);
    gaezFake.resolveLocalFilePath.mockReturnValue(pjoin(tmpdir(), 'does-not-exist-xyz.tif'));
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/gaez/raster/baseline_1981_2010/maize/rainfed/high/suitability',
      headers: { authorization: `Bearer ${app.jwt.sign({ sub: 'test-user', email: 't@t' })}` },
    });
    expect(res.statusCode).toBe(404);
  });

  // ─── Sprint CC: /raster/* auth gate ───────────────────────────────────────
  //
  // FAO GAEZ v4 is CC BY-NC-SA 3.0 IGO. The raster endpoint streams FAO bytes,
  // so we gate it behind JWT as defense-in-depth (the NC-license decision
  // itself is tracked on wiki/LAUNCH-CHECKLIST.md). /catalog and /query stay
  // public — the former serves a manifest digest, the latter single-pixel
  // readings used by the Site Intelligence panel across the app.

  it('returns 401 when no Authorization header is supplied', async () => {
    gaezFake.isEnabled.mockReturnValue(true);
    gaezFake.resolveLocalFilePath.mockReturnValue(tmpFile);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/gaez/raster/baseline_1981_2010/maize/rainfed/high/suitability',
    });
    expect(res.statusCode).toBe(401);
    // Should short-circuit before touching the service.
    expect(gaezFake.resolveLocalFilePath).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header is malformed', async () => {
    gaezFake.isEnabled.mockReturnValue(true);
    gaezFake.resolveLocalFilePath.mockReturnValue(tmpFile);
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/gaez/raster/baseline_1981_2010/maize/rainfed/high/suitability',
      headers: { authorization: 'Bearer garbage.not.a.jwt' },
    });
    expect(res.statusCode).toBe(401);
    expect(gaezFake.resolveLocalFilePath).not.toHaveBeenCalled();
  });

  it('returns 200 when a valid JWT is supplied', async () => {
    gaezFake.isEnabled.mockReturnValue(true);
    gaezFake.resolveLocalFilePath.mockReturnValue(tmpFile);
    const token = app.jwt.sign({ sub: 'test-user', email: 'test@test' });
    const res = await app.inject({
      method: 'GET',
      url:    '/api/v1/gaez/raster/baseline_1981_2010/maize/rainfed/high/suitability',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['accept-ranges']).toBe('bytes');
    expect(res.rawPayload.length).toBe(TOTAL);
  });

  // ─── Sprint CD: scenario dimension ────────────────────────────────────────

  it('returns 400 when scenario path segment is malformed (contains slash or uppercase)', async () => {
    gaezFake.isEnabled.mockReturnValue(true);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/gaez/raster/Baseline_1981_2010/maize/rainfed/high/suitability',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when scenario is well-formed but not in manifest', async () => {
    gaezFake.isEnabled.mockReturnValue(true);
    gaezFake.resolveLocalFilePath.mockReturnValue(null);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/gaez/raster/rcp85_2041_2070/maize/rainfed/high/suitability',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(404);
  });
});

// ─── Sprint CD: scenario query-param plumbing on /catalog and /query ────────

describe('Sprint CD — scenario query param', () => {
  it('/catalog filters by scenario query param when supplied', async () => {
    gaezFake.isEnabled.mockReturnValue(true);
    gaezFake.getManifestEntries.mockReturnValue([
      { crop: 'maize', waterSupply: 'rainfed', inputLevel: 'high', scenario: 'baseline_1981_2010', variables: ['suitability', 'yield'] },
    ]);
    const res = await app.inject({ method: 'GET', url: '/api/v1/gaez/catalog?scenario=baseline_1981_2010' });
    expect(res.statusCode).toBe(200);
    expect(gaezFake.getManifestEntries).toHaveBeenCalledWith('baseline_1981_2010');
  });

  it('/query passes scenario to service when supplied', async () => {
    gaezFake.isEnabled.mockReturnValue(true);
    gaezFake.query.mockResolvedValue({ fetch_status: 'complete' } as unknown as ReturnType<typeof gaezFake.query> extends Promise<infer R> ? R : never);
    await app.inject({ method: 'GET', url: '/api/v1/gaez/query?lat=40&lng=-80&scenario=rcp85_2041_2070' });
    expect(gaezFake.query).toHaveBeenCalledWith(40, -80, 'rcp85_2041_2070');
  });

  it('/query calls service without scenario when param omitted', async () => {
    gaezFake.isEnabled.mockReturnValue(true);
    gaezFake.query.mockResolvedValue({ fetch_status: 'complete' } as unknown as ReturnType<typeof gaezFake.query> extends Promise<infer R> ? R : never);
    await app.inject({ method: 'GET', url: '/api/v1/gaez/query?lat=40&lng=-80' });
    expect(gaezFake.query).toHaveBeenCalledWith(40, -80, undefined);
  });
});

