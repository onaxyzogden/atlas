/**
 * OLOS local-first hardening Phase 3B — olos record rev-parity, route → real
 * Postgres. The olos parallel of actRecords.integration.test.ts.
 *
 * The three olos record domains (observations / proofs / verifications) join the
 * SAME wire contract as the Act typed records: a per-record monotonic `rev`
 * (migration 053), a rev-gated PATCH that 409s a stale write, a durable
 * sync_log + failed_records escalation, a changed-since reconnect delta, and one
 * storeKey-generic resolve route. The conflict-surface, broadcast, and resolve
 * machinery (recordSync.ts) is shared verbatim across all three stores, so this
 * spec exercises that machinery through ONE domain — observations — which needs
 * only an objective row (proofs/verifications additionally need the
 * handoff→task FK chain, but ride the identical recordSync code path).
 *
 * Cases (observations):
 *   A — create:       POST a fresh observation → 201, rev===1; a direct SELECT
 *                     proves the row persisted with rev 1 (DEFAULT 0 sentinel is
 *                     only ever a legacy backfilled row).
 *   B — changed-since: a second observation; GET changed-since (epoch) returns
 *                     both as storeKey-generic delta envelopes ordered by
 *                     updated_at ASC; a since-cursor past the first returns only
 *                     the second (the reconnect delta-pull contract).
 *   C — conflict:     PATCH at a stale baseRev → 409 {serverRev, serverPayload}
 *                     resolution 'escalated' (olos has no observed_at LWW tier →
 *                     always escalates); a follow-up GET proves no clobber; a
 *                     PATCH at the correct baseRev then bumps rev. A durable
 *                     sync_log row + failed_records pointer are written.
 *   D — keep_server:  resolve an escalated conflict keep_server → server copy
 *                     never clobbered (rev unchanged), conflict cleared.
 *   E — keep_mine:    resolve keep_mine → the steward's local payload becomes
 *                     authoritative at rev + 1 (the one sanctioned override).
 *
 * Auto-skips when no live DB is reachable so the mock-DB unit gate is never
 * broken. Point it at a DB with `INTEGRATION_DATABASE_URL` (apply migrations
 * through 053 first with `pnpm --filter @ogden/api migrate`).
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
    `[olosRecords.integration] SKIPPED — no live Postgres at ${INTEGRATION_DATABASE_URL}. ` +
      'Bring it up and `pnpm --filter @ogden/api migrate` (through 053) to run this spec.',
  );
}

// Decorate a REAL postgres client at the integration URL (mirrors actRecords).
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
const EMAIL = `olosrecords-it-${RUN}@example.test`;
const OBJECTIVE_ID = `olos-it-objective-${RUN}`;
const STORE = 'ogden-olos-observation-records';

describe.skipIf(!dbReachable)('olosRecords.integration (real Postgres)', () => {
  let app: FastifyInstance;
  let token: string;
  let userId: string;
  let projectId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const reg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: EMAIL, password: 'integration-pw-123', displayName: 'OLOS IT' },
    });
    expect(reg.statusCode).toBe(201);
    const regBody = JSON.parse(reg.body);
    token = regBody.data.token as string;
    userId = regBody.data.user.id as string;

    const [org] = await probeSql<{ org_id: string }[]>`
      SELECT org_id FROM organization_members WHERE user_id = ${userId} LIMIT 1
    `;
    const orgId = org!.org_id;

    const [proj] = await probeSql<{ id: string }[]>`
      INSERT INTO projects (owner_id, org_id, name) VALUES (${userId}, ${orgId}, ${'OLOS IT'})
      RETURNING id
    `;
    projectId = proj!.id;

    // olos_observation_records.objective_id FKs olos_objectives ON DELETE
    // RESTRICT — seed a self-contained objective row for this run.
    await probeSql`
      INSERT INTO olos_objectives (id, stage, domain, title, focused_question, output_kind)
      VALUES (
        ${OBJECTIVE_ID}, 'observe', 'soil', 'IT objective',
        'is the machinery sound?', 'observation-record'
      )
    `;
  });

  afterAll(async () => {
    // ON DELETE CASCADE clears olos records + sync_log via project FK; the
    // RESTRICT-guarded objective must be deleted after its records are gone.
    await probeSql`DELETE FROM projects WHERE owner_id = ${userId}`.catch(() => {});
    await probeSql`DELETE FROM olos_objectives WHERE id = ${OBJECTIVE_ID}`.catch(() => {});
    await probeSql`DELETE FROM users WHERE id = ${userId}`.catch(() => {});
    await probeSql.end({ timeout: 5 }).catch(() => {});
    await app.close();
  });

  function createObs(payload: Record<string, unknown>) {
    return app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/olos/observations`,
      headers: { authorization: `Bearer ${token}` },
      payload: { objectiveId: OBJECTIVE_ID, status: 'clear', ...payload },
    });
  }

  function patchObs(recordId: string, payload: Record<string, unknown>) {
    return app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${projectId}/olos/observations/${recordId}`,
      headers: { authorization: `Bearer ${token}` },
      payload,
    });
  }

  function changedSince(since?: string) {
    const q = since ? `?since=${encodeURIComponent(since)}` : '';
    return app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/olos/observations/changed-since${q}`,
      headers: { authorization: `Bearer ${token}` },
    });
  }

  function resolveConflict(syncLogId: string, choice: 'keep_mine' | 'keep_server') {
    return app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/olos/conflicts/${syncLogId}/resolve`,
      headers: { authorization: `Bearer ${token}` },
      payload: { choice },
    });
  }

  let recA = '';

  it('A — create: fresh observation persists at rev 1', async () => {
    const res = await createObs({ summary: 'baseline survey' });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.error).toBeNull();
    expect(body.data.rev).toBe(1);
    expect(body.data.objectiveId).toBe(OBJECTIVE_ID);
    recA = body.data.id as string;

    const rows = await probeSql<{ rev: string; summary: string }[]>`
      SELECT rev, summary FROM olos_observation_records WHERE id = ${recA}
    `;
    expect(rows).toHaveLength(1);
    expect(Number(rows[0]!.rev)).toBe(1);
    expect(rows[0]!.summary).toBe('baseline survey');
  });

  it('B — changed-since: returns delta envelopes ordered by updated_at ASC, honouring the cursor', async () => {
    const resB = await createObs({ summary: 'second observation' });
    expect(resB.statusCode).toBe(201);
    const recB = JSON.parse(resB.body).data.id as string;

    // Epoch pull returns BOTH as the storeKey-generic delta envelope.
    const all = JSON.parse((await changedSince()).body);
    const ids = all.data.map((d: { recordId: string }) => d.recordId);
    expect(ids).toContain(recA);
    expect(ids).toContain(recB);
    const envelopeA = all.data.find((d: { recordId: string }) => d.recordId === recA);
    expect(envelopeA.storeKey).toBe(STORE);
    expect(envelopeA.schemaVersion).toBe(1);
    expect(envelopeA.rev).toBe(1);
    expect(typeof envelopeA.updatedAt).toBe('string');
    expect(envelopeA.payload.id).toBe(recA);
    // ASC by updated_at: A (older) precedes B (newer).
    const posA = ids.indexOf(recA);
    const posB = ids.indexOf(recB);
    expect(posA).toBeLessThan(posB);

    // The cursor is the newest envelope's `updatedAt` — exactly what the
    // reconnect delta-pull persists as the next watermark. Re-pulling with it
    // EXCLUDES strictly-older rows (A): the clock-skew-relevant guarantee. The
    // boundary row B may re-appear (the cursor is millisecond-precision while
    // updated_at is microsecond-precision in Postgres) — a harmless, rev-
    // idempotent re-pull the client dedupes, never a skipped row.
    const envelopeB = all.data.find((d: { recordId: string }) => d.recordId === recB);
    const delta = JSON.parse((await changedSince(envelopeB.updatedAt)).body);
    const deltaIds = delta.data.map((d: { recordId: string }) => d.recordId);
    expect(deltaIds).not.toContain(recA);
  });

  it('C — conflict: stale baseRev → 409 escalated, no clobber, recovery bumps rev', async () => {
    // recA is at rev 1. A baseRev:0 PATCH is stale.
    const stale = await patchObs(recA, { baseRev: 0, summary: 'clobber attempt' });
    expect(stale.statusCode).toBe(409);
    const conflict = JSON.parse(stale.body);
    expect(conflict.error.code).toBe('CONFLICT');
    expect(conflict.error.details.serverRev).toBe(1);
    expect(conflict.error.details.serverPayload.summary).toBe('baseline survey');
    // olos records carry no observed_at LWW tier → safety can never be proven →
    // the server ALWAYS escalates (never auto-resolves).
    expect(conflict.error.details.resolution).toBe('escalated');
    expect(typeof conflict.error.details.syncLogId).toBe('string');

    // No clobber: the stored summary is unchanged.
    const after = await probeSql<{ rev: string; summary: string }[]>`
      SELECT rev, summary FROM olos_observation_records WHERE id = ${recA}
    `;
    expect(Number(after[0]!.rev)).toBe(1);
    expect(after[0]!.summary).toBe('baseline survey');

    // Durable audit trail: one escalated sync_log row + a failed_records pointer.
    const logRows = await probeSql<
      { resolution_status: string; local_rev: string; server_rev: string }[]
    >`
      SELECT resolution_status, local_rev, server_rev FROM sync_log
      WHERE project_id = ${projectId} AND store_key = ${STORE} AND record_id = ${recA}
      ORDER BY detected_at DESC
    `;
    expect(logRows).toHaveLength(1);
    expect(logRows[0]!.resolution_status).toBe('escalated');
    expect(Number(logRows[0]!.local_rev)).toBe(0);
    expect(Number(logRows[0]!.server_rev)).toBe(1);

    const failed = await probeSql<{ sync_log_id: string }[]>`
      SELECT sync_log_id FROM failed_records
      WHERE project_id = ${projectId} AND store_key = ${STORE} AND record_id = ${recA}
    `;
    expect(failed).toHaveLength(1);
    expect(failed[0]!.sync_log_id).toBe(conflict.error.details.syncLogId);

    // Recovery: a PATCH at the correct baseRev succeeds and bumps rev.
    const recovered = await patchObs(recA, { baseRev: 1, summary: 'updated baseline' });
    expect(recovered.statusCode).toBe(200);
    expect(JSON.parse(recovered.body).data.rev).toBe(2);
  });

  // Drive a fresh record to a clean ESCALATED conflict and return the syncLogId.
  async function forceEscalation(summary: string): Promise<{ id: string; syncLogId: string }> {
    const created = JSON.parse((await createObs({ summary })).body).data.id as string;
    const stale = await patchObs(created, { baseRev: 0, summary: 'local-newer' });
    expect(stale.statusCode).toBe(409);
    const body = JSON.parse(stale.body);
    expect(body.error.details.resolution).toBe('escalated');
    return { id: created, syncLogId: body.error.details.syncLogId as string };
  }

  it('D — keep_server: resolves, server copy never clobbered (rev stays 1)', async () => {
    const { id, syncLogId } = await forceEscalation('server-v1');

    const res = await resolveConflict(syncLogId, 'keep_server');
    expect(res.statusCode).toBe(200);
    const out = JSON.parse(res.body);
    expect(out.error).toBeNull();
    expect(out.data.recordId).toBe(id);
    expect(out.data.storeKey).toBe(STORE);
    expect(out.data.rev).toBe(1);
    expect(out.data.resolutionStatus).toBe('resolved');

    const [log] = await probeSql<{ resolution_status: string; resolved_by: string | null }[]>`
      SELECT resolution_status, resolved_by FROM sync_log WHERE id = ${syncLogId}
    `;
    expect(log!.resolution_status).toBe('resolved');
    expect(log!.resolved_by).toBe(userId);

    const stillFailed = await probeSql<{ id: string }[]>`
      SELECT id FROM failed_records WHERE sync_log_id = ${syncLogId}
    `;
    expect(stillFailed).toHaveLength(0);

    const [rec] = await probeSql<{ rev: string; summary: string }[]>`
      SELECT rev, summary FROM olos_observation_records WHERE id = ${id}
    `;
    expect(Number(rec!.rev)).toBe(1);
    expect(rec!.summary).toBe('server-v1');
  });

  it('E — keep_mine: server adopts the local payload at rev + 1 (sanctioned override)', async () => {
    const { id, syncLogId } = await forceEscalation('server-v1');

    const res = await resolveConflict(syncLogId, 'keep_mine');
    expect(res.statusCode).toBe(200);
    const out = JSON.parse(res.body);
    expect(out.error).toBeNull();
    expect(out.data.recordId).toBe(id);
    expect(out.data.rev).toBe(2);
    expect(out.data.resolutionStatus).toBe('resolved');

    const [log] = await probeSql<{ resolution_status: string }[]>`
      SELECT resolution_status FROM sync_log WHERE id = ${syncLogId}
    `;
    expect(log!.resolution_status).toBe('resolved');

    const stillFailed = await probeSql<{ id: string }[]>`
      SELECT id FROM failed_records WHERE sync_log_id = ${syncLogId}
    `;
    expect(stillFailed).toHaveLength(0);

    // The steward's local summary is now authoritative, force-written at rev + 1.
    const [rec] = await probeSql<{ rev: string; summary: string }[]>`
      SELECT rev, summary FROM olos_observation_records WHERE id = ${id}
    `;
    expect(Number(rec!.rev)).toBe(2);
    expect(rec!.summary).toBe('local-newer');
  });
});
