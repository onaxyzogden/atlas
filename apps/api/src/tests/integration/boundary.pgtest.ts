/**
 * boundary.pgtest.ts — locks the geodetic acreage math + geometry round-trip
 * that a FIFO queue mock cannot reproduce.
 *
 * POST /api/v1/projects/:id/boundary computes
 *   acreage = ST_Area(geom::geography) / 4046.86
 * i.e. true geodesic m² → acres. A planar mock would return a
 * degrees²-scaled number off by ~10 orders of magnitude. We assert the
 * route's acreage equals an INDEPENDENTLY recomputed ST_Area::geography,
 * that the stored geometry is MultiPolygon, GeoJSON round-trips, and the
 * centroid lies inside the polygon.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type postgres from 'postgres';
import { INTEGRATION_ENABLED, getHarness, resetDb, closeHarness } from './harness.js';
import { seedUser, seedProject, signToken } from './fixtures.js';

// ~1 km square near lat 45°, lon -100° (closed ring).
const RING: [number, number][] = [
  [-100.0, 45.0],
  [-99.99, 45.0],
  [-99.99, 45.01],
  [-100.0, 45.01],
  [-100.0, 45.0],
];
const SQUARE = { type: 'Polygon' as const, coordinates: [RING] };

describe.skipIf(!INTEGRATION_ENABLED)('POST /projects/:id/boundary (real PostGIS)', () => {
  let app: FastifyInstance;
  let sql: postgres.Sql;

  beforeAll(async () => {
    ({ app, sql } = await getHarness());
    await resetDb(sql);
  });
  afterEach(async () => { await resetDb(sql); });
  afterAll(async () => { await closeHarness(); });

  it('writes geodesic acreage and a MultiPolygon that round-trips', async () => {
    const ownerId = await seedUser(sql);
    const projectId = await seedProject(sql, ownerId, { name: 'Boundary Proj' });
    const token = signToken(app, ownerId);

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/boundary`,
      headers: { authorization: `Bearer ${token}` },
      payload: { geojson: SQUARE },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const acreage: number = body.data.acreage;

    // Sanity magnitude: a ~1 km² parcel ≈ 200+ acres. A planar mock would
    // yield ~1e-8 here — this bound alone catches the divergence class.
    expect(acreage).toBeGreaterThan(150);
    expect(acreage).toBeLessThan(350);

    // Independent recomputation straight from PostGIS.
    const [check] = await sql<{
      a: number; gtype: string; gj: { type: string }; inside: boolean;
    }[]>`
      SELECT
        ST_Area(parcel_boundary::geography) / 4046.86            AS a,
        ST_GeometryType(parcel_boundary)                          AS gtype,
        ST_AsGeoJSON(parcel_boundary)::jsonb                      AS gj,
        ST_Contains(parcel_boundary, centroid)                    AS inside
      FROM projects WHERE id = ${projectId}
    `;

    expect(check!.gtype).toBe('ST_MultiPolygon');
    expect(check!.gj.type).toBe('MultiPolygon');
    expect(check!.inside).toBe(true);
    // Route value must equal the independent geodesic computation.
    expect(acreage).toBeCloseTo(check!.a, 4);
  });
});
