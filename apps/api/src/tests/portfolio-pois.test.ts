/**
 * Portfolio POI routes — tests for resource-POI + POI↔project flow CRUD.
 *
 * POIs are user-scoped (no project param / resolveProjectRole), so the only
 * preHandler is `authenticate`; ownership is enforced inside each handler by a
 * `SELECT ... FROM portfolio_pois` whose `owner_id` is compared to the JWT sub.
 * Each test enqueues that ownership row first, mirroring the route's query
 * order.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { mockDb, enqueue, enqueueError, clearQueue } from './helpers/testApp.js';
import {
  TEST_USER_ID,
  TEST_USER_ID_2,
  TEST_EMAIL,
  TEST_PROJ_ID,
  projectRow,
  poiRow,
  poiFlowRow,
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

const POI_ID = 'f0000000-0000-0000-0000-000000000001';
const FLOW_ID = 'f1000000-0000-0000-0000-000000000001';
const FAKE_POI_ID = 'f0000000-0000-0000-0000-0000000000ff';

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

// Lazy: authToken is set in beforeAll, AFTER module load. A snapshot object
// evaluated here would capture `Bearer undefined`.
const auth = () => ({ authorization: `Bearer ${authToken}` });

describe('GET /api/v1/portfolio-pois', () => {
  it('returns 200 with POIs and nested flows', async () => {
    enqueue(poiRow()); // SELECT pois
    enqueue(poiFlowRow()); // SELECT flows (ids non-empty)

    const res = await app.inject({ method: 'GET', url: '/api/v1/portfolio-pois', headers: auth() });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].poiKind).toBe('compost_hub');
    expect(body.data[0].flows).toHaveLength(1);
    expect(body.data[0].flows[0].materialKind).toBe('compost');
    expect(body.data[0].flows[0].direction).toBe('output');
    expect(body.data[0].flows[0].projectName).toBe('Test Farm');
  });

  it('returns 200 with empty list (no flow query)', async () => {
    enqueue(); // SELECT pois → none

    const res = await app.inject({ method: 'GET', url: '/api/v1/portfolio-pois', headers: auth() });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data).toEqual([]);
  });
});

describe('POST /api/v1/portfolio-pois', () => {
  it('creates a POI and returns 201', async () => {
    enqueue(poiRow()); // INSERT RETURNING

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/portfolio-pois',
      headers: auth(),
      payload: { name: 'Regional Compost Depot', poiKind: 'compost_hub', lng: -79.4, lat: 43.7 },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.name).toBe('Regional Compost Depot');
    expect(body.data.flows).toEqual([]);
  });

  it('rejects an invalid poiKind with 422', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/portfolio-pois',
      headers: auth(),
      payload: { name: 'Bad', poiKind: 'nuclear_reactor', lng: 0, lat: 0 },
    });

    expect(res.statusCode).toBe(422);
  });
});

describe('POST /api/v1/portfolio-pois/:poiId/flows', () => {
  it('creates a flow to an owned project and returns 201', async () => {
    enqueue(poiRow()); // requireOwnedPoi
    enqueue(projectRow()); // linked project (owned)
    enqueue(poiFlowRow()); // INSERT RETURNING

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/portfolio-pois/${POI_ID}/flows`,
      headers: auth(),
      payload: {
        projectId: TEST_PROJ_ID,
        materialKind: 'compost',
        direction: 'output',
        massKgPerMonth: 500,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.materialKind).toBe('compost');
    expect(body.data.massKgPerMonth).toBe(500);
  });

  it('returns 403 when the caller does not own the linked project', async () => {
    enqueue(poiRow()); // requireOwnedPoi (owned)
    enqueue(projectRow({ owner_id: TEST_USER_ID_2 })); // linked project NOT owned

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/portfolio-pois/${POI_ID}/flows`,
      headers: auth(),
      payload: { projectId: TEST_PROJ_ID, materialKind: 'compost', direction: 'output' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('returns 403 when the caller does not own the POI', async () => {
    enqueue(poiRow({ owner_id: TEST_USER_ID_2 })); // requireOwnedPoi (not owned)

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/portfolio-pois/${POI_ID}/flows`,
      headers: auth(),
      payload: { projectId: TEST_PROJ_ID, materialKind: 'compost', direction: 'output' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('returns 409 on a duplicate flow (23505)', async () => {
    enqueue(poiRow()); // requireOwnedPoi
    enqueue(projectRow()); // linked project (owned)
    enqueueError({ code: '23505' }); // INSERT → unique violation

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/portfolio-pois/${POI_ID}/flows`,
      headers: auth(),
      payload: { projectId: TEST_PROJ_ID, materialKind: 'compost', direction: 'output' },
    });

    expect(res.statusCode).toBe(409);
  });

  it('rejects an invalid materialKind with 422', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/portfolio-pois/${POI_ID}/flows`,
      headers: auth(),
      payload: { projectId: TEST_PROJ_ID, materialKind: 'plutonium', direction: 'output' },
    });

    expect(res.statusCode).toBe(422);
  });
});

describe('DELETE /api/v1/portfolio-pois/:poiId/flows/:flowId', () => {
  it('deletes a flow and returns 204', async () => {
    enqueue(poiRow()); // requireOwnedPoi
    enqueue({ id: FLOW_ID }); // existence check
    enqueue(); // DELETE

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/portfolio-pois/${POI_ID}/flows/${FLOW_ID}`,
      headers: auth(),
    });

    expect(res.statusCode).toBe(204);
  });

  it('returns 404 when the flow does not exist', async () => {
    enqueue(poiRow()); // requireOwnedPoi
    enqueue(); // existence check → none

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/portfolio-pois/${POI_ID}/flows/${FLOW_ID}`,
      headers: auth(),
    });

    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /api/v1/portfolio-pois/:poiId', () => {
  it('deletes a POI and returns 204', async () => {
    enqueue(poiRow()); // requireOwnedPoi
    enqueue(); // DELETE

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/portfolio-pois/${POI_ID}`,
      headers: auth(),
    });

    expect(res.statusCode).toBe(204);
  });

  it('returns 404 when the POI does not exist', async () => {
    enqueue(); // requireOwnedPoi → none

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/portfolio-pois/${FAKE_POI_ID}`,
      headers: auth(),
    });

    expect(res.statusCode).toBe(404);
  });
});
