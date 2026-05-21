/**
 * Soil-regeneration SOM-trajectory route tests — Phase D.3.
 *
 * Covers:
 *  - 401 unauthenticated
 *  - GET returns ordered rows for the project
 *  - POST recompute persists trajectory + returns rowCount
 *  - POST recompute idempotent on repeat
 *  - POST recompute 403 for viewer role
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { mockDb, enqueue, clearQueue } from './helpers/testApp.js';
import {
  TEST_USER_ID,
  TEST_USER_ID_2,
  TEST_EMAIL,
  TEST_PROJ_ID,
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

vi.mock('../plugins/websocket.js', async () => {
  const { default: fp } = await import('fastify-plugin');
  return {
    default: fp(async (fastify: FastifyInstance) => {
      fastify.decorate('wsBroadcast', vi.fn());
    }),
  };
});

import { buildApp } from '../app.js';

let app: FastifyInstance;
let authToken: string;
let viewerToken: string;

function rbacOwnerRow() {
  return { id: TEST_PROJ_ID, owner_id: TEST_USER_ID, is_builtin: false };
}
function rbacNonOwnerRow() {
  return { id: TEST_PROJ_ID, owner_id: TEST_USER_ID, is_builtin: false };
}
function viewerMembershipRow() {
  return { role: 'viewer' };
}

function fakeTrajectoryRow(year: number) {
  return {
    year,
    som_stock_tc: 7.308 + year * 0.1,
    sequestration_tcyr: 0.1,
    j_curve_stage: year <= 2 ? 'establishment' : year <= 5 ? 'build-up' : 'maturation',
  };
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  authToken = app.jwt.sign({ sub: TEST_USER_ID, email: TEST_EMAIL }, { expiresIn: '1h' });
  viewerToken = app.jwt.sign(
    { sub: TEST_USER_ID_2, email: 'viewer@ogden.ag' },
    { expiresIn: '1h' },
  );
});
afterAll(async () => {
  await app.close();
});
beforeEach(() => {
  clearQueue();
});

describe('GET /api/v1/soil-regeneration/project/:projectId/som-trajectory', () => {
  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/soil-regeneration/project/${TEST_PROJ_ID}/som-trajectory`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns ordered trajectory rows for the project', async () => {
    enqueue(rbacOwnerRow()); // resolveProjectRole
    enqueue(
      fakeTrajectoryRow(0),
      fakeTrajectoryRow(1),
      fakeTrajectoryRow(2),
      fakeTrajectoryRow(3),
    );

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/soil-regeneration/project/${TEST_PROJ_ID}/som-trajectory`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.error).toBeNull();
    expect(body.data).toHaveLength(4);
    expect(body.data[0]).toMatchObject({
      year: 0,
      j_curve_stage: 'establishment',
    });
    expect(body.meta.total).toBe(4);
  });
});

describe('POST /api/v1/soil-regeneration/project/:projectId/som-trajectory/recompute', () => {
  const validBody = {
    baseline_pct: 2.0,
    target_pct: 4.0,
    annualSeqRate_tChaYr: 0.5,
    horizonYears: 10,
  };

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/soil-regeneration/project/${TEST_PROJ_ID}/som-trajectory/recompute`,
      payload: validBody,
    });
    expect(res.statusCode).toBe(401);
  });

  it('owner can recompute — returns trajectory + rowCount', async () => {
    enqueue(rbacOwnerRow()); // resolveProjectRole
    // Transaction: 1 DELETE + 11 INSERTs (years 0..10). Enqueue empty
    // result-sets for each statement.
    for (let i = 0; i < 12; i += 1) enqueue();

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/soil-regeneration/project/${TEST_PROJ_ID}/som-trajectory/recompute`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: validBody,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.error).toBeNull();
    expect(body.data.rowCount).toBe(11);
    expect(body.data.trajectory).toHaveLength(11);
    expect(body.data.trajectory[0].year).toBe(0);
    expect(body.data.trajectory[10].year).toBe(10);
    expect(body.data.trajectory[0].j_curve_stage).toBe('establishment');
    expect(body.data.trajectory[10].j_curve_stage).toBe('maturation');
  });

  it('idempotent on repeat — second call returns the same trajectory', async () => {
    enqueue(rbacOwnerRow());
    for (let i = 0; i < 12; i += 1) enqueue();

    const first = await app.inject({
      method: 'POST',
      url: `/api/v1/soil-regeneration/project/${TEST_PROJ_ID}/som-trajectory/recompute`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: validBody,
    });

    enqueue(rbacOwnerRow());
    for (let i = 0; i < 12; i += 1) enqueue();

    const second = await app.inject({
      method: 'POST',
      url: `/api/v1/soil-regeneration/project/${TEST_PROJ_ID}/som-trajectory/recompute`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: validBody,
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    const a = JSON.parse(first.body).data.trajectory;
    const b = JSON.parse(second.body).data.trajectory;
    expect(a).toEqual(b);
  });

  it('returns 403 when a viewer attempts recompute', async () => {
    enqueue(rbacNonOwnerRow());
    enqueue(viewerMembershipRow());

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/soil-regeneration/project/${TEST_PROJ_ID}/som-trajectory/recompute`,
      headers: { authorization: `Bearer ${viewerToken}` },
      payload: validBody,
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  // ---------------------------------------------------------------------
  // F.3 — per-zone trajectory + GET ?zoneId filter
  // ---------------------------------------------------------------------

  it('F.3: POST with zones[] also upserts per-zone rows + returns zoneRowCount', async () => {
    enqueue(rbacOwnerRow());
    // Transaction: 1 DELETE (project) + 11 INSERTs (project) +
    // 2 DELETEs (one per zoneId, dedup) + 22 INSERTs (2 zones × 11 yrs).
    // Total = 36 enqueued empty result-sets.
    for (let i = 0; i < 36; i += 1) enqueue();

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/soil-regeneration/project/${TEST_PROJ_ID}/som-trajectory/recompute`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        ...validBody,
        zones: [
          { zoneId: 'food-prod-A', baseline_pct: 1.5, target_pct: 3.5, annualSeqRate_tChaYr: 0.7 },
          { zoneId: 'livestock-B', baseline_pct: 0.8, target_pct: 2.5, annualSeqRate_tChaYr: 0.6 },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.error).toBeNull();
    expect(body.data.zoneRowCount).toBe(22); // 2 zones × 11 years
    expect(body.data.zoneIds).toEqual(expect.arrayContaining(['food-prod-A', 'livestock-B']));
    expect(body.data.rowCount).toBe(33); // 11 project + 22 zone
    // Whole-project trajectory still returned in `trajectory` field.
    expect(body.data.trajectory).toHaveLength(11);
  });

  it('F.3: POST without zones is behaviour-identical to v1 (no extra rows)', async () => {
    enqueue(rbacOwnerRow());
    for (let i = 0; i < 12; i += 1) enqueue();

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/soil-regeneration/project/${TEST_PROJ_ID}/som-trajectory/recompute`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: validBody, // no zones field
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.rowCount).toBe(11);
    expect(body.data.zoneRowCount).toBe(0);
    expect(body.data.zoneIds).toEqual([]);
  });
});

describe('GET /api/v1/soil-regeneration/.../som-trajectory?zoneId — F.3 filter', () => {
  it('F.3: filters to per-zone rows when ?zoneId is provided', async () => {
    enqueue(rbacOwnerRow()); // resolveProjectRole
    enqueue(
      { ...fakeTrajectoryRow(0), zone_id: 'food-prod-A' },
      { ...fakeTrajectoryRow(1), zone_id: 'food-prod-A' },
      { ...fakeTrajectoryRow(2), zone_id: 'food-prod-A' },
    );

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/soil-regeneration/project/${TEST_PROJ_ID}/som-trajectory?zoneId=food-prod-A`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(3);
    expect(body.meta.total).toBe(3);
  });
});
