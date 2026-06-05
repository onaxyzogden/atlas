/**
 * Telemetry routes — tests for /api/v1/telemetry/act-interactions endpoints.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { mockDb, enqueue, clearQueue } from './helpers/testApp.js';
import { TEST_USER_ID, TEST_EMAIL, TEST_PROJ_ID } from './helpers/fixtures.js';

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

const sampleEvent = (overrides: Partial<Record<string, unknown>> = {}) => ({
  projectId: TEST_PROJ_ID,
  sessionId: 'sess-test-1',
  occurredAt: '2026-05-10T12:00:00.000Z',
  projectType: 'homestead',
  module: 'maintain',
  eventType: 'tile_select',
  payload: {},
  ...overrides,
});

describe('POST /api/v1/telemetry/act-interactions', () => {
  it('returns 201 with ingested count after a happy-path batch', async () => {
    // 3 INSERTs — 3 mock-db calls, each returns an empty result.
    enqueue();
    enqueue();
    enqueue();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/telemetry/act-interactions',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        events: [
          sampleEvent({ eventType: 'tile_select', module: 'maintain' }),
          sampleEvent({
            eventType: 'quick_log_click',
            module: 'harvest',
            payload: { toolId: 'log-harvest' },
          }),
          sampleEvent({
            eventType: 'slideup_close',
            module: 'review',
            payload: { dwellMs: 3500 },
          }),
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.ingested).toBe(3);
  });

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/telemetry/act-interactions',
      payload: { events: [sampleEvent()] },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 422 when payload fails per-eventType validation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/telemetry/act-interactions',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        events: [
          sampleEvent({
            eventType: 'quick_log_click',
            payload: {}, // missing required toolId
          }),
        ],
      },
    });
    // ZodError → custom error handler → 422 VALIDATION_ERROR envelope
    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when batch is empty', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/telemetry/act-interactions',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { events: [] },
    });
    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

const sampleClientError = (overrides: Partial<Record<string, unknown>> = {}) => ({
  sessionId: 'sess-client-1',
  occurredAt: '2026-05-21T12:00:00.000Z',
  projectId: null,
  source: 'persist_rehydrate',
  name: 'SyntaxError',
  message: 'Unexpected token',
  context: { persistKey: 'ogden-conventional-crops' },
  ...overrides,
});

describe('POST /api/v1/telemetry/client-errors', () => {
  it('returns 201 with ingested count after a happy-path batch', async () => {
    enqueue();
    enqueue();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/telemetry/client-errors',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        events: [
          sampleClientError(),
          sampleClientError({
            source: 'api_client',
            projectId: TEST_PROJ_ID,
            name: 'ApiError',
            message: 'Request failed',
            stack: 'ApiError: Request failed\n  at request',
            url: 'https://atlas.ogden.ag/projects/x',
          }),
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.ingested).toBe(2);
  });

  it('accepts a null projectId (global-store failure)', async () => {
    enqueue();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/telemetry/client-errors',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { events: [sampleClientError({ projectId: null })] },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).data.ingested).toBe(1);
  });

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/telemetry/client-errors',
      payload: { events: [sampleClientError()] },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 422 for an unknown source', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/telemetry/client-errors',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { events: [sampleClientError({ source: 'mystery' })] },
    });
    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when batch is empty', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/telemetry/client-errors',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { events: [] },
    });
    expect(res.statusCode).toBe(422);
    expect(JSON.parse(res.body).error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when batch exceeds the 50-event cap', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/telemetry/client-errors',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { events: Array.from({ length: 51 }, () => sampleClientError()) },
    });
    expect(res.statusCode).toBe(422);
    expect(JSON.parse(res.body).error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/telemetry/act-interactions/aggregate', () => {
  it('returns 200 with grouped rows', async () => {
    enqueue(
      {
        project_type: 'homestead',
        module: 'maintain',
        event_type: 'tile_select',
        touch_count: 7,
        distinct_sessions: 2,
        avg_dwell_ms: null,
      },
      {
        project_type: 'homestead',
        module: 'review',
        event_type: 'slideup_close',
        touch_count: 3,
        distinct_sessions: 1,
        avg_dwell_ms: 4200,
      },
    );

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/telemetry/act-interactions/aggregate',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.rows).toHaveLength(2);
    expect(body.data.rows[0]).toMatchObject({
      projectType: 'homestead',
      module: 'maintain',
      eventType: 'tile_select',
      touchCount: 7,
      distinctSessions: 2,
      avgDwellMs: null,
    });
    expect(body.data.rows[1].avgDwellMs).toBe(4200);
  });

  it('returns 200 with empty rows', async () => {
    enqueue();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/telemetry/act-interactions/aggregate',
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.rows).toEqual([]);
  });

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/telemetry/act-interactions/aggregate',
    });
    expect(res.statusCode).toBe(401);
  });
});
