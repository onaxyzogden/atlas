/**
 * ADR 7 Phase 1 — typed per-record Act transport, route → real Postgres.
 *
 * The per-record parallel of blobSync.integration.test.ts. Where that spec
 * exercises the opaque per-(project, store_key) blob, this one exercises the
 * typed per-(project, store_key, record_id) endpoint that replaces it for the
 * four Act stores — the mechanical core a FIFO mock-DB cannot reproduce: the
 * ON CONFLICT rev gate per record, per-record isolation within a store, and
 * cross-project / cross-store read isolation.
 *
 * Auto-skips when no live DB is reachable so the mock-DB unit gate is never
 * broken. Point it at a DB with `INTEGRATION_DATABASE_URL`; default targets the
 * infrastructure/docker-compose.yml dev database (apply migration 047 first
 * with `pnpm --filter @ogden/api migrate`).
 *
 * Cases:
 *   A — shadow:    PUT a brand-new (project, storeKey, recordId) at baseRev 0 →
 *                  200, rev===1; a direct SELECT proves the row persisted under
 *                  the right PK with the exact payload AND the denormalised
 *                  tier-hint columns (observed_at / source_type / cycle_id /
 *                  task_type) — the reason Act records left the opaque blob.
 *   B — restore +  Two records under P1's store + the same record id under P2 +
 *       isolation:  one record under a different store of P1; GET P1/:storeKey
 *                  returns exactly P1's two records for that store — the P2 row
 *                  and the other-store row do not leak.
 *   C — conflict,  Re-PUT P1's record at a stale baseRev → 409 with
 *       no clobber: {serverRev, serverPayload}; a follow-up GET proves the
 *                  server copy is unchanged; a PUT at the correct baseRev then
 *                  bumps rev — and its sibling record's rev is untouched
 *                  (per-record independence).
 *
 * No new product code, no new deps — real buildApp, real app.jwt via
 * /auth/register, real @ogden/shared Zod, real requireRole.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import postgres from 'postgres';

const INTEGRATION_DATABASE_URL =
  process.env['INTEGRATION_DATABASE_URL'] ??
  'postgresql://ogden_app:ogden_dev_password@localhost:5432/ogden_atlas';

// ─── Live-DB probe (synchronous skip decision) ────────────────────────────────
async function probe(): Promise<boolean> {
  const sql = postgres(INTEGRATION_DATABASE_URL, {
    max: 1,
    idle_timeout: 1,
    connect_timeout: 3,
    onnotice: () => {},
  });
  try {
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  } finally {
    await sql.end({ timeout: 2 }).catch(() => {});
  }
}

const dbReachable = await probe();
if (!dbReachable) {
  // eslint-disable-next-line no-console
  console.warn(
    `[actRecords.integration] SKIPPED — no live Postgres at ${INTEGRATION_DATABASE_URL}. ` +
      'Bring it up with `cd infrastructure && docker compose up -d` then ' +
      '`pnpm --filter @ogden/api migrate` to run this spec.',
  );
}

// The route's db is the *plugin's* client. Mock the database plugin to decorate
// a REAL postgres client at the integration URL (mirrors blobSync.integration).
vi.mock('../plugins/database.js', async () => {
  const { default: fp } = await import('fastify-plugin');
  const pg = (await import('postgres')).default;
  return {
    default: fp(async (fastify: FastifyInstance) => {
      const sql = pg(INTEGRATION_DATABASE_URL, {
        max: 5,
        idle_timeout: 10,
        connect_timeout: 5,
        onnotice: () => {},
      });
      fastify.decorate('db', sql);
      fastify.addHook('onClose', async () => {
        await sql.end({ timeout: 5 }).catch(() => {});
      });
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

const { buildApp } = await import('../app.js');

// Independent pool for fixture setup, assertion SELECTs, and teardown.
const probeSql = postgres(INTEGRATION_DATABASE_URL, {
  max: 3,
  idle_timeout: 10,
  connect_timeout: 5,
  onnotice: () => {},
});

const RUN = Date.now();
const EMAIL = `actrecords-it-${RUN}@example.test`;

const STORE = 'ogden-field-actions';
const STORE2 = 'ogden-observe-feed';
const OBSERVED_AT = '2026-05-20T10:00:00.000Z';

interface TierHints {
  observedAt?: string | null;
  sourceType?: string | null;
  cycleId?: string | null;
  taskType?: string | null;
}

describe.skipIf(!dbReachable)('actRecords.integration (real Postgres)', () => {
  let app: FastifyInstance;
  let token: string;
  let userId: string;
  let p1: string;
  let p2: string;

  const A1 = { id: 'fa-1', note: 'baseline survey', x: 1 };
  const A2 = { id: 'fa-2', note: 'second action' };
  const P2_REC = { id: 'fa-1', note: 'other project, must not leak' };
  const OTHER_STORE_REC = { id: 'of-1', note: 'observe feed event, must not leak' };

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const reg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: EMAIL, password: 'integration-pw-123', displayName: 'Act IT' },
    });
    expect(reg.statusCode).toBe(201);
    const regBody = JSON.parse(reg.body);
    token = regBody.data.token as string;
    userId = regBody.data.user.id as string;

    // projects.org_id is NOT NULL (migration 036). Register auto-creates a
    // personal org + owner-membership; resolve it and attach both projects.
    const [org] = await probeSql<{ org_id: string }[]>`
      SELECT org_id FROM organization_members WHERE user_id = ${userId} LIMIT 1
    `;
    const orgId = org!.org_id;

    const [r1] = await probeSql<{ id: string }[]>`
      INSERT INTO projects (owner_id, org_id, name) VALUES (${userId}, ${orgId}, ${'Act IT P1'})
      RETURNING id
    `;
    const [r2] = await probeSql<{ id: string }[]>`
      INSERT INTO projects (owner_id, org_id, name) VALUES (${userId}, ${orgId}, ${'Act IT P2'})
      RETURNING id
    `;
    p1 = r1!.id;
    p2 = r2!.id;
  });

  afterAll(async () => {
    // ON DELETE CASCADE (migration 047 FK) clears synced_records; users last.
    await probeSql`DELETE FROM projects WHERE owner_id = ${userId}`.catch(() => {});
    await probeSql`DELETE FROM users WHERE id = ${userId}`.catch(() => {});
    await probeSql.end({ timeout: 5 }).catch(() => {});
    await app.close();
  });

  function put(
    project: string,
    storeKey: string,
    recordId: string,
    baseRev: number,
    payload: unknown,
    hints: TierHints = {},
  ) {
    return app.inject({
      method: 'PUT',
      url: `/api/v1/act-records/project/${project}/${storeKey}/${recordId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        envelopeSchema: 1,
        schemaVersion: 2,
        baseRev,
        payload,
        observedAt: hints.observedAt ?? null,
        sourceType: hints.sourceType ?? null,
        cycleId: hints.cycleId ?? null,
        taskType: hints.taskType ?? null,
      },
    });
  }

  function getStore(project: string, storeKey: string) {
    return app.inject({
      method: 'GET',
      url: `/api/v1/act-records/project/${project}/${storeKey}`,
      headers: { authorization: `Bearer ${token}` },
    });
  }

  it('A — shadow: first per-record write at baseRev 0 persists (rev 1) with tier hints', async () => {
    const res = await put(p1, STORE, 'fa-1', 0, A1, {
      observedAt: OBSERVED_AT,
      sourceType: 'field_survey',
      cycleId: 'baseline',
      taskType: 'field_survey',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.error).toBeNull();
    expect(body.data.rev).toBe(1);
    expect(body.data.recordId).toBe('fa-1');

    // The assertion the FIFO mock cannot make: the row really landed under the
    // right (project_id, store_key, record_id) with the exact payload AND the
    // denormalised tier-hint columns populated.
    const rows = await probeSql<
      {
        payload: unknown;
        rev: string;
        observed_at: Date | null;
        source_type: string | null;
        cycle_id: string | null;
        task_type: string | null;
      }[]
    >`
      SELECT payload, rev, observed_at, source_type, cycle_id, task_type
      FROM synced_records
      WHERE project_id = ${p1} AND store_key = ${STORE} AND record_id = ${'fa-1'}
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.payload).toEqual(A1);
    expect(Number(rows[0]!.rev)).toBe(1);
    expect(rows[0]!.source_type).toBe('field_survey');
    expect(rows[0]!.cycle_id).toBe('baseline');
    expect(rows[0]!.task_type).toBe('field_survey');
    expect(rows[0]!.observed_at?.toISOString()).toBe(OBSERVED_AT);
  });

  it('B — restore + isolation: GET P1/:storeKey returns exactly P1 records for that store', async () => {
    expect((await put(p1, STORE, 'fa-2', 0, A2)).statusCode).toBe(200);
    expect((await put(p2, STORE, 'fa-1', 0, P2_REC)).statusCode).toBe(200);
    expect((await put(p1, STORE2, 'of-1', 0, OTHER_STORE_REC)).statusCode).toBe(200);

    const res = await getStore(p1, STORE);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const byId = Object.fromEntries(
      body.data.map((r: { recordId: string }) => [r.recordId, r]),
    );
    // Exactly P1's two records in THIS store; P2's same-id record and the
    // other-store record must not leak in.
    expect(Object.keys(byId).sort()).toEqual(['fa-1', 'fa-2']);
    expect(byId['fa-1'].payload).toEqual(A1);
    expect(byId['fa-2'].payload).toEqual(A2);
    expect(
      body.data.every(
        (r: { projectId: string; storeKey: string }) =>
          r.projectId === p1 && r.storeKey === STORE,
      ),
    ).toBe(true);
    expect(body.meta.total).toBe(2);
  });

  it('C — conflict: stale per-record baseRev → 409, no clobber, recovery bumps only that record', async () => {
    // Server rev for P1/STORE/fa-1 is 1 (case A). A baseRev:0 write is stale.
    const stale = await put(p1, STORE, 'fa-1', 0, { id: 'fa-1', clobbered: true });
    expect(stale.statusCode).toBe(409);
    const conflict = JSON.parse(stale.body);
    expect(conflict.error.code).toBe('CONFLICT');
    expect(conflict.error.details.serverRev).toBe(1);
    expect(conflict.error.details.serverPayload).toEqual(A1);

    // No clobber: the stored record is byte-for-byte unchanged.
    const after = await getStore(p1, STORE);
    const fa1After = JSON.parse(after.body).data.find(
      (r: { recordId: string }) => r.recordId === 'fa-1',
    );
    expect(fa1After.rev).toBe(1);
    expect(fa1After.payload).toEqual(A1);

    // Recovery: a write at the correct baseRev succeeds and bumps rev.
    const recovered = await put(p1, STORE, 'fa-1', 1, { id: 'fa-1', note: 'updated' });
    expect(recovered.statusCode).toBe(200);
    expect(JSON.parse(recovered.body).data.rev).toBe(2);

    // Per-record independence: bumping fa-1 left its sibling fa-2 at rev 1.
    const final = await getStore(p1, STORE);
    const finalById = Object.fromEntries(
      JSON.parse(final.body).data.map((r: { recordId: string }) => [r.recordId, r]),
    );
    expect(finalById['fa-1'].rev).toBe(2);
    expect(finalById['fa-2'].rev).toBe(1);
  });
});
