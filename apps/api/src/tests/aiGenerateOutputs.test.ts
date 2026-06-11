/**
 * On-demand AI generation — tests for POST /api/v1/ai/project/:projectId/generate-outputs.
 *
 * Exercises the full route: RBAC preHandler, the AI_NOT_CONFIGURED gate,
 * NarrativeContextBuilder's 404 path, the 5-minute freshness debounce,
 * `force`, single-type selection, and the happy path through the REAL
 * ClaudeClient (global fetch stubbed with the structured-response envelope,
 * matching the aiAgents.test.ts pattern) plus AiOutputWriter inserts.
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
import { config } from '../lib/config.js';
import { claudeClient } from '../services/ai/ClaudeClient.js';

// ── Anthropic fetch stub (structured-response envelope) ────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function structured(body: string) {
  return [
    'CONFIDENCE: high',
    'DATA_SOURCES: SSURGO, USGS 3DEP',
    'NEEDS_SITE_VISIT: false',
    'CAVEAT: none',
    '---',
    body,
  ].join('\n');
}

function anthropicResponse(text: string, model = 'claude-sonnet-4-20250514') {
  return {
    ok: true,
    json: async () => ({
      content: [{ type: 'text', text }],
      model,
      usage: { input_tokens: 100, output_tokens: 200 },
    }),
  };
}

/** Answer per task: the narrative and recommendation system prompts differ. */
function stubAnthropicByTask() {
  mockFetch.mockImplementation(async (_url: string, init: { body: string }) => {
    const reqBody = JSON.parse(init.body) as { system: Array<{ text: string }> };
    const sys = reqBody.system.map((b) => b.text).join('\n');
    const text = sys.includes('site narrative')
      ? structured('Generated narrative body.')
      : structured('Generated recommendation body.');
    return anthropicResponse(text);
  });
}

// ── DB fixtures (FIFO order per request) ────────────────────────────────────

/** Queue the 3 buildNarrativeContext queries: project, layers, assessment. */
function enqueueNarrativeContext() {
  enqueue({
    name: 'Cedar Hollow',
    project_type: 'homestead',
    country: 'CA',
    province_state: 'ON',
    acreage: '25',
    address: null,
  });
  enqueue(); // project_layers — none
  enqueue(); // site_assessments — none
}

function freshOutputRow(overrides?: Record<string, unknown>) {
  return {
    id: 'existing-1',
    project_id: TEST_PROJ_ID,
    output_type: 'site_narrative',
    content: 'Cached narrative.',
    confidence: 'high',
    data_sources: ['SSURGO'],
    caveat: null,
    needs_site_visit: false,
    model_id: 'claude-sonnet-4-20250514',
    generated_at: new Date().toISOString(), // inside the 5-min window
    ...overrides,
  };
}

// ── App lifecycle ────────────────────────────────────────────────────────────

let app: FastifyInstance;
let authToken: string;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  authToken = app.jwt.sign({ sub: TEST_USER_ID, email: TEST_EMAIL }, { expiresIn: '1h' });
  // Both the route gate (config) and the module-load singleton (claudeClient)
  // read ANTHROPIC_API_KEY, which is unset in the test env. Override both.
  (config as { ANTHROPIC_API_KEY?: string }).ANTHROPIC_API_KEY = 'sk-ant-test';
  (claudeClient as unknown as { apiKey: string }).apiKey = 'sk-ant-test';
});

afterAll(async () => {
  delete (config as { ANTHROPIC_API_KEY?: string }).ANTHROPIC_API_KEY;
  await app.close();
});

beforeEach(() => {
  clearQueue();
  mockFetch.mockReset();
});

const URL = `/api/v1/ai/project/${TEST_PROJ_ID}/generate-outputs`;

function inject(payload: Record<string, unknown> = {}) {
  return app.inject({
    method: 'POST',
    url: URL,
    headers: { authorization: `Bearer ${authToken}` },
    payload,
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/ai/project/:projectId/generate-outputs', () => {
  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'POST', url: URL, payload: {} });
    expect(res.statusCode).toBe(401);
  });

  it('returns 503 AI_NOT_CONFIGURED when the API key is absent', async () => {
    const saved = config.ANTHROPIC_API_KEY;
    delete (config as { ANTHROPIC_API_KEY?: string }).ANTHROPIC_API_KEY;
    try {
      enqueue(projectRow()); // resolveProjectRole
      const res = await inject();
      expect(res.statusCode).toBe(503);
      expect(JSON.parse(res.body).error.code).toBe('AI_NOT_CONFIGURED');
      expect(mockFetch).not.toHaveBeenCalled();
    } finally {
      (config as { ANTHROPIC_API_KEY?: string }).ANTHROPIC_API_KEY = saved;
    }
  });

  it('returns 404 when the project row is gone at context-build time', async () => {
    enqueue(projectRow()); // resolveProjectRole
    enqueue(); // buildNarrativeContext project SELECT — no row
    const res = await inject();
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error.code).toBe('NOT_FOUND');
  });

  it('generates both types by default, persists rows, returns keyed map', async () => {
    stubAnthropicByTask();
    enqueue(projectRow()); // resolveProjectRole
    enqueueNarrativeContext();
    enqueue(); // getLatestAiOutputsForProject — nothing existing
    enqueue({ id: 'gen-1' }); // writeAiOutput #1
    enqueue({ id: 'gen-2' }); // writeAiOutput #2

    const res = await inject();
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(2);

    expect(body.data.site_narrative).toMatchObject({
      projectId: TEST_PROJ_ID,
      outputType: 'site_narrative',
      content: 'Generated narrative body.',
      confidence: 'high',
      dataSources: ['SSURGO', 'USGS 3DEP'],
      needsSiteVisit: false,
      modelId: 'claude-sonnet-4-20250514',
    });
    expect(body.data.design_recommendation).toMatchObject({
      outputType: 'design_recommendation',
      content: 'Generated recommendation body.',
    });
    // The two parallel inserts may land in either order — assert the id SET.
    expect(
      [body.data.site_narrative.id, body.data.design_recommendation.id].sort(),
    ).toEqual(['gen-1', 'gen-2']);
    expect([...body.meta.generated].sort()).toEqual(
      ['design_recommendation', 'site_narrative'],
    );
  });

  it('generates only the requested type', async () => {
    stubAnthropicByTask();
    enqueue(projectRow()); // resolveProjectRole
    enqueueNarrativeContext();
    enqueue(); // getLatest — nothing existing
    enqueue({ id: 'gen-1' }); // single writeAiOutput

    const res = await inject({ outputTypes: ['site_narrative'] });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(body.data.site_narrative).toMatchObject({ id: 'gen-1' });
    expect(body.data.design_recommendation).toBeUndefined();
    expect(body.meta.generated).toEqual(['site_narrative']);
  });

  it('short-circuits with a fresh existing row (no Anthropic call)', async () => {
    enqueue(projectRow()); // resolveProjectRole
    enqueueNarrativeContext();
    enqueue(freshOutputRow()); // getLatest — fresh site_narrative

    const res = await inject({ outputTypes: ['site_narrative'] });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(body.data.site_narrative).toMatchObject({
      id: 'existing-1',
      content: 'Cached narrative.',
    });
    expect(body.meta.generated).toEqual([]);
  });

  it('force=true regenerates despite a fresh row', async () => {
    stubAnthropicByTask();
    enqueue(projectRow()); // resolveProjectRole
    enqueueNarrativeContext();
    enqueue(freshOutputRow()); // getLatest — fresh row exists
    enqueue({ id: 'gen-forced' }); // writeAiOutput

    const res = await inject({ outputTypes: ['site_narrative'], force: true });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(body.data.site_narrative).toMatchObject({
      id: 'gen-forced',
      content: 'Generated narrative body.',
    });
    expect(body.meta.generated).toEqual(['site_narrative']);
  });

  it('rejects an empty outputTypes array', async () => {
    enqueue(projectRow()); // resolveProjectRole
    const res = await inject({ outputTypes: [] });
    expect(res.statusCode).toBe(422);
  });
});
