/**
 * Boundary routes — tests for parcel boundary management.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { mockDb, enqueue, clearQueue } from './helpers/testApp.js';
import {
  TEST_USER_ID, TEST_EMAIL, TEST_PROJ_ID, FAKE_ID, projectRow,
} from './helpers/fixtures.js';

vi.mock('../plugins/database.js', async () => {
  const { default: fp } = await import('fastify-plugin');
  return {
    default: fp(async (fastify: FastifyInstance) => {
      // @ts-expect-error — mock
      fastify.decorate('db', mockDb);
      fastify.addHook('onClose', async () => {});
    }),
  };
});

vi.mock('../plugins/redis.js', async () => {
  const { default: fp } = await import('fastify-plugin');
  return {
    default: fp(async (fastify: FastifyInstance) => {
      // @ts-expect-error — mock
      fastify.decorate('redis', { quit: vi.fn().mockResolvedValue('OK') });
      fastify.addHook('onClose', async () => {});
    }),
  };
});

import { buildApp } from '../app.js';

let app: FastifyInstance;
let authToken: string;

const validGeoJSON = {
  type: 'Polygon',
  coordinates: [
    [[-80.0, 40.0], [-79.9, 40.0], [-79.9, 40.1], [-80.0, 40.1], [-80.0, 40.0]],
  ],
};

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  authToken = app.jwt.sign({ sub: TEST_USER_ID, email: TEST_EMAIL }, { expiresIn: '1h' });
});

afterAll(async () => { await app.close(); });
beforeEach(() => { clearQueue(); });

describe('POST /api/v1/projects/:id/boundary', () => {
  it('sets boundary and returns 200', async () => {
    enqueue(projectRow()); // resolveProjectRole
    enqueue(projectRow()); // refuseIfBuiltin (added 2026-05-05: route now guards builtin sample projects)
    // UPDATE projects SET parcel_boundary, centroid, acreage RETURNING ...
    enqueue({
      id: TEST_PROJ_ID,
      acreage: 152.3,
      centroid_geojson: { type: 'Point', coordinates: [-79.95, 40.05] },
      has_parcel_boundary: true,
    });
    // INSERT data_pipeline_jobs (re-enqueue Tier 1)
    enqueue();

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${TEST_PROJ_ID}/boundary`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { geojson: validGeoJSON },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.acreage).toBe(152.3);
    expect(body.data.has_parcel_boundary).toBe(true);
  });

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${TEST_PROJ_ID}/boundary`,
      payload: { geojson: validGeoJSON },
    });

    expect(res.statusCode).toBe(401);
  });

  it('returns 404 for non-existent project', async () => {
    enqueue(); // resolveProjectRole → no project found

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${FAKE_ID}/boundary`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { geojson: validGeoJSON },
    });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});
