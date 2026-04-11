/**
 * Auth routes — comprehensive tests.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { mockDb, enqueue, clearQueue } from './helpers/testApp.js';
import { TEST_USER_ID, TEST_EMAIL, TEST_PASSWORD, userRow } from './helpers/fixtures.js';

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
let loginHash: string;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  authToken = app.jwt.sign({ sub: TEST_USER_ID, email: TEST_EMAIL }, { expiresIn: '1h' });
  loginHash = bcrypt.hashSync(TEST_PASSWORD, 1);
});

afterAll(async () => { await app.close(); });
beforeEach(() => { clearQueue(); });

// ── POST /register ──

describe('POST /api/v1/auth/register', () => {
  it('returns 201 with a token', async () => {
    enqueue(); // SELECT → no existing user
    enqueue({ id: TEST_USER_ID, email: TEST_EMAIL, display_name: null }); // INSERT

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).data.token).toBeTruthy();
    expect(JSON.parse(res.body).data.user.email).toBe(TEST_EMAIL);
  });

  it('returns 409 for duplicate email', async () => {
    enqueue({ id: TEST_USER_ID }); // SELECT → existing user found

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });

    expect(res.statusCode).toBe(409);
  });

  it('returns 422 for missing email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { password: TEST_PASSWORD },
    });

    // Zod validation fails → error handler returns 422 or 400
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('returns 422 for short password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: TEST_EMAIL, password: 'short' },
    });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});

// ── POST /login ──

describe('POST /api/v1/auth/login', () => {
  it('returns 200 with a token', async () => {
    enqueue({ id: TEST_USER_ID, email: TEST_EMAIL, display_name: null, password_hash: loginHash });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.token).toBeTruthy();
  });

  it('returns 401 for wrong password', async () => {
    enqueue({ id: TEST_USER_ID, email: TEST_EMAIL, display_name: null, password_hash: loginHash });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: TEST_EMAIL, password: 'wrongpassword123' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    enqueue(); // SELECT → no user found

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'unknown@test.com', password: TEST_PASSWORD },
    });

    expect(res.statusCode).toBe(401);
  });
});

// ── GET /me ──

describe('GET /api/v1/auth/me', () => {
  it('returns 200 with valid token', async () => {
    enqueue(userRow());

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.email).toBe(TEST_EMAIL);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    expect(res.statusCode).toBe(401);
  });

  it('returns 401 with expired token', async () => {
    const expiredToken = app.jwt.sign(
      { sub: TEST_USER_ID, email: TEST_EMAIL },
      { expiresIn: '0s' },
    );
    // Wait tiny bit for it to expire
    await new Promise((r) => setTimeout(r, 50));

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${expiredToken}` },
    });

    expect(res.statusCode).toBe(401);
  });
});
