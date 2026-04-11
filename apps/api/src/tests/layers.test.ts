/**
 * Layer routes — tests for project layer data access.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { mockDb, enqueue, clearQueue } from './helpers/testApp.js';
import {
  TEST_USER_ID, TEST_EMAIL, TEST_PROJ_ID, FAKE_ID, projectRow, layerRow,
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

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  authToken = app.jwt.sign({ sub: TEST_USER_ID, email: TEST_EMAIL }, { expiresIn: '1h' });
});

afterAll(async () => { await app.close(); });
beforeEach(() => { clearQueue(); });

describe('GET /api/v1/layers/project/:projectId', () => {
  it('returns 200 with layer list', async () => {
    // resolveProjectRole (owner shortcut)
    enqueue(projectRow());
    // Layers query
    enqueue(layerRow(), layerRow({ layer_type: 'soil' }));

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/layers/project/${TEST_PROJ_ID}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(2);
    expect(body.meta.total).toBe(2);
  });

  it('returns 200 with empty layers', async () => {
    enqueue(projectRow()); // resolveProjectRole
    enqueue(); // no layers

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/layers/project/${TEST_PROJ_ID}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data).toEqual([]);
  });

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/layers/project/${TEST_PROJ_ID}`,
    });

    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/v1/layers/project/:projectId/:layerType', () => {
  it('returns 200 for existing layer', async () => {
    enqueue(projectRow()); // resolveProjectRole
    enqueue(layerRow({ layer_type: 'elevation' })); // single layer

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/layers/project/${TEST_PROJ_ID}/elevation`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
  });

  it('returns 404 for unknown layer type', async () => {
    enqueue(projectRow()); // resolveProjectRole
    enqueue(); // no layer found

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/layers/project/${TEST_PROJ_ID}/nonexistent`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(404);
  });
});

describe('POST /api/v1/layers/project/:projectId/:layerType/refresh', () => {
  it('returns 202 for layer refresh', async () => {
    enqueue(projectRow()); // resolveProjectRole
    enqueue(); // UPDATE project_layers
    enqueue({ id: 'job-001' }); // INSERT data_pipeline_jobs RETURNING id

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/layers/project/${TEST_PROJ_ID}/elevation/refresh`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(202);
    expect(JSON.parse(res.body).data.jobId).toBe('job-001');
  });
});
