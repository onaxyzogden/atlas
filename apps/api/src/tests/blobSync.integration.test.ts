/**
 * Phase 5.7 — automatable subset of the multi-device A→B matrix.
 *
 * The true two-device matrix is a human-operator action (two browser
 * profiles, observed conflict bar / toast / undo) and cannot run from CI.
 * Its *mechanical core* — route → real Postgres round-trip, cross-project
 * isolation, and the ON CONFLICT rev gate — IS automatable, and that is
 * exactly the fidelity the FIFO mock-DB harness (helpers/testApp.ts, which
 * ignores SQL params) cannot provide. This spec closes that gap against a
 * live Postgres.
 *
 * Auto-skips when no live DB is reachable so the mock-DB unit gate is never
 * broken. Point it at a DB with `INTEGRATION_DATABASE_URL`; default targets
 * the infrastructure/docker-compose.yml dev database.
 *
 * Cases (automatable equivalents of the matrix steps):
 *   A — shadow:    PUT a brand-new (project, storeKey) at baseRev 0 → 200,
 *                  rev===1, and a direct SELECT proves the row physically
 *                  persisted under the right (project_id, store_key).
 *   B — restore +  Two store keys under project P1 + one under P2 (same
 *       isolation:  owner); GET /project/P1 returns exactly P1's two blobs,
 *                  P2's blob absent (the P0-1 cross-project read invariant).
 *   C — conflict,  Re-PUT P1's key at a stale baseRev → 409 with
 *       no clobber: {serverRev, serverPayload}; a follow-up GET proves the
 *                  server copy is unchanged; a PUT at the correct baseRev
 *                  then succeeds and bumps rev (recovery path).
 *
 * No new product code, no new deps — real buildApp, real app.jwt via the
 * /auth/register route, real @ogden/shared Zod, real requireRole.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import postgres from 'postgres';

const INTEGRATION_DATABASE_URL =
  process.env['INTEGRATION_DATABASE_URL'] ??
  'postgresql://ogden_app:ogden_dev_password@localhost:5432/ogden_atlas';

// ─── Live-DB probe (synchronous skip decision) ────────────────────────────────
// postgres() is lazy, so constructing the client never throws even with the
// DB down; the SELECT 1 is what proves reachability.
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
    `[blobSync.integration] SKIPPED — no live Postgres at ${INTEGRATION_DATABASE_URL}. ` +
      'Bring it up with `cd infrastructure && docker compose up -d` then ' +
      '`pnpm --filter @ogden/api migrate` to run this spec.',
  );
}

// The route's db is the *plugin's* client. Mock the database plugin to
// decorate a REAL postgres client at the integration URL (mirrors the
// projectState.test.ts mock structure, swapping the FIFO for a live pool).
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

// A second, independent pool for direct fixture setup, assertion SELECTs,
// and teardown — kept separate from the route's plugin pool on purpose.
const probeSql = postgres(INTEGRATION_DATABASE_URL, {
  max: 3,
  idle_timeout: 10,
  connect_timeout: 5,
  onnotice: () => {},
});

const RUN = Date.now();
const EMAIL = `blobsync-it-${RUN}@example.test`;

describe.skipIf(!dbReachable)('blobSync.integration (real Postgres)', () => {
  let app: FastifyInstance;
  let token: string;
  let userId: string;
  let p1: string;
  let p2: string;

  const VEG = { headline: 'A regenerative oasis', items: [1, 2, 3] };
  const HAZ = { items: [{ kind: 'flood', severity: 'low' }] };
  const P2_VEG = { headline: 'second project, must not leak' };

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const reg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: EMAIL, password: 'integration-pw-123', displayName: 'Blob IT' },
    });
    expect(reg.statusCode).toBe(201);
    const regBody = JSON.parse(reg.body);
    token = regBody.data.token as string;
    userId = regBody.data.user.id as string;

    const [r1] = await probeSql<{ id: string }[]>`
      INSERT INTO projects (owner_id, name) VALUES (${userId}, ${'Blob IT P1'})
      RETURNING id
    `;
    const [r2] = await probeSql<{ id: string }[]>`
      INSERT INTO projects (owner_id, name) VALUES (${userId}, ${'Blob IT P2'})
      RETURNING id
    `;
    p1 = r1!.id;
    p2 = r2!.id;
  });

  afterAll(async () => {
    // ON DELETE CASCADE clears project_state_blobs; users last.
    await probeSql`DELETE FROM projects WHERE owner_id = ${userId}`.catch(() => {});
    await probeSql`DELETE FROM users WHERE id = ${userId}`.catch(() => {});
    await probeSql.end({ timeout: 5 }).catch(() => {});
    await app.close();
  });

  function put(project: string, storeKey: string, baseRev: number, payload: unknown) {
    return app.inject({
      method: 'PUT',
      url: `/api/v1/project-state/project/${project}/${storeKey}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { envelopeSchema: 1, schemaVersion: 2, baseRev, payload },
    });
  }

  it('A — shadow: first write at baseRev 0 persists physically (rev 1)', async () => {
    const res = await put(p1, 'ogden-vision', 0, VEG);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.error).toBeNull();
    expect(body.data.rev).toBe(1);

    // The assertion the FIFO mock cannot make: the row really landed under
    // the right (project_id, store_key) with the exact payload.
    const rows = await probeSql<{ payload: unknown; rev: string }[]>`
      SELECT payload, rev FROM project_state_blobs
      WHERE project_id = ${p1} AND store_key = ${'ogden-vision'}
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.payload).toEqual(VEG);
    expect(Number(rows[0]!.rev)).toBe(1);
  });

  it('B — restore + isolation: GET /project/P1 returns only P1 blobs', async () => {
    expect((await put(p1, 'ogden-hazards', 0, HAZ)).statusCode).toBe(200);
    expect((await put(p2, 'ogden-vision', 0, P2_VEG)).statusCode).toBe(200);

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/project-state/project/${p1}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const byKey = Object.fromEntries(
      body.data.map((b: { storeKey: string; payload: unknown }) => [b.storeKey, b.payload]),
    );
    // Exactly P1's two stores — P2's blob must not leak across projects.
    expect(Object.keys(byKey).sort()).toEqual(['ogden-hazards', 'ogden-vision']);
    expect(byKey['ogden-vision']).toEqual(VEG);
    expect(byKey['ogden-hazards']).toEqual(HAZ);
    expect(body.data.every((b: { projectId: string }) => b.projectId === p1)).toBe(true);
  });

  it('C — conflict: stale baseRev → 409, no clobber, then recovery bumps rev', async () => {
    // Server rev for P1/ogden-vision is 1 (from case A). A baseRev:0 write
    // is stale → 409 with the authoritative state.
    const stale = await put(p1, 'ogden-vision', 0, { clobbered: true });
    expect(stale.statusCode).toBe(409);
    const conflict = JSON.parse(stale.body);
    expect(conflict.error.code).toBe('CONFLICT');
    expect(conflict.error.details.serverRev).toBe(1);
    expect(conflict.error.details.serverPayload).toEqual(VEG);

    // No clobber: the server copy is byte-for-byte unchanged.
    const after = await app.inject({
      method: 'GET',
      url: `/api/v1/project-state/project/${p1}/ogden-vision`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(after.statusCode).toBe(200);
    const afterBody = JSON.parse(after.body);
    expect(afterBody.data.rev).toBe(1);
    expect(afterBody.data.payload).toEqual(VEG);

    // Recovery: a write at the correct baseRev succeeds and bumps rev.
    const recovered = await put(p1, 'ogden-vision', 1, { headline: 'updated' });
    expect(recovered.statusCode).toBe(200);
    expect(JSON.parse(recovered.body).data.rev).toBe(2);
  });
});
