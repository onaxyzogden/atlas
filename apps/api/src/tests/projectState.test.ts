/**
 * project-state routes — generic versioned-blob sync transport.
 *
 * Pins the Phase-2 gate behaviour: an authed upsert round-trips (200), a
 * viewer cannot write (403), and a stale `baseRev` is rejected 409 with the
 * authoritative server state so the client can surface the conflict rather
 * than silently clobber (stale-write reject + surface).
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
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

const STORE_KEY = 'ogden-vision';
const NOW = '2026-01-01T00:00:00.000Z';

function blobRow(overrides?: Record<string, unknown>) {
  return {
    project_id: TEST_PROJ_ID,
    store_key: STORE_KEY,
    payload: { headline: 'A regenerative oasis' },
    schema_version: 2,
    rev: 4,
    updated_by: TEST_USER_ID,
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

describe('GET /api/v1/project-state/project/:projectId', () => {
  it('returns all blobs for the project (any role)', async () => {
    enqueue(projectRow()); // resolveProjectRole owner shortcut
    enqueue(blobRow());    // SELECT all blobs

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/project-state/project/${TEST_PROJ_ID}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].storeKey).toBe(STORE_KEY);
    expect(body.data[0].rev).toBe(4);
  });
});

describe('PUT /api/v1/project-state/project/:projectId/:storeKey', () => {
  it('upserts a blob and returns 200 with the bumped rev', async () => {
    enqueue(projectRow());            // resolveProjectRole owner shortcut
    enqueue(blobRow({ rev: 5 }));     // INSERT ... ON CONFLICT ... RETURNING

    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/project-state/project/${TEST_PROJ_ID}/${STORE_KEY}`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { envelopeSchema: 1, schemaVersion: 2, baseRev: 4, payload: { headline: 'x' } },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.rev).toBe(5);
    expect(body.error).toBeNull();
  });

  it('cold-start: first write of a brand-new (project, storeKey) at baseRev 0 → 200 rev 1', async () => {
    enqueue(projectRow());                          // resolveProjectRole owner shortcut
    enqueue(blobRow({ rev: 1, store_key: 'ogden-hazards' })); // fresh INSERT gets DEFAULT rev 1

    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/project-state/project/${TEST_PROJ_ID}/ogden-hazards`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { envelopeSchema: 1, schemaVersion: 2, baseRev: 0, payload: { items: [] } },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.rev).toBe(1);
    expect(body.error).toBeNull();
  });

  it('allows a designer (write role) to upsert → 200', async () => {
    // resolveProjectRole: not owner → membership lookup returns designer
    enqueue(projectRow({ owner_id: TEST_USER_ID_2 }));
    enqueue({ role: 'designer' });
    enqueue(blobRow({ rev: 6 }));

    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/project-state/project/${TEST_PROJ_ID}/${STORE_KEY}`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { envelopeSchema: 1, schemaVersion: 2, baseRev: 5, payload: { headline: 'y' } },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.rev).toBe(6);
    expect(body.error).toBeNull();
  });

  it('rejects a viewer with 403 (no DB write attempted)', async () => {
    // resolveProjectRole: not owner → membership lookup returns viewer
    enqueue(projectRow({ owner_id: TEST_USER_ID_2 }));
    enqueue({ role: 'viewer' });

    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/project-state/project/${TEST_PROJ_ID}/${STORE_KEY}`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { envelopeSchema: 1, schemaVersion: 2, baseRev: 4, payload: {} },
    });

    expect(res.statusCode).toBe(403);
  });

  it('rejects a stale baseRev with 409 and the authoritative server state', async () => {
    enqueue(projectRow());        // resolveProjectRole owner shortcut
    enqueue();                    // ON CONFLICT WHERE rev <= baseRev → 0 rows (stale)
    enqueue(blobRow({ rev: 9 })); // SELECT current authoritative row

    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/project-state/project/${TEST_PROJ_ID}/${STORE_KEY}`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { envelopeSchema: 1, schemaVersion: 2, baseRev: 3, payload: { stale: true } },
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.details.serverRev).toBe(9);
    expect(body.error.details.serverPayload).toEqual({ headline: 'A regenerative oasis' });
  });
});
