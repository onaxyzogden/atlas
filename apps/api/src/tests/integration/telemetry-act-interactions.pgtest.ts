/**
 * telemetry-act-interactions.pgtest.ts — locks the per-event swallowed FK
 * violation. The route catches a real Postgres 23503 (FK miss on
 * project_id) per event and continues the batch. A queue mock never raises
 * a real FK error, so this path is invisible to the fast suite.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type postgres from 'postgres';
import { INTEGRATION_ENABLED, getHarness, resetDb, closeHarness } from './harness.js';
import { seedUser, seedProject, signToken } from './fixtures.js';

describe.skipIf(!INTEGRATION_ENABLED)('POST /telemetry/act-interactions (real FK)', () => {
  let app: FastifyInstance;
  let sql: postgres.Sql;

  beforeAll(async () => { ({ app, sql } = await getHarness()); await resetDb(sql); });
  afterEach(async () => { await resetDb(sql); });
  afterAll(async () => { await closeHarness(); });

  it('ingests valid events and silently drops FK-violating ones', async () => {
    const userId = await seedUser(sql);
    const projectId = await seedProject(sql, userId);
    const token = signToken(app, userId);
    const occurredAt = new Date().toISOString();

    const mk = (pid: string, idx: number) => ({
      projectId: pid,
      sessionId: `sess-${idx}`,
      occurredAt,
      projectType: null,
      module: 'tracker',
      eventType: 'tile_select',
      payload: {},
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/telemetry/act-interactions',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        events: [
          mk(projectId, 1),
          mk(crypto.randomUUID(), 2), // nonexistent project → FK 23503
          mk(projectId, 3),
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).data.ingested).toBe(2);

    const countRows = await sql<{ count: string }[]>`
      SELECT count(*)::text AS count FROM act_interaction_events
    `;
    expect(Number(countRows[0]!.count)).toBe(2);
  });
});
