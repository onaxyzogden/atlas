/**
 * Project routes — comprehensive tests.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { mockDb, enqueue, clearQueue } from './helpers/testApp.js';
import { TEST_USER_ID, TEST_USER_ID_2, TEST_EMAIL, TEST_PROJ_ID, FAKE_ID, projectRow } from './helpers/fixtures.js';

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
    enqueue({ org_id: 'd0000000-0000-0000-0000-000000000001' }); // SELECT default org (Phase 4.5)
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

  it('is idempotent for a repeated clientLocalId — second POST returns the same row with 200', async () => {
    const clientLocalId = 'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1';

    // POST #1 — fresh insert: SELECT default org, INSERT … RETURNING the row,
    // INSERT data_pipeline_jobs (the one and only pipeline enqueue).
    enqueue({ org_id: 'd0000000-0000-0000-0000-000000000001' });
    enqueue(projectRow());
    enqueue();
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { name: 'My Test Farm', country: 'US', units: 'metric', clientLocalId },
    });

    // POST #2 — same clientLocalId: SELECT default org, INSERT hits the partial
    // unique index so ON CONFLICT DO NOTHING returns no row, then SELECT the
    // existing row. The handler returns 200 BEFORE the data_pipeline_jobs insert,
    // so no second pipeline job is enqueued — exactly one across both calls.
    enqueue({ org_id: 'd0000000-0000-0000-0000-000000000001' });
    enqueue(); // ON CONFLICT DO NOTHING → empty row-set
    enqueue(projectRow()); // SELECT existing by (owner_id, client_local_id)
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { name: 'My Test Farm', country: 'US', units: 'metric', clientLocalId },
    });

    expect(res1.statusCode).toBe(201);
    expect(res2.statusCode).toBe(200); // idempotent replay, not a fresh create
    const id1 = JSON.parse(res1.body).data.id;
    const id2 = JSON.parse(res2.body).data.id;
    expect(id2).toBe(id1); // same row returned both times
    expect(id1).toBe(TEST_PROJ_ID);
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

// ── PATCH /projects/:id/operational-role-defs (Option C — rename + re-scope) ──

describe('PATCH /api/v1/projects/:id/operational-role-defs', () => {
  it('persists a per-project role override and echoes metadata (owner)', async () => {
    enqueue(projectRow()); // resolveProjectRole → owner shortcut
    enqueue(projectRow()); // refuseIfBuiltin → not builtin
    enqueue(
      projectRow({
        metadata: {
          operationalRoleDefs: [{ slug: 'food_production', label: 'Grower' }],
        },
      }),
    ); // UPDATE … RETURNING

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${TEST_PROJ_ID}/operational-role-defs`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        operationalRoleDefs: [
          { slug: 'food_production', label: 'Grower', domains: ['plants-food', 'soil'] },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    // slug survives toCamelCase because it is a VALUE, not a key
    expect(body.data.metadata.operationalRoleDefs[0].slug).toBe('food_production');
    expect(body.data.metadata.operationalRoleDefs[0].label).toBe('Grower');
  });

  it('rejects a vision-intent domain override with 422 (steward-only)', async () => {
    enqueue(projectRow()); // resolveProjectRole → owner
    enqueue(projectRow()); // refuseIfBuiltin

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${TEST_PROJ_ID}/operational-role-defs`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        operationalRoleDefs: [{ slug: 'food_production', domains: ['vision-intent'] }],
      },
    });

    // The override schema's superRefine raises a ZodError, which the global
    // handler maps to 422 VALIDATION_ERROR (app.ts:191-192) — the same contract
    // as any other malformed body on this API.
    expect(res.statusCode).toBe(422);
  });

  it('returns 403 for a team_member (role gate is owner-only)', async () => {
    // resolveProjectRole: owner shortcut misses (foreign owner_id), falls
    // through to the project_members lookup which grants team_member —
    // an edit-capable role that does NOT satisfy requireRole('owner')
    // (team_member aliases to designer, projectRoleCapabilities.ts).
    enqueue(projectRow({ owner_id: TEST_USER_ID_2 }));
    enqueue({ role: 'team_member' });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${TEST_PROJ_ID}/operational-role-defs`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        operationalRoleDefs: [{ slug: 'food_production', label: 'Grower' }],
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${TEST_PROJ_ID}/operational-role-defs`,
      payload: { operationalRoleDefs: [] },
    });

    expect(res.statusCode).toBe(401);
  });
});
