/**
 * API smoke tests — status codes only, no business logic.
 *
 * All DB and Redis calls are intercepted via vi.mock so no real
 * database or Redis instance is required.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';

// ─── Hoisted mock state ───────────────────────────────────────────────────────
//
// vi.hoisted() runs before vi.mock() factory functions, making these variables
// available to the mock factories below without hitting the "hoisting" trap.

const { mockDb, enqueue } = vi.hoisted(() => {
  const queue: unknown[][] = [];

  // Tagged-template function that shifts the next row-set off the queue.
  // Called as: db`SELECT ...` → Promise<row[]>
  const mockDb = (_strings: TemplateStringsArray, ..._values: unknown[]) =>
    Promise.resolve(queue.shift() ?? []);

  const enqueue = (...rows: unknown[]) => { queue.push(rows); };

  return { mockDb, enqueue };
});

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock('../plugins/database.js', async () => {
  const { default: fp } = await import('fastify-plugin');
  return {
    default: fp(async (fastify: FastifyInstance) => {
      // @ts-expect-error — mock does not implement full postgres.Sql interface
      fastify.decorate('db', mockDb);
      fastify.addHook('onClose', async () => {});
    }),
  };
});

vi.mock('../plugins/redis.js', async () => {
  const { default: fp } = await import('fastify-plugin');
  return {
    default: fp(async (fastify: FastifyInstance) => {
      // @ts-expect-error — mock does not implement full ioredis.Redis interface
      fastify.decorate('redis', { quit: vi.fn().mockResolvedValue('OK') });
      fastify.addHook('onClose', async () => {});
    }),
  };
});

// ─── Test setup ──────────────────────────────────────────────────────────────

import { buildApp } from '../app.js';

const TEST_EMAIL    = 'smoke@test.example';
const TEST_PASSWORD = 'password123';
const TEST_USER_ID  = 'a0000000-0000-0000-0000-000000000001';
const TEST_PROJ_ID  = 'b0000000-0000-0000-0000-000000000002';
const FAKE_PROJ_ID  = 'c0000000-0000-0000-0000-000000000099';
const NOW           = '2026-01-01T00:00:00.000Z';

let app: FastifyInstance;
let authToken: string;
let loginHash: string;

// A DB row that passes ProjectSummary.parse(toCamelCase(row))
function projectRow() {
  return {
    id:                      TEST_PROJ_ID,
    owner_id:                TEST_USER_ID,
    name:                    'Test Project',
    description:             null,
    status:                  'active',
    project_type:            null,
    country:                 'US',
    province_state:          null,
    conservation_auth_id:    null,
    address:                 null,
    parcel_id:               null,
    acreage:                 null,
    data_completeness_score: null,
    has_parcel_boundary:     false,
    created_at:              NOW,
    updated_at:              NOW,
  };
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();

  // Sign a token directly — same secret as vitest.config.ts JWT_SECRET
  authToken = app.jwt.sign(
    { sub: TEST_USER_ID, email: TEST_EMAIL },
    { expiresIn: '1h' },
  );

  // Pre-compute a real bcrypt hash at cost=1 for the login smoke test
  loginHash = bcrypt.hashSync(TEST_PASSWORD, 1);
});

afterAll(async () => {
  await app.close();
});

// ─── Auth routes ─────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  it('returns 201 with a token', async () => {
    enqueue();                                                               // SELECT → no existing user
    enqueue({ id: TEST_USER_ID, email: TEST_EMAIL, display_name: null });   // INSERT → created user

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).data.token).toBeTruthy();
  });
});

describe('POST /api/v1/auth/login', () => {
  it('returns 200 with a token', async () => {
    enqueue({                                                                // SELECT → user row
      id:            TEST_USER_ID,
      email:         TEST_EMAIL,
      display_name:  null,
      password_hash: loginHash,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.token).toBeTruthy();
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns 200 with a valid token', async () => {
    enqueue({ id: TEST_USER_ID, email: TEST_EMAIL, display_name: null });   // SELECT user

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
  });

  it('returns 401 without a token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    expect(res.statusCode).toBe(401);
  });
});

// ─── Project routes ───────────────────────────────────────────────────────────

describe('GET /api/v1/projects', () => {
  it('returns 200 with a valid token', async () => {
    enqueue();                                                               // SELECT → empty list

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
  });
});

describe('POST /api/v1/projects', () => {
  it('creates a project and returns 201', async () => {
    enqueue(projectRow());  // INSERT projects → row
    enqueue();              // INSERT data_pipeline_jobs → (no return needed)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { name: 'My Test Farm', country: 'US', units: 'metric' },
    });

    expect(res.statusCode).toBe(201);
  });
});

describe('GET /api/v1/projects/:id', () => {
  it('returns 200 for an existing project', async () => {
    enqueue(projectRow());  // resolveProjectRole (owner shortcut)
    enqueue(projectRow());  // actual GET query

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${TEST_PROJ_ID}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
  });

  it('returns 404 for an unknown project id', async () => {
    enqueue();              // SELECT → no rows → NotFoundError

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${FAKE_PROJ_ID}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(404);
  });
});
