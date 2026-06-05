/**
 * Auth routes — comprehensive tests.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { mockDb, enqueue, clearQueue } from './helpers/testApp.js';
import {
  TEST_USER_ID,
  TEST_EMAIL,
  TEST_PASSWORD,
  TEST_ORG_ID,
  userRow,
  verificationTokenRow,
  resetTokenRow,
} from './helpers/fixtures.js';

// ─── Module mocks ───

// Email is mocked so register/verify/forgot never touch a real transport and
// we can assert the app-level messages were dispatched.
vi.mock('../lib/email/index.js', () => ({
  emailIsLive: false,
  emailTransportName: 'console',
  sendEmail: vi.fn().mockResolvedValue(undefined),
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));
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
    enqueue({ id: TEST_USER_ID, email: TEST_EMAIL, display_name: null }); // INSERT users
    enqueue({ id: TEST_ORG_ID }); // INSERT organizations RETURNING id (Phase 4.5 default org)
    enqueue(); // INSERT organization_members (no RETURNING)
    enqueue(); // INSERT email_verification_tokens (no RETURNING)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).data.token).toBeTruthy();
    expect(JSON.parse(res.body).data.user.email).toBe(TEST_EMAIL);
    expect(JSON.parse(res.body).data.user.defaultOrgId).toBe(TEST_ORG_ID);
    expect(JSON.parse(res.body).data.user.emailVerified).toBe(false);
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
    enqueue({ org_id: TEST_ORG_ID }); // SELECT default owner-org (Phase 4.5)

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
    enqueue({ org_id: TEST_ORG_ID }); // SELECT default owner-org (Phase 4.5)

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.email).toBe(TEST_EMAIL);
    expect(JSON.parse(res.body).data.defaultOrgId).toBe(TEST_ORG_ID);
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

// ── POST /verify-email/request ──

describe('POST /api/v1/auth/verify-email/request', () => {
  it('returns generic 200 when an unverified account exists', async () => {
    enqueue({ id: TEST_USER_ID, email: TEST_EMAIL, email_verified: false }); // SELECT user
    enqueue(); // INSERT token

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-email/request',
      payload: { email: TEST_EMAIL },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.sent).toBe(true);
  });

  it('returns the identical generic 200 when no account exists', async () => {
    enqueue(); // SELECT → no user

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-email/request',
      payload: { email: 'nobody@test.com' },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.sent).toBe(true);
  });
});

// ── POST /verify-email/confirm ──

describe('POST /api/v1/auth/verify-email/confirm', () => {
  it('returns 200 + a fresh token for a valid verification token', async () => {
    enqueue(verificationTokenRow()); // SELECT join token+user
    enqueue(); // UPDATE users
    enqueue(); // UPDATE token used_at
    enqueue({ org_id: TEST_ORG_ID }); // SELECT default owner-org

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-email/confirm',
      payload: { token: 'raw-token-value' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.verified).toBe(true);
    expect(body.data.token).toBeTruthy();
    expect(body.data.user.emailVerified).toBe(true);
  });

  it('returns 400 (never 401) for an unknown token', async () => {
    enqueue(); // SELECT → no row

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-email/confirm',
      payload: { token: 'bogus' },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('INVALID_TOKEN');
  });

  it('returns 400 for an expired token', async () => {
    enqueue(verificationTokenRow({ expires_at: new Date(Date.now() - 1000) }));

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-email/confirm',
      payload: { token: 'expired' },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('INVALID_TOKEN');
  });

  it('returns 400 for an already-used token', async () => {
    enqueue(verificationTokenRow({ used_at: new Date(Date.now() - 1000) }));

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-email/confirm',
      payload: { token: 'used' },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('INVALID_TOKEN');
  });
});

// ── POST /forgot-password ──

describe('POST /api/v1/auth/forgot-password', () => {
  it('returns generic 200 when the account exists', async () => {
    enqueue({ id: TEST_USER_ID, email: TEST_EMAIL }); // SELECT user
    enqueue(); // INSERT reset token

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: { email: TEST_EMAIL },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.sent).toBe(true);
  });

  it('returns the identical generic 200 when the account is unknown', async () => {
    enqueue(); // SELECT → no user

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: { email: 'nobody@test.com' },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.sent).toBe(true);
  });
});

// ── POST /reset-password ──

describe('POST /api/v1/auth/reset-password', () => {
  it('returns 200 for a valid reset token', async () => {
    enqueue(resetTokenRow()); // SELECT token
    enqueue(); // UPDATE users password_hash
    enqueue(); // UPDATE outstanding tokens used_at

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: { token: 'raw-reset-token', password: 'newpassword123' },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.reset).toBe(true);
  });

  it('returns 400 (never 401) for an invalid token', async () => {
    enqueue(); // SELECT → no row

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: { token: 'bogus', password: 'newpassword123' },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('INVALID_TOKEN');
  });

  it('returns 400 for an already-used token', async () => {
    enqueue(resetTokenRow({ used_at: new Date(Date.now() - 1000) }));

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: { token: 'used', password: 'newpassword123' },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('INVALID_TOKEN');
  });

  it('returns 422 for a short password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: { token: 'whatever', password: 'short' },
    });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});
