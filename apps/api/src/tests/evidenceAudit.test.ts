/**
 * Evidence-audit route tests — Phase F.4.
 *
 * Covers:
 *  - 401 unauthenticated
 *  - 422 on malformed inputHash
 *  - 403 for a non-member of the project
 *  - 200 + returned row id on a valid write (any project member)
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { mockDb, enqueue, clearQueue } from './helpers/testApp.js';
import {
  TEST_USER_ID,
  TEST_USER_ID_2,
  TEST_EMAIL,
  TEST_PROJ_ID,
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

vi.mock('../plugins/websocket.js', async () => {
  const { default: fp } = await import('fastify-plugin');
  return {
    default: fp(async (fastify: FastifyInstance) => {
      fastify.decorate('wsBroadcast', vi.fn());
    }),
  };
});

import { buildApp } from '../app.js';

let app: FastifyInstance;
let authToken: string;
let strangerToken: string;

const VALID_HASH = 'a'.repeat(64);
const NEW_ROW_ID = 'e0000000-0000-0000-0000-000000000001';

function rbacOwnerRow() {
  return { id: TEST_PROJ_ID, owner_id: TEST_USER_ID, is_builtin: false };
}
function rbacStrangerLookupRow() {
  // Owned by TEST_USER_ID; the request comes from TEST_USER_ID_2 with no
  // membership row → resolveProjectRole 403.
  return { id: TEST_PROJ_ID, owner_id: TEST_USER_ID, is_builtin: false };
}

const validBody = {
  panelKey: 'LandVerdictCard',
  inputHash: VALID_HASH,
  inputPayload: { acreage: 12.4, koppen: 'Csa' },
  selectorName: 'selectVerdictEvidence',
  evidenceOutput: { fragments: [], confidence: 'medium' },
};

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  authToken = app.jwt.sign({ sub: TEST_USER_ID, email: TEST_EMAIL }, { expiresIn: '1h' });
  strangerToken = app.jwt.sign(
    { sub: TEST_USER_ID_2, email: 'stranger@ogden.ag' },
    { expiresIn: '1h' },
  );
});
afterAll(async () => {
  await app.close();
});
beforeEach(() => {
  clearQueue();
});

describe('POST /api/v1/projects/:projectId/evidence-audit/log', () => {
  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${TEST_PROJ_ID}/evidence-audit/log`,
      payload: validBody,
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 422 when inputHash is not a 64-char hex string', async () => {
    enqueue(rbacOwnerRow()); // resolveProjectRole runs before the handler's Zod parse
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${TEST_PROJ_ID}/evidence-audit/log`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { ...validBody, inputHash: 'not-a-real-hash' },
    });
    expect(res.statusCode).toBe(422);
  });

  it('owner can write an audit row and receives its id', async () => {
    enqueue(rbacOwnerRow()); // resolveProjectRole
    enqueue({ id: NEW_ROW_ID }); // INSERT … RETURNING id

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${TEST_PROJ_ID}/evidence-audit/log`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: validBody,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.error).toBeNull();
    expect(body.data.id).toBe(NEW_ROW_ID);
  });

  it('returns 403 for a non-member of the project', async () => {
    enqueue(rbacStrangerLookupRow()); // project lookup
    enqueue(); // empty membership lookup → not a member

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${TEST_PROJ_ID}/evidence-audit/log`,
      headers: { authorization: `Bearer ${strangerToken}` },
      payload: validBody,
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('FORBIDDEN');
  });
});
