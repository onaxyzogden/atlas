/**
 * telemetry-client-errors.pgtest.ts — locks the real client_error_events
 * write path against a live Postgres (migration 039). Two things the fast
 * mock suite cannot prove:
 *   1. a null project_id row inserts cleanly (global-store failures like a
 *      persist rehydrate at boot have no project context), and
 *   2. a non-null but FK-violating project_id is caught (23503) per event
 *      and silently dropped while the rest of the batch lands.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type postgres from 'postgres';
import { INTEGRATION_ENABLED, getHarness, resetDb, closeHarness } from './harness.js';
import { seedUser, seedProject, signToken } from './fixtures.js';

describe.skipIf(!INTEGRATION_ENABLED)('POST /telemetry/client-errors (real FK)', () => {
  let app: FastifyInstance;
  let sql: postgres.Sql;

  beforeAll(async () => { ({ app, sql } = await getHarness()); await resetDb(sql); });
  afterEach(async () => { await resetDb(sql); });
  afterAll(async () => { await closeHarness(); });

  const mk = (pid: string | null, idx: number) => ({
    sessionId: `sess-${idx}`,
    occurredAt: new Date().toISOString(),
    projectId: pid,
    source: 'persist_rehydrate',
    name: 'SyntaxError',
    message: 'Unexpected token',
    context: { persistKey: 'ogden-conventional-crops' },
  });

  it('ingests a null-projectId event (global-store failure)', async () => {
    const userId = await seedUser(sql);
    const token = signToken(app, userId);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/telemetry/client-errors',
      headers: { authorization: `Bearer ${token}` },
      payload: { events: [mk(null, 1)] },
    });

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).data.ingested).toBe(1);

    const rows = await sql<{ count: string }[]>`
      SELECT count(*)::text AS count FROM client_error_events WHERE project_id IS NULL
    `;
    expect(Number(rows[0]!.count)).toBe(1);
  });

  it('ingests valid events and silently drops FK-violating ones', async () => {
    const userId = await seedUser(sql);
    const projectId = await seedProject(sql, userId);
    const token = signToken(app, userId);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/telemetry/client-errors',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        events: [
          mk(projectId, 1),
          mk(crypto.randomUUID(), 2), // nonexistent project → FK 23503
          mk(null, 3),
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).data.ingested).toBe(2);

    const countRows = await sql<{ count: string }[]>`
      SELECT count(*)::text AS count FROM client_error_events
    `;
    expect(Number(countRows[0]!.count)).toBe(2);
  });
});
