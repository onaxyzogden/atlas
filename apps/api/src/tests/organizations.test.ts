/**
 * Organizations routes — tests for org CRUD and membership.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { mockDb, enqueue, clearQueue } from './helpers/testApp.js';
import {
  TEST_USER_ID, TEST_EMAIL, TEST_ORG_ID, orgRow, orgMemberRow,
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

afterAll(async () => { await app.close(); });
beforeEach(() => { clearQueue(); });

describe('POST /api/v1/organizations', () => {
  it('creates org and returns 201', async () => {
    // Query 1: INSERT org RETURNING id, name, plan, created_at
    enqueue(orgRow());
    // Query 2: INSERT org member (no RETURNING but still consumes a queue entry)
    enqueue();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { name: 'Ogden Farms' },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.name).toBe('Ogden Farms');
    expect(body.data.plan).toBe('free');
  });
});

describe('GET /api/v1/organizations', () => {
  it('returns 200 with user orgs', async () => {
    // Query: SELECT orgs for user
    enqueue(orgRow());

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/organizations',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
  });

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/organizations',
    });

    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/v1/organizations/:id/members', () => {
  it('returns 200 for org member', async () => {
    // Query 1: requireOrgMember — SELECT role FROM organization_members
    enqueue(orgMemberRow());
    // Query 2: List members — SELECT om.*, u.*
    enqueue(orgMemberRow());

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/organizations/${TEST_ORG_ID}/members`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
  });
});
