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
    expect(gaezFake.query).toHaveBeenCalledWith(40, -80);
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


