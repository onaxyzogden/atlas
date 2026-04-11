/**
 * Suggestion routes — tests for suggested edit CRUD and review workflow.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { mockDb, enqueue, clearQueue } from './helpers/testApp.js';
import {
  TEST_USER_ID, TEST_USER_ID_2, TEST_EMAIL, TEST_EMAIL_2,
  TEST_PROJ_ID, NOW_DATE, projectRow, suggestionRow, userRow,
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
let ownerToken: string;
let reviewerToken: string;
const SUGGESTION_ID = 'e0000000-0000-0000-0000-000000000001';
const FEATURE_ID = 'f0000000-0000-0000-0000-000000000001';

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  ownerToken = app.jwt.sign({ sub: TEST_USER_ID, email: TEST_EMAIL }, { expiresIn: '1h' });
  reviewerToken = app.jwt.sign({ sub: TEST_USER_ID_2, email: TEST_EMAIL_2 }, { expiresIn: '1h' });
});

afterAll(async () => { await app.close(); });
beforeEach(() => { clearQueue(); });

describe('GET /api/v1/projects/:id/suggestions', () => {
  it('returns 200 with suggestions list', async () => {
    enqueue(projectRow()); // resolveProjectRole
    // suggestions query
    enqueue(suggestionRow({
      id: SUGGESTION_ID,
      feature_id: FEATURE_ID,
      author_id: TEST_USER_ID_2,
      author_name: 'Reviewer',
      author_email: TEST_EMAIL_2,
    }));

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${TEST_PROJ_ID}/suggestions`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].status).toBe('pending');
  });

  it('returns 200 with empty suggestions', async () => {
    enqueue(projectRow()); // resolveProjectRole
    enqueue(); // no suggestions

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${TEST_PROJ_ID}/suggestions`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data).toEqual([]);
  });
});

describe('POST /api/v1/projects/:id/suggestions', () => {
  it('creates suggestion by reviewer (with comment)', async () => {
    // resolveProjectRole for reviewer (NOT owner — check members)
    enqueue(projectRow());
    // reviewer isn't owner, so resolveProjectRole queries project_members
    enqueue({ role: 'reviewer' });
    // Verify feature exists
    enqueue({ id: FEATURE_ID });
    // INSERT linked comment RETURNING id (since comment is provided)
    enqueue({ id: 'comment-001' });
    // INSERT suggested_edit RETURNING *
    enqueue(suggestionRow({
      id: SUGGESTION_ID,
      feature_id: FEATURE_ID,
      author_id: TEST_USER_ID_2,
      comment_id: 'comment-001',
    }));
    // SELECT user for author name
    enqueue(userRow({ id: TEST_USER_ID_2, display_name: 'Reviewer', email: TEST_EMAIL_2 }));
    // logActivity INSERT
    enqueue();

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${TEST_PROJ_ID}/suggestions`,
      headers: { authorization: `Bearer ${reviewerToken}` },
      payload: {
        featureId: FEATURE_ID,
        diffPayload: {
          properties: {
            before: { name: 'Old Name' },
            after: { name: 'Renamed Feature' },
          },
        },
        comment: 'Suggest renaming this feature',
      },
    });

    expect(res.statusCode).toBe(201);
  });
});

describe('PATCH /api/v1/projects/:id/suggestions/:suggestionId', () => {
  it('rejects a suggestion as owner', async () => {
    enqueue(projectRow()); // resolveProjectRole (owner shortcut)
    // SELECT existing suggestion
    enqueue({
      id: SUGGESTION_ID,
      status: 'pending',
      feature_id: FEATURE_ID,
      diff_payload: { properties: { before: {}, after: { name: 'New' } } },
    });
    // UPDATE suggestion status
    enqueue();
    // logActivity INSERT (no diff application for rejection)
    enqueue();
    // SELECT updated suggestion with author info
    enqueue(suggestionRow({
      id: SUGGESTION_ID,
      status: 'rejected',
      reviewed_by: TEST_USER_ID,
      reviewed_at: NOW_DATE,
      author_name: 'Reviewer',
      author_email: TEST_EMAIL_2,
    }));

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${TEST_PROJ_ID}/suggestions/${SUGGESTION_ID}`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { action: 'rejected' },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.status).toBe('rejected');
  });
});
