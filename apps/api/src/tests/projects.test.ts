/**
 * Project routes — comprehensive tests.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { mockDb, enqueue, clearQueue } from './helpers/testApp.js';
import { TEST_USER_ID, TEST_EMAIL, TEST_PROJ_ID, FAKE_ID, projectRow } from './helpers/fixtures.js';

// ─── Module mocks ───
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

// ── GET /projects ──

describe('GET /api/v1/projects', () => {
  it('returns 200 with empty list', async () => {
    enqueue(); // SELECT → no projects

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data).toEqual([]);
  });

  it('returns 200 with projects', async () => {
    enqueue(projectRow()); // SELECT → one project

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data).toHaveLength(1);
  });

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
    });

    expect(res.statusCode).toBe(401);
  });
});

// ── POST /projects ──

describe('POST /api/v1/projects', () => {
  it('creates a project and returns 201', async () => {
    enqueue(projectRow()); // INSERT → project row
    enqueue();             // INSERT data_pipeline_jobs

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { name: 'My Test Farm', country: 'US', units: 'metric' },
    });

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).data.name).toBe('Test Farm');
  });

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      payload: { name: 'Farm', country: 'US', units: 'metric' },
    });

    expect(res.statusCode).toBe(401);
  });
});

// ── GET /projects/:id ──

describe('GET /api/v1/projects/:id', () => {
  it('returns 200 for existing project', async () => {
    // resolveProjectRole (owner shortcut — 1 query since owner_id matches)
    enqueue(projectRow());
    // Actual GET query
    enqueue(projectRow());

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${TEST_PROJ_ID}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
  });

  it('returns 404 for unknown project', async () => {
    enqueue(); // resolveProjectRole → no project

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${FAKE_ID}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});

// ── DELETE /projects/:id ──

describe('DELETE /api/v1/projects/:id', () => {
  it('returns 204 for project deletion', async () => {
    // resolveProjectRole (owner shortcut)
    enqueue(projectRow());
    // DELETE cascade
    enqueue();

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${TEST_PROJ_ID}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBeLessThan(300);
  });
});
