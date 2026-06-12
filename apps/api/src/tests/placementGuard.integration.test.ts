/**
 * Placement guard (Phase 4) — route → real PostGIS.
 *
 * The geometric core the FIFO mock cannot reproduce: real
 * ST_DWithin(geography) metre math, ST_Covers boundary containment, and the
 * bulk transaction rollback. Plan gate: seed a septic, POST a well at ~20 m
 * → 409 PLACEMENT_VIOLATION, at ~40 m → 201, against the NATIVE
 * postgresql-x64-17 on localhost:5432 (not the stale docker container).
 *
 * Auto-skips when no live DB is reachable so the mock-DB unit gate is never
 * broken. Point it elsewhere with `INTEGRATION_DATABASE_URL`.
 *
 * Cases (PLACEMENT_GUARD_MODE mutated to 'enforce' at runtime):
 *   A — separation:  POST well_pump 20 m from the seeded septic → 409 with
 *                    ruleId well-septic-separation; nothing persisted.
 *   B — clean:       POST well_pump 40 m away → 201; row exists in PG.
 *   C — boundary:    POST a structure outside parcel_boundary → 409 with
 *                    ruleId boundary-containment.
 *   D — PATCH:       move the clean well to 20 m → 409; a direct SELECT
 *                    proves the stored geometry did not move; move to ~60 m
 *                    → 200.
 *   E — bulk:        a batch whose 2nd feature violates → 409 and the whole
 *                    batch rolls back (1st feature absent too).
 *   F — log mode:    the violating 20 m well is accepted (201) when the mode
 *                    is the default 'log' — legacy-sync safety. Runs LAST so
 *                    the extra well cannot perturb earlier cases.
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
    `[placementGuard.integration] SKIPPED — no live Postgres at ${INTEGRATION_DATABASE_URL}. ` +
      'This box runs the native postgresql-x64-17 service on 5432.',
  );
}

// The route's db is the *plugin's* client. Mock the database plugin to decorate
// a REAL postgres client at the integration URL (mirrors actRecords.integration).
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
const { config } = await import('../lib/config.js');

type GuardMode = 'off' | 'log' | 'enforce';
const setMode = (mode: GuardMode) => {
  (config as { PLACEMENT_GUARD_MODE: GuardMode }).PLACEMENT_GUARD_MODE = mode;
};
const ORIGINAL_MODE = config.PLACEMENT_GUARD_MODE;

// Independent pool for fixture setup, assertion SELECTs, and teardown.
const probeSql = postgres(INTEGRATION_DATABASE_URL, {
  max: 3,
  idle_timeout: 10,
  connect_timeout: 5,
  onnotice: () => {},
});

const RUN = Date.now();
const EMAIL = `placementguard-it-${RUN}@example.test`;

// ─── Geometry fixtures ────────────────────────────────────────────────────────
// 1° of latitude ≈ 111,132 m at 40°N, so Δlat 0.00018 ≈ 20.0 m and
// 0.00036 ≈ 40.0 m — comfortably either side of the 30 m
// well-septic-separation threshold (ST_DWithin on geography = real metres).
const SEPTIC = { type: 'Point', coordinates: [-80.0, 40.0] };
const WELL_20M = { type: 'Point', coordinates: [-80.0, 40.00018] };
const WELL_40M = { type: 'Point', coordinates: [-80.0, 40.00036] };
const WELL_60M = { type: 'Point', coordinates: [-80.0, 40.00054] };
const OUTSIDE_BOUNDARY = { type: 'Point', coordinates: [-80.5, 40.0] };

// Generous parcel around the test cluster: ±0.01° (~1 km).
const BOUNDARY = {
  type: 'Polygon',
  coordinates: [[
    [-80.01, 39.99],
    [-79.99, 39.99],
    [-79.99, 40.01],
    [-80.01, 40.01],
    [-80.01, 39.99],
  ]],
};

describe.skipIf(!dbReachable)('placementGuard.integration (real PostGIS)', () => {
  let app: FastifyInstance;
  let token: string;
  let userId: string;
  let projectId: string;
  let cleanWellId: string;

  beforeAll(async () => {
    setMode('enforce');
    app = await buildApp();
    await app.ready();

    const reg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: EMAIL, password: 'integration-pw-123', displayName: 'Placement IT' },
    });
    expect(reg.statusCode).toBe(201);
    const regBody = JSON.parse(reg.body);
    token = regBody.data.token as string;
    userId = regBody.data.user.id as string;

    // projects.org_id is NOT NULL (migration 036); register auto-creates a
    // personal org + owner-membership.
    const [org] = await probeSql<{ org_id: string }[]>`
      SELECT org_id FROM organization_members WHERE user_id = ${userId} LIMIT 1
    `;
    const orgId = org!.org_id;

    // parcel_boundary is geometry(MultiPolygon, 4326) — ST_Multi the polygon.
    const [proj] = await probeSql<{ id: string }[]>`
      INSERT INTO projects (owner_id, org_id, name, parcel_boundary)
      VALUES (
        ${userId}, ${orgId}, ${'Placement IT'},
        ST_Multi(ST_GeomFromGeoJSON(${JSON.stringify(BOUNDARY)}))
      )
      RETURNING id
    `;
    projectId = proj!.id;

    // Seed the septic directly (bypasses the guard — fixture, not behaviour).
    await probeSql`
      INSERT INTO design_features (project_id, feature_type, subtype, geometry, label, created_by)
      VALUES (
        ${projectId}, ${'point'}, ${'septic'},
        ST_GeomFromGeoJSON(${JSON.stringify(SEPTIC)}), ${'Septic IT'}, ${userId}
      )
    `;
  });

  afterAll(async () => {
    setMode(ORIGINAL_MODE);
    // design_features FK is ON DELETE CASCADE; users last.
    await probeSql`DELETE FROM projects WHERE owner_id = ${userId}`.catch(() => {});
    await probeSql`DELETE FROM users WHERE id = ${userId}`.catch(() => {});
    await probeSql.end({ timeout: 5 }).catch(() => {});
    await app.close();
  });

  function postFeature(payload: Record<string, unknown>) {
    return app.inject({
      method: 'POST',
      url: `/api/v1/design-features/project/${projectId}`,
      headers: { authorization: `Bearer ${token}` },
      payload,
    });
  }

  const wellPayload = (geometry: unknown, label: string) => ({
    featureType: 'point',
    subtype: 'well_pump',
    geometry,
    label,
  });

  it('A — 409 when a well lands ~20 m from the seeded septic (30 m rule, real geography)', async () => {
    const res = await postFeature(wellPayload(WELL_20M, 'Well 20m'));

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('PLACEMENT_VIOLATION');
    expect(
      body.error.details.violations.map((v: { ruleId: string }) => v.ruleId),
    ).toContain('well-septic-separation');

    const rows = await probeSql`
      SELECT id FROM design_features WHERE project_id = ${projectId} AND label = ${'Well 20m'}
    `;
    expect(rows.length).toBe(0);
  });

  it('B — 201 when the well sits ~40 m away (outside the 30 m threshold)', async () => {
    const res = await postFeature(wellPayload(WELL_40M, 'Well 40m'));

    expect(res.statusCode).toBe(201);
    cleanWellId = JSON.parse(res.body).data.id as string;

    const rows = await probeSql`
      SELECT id FROM design_features WHERE id = ${cleanWellId}
    `;
    expect(rows.length).toBe(1);
  });

  it('C — 409 boundary-containment when placed outside parcel_boundary', async () => {
    const res = await postFeature({
      featureType: 'structure',
      subtype: 'barn',
      geometry: OUTSIDE_BOUNDARY,
      label: 'Barn outside',
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(
      body.error.details.violations.map((v: { ruleId: string }) => v.ruleId),
    ).toContain('boundary-containment');
  });

  it('D — PATCH moving the clean well to ~20 m is rejected and the row does not move', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/design-features/${cleanWellId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { geometry: WELL_20M },
    });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error.code).toBe('PLACEMENT_VIOLATION');

    const [row] = await probeSql<{ geom: string }[]>`
      SELECT ST_AsGeoJSON(geometry) AS geom FROM design_features WHERE id = ${cleanWellId}
    `;
    const stored = JSON.parse(row!.geom) as { coordinates: [number, number] };
    expect(stored.coordinates[1]).toBeCloseTo(WELL_40M.coordinates[1]!, 8);

    const ok = await app.inject({
      method: 'PATCH',
      url: `/api/v1/design-features/${cleanWellId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { geometry: WELL_60M },
    });
    // eslint-disable-next-line no-console
    if (ok.statusCode !== 200) console.error('D second PATCH body:', ok.body);
    expect(ok.statusCode).toBe(200);
  });

  it('E — a bulk batch with one violating feature rolls back entirely', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/design-features/project/${projectId}/bulk`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        features: [
          { featureType: 'path', subtype: 'trail', geometry: {
            type: 'LineString',
            coordinates: [[-80.001, 40.001], [-80.002, 40.002]],
          }, label: 'Bulk trail' },
          wellPayload(WELL_20M, 'Bulk well 20m'),
        ],
      },
    });

    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error.code).toBe('PLACEMENT_VIOLATION');

    const rows = await probeSql`
      SELECT label FROM design_features
      WHERE project_id = ${projectId} AND label IN (${'Bulk trail'}, ${'Bulk well 20m'})
    `;
    expect(rows.length).toBe(0);
  });

  it('F — log mode (the default) accepts the violating well: legacy sync never bricks', async () => {
    setMode('log');
    try {
      const res = await postFeature(wellPayload(WELL_20M, 'Log-mode well'));
      expect(res.statusCode).toBe(201);
    } finally {
      setMode('enforce');
    }
  });
});
