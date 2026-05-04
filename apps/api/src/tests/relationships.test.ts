/**
 * Relationships routes — tests for Needs & Yields edge CRUD.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { mockDb, enqueue, clearQueue } from './helpers/testApp.js';
import {
  TEST_USER_ID,
  TEST_EMAIL,
  TEST_PROJ_ID,
  projectRow,
  relationshipRow,
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

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  clearQueue();
});

describe('GET /api/v1/projects/:id/relationships', () => {
  it('returns 200 with edge list', async () => {
    enqueue(projectRow()); // resolveProjectRole
    enqueue(relationshipRow()); // SELECT edges

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${TEST_PROJ_ID}/relationships`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].fromOutput).toBe('biomass');
    expect(body.data[0].toInput).toBe('biomass');
  });

  it('returns 200 with empty list', async () => {
    enqueue(projectRow());
    enqueue();

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${TEST_PROJ_ID}/relationships`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data).toEqual([]);
  });
});

describe('POST /api/v1/projects/:id/relationships', () => {
  it('creates an edge and returns 201', async () => {
    enqueue(projectRow()); // resolveProjectRole
    enqueue(relationshipRow()); // INSERT RETURNING

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${TEST_PROJ_ID}/relationships`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        fromId: 'orchard-1',
        fromOutput: 'biomass',
        toId: 'compost-1',
        toInput: 'biomass',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.fromId).toBe('orchard-1');
    expect(body.data.toInput).toBe('biomass');
  });

  it('rejects an edge with an invalid resource type', async () => {
    enqueue(projectRow()); // resolveProjectRole

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${TEST_PROJ_ID}/relationships`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        fromId: 'orchard-1',
        fromOutput: 'plutonium',
        toId: 'compost-1',
        toInput: 'biomass',
      },
    });

    expect(res.statusCode).toBe(422);
  });
});

describe('DELETE /api/v1/projects/:id/relationships/:edgeId', () => {
  it('deletes an edge and returns 204', async () => {
    const edgeId = 'e0000000-0000-0000-0000-000000000001';
    enqueue(projectRow()); // resolveProjectRole
    enqueue({ id: edgeId }); // existence check
    enqueue(); // DELETE

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${TEST_PROJ_ID}/relationships/${edgeId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(204);
  });

  it('returns 404 when the edge does not exist', async () => {
    const edgeId = 'e0000000-0000-0000-0000-000000000099';
    enqueue(projectRow()); // resolveProjectRole
    enqueue(); // existence check returns nothing

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${TEST_PROJ_ID}/relationships/${edgeId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(404);
  });
});
