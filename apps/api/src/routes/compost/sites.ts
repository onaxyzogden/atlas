/**
 * Compost site routes — CRUD on compost_sites under /api/v1/compost/sites.
 *
 * A site is a pinned location (single Point, not a parcel polygon) hosting one
 * or more piles. Org-scoped + owned; authorization runs through the org
 * membership helpers in lib/compostAccess.ts (NOT resolveProjectRole — compost
 * has no project row). Geometry is WGS84 (SRID 4326); the API speaks
 * {latitude, longitude} and stores a PostGIS Point.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CompostSitePointSchema } from '@ogden/shared';
import {
  requireOrgMember,
  requireOrgWriter,
  requireOrgOwnerOrResourceOwner,
  getSiteContext,
} from '../../lib/compostAccess.js';

const ParamsSiteId = z.object({ siteId: z.string().uuid() });

const ListQuery = z.object({
  orgId: z.string().uuid(),
});

const SiteCreateInput = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1),
  label: z.string().optional(),
  location: CompostSitePointSchema.nullish(),
  address: z.string().optional(),
});

const SitePatchInput = z.object({
  name: z.string().min(1).optional(),
  label: z.string().nullish(),
  location: CompostSitePointSchema.nullish(),
  address: z.string().nullish(),
});

type Row = Record<string, unknown>;

function mapRow(row: Row) {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    ownerId: (row.owner_id ?? null) as string | null,
    name: row.name as string,
    label: (row.label ?? null) as string | null,
    location:
      row.latitude == null
        ? null
        : { latitude: Number(row.latitude), longitude: Number(row.longitude) },
    address: (row.address ?? null) as string | null,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

export default async function compostSiteRoutes(fastify: FastifyInstance) {
  const { db, authenticate } = fastify;

  // GET /sites?orgId= — list an org's sites
  fastify.get('/sites', { preHandler: [authenticate] }, async (req) => {
    const q = ListQuery.parse(req.query);
    await requireOrgMember(db, q.orgId, req.userId);
    const rows = await db`
      SELECT *, ST_Y(location) AS latitude, ST_X(location) AS longitude
      FROM compost_sites
      WHERE org_id = ${q.orgId}
      ORDER BY name
    `;
    return { data: rows.map(mapRow), meta: { total: rows.length }, error: null };
  });

  // POST /sites — create
  fastify.post('/sites', { preHandler: [authenticate] }, async (req, reply) => {
    const body = SiteCreateInput.parse(req.body);
    await requireOrgWriter(db, body.orgId, req.userId);

    const locationExpr = body.location
      ? db`ST_SetSRID(ST_MakePoint(${body.location.longitude}, ${body.location.latitude}), 4326)`
      : db`NULL`;

    const [row] = await db`
      INSERT INTO compost_sites (org_id, owner_id, name, label, location, address)
      VALUES (
        ${body.orgId},
        ${req.userId},
        ${body.name},
        ${body.label ?? null},
        ${locationExpr},
        ${body.address ?? null}
      )
      RETURNING *, ST_Y(location) AS latitude, ST_X(location) AS longitude
    `;

    reply.code(201);
    return { data: mapRow(row as Row), meta: undefined, error: null };
  });

  // GET /sites/:siteId
  fastify.get<{ Params: { siteId: string } }>(
    '/sites/:siteId',
    { preHandler: [authenticate] },
    async (req) => {
      const { siteId } = ParamsSiteId.parse(req.params);
      const { orgId } = await getSiteContext(db, siteId);
      await requireOrgMember(db, orgId, req.userId);
      const [row] = await db`
        SELECT *, ST_Y(location) AS latitude, ST_X(location) AS longitude
        FROM compost_sites WHERE id = ${siteId}
      `;
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // PATCH /sites/:siteId
  fastify.patch<{ Params: { siteId: string } }>(
    '/sites/:siteId',
    { preHandler: [authenticate] },
    async (req) => {
      const { siteId } = ParamsSiteId.parse(req.params);
      const body = SitePatchInput.parse(req.body);
      const { orgId } = await getSiteContext(db, siteId);
      await requireOrgWriter(db, orgId, req.userId);

      const locationPatch =
        body.location === undefined
          ? db`location`
          : body.location === null
            ? db`NULL`
            : db`ST_SetSRID(ST_MakePoint(${body.location.longitude}, ${body.location.latitude}), 4326)`;

      const [row] = await db`
        UPDATE compost_sites SET
          name     = COALESCE(${body.name ?? null}, name),
          label    = ${body.label === undefined ? db`label` : (body.label ?? null)},
          location = ${locationPatch},
          address  = ${body.address === undefined ? db`address` : (body.address ?? null)},
          updated_at = now()
        WHERE id = ${siteId}
        RETURNING *, ST_Y(location) AS latitude, ST_X(location) AS longitude
      `;
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // DELETE /sites/:siteId — cascades to piles + readings (FK ON DELETE CASCADE)
  fastify.delete<{ Params: { siteId: string } }>(
    '/sites/:siteId',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const { siteId } = ParamsSiteId.parse(req.params);
      const { orgId, ownerId } = await getSiteContext(db, siteId);
      await requireOrgOwnerOrResourceOwner(db, orgId, req.userId, ownerId);
      await db`DELETE FROM compost_sites WHERE id = ${siteId}`;
      reply.code(204);
      return '';
    },
  );
}
