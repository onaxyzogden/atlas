/**
 * AI outputs route — tests for GET /api/v1/projects/:id/ai-outputs.
 *
 * Exercises the route wiring and the AiOutputWriter `DISTINCT ON (output_type)`
 * query shape by asserting the mockDb returns rows get passed through to the
 * camelCased response envelope.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { mockDb, enqueue, clearQueue } from './helpers/testApp.js';
import {
  TEST_USER_ID, TEST_EMAIL, TEST_PROJ_ID, projectRow,
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

describe('GET /api/v1/projects/:id/ai-outputs', () => {
  it('returns latest output per type, keyed by outputType', async () => {
    enqueue(projectRow()); // resolveProjectRole
    // getLatestAiOutputsForProject — DISTINCT ON (output_type) result set
    enqueue(
      {
        id: 'out-1',
        project_id: TEST_PROJ_ID,
        output_type: 'site_narrative',
        content: 'Rolling terrain with fertile loam soils.',
        confidence: 'high',
        data_sources: ['USGS 3DEP', 'SSURGO'],
        caveat: null,
        needs_site_visit: false,
        model_id: 'claude-sonnet-4-6',
        generated_at: '2026-04-22T12:00:00.000Z',
      },
      {
        id: 'out-2',
        project_id: TEST_PROJ_ID,
        output_type: 'design_recommendation',
        content: 'Plant riparian buffer along north slope.',
        confidence: 'medium',
        data_sources: ['NHD'],
        caveat: 'Site visit recommended',
        needs_site_visit: true,
        model_id: 'claude-sonnet-4-6',
        generated_at: '2026-04-22T12:00:05.000Z',
      },
    );

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${TEST_PROJ_ID}/ai-outputs`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.error).toBeNull();
    expect(body.data.site_narrative).toMatchObject({
      id: 'out-1',
      outputType: 'site_narrative',
      confidence: 'high',
      needsSiteVisit: false,
      modelId: 'claude-sonnet-4-6',
    });
    expect(body.data.design_recommendation).toMatchObject({
      outputType: 'design_recommendation',
      caveat: 'Site visit recommended',
      needsSiteVisit: true,
    });
  });

  it('returns empty object when no outputs exist', async () => {
    enqueue(projectRow()); // resolveProjectRole
    enqueue(); // no ai_outputs rows

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${TEST_PROJ_ID}/ai-outputs`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toEqual({});
  });

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${TEST_PROJ_ID}/ai-outputs`,
    });
    expect(res.statusCode).toBe(401);
  });
});
