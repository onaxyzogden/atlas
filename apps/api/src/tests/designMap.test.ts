/**
 * Design Map generator route tests — Phase B.5.1.
 *
 * Covers:
 *  - 401 unauthenticated
 *  - 409 when the project has no parcel boundary
 *  - dry-run (`persist: false`) returns features + summary + warnings
 *    without persisting
 *  - persist=true inserts rows and broadcasts
 *  - persist=true for a viewer role yields 403
 *  - missing terrain / watershed rows surface generator warnings, not 500
 *  - `metresPerDegLat` / `metresPerDegLon` fixture-based smoke test
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
import {
  metresPerDegLat,
  metresPerDegLon,
} from '../services/designMap/geometry.js';

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

// wsBroadcast is decorated by the websocket plugin; for unit tests we
// just want a spy that captures the broadcast payload.
const wsBroadcastSpy = vi.fn();
vi.mock('../plugins/websocket.js', async () => {
  const { default: fp } = await import('fastify-plugin');
  return {
    default: fp(async (fastify: FastifyInstance) => {
      // @ts-expect-error — mock
      fastify.decorate('wsBroadcast', wsBroadcastSpy);
    }),
  };
});

import { buildApp } from '../app.js';

let app: FastifyInstance;
let authToken: string;
let viewerToken: string;

const ANCHOR_LAT = 43;
const ANCHOR_LON = -79;

function squareBoundaryGeoJSON(sideM: number) {
  const half = sideM / 2;
  const mLat = metresPerDegLat();
  const mLon = metresPerDegLon(ANCHOR_LAT);
  const w = ANCHOR_LON - half / mLon;
  const e = ANCHOR_LON + half / mLon;
  const s = ANCHOR_LAT - half / mLat;
  const n = ANCHOR_LAT + half / mLat;
  return {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [w, s],
          [e, s],
          [e, n],
          [w, n],
          [w, s],
        ],
      ],
    ],
  };
}

function projectRow() {
  return {
    acreage: 200,
    parcel_boundary_geojson: squareBoundaryGeoJSON(900),
  };
}
function noBoundaryRow() {
  return { acreage: 0, parcel_boundary_geojson: null };
}
function terrainRow() {
  // Two horizontal contour lines inside the parcel.
  const mLat = metresPerDegLat();
  const mLon = metresPerDegLon(ANCHOR_LAT);
  const line = (northingM: number) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: [
        [ANCHOR_LON - 350 / mLon, ANCHOR_LAT + northingM / mLat],
        [ANCHOR_LON + 350 / mLon, ANCHOR_LAT + northingM / mLat],
      ],
    },
    properties: { elevation: 100 + northingM / 10 },
  });
  return {
    contour_geojson: {
      type: 'FeatureCollection' as const,
      features: [line(-150), line(0), line(150)],
    },
    slope_mean_deg: 3.4,
  };
}
function watershedRow() {
  const mLat = metresPerDegLat();
  const mLon = metresPerDegLon(ANCHOR_LAT);
  return {
    summary_data: {
      swaleCandidates: {
        candidateCount: 1,
        candidates: [
          {
            start: [ANCHOR_LON - 200 / mLon, ANCHOR_LAT - 50 / mLat],
            end: [ANCHOR_LON + 200 / mLon, ANCHOR_LAT - 50 / mLat],
            lengthCells: 20,
            meanSlope: 6,
            elevation: 100,
            suitabilityScore: 0.8,
          },
        ],
      },
    },
  };
}

/** Row matching rbac.ts `SELECT id, owner_id, is_builtin FROM projects`. */
function rbacOwnerRow() {
  return { id: TEST_PROJ_ID, owner_id: TEST_USER_ID, is_builtin: false };
}
function rbacNonOwnerRow() {
  return { id: TEST_PROJ_ID, owner_id: TEST_USER_ID, is_builtin: false };
}
function viewerMembershipRow() {
  return { role: 'viewer' };
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
afterAll(async () => { await app.close(); });
beforeEach(() => {
  clearQueue();
  wsBroadcastSpy.mockClear();
});

describe('POST /api/v1/design-map/project/:projectId/generate', () => {
  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/design-map/project/${TEST_PROJ_ID}/generate`,
      payload: { persist: false },
    });
    expect(res.statusCode).toBe(401);
  });

  it('dry-run returns features + summary + warnings without persisting', async () => {
    enqueue(rbacOwnerRow());            // resolveProjectRole
    enqueue(projectRow());              // SELECT projects
    enqueue(terrainRow());              // SELECT terrain_analysis
    enqueue(watershedRow());            // SELECT project_layers

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/design-map/project/${TEST_PROJ_ID}/generate`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { persist: false, options: { enterprises: ['orchard', 'livestock'] } },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.error).toBeNull();
    expect(Array.isArray(body.data.features)).toBe(true);
    expect(body.data.features.length).toBeGreaterThan(0);
    expect(body.data.summary).toMatchObject({
      orchardRows: expect.any(Number),
      paddocks: expect.any(Number),
      corridors: expect.any(Number),
      swales: expect.any(Number),
    });
    expect(body.data.summary.corridors).toBeGreaterThan(0); // perimeter band always
    expect(body.data.persisted).toBeUndefined();
    expect(wsBroadcastSpy).not.toHaveBeenCalled();
  });

  it('returns 409 when the project has no parcel boundary', async () => {
    enqueue(rbacOwnerRow());
    enqueue(noBoundaryRow());

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/design-map/project/${TEST_PROJ_ID}/generate`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { persist: false },
    });
    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('NO_BOUNDARY');
  });

  it('missing terrain + watershed rows surface generator warnings, not 500', async () => {
    enqueue(rbacOwnerRow());
    enqueue(projectRow());
    enqueue();                           // no terrain_analysis row
    enqueue();                           // no watershed_derived layer

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/design-map/project/${TEST_PROJ_ID}/generate`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { persist: false, options: { enterprises: ['orchard'] } },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.warnings.some((w: string) => /no contours/i.test(w))).toBe(true);
    expect(body.data.summary.swales).toBe(0);
    // Corridor still emits the perimeter band even with no contours.
    expect(body.data.summary.corridors).toBeGreaterThan(0);
  });

  it('persist=true inserts rows, broadcasts, and returns ids', async () => {
    enqueue(rbacOwnerRow());
    enqueue(projectRow());
    enqueue(terrainRow());
    enqueue(watershedRow());
    // The transaction inserts one row per feature; queue enough returning
    // rows that every feature gets one. The mock harness shifts on each
    // INSERT, so we just enqueue a generic "looks-like-a-feature-row"
    // response for each. Easier: enqueue 200 ahead of time and let the
    // unused ones drop.
    const fakeId = 'b0000000-0000-0000-0000-000000000099';
    for (let i = 0; i < 200; i += 1) {
      enqueue({
        id: `${fakeId.slice(0, -2)}${(i % 100).toString().padStart(2, '0')}`,
        project_id: TEST_PROJ_ID,
        feature_type: 'zone',
        subtype: 'conservation',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-79.001, 43.001],
              [-79.001, 43.002],
              [-79.002, 43.002],
              [-79.001, 43.001],
            ],
          ],
        },
        label: 'Perimeter Habitat Corridor',
        properties: { generator: 'habitatCorridors' },
        phase_tag: 'habitat',
        style: null,
        sort_order: 401,
        created_by: TEST_USER_ID,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      });
    }
    enqueue(); // logActivity INSERT

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/design-map/project/${TEST_PROJ_ID}/generate`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { persist: true, options: { enterprises: ['orchard', 'livestock'] } },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.error).toBeNull();
    expect(body.data.persisted.count).toBeGreaterThan(0);
    expect(body.data.persisted.ids.length).toBe(body.data.persisted.count);
    expect(wsBroadcastSpy).toHaveBeenCalledTimes(1);
    const [pid, event] = wsBroadcastSpy.mock.calls[0]!;
    expect(pid).toBe(TEST_PROJ_ID);
    expect(event.type).toBe('features_bulk_created');
    expect(event.payload.source).toBe('design-map-generator');
  });

  it('returns 403 when a viewer attempts persist=true', async () => {
    // Resolve project, viewer is NOT the owner so membership lookup runs.
    enqueue(rbacNonOwnerRow());
    enqueue(viewerMembershipRow());

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/design-map/project/${TEST_PROJ_ID}/generate`,
      headers: { authorization: `Bearer ${viewerToken}` },
      payload: { persist: true },
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(wsBroadcastSpy).not.toHaveBeenCalled();
  });

  it('viewer can still dry-run (any authenticated member)', async () => {
    enqueue(rbacNonOwnerRow());
    enqueue(viewerMembershipRow());
    enqueue(projectRow());
    enqueue(terrainRow());
    enqueue(watershedRow());

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/design-map/project/${TEST_PROJ_ID}/generate`,
      headers: { authorization: `Bearer ${viewerToken}` },
      payload: { persist: false },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.summary.corridors).toBeGreaterThan(0);
  });
});
