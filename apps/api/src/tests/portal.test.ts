/**
 * Portal routes — tests for portal config CRUD.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { mockDb, enqueue, clearQueue } from './helpers/testApp.js';
import {
  TEST_USER_ID, TEST_EMAIL, TEST_PROJ_ID, projectRow, portalRow,
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

const validPortalPayload = {
  slug: 'test-farm-portal',
  isPublished: true,
  heroTitle: 'Welcome to Test Farm',
  heroSubtitle: 'Regenerative agriculture in action',
  missionStatement: 'Our mission is regenerative farming.',
  sections: ['hero', 'mission', 'map'],
  donationUrl: null,
  inquiryEmail: null,
  dataMaskingLevel: 'full',
  curatedHotspots: [],
  brandColor: '#2D5016',
  beforeAfterPairs: [],
  storyScenes: [],
};

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  authToken = app.jwt.sign({ sub: TEST_USER_ID, email: TEST_EMAIL }, { expiresIn: '1h' });
});

afterAll(async () => { await app.close(); });
beforeEach(() => { clearQueue(); });

describe('POST /api/v1/projects/:id/portal', () => {
  it('creates portal config and returns 201', async () => {
    enqueue(projectRow()); // resolveProjectRole
    // INSERT ... ON CONFLICT ... RETURNING *
    enqueue(portalRow({ config: validPortalPayload }));

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${TEST_PROJ_ID}/portal`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: validPortalPayload,
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.isPublished).toBe(true);
    expect(body.data.shareToken).toBeTruthy();
  });

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${TEST_PROJ_ID}/portal`,
      payload: validPortalPayload,
    });

    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/v1/projects/:id/portal', () => {
  it('returns 200 with portal config', async () => {
    enqueue(projectRow()); // resolveProjectRole
    enqueue(portalRow()); // portal query

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${TEST_PROJ_ID}/portal`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.shareToken).toBeTruthy();
  });

  it('returns 404 when no portal exists', async () => {
    enqueue(projectRow()); // resolveProjectRole
    enqueue(); // no portal found

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${TEST_PROJ_ID}/portal`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(404);
  });
});
