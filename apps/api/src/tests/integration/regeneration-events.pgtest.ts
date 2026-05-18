/**
 * regeneration-events.pgtest.ts — locks the SRID-4326 geometry round-trip
 * (ST_SetSRID(ST_GeomFromGeoJSON,4326) → ST_AsGeoJSON::jsonb) and the real
 * ownership-join authorization (author-or-owner mutation guard + member-role
 * resolution). None of this is reproducible against a FIFO queue mock.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type postgres from 'postgres';
import { INTEGRATION_ENABLED, getHarness, resetDb, closeHarness } from './harness.js';
import { seedUser, seedProject, seedProjectMember, signToken } from './fixtures.js';

const LOCATION = { type: 'Point' as const, coordinates: [-100.5, 45.25] };

describe.skipIf(!INTEGRATION_ENABLED)('regeneration-events (real PostGIS + RBAC)', () => {
  let app: FastifyInstance;
  let sql: postgres.Sql;

  beforeAll(async () => { ({ app, sql } = await getHarness()); await resetDb(sql); });
  afterEach(async () => { await resetDb(sql); });
  afterAll(async () => { await closeHarness(); });

  it('round-trips SRID-4326 geometry and enforces author-or-owner', async () => {
    const ownerId = await seedUser(sql);
    const designerId = await seedUser(sql);
    const strangerId = await seedUser(sql);
    const projectId = await seedProject(sql, ownerId);
    await seedProjectMember(sql, projectId, designerId, 'designer');

    const designerTok = signToken(app, designerId);
    const ownerTok = signToken(app, ownerId);
    const strangerTok = signToken(app, strangerId);

    // Designer (project member) creates an event with geometry.
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/regeneration-events`,
      headers: { authorization: `Bearer ${designerTok}` },
      payload: {
        eventType: 'observation',
        title: 'Soil probe A',
        eventDate: '2026-05-17',
        location: LOCATION,
      },
    });
    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.body).data;
    expect(created.location).toEqual(LOCATION); // SRID round-trip

    // GET back — geometry deep-equals through ST_AsGeoJSON::jsonb.
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/regeneration-events`,
      headers: { authorization: `Bearer ${ownerTok}` },
    });
    expect(listRes.statusCode).toBe(200);
    const list = JSON.parse(listRes.body).data;
    expect(list).toHaveLength(1);
    expect(list[0].location).toEqual(LOCATION);

    // Project owner (NOT the author) may PATCH — real owner-shortcut path.
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${projectId}/regeneration-events/${created.id}`,
      headers: { authorization: `Bearer ${ownerTok}` },
      payload: { title: 'Soil probe A (edited)' },
    });
    expect(patchRes.statusCode).toBe(200);
    expect(JSON.parse(patchRes.body).data.title).toBe('Soil probe A (edited)');

    // Unrelated user — resolveProjectRole join finds no membership → 403.
    const strangerRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${projectId}/regeneration-events/${created.id}`,
      headers: { authorization: `Bearer ${strangerTok}` },
      payload: { title: 'hijack' },
    });
    expect(strangerRes.statusCode).toBe(403);
  });
});
