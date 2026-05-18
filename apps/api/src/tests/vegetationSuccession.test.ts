/**
 * vegetation + succession routes — Phase 3 typed-table sync transport.
 *
 * Pins the gate behaviour mirrored from machinery_items / project-state:
 * an authed create round-trips (201), list is any-role (200), update is
 * write-role (200), a viewer cannot write (403), and — the Phase-3 3.3
 * invariant — neither route touches the design_features surface (no
 * double-write).
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mockDb, enqueue, clearQueue } from './helpers/testApp.js';
import {
  TEST_USER_ID, TEST_USER_ID_2, TEST_EMAIL, TEST_PROJ_ID, projectRow,
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

const NOW = '2026-01-01T00:00:00.000Z';

function vegRow(overrides?: Record<string, unknown>) {
  return {
    id: 'veg-1',
    project_id: TEST_PROJ_ID,
    geometry: { type: 'Polygon', coordinates: [] },
    succession_stage: 'climax',
    ground_cover: 'forest',
    label: null,
    notes: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function succRow(overrides?: Record<string, unknown>) {
  return {
    id: 'sm-1',
    project_id: TEST_PROJ_ID,
    zone_id: null,
    year: 2028,
    phase: 'pioneer',
    observation: 'First nitrogen-fixers in.',
    photo_data_url: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  authToken = app.jwt.sign({ sub: TEST_USER_ID, email: TEST_EMAIL }, { expiresIn: '1h' });
});

afterAll(async () => { await app.close(); });
beforeEach(() => { clearQueue(); });

describe('vegetation routes', () => {
  it('POST create (owner) → 201 with the client-supplied id', async () => {
    enqueue(projectRow());          // resolveProjectRole owner shortcut
    enqueue(vegRow({ id: 'veg-x' })); // INSERT ... RETURNING
    enqueue();                      // logActivity

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/vegetation/project/${TEST_PROJ_ID}`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        id: 'veg-x',
        geometry: { type: 'Polygon', coordinates: [] },
        successionStage: 'climax',
        groundCover: 'forest',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.id).toBe('veg-x');
    expect(body.error).toBeNull();
  });

  it('GET list is any-role → 200', async () => {
    enqueue(projectRow({ owner_id: TEST_USER_ID_2 }));
    enqueue({ role: 'viewer' });    // membership: viewer can still list
    enqueue(vegRow());              // SELECT list

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/vegetation/project/${TEST_PROJ_ID}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].successionStage).toBe('climax');
  });

  it('PATCH update (designer write-role) → 200', async () => {
    enqueue(vegRow());                              // resolveFromItem: SELECT project_id
    enqueue(projectRow({ owner_id: TEST_USER_ID_2 }));
    enqueue({ role: 'designer' });
    enqueue(vegRow());                              // SELECT existing
    enqueue(vegRow({ succession_stage: 'mid' }));   // UPDATE ... RETURNING
    enqueue();                                      // logActivity

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/vegetation/veg-1`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { successionStage: 'mid' },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.successionStage).toBe('mid');
  });

  it('DELETE (owner) → 204', async () => {
    enqueue(vegRow());        // resolveFromItem: SELECT project_id
    enqueue(projectRow());    // resolveProjectRole owner shortcut
    enqueue(vegRow());        // SELECT before delete
    enqueue();                // DELETE
    enqueue();                // logActivity

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/vegetation/veg-1`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(204);
  });

  it('rejects a viewer POST with 403', async () => {
    enqueue(projectRow({ owner_id: TEST_USER_ID_2 }));
    enqueue({ role: 'viewer' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/vegetation/project/${TEST_PROJ_ID}`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        geometry: { type: 'Polygon', coordinates: [] },
        successionStage: 'climax',
        groundCover: 'forest',
      },
    });

    expect(res.statusCode).toBe(403);
  });
});

describe('succession routes', () => {
  it('POST create (owner) → 201 with the non-uuid client id', async () => {
    enqueue(projectRow());
    enqueue(succRow({ id: 'sm-1715900000000-ab12cd' }));
    enqueue(); // logActivity

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/succession/project/${TEST_PROJ_ID}`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        id: 'sm-1715900000000-ab12cd',
        year: 2028,
        phase: 'pioneer',
        observation: 'First nitrogen-fixers in.',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).data.id).toBe('sm-1715900000000-ab12cd');
  });

  it('GET list → 200', async () => {
    enqueue(projectRow());
    enqueue(succRow());

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/succession/project/${TEST_PROJ_ID}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data[0].phase).toBe('pioneer');
  });
});

describe('Phase 3 3.3 — no design_features double-write', () => {
  it('neither route module references design_features', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const routes = join(here, '..', 'routes');
    for (const f of ['vegetation/index.ts', 'succession/index.ts']) {
      const src = readFileSync(join(routes, f), 'utf8');
      expect(
        src.includes('design_features'),
        `${f} must not touch design_features (Phase 3 3.3 no double-write)`,
      ).toBe(false);
    }
  });
});
