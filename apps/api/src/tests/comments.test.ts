/**
 * Comments routes — tests for comment CRUD and resolution.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { mockDb, enqueue, clearQueue } from './helpers/testApp.js';
import {
  TEST_USER_ID, TEST_EMAIL, TEST_PROJ_ID, projectRow, commentRow, userRow,
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

describe('GET /api/v1/projects/:id/comments', () => {
  it('returns 200 with comment list', async () => {
    // resolveProjectRole (owner shortcut)
    enqueue(projectRow());
    // Comments query
    enqueue(commentRow());

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${TEST_PROJ_ID}/comments`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
  });

  it('returns 200 with empty list', async () => {
    enqueue(projectRow()); // resolveProjectRole
    enqueue(); // no comments

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${TEST_PROJ_ID}/comments`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data).toEqual([]);
  });
});

describe('POST /api/v1/projects/:id/comments', () => {
  it('creates a comment and returns 201', async () => {
    // resolveProjectRole (owner shortcut)
    enqueue(projectRow());
    // db`NULL` for locationExpr (no location provided)
    enqueue();
    // INSERT comment RETURNING *
    enqueue(commentRow({ text: 'New comment', author_id: TEST_USER_ID }));
    // SELECT user display_name, email
    enqueue(userRow());
    // logActivity INSERT
    enqueue();

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${TEST_PROJ_ID}/comments`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { text: 'New comment' },
    });

    expect(res.statusCode).toBe(201);
  });
});
