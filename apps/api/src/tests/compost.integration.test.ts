/**
 * Compost vertical — route → real Postgres integration spec.
 *
 * Proves the Phase 2 gate: full Site → Pile → Reading CRUD works under a real
 * user/org, and the org-membership RBAC actually gates (the land-use routes use
 * resolveProjectRole; compost has no project row, so it gates on
 * organization_members via lib/compostAccess.ts — this spec is what proves that
 * substitution holds end-to-end).
 *
 * Auto-skips when no live DB is reachable (mirrors actRecords.integration).
 * Apply migration 051 first: `pnpm --filter @ogden/api migrate`.
 *
 * Cases:
 *   A — CRUD:      owner creates a site, a pile under it, two readings; the
 *                  readings list returns them as an ascending curve; PATCH a
 *                  pile status; the SELECTs prove persistence.
 *   B — read RBAC: a stranger (member of no shared org) gets 403 on the site;
 *                  a viewer-role member of the org gets 200 (read is open to
 *                  any member).
 *   C — write RBAC:the viewer-role member is refused (403) on POST reading and
 *                  on DELETE; the owner's delete cascades site → pile → readings.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import postgres from 'postgres';

const INTEGRATION_DATABASE_URL =
  process.env['INTEGRATION_DATABASE_URL'] ??
  'postgresql://ogden_app:ogden_dev_password@localhost:5432/ogden_atlas';

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
    `[compost.integration] SKIPPED — no live Postgres at ${INTEGRATION_DATABASE_URL}. ` +
      'Bring it up and run `pnpm --filter @ogden/api migrate` (migration 051) to run this spec.',
  );
}

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

const probeSql = postgres(INTEGRATION_DATABASE_URL, {
  max: 3,
  idle_timeout: 10,
  connect_timeout: 5,
  onnotice: () => {},
});

const RUN = Date.now();
const OWNER_EMAIL = `compost-it-owner-${RUN}@example.test`;
const VIEWER_EMAIL = `compost-it-viewer-${RUN}@example.test`;
const STRANGER_EMAIL = `compost-it-stranger-${RUN}@example.test`;

describe.skipIf(!dbReachable)('compost.integration (real Postgres)', () => {
  let app: FastifyInstance;
  let ownerToken: string;
  let ownerId: string;
  let orgId: string;
  let viewerToken: string;
  let viewerId: string;
  let strangerToken: string;

  let siteId: string;
  let pileId: string;

  async function register(email: string): Promise<{ token: string; id: string }> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'integration-pw-123', displayName: 'Compost IT' },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    return { token: body.data.token as string, id: body.data.user.id as string };
  }

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const owner = await register(OWNER_EMAIL);
    ownerToken = owner.token;
    ownerId = owner.id;

    const viewer = await register(VIEWER_EMAIL);
    viewerToken = viewer.token;
    viewerId = viewer.id;

    const stranger = await register(STRANGER_EMAIL);
    strangerToken = stranger.token;

    // Register auto-creates a personal org + owner-membership; resolve owner's.
    const [org] = await probeSql<{ org_id: string }[]>`
      SELECT org_id FROM organization_members WHERE user_id = ${ownerId} LIMIT 1
    `;
    orgId = org!.org_id;

    // Add the viewer to the owner's org as a read-only member.
    await probeSql`
      INSERT INTO organization_members (org_id, user_id, role)
      VALUES (${orgId}, ${viewerId}, 'viewer')
    `;
  });

  afterAll(async () => {
    // compost_sites FK ON DELETE CASCADE clears piles + readings; then orgs/users.
    await probeSql`DELETE FROM compost_sites WHERE org_id = ${orgId}`.catch(() => {});
    await probeSql`DELETE FROM users WHERE id IN (
      SELECT id FROM users WHERE email IN (${OWNER_EMAIL}, ${VIEWER_EMAIL}, ${STRANGER_EMAIL})
    )`.catch(() => {});
    await probeSql.end({ timeout: 5 }).catch(() => {});
    await app.close();
  });

  const auth = (token: string) => ({ authorization: `Bearer ${token}` });

  it('A — CRUD: owner creates site → pile → readings; the curve reads back ascending', async () => {
    const siteRes = await app.inject({
      method: 'POST',
      url: '/api/v1/compost/sites',
      headers: auth(ownerToken),
      payload: {
        orgId,
        name: 'Millbrook Compost Yard',
        location: { latitude: 41.51, longitude: -73.98 },
        address: 'Remote plot, Millbrook',
      },
    });
    expect(siteRes.statusCode).toBe(201);
    const site = JSON.parse(siteRes.body).data;
    expect(site.orgId).toBe(orgId);
    expect(site.ownerId).toBe(ownerId);
    expect(site.location.latitude).toBeCloseTo(41.51);
    expect(site.location.longitude).toBeCloseTo(-73.98);
    siteId = site.id;

    const pileRes = await app.inject({
      method: 'POST',
      url: `/api/v1/compost/sites/${siteId}/piles`,
      headers: auth(ownerToken),
      payload: {
        name: 'Batch 1 — Spring Build',
        status: 'building',
        dimensions: { lengthFt: 4, widthFt: 4, heightFt: 3 },
        targetCnRatio: 30,
        targetTempMinC: 55,
        targetTempMaxC: 71,
        recipeLayers: [
          { id: 'l1', type: 'brown', name: 'Dry straw', depth: '4 in', cnApprox: 80, status: 'complete' },
        ],
      },
    });
    expect(pileRes.statusCode).toBe(201);
    const pile = JSON.parse(pileRes.body).data;
    expect(pile.orgId).toBe(orgId); // inherited from the site
    expect(pile.siteId).toBe(siteId);
    expect(pile.dimensions.heightFt).toBe(3);
    expect(pile.recipeLayers).toHaveLength(1);
    pileId = pile.id;

    // Two readings, posted out of chronological order to prove the ORDER BY.
    const later = await app.inject({
      method: 'POST',
      url: `/api/v1/compost/piles/${pileId}/readings`,
      headers: auth(ownerToken),
      payload: { tempC: 64, turned: true, capturedAt: '2026-03-11T08:00:00.000Z' },
    });
    expect(later.statusCode).toBe(201);
    const earlier = await app.inject({
      method: 'POST',
      url: `/api/v1/compost/piles/${pileId}/readings`,
      headers: auth(ownerToken),
      payload: { tempC: 58.5, moisturePct: 55, capturedAt: '2026-03-09T08:00:00.000Z' },
    });
    expect(earlier.statusCode).toBe(201);
    expect(JSON.parse(earlier.body).data.source).toBe('manual');

    const list = await app.inject({
      method: 'GET',
      url: `/api/v1/compost/piles/${pileId}/readings`,
      headers: auth(ownerToken),
    });
    expect(list.statusCode).toBe(200);
    const curve = JSON.parse(list.body);
    expect(curve.meta.total).toBe(2);
    expect(curve.data.map((r: { tempC: number }) => r.tempC)).toEqual([58.5, 64]);
    expect(curve.data[0].capturedAt).toBe('2026-03-09T08:00:00.000Z');
    expect(curve.data[0].recordedBy).toBe(ownerId);

    // PATCH a pile field; the SELECT proves it persisted.
    const patch = await app.inject({
      method: 'PATCH',
      url: `/api/v1/compost/piles/${pileId}`,
      headers: auth(ownerToken),
      payload: { status: 'active' },
    });
    expect(patch.statusCode).toBe(200);
    expect(JSON.parse(patch.body).data.status).toBe('active');
    const [dbPile] = await probeSql<{ status: string }[]>`
      SELECT status FROM compost_piles WHERE id = ${pileId}
    `;
    expect(dbPile!.status).toBe('active');
  });

  it('B — read RBAC: stranger 403; viewer (org member) 200', async () => {
    const stranger = await app.inject({
      method: 'GET',
      url: `/api/v1/compost/sites/${siteId}`,
      headers: auth(strangerToken),
    });
    expect(stranger.statusCode).toBe(403);

    const viewer = await app.inject({
      method: 'GET',
      url: `/api/v1/compost/sites/${siteId}`,
      headers: auth(viewerToken),
    });
    expect(viewer.statusCode).toBe(200);
    expect(JSON.parse(viewer.body).data.id).toBe(siteId);
  });

  it('C — write RBAC: viewer refused POST + DELETE; owner delete cascades', async () => {
    const viewerWrite = await app.inject({
      method: 'POST',
      url: `/api/v1/compost/piles/${pileId}/readings`,
      headers: auth(viewerToken),
      payload: { tempC: 70 },
    });
    expect(viewerWrite.statusCode).toBe(403);

    const viewerDelete = await app.inject({
      method: 'DELETE',
      url: `/api/v1/compost/sites/${siteId}`,
      headers: auth(viewerToken),
    });
    expect(viewerDelete.statusCode).toBe(403);

    const ownerDelete = await app.inject({
      method: 'DELETE',
      url: `/api/v1/compost/sites/${siteId}`,
      headers: auth(ownerToken),
    });
    expect(ownerDelete.statusCode).toBe(204);

    // CASCADE: the pile and its readings are gone with the site.
    const piles = await probeSql`SELECT id FROM compost_piles WHERE id = ${pileId}`;
    expect(piles).toHaveLength(0);
    const readings = await probeSql`SELECT id FROM compost_readings WHERE pile_id = ${pileId}`;
    expect(readings).toHaveLength(0);
  });
});
