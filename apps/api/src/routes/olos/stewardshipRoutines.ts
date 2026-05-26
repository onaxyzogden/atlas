/**
 * OLOS StewardshipRoutine routes — CRUD on olos_stewardship_routines under
 * /api/v1/projects/:id/olos/stewardship-routines.
 *
 * Routines are the cadenced, recurring work that keeps a Domain healthy
 * after Act tasks complete. Each routine binds to a project + domain +
 * optional location and references the checklist items it cycles through.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  StewardshipFrequency,
  StewardshipMonitoringRequirementSchema,
  UniversalDomain,
  GeoJSONGeometrySchema,
} from '@ogden/shared';
import { NotFoundError } from '../../lib/errors.js';
import { logActivity } from '../../lib/activityLog.js';

const ParamsRecordId = z.object({
  id: z.string().uuid(),
  recordId: z.string().uuid(),
});

const ListQuery = z.object({
  domainId: UniversalDomain.optional(),
  frequency: StewardshipFrequency.optional(),
});

const RoutineCreateInput = z.object({
  domainId: UniversalDomain,
  title: z.string().min(1),
  locationGeometry: GeoJSONGeometrySchema.nullish(),
  frequency: StewardshipFrequency,
  stewardRoleId: z.string().nullish(),
  checklistItemIds: z.array(z.string()).default([]),
  monitoringRequirements: z
    .array(StewardshipMonitoringRequirementSchema)
    .default([]),
  reviewCycle: z.string().nullish(),
});

const RoutinePatchInput = RoutineCreateInput.partial();

type Row = Record<string, unknown>;

function mapRow(row: Row) {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    domainId: row.domain_id as string,
    title: row.title as string,
    locationGeometry: row.location_geojson ?? null,
    frequency: row.frequency as string,
    stewardRoleId: (row.steward_role_id ?? null) as string | null,
    checklistItemIds: (row.checklist_item_ids ?? []) as string[],
    monitoringRequirements: (row.monitoring_requirements ?? []) as unknown[],
    reviewCycle: (row.review_cycle ?? null) as string | null,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

export default async function olosStewardshipRoutineRoutes(
  fastify: FastifyInstance,
) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  // GET /:id/olos/stewardship-routines
  fastify.get<{ Params: { id: string }; Querystring: Record<string, string> }>(
    '/:id/olos/stewardship-routines',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer', 'reviewer', 'viewer'),
      ],
    },
    async (req) => {
      const q = ListQuery.parse(req.query);
      const rows = await db`
        SELECT r.*, ST_AsGeoJSON(r.location_geometry)::jsonb AS location_geojson
        FROM olos_stewardship_routines r
        WHERE r.project_id = ${req.projectId}
          AND (${q.domainId ?? null}::text  IS NULL OR r.domain_id  = ${q.domainId ?? null})
          AND (${q.frequency ?? null}::text IS NULL OR r.frequency  = ${q.frequency ?? null})
        ORDER BY r.created_at DESC
      `;
      return {
        data: rows.map(mapRow),
        meta: { total: rows.length },
        error: null,
      };
    },
  );

  // POST /:id/olos/stewardship-routines
  fastify.post<{ Params: { id: string } }>(
    '/:id/olos/stewardship-routines',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer'),
      ],
    },
    async (req, reply) => {
      const body = RoutineCreateInput.parse(req.body);

      const locationExpr = body.locationGeometry
        ? db`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(body.locationGeometry)}), 4326)`
        : db`NULL`;

      const [row] = await db`
        INSERT INTO olos_stewardship_routines (
          project_id, domain_id,
          title, location_geometry,
          frequency, steward_role_id,
          checklist_item_ids, monitoring_requirements,
          review_cycle
        ) VALUES (
          ${req.projectId},
          ${body.domainId},
          ${body.title},
          ${locationExpr},
          ${body.frequency},
          ${body.stewardRoleId ?? null},
          ${body.checklistItemIds},
          ${db.json(body.monitoringRequirements as never)},
          ${body.reviewCycle ?? null}
        )
        RETURNING *, ST_AsGeoJSON(location_geometry)::jsonb AS location_geojson
      `;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_stewardship_routine_created',
        entityType: 'olos_stewardship_routine',
        entityId: row!.id as string,
        metadata: { domainId: body.domainId, frequency: body.frequency },
      });

      reply.code(201);
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // GET /:id/olos/stewardship-routines/:recordId
  fastify.get<{ Params: { id: string; recordId: string } }>(
    '/:id/olos/stewardship-routines/:recordId',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer', 'reviewer', 'viewer'),
      ],
    },
    async (req) => {
      const { recordId } = ParamsRecordId.parse(req.params);
      const [row] = await db`
        SELECT r.*, ST_AsGeoJSON(r.location_geometry)::jsonb AS location_geojson
        FROM olos_stewardship_routines r
        WHERE r.id = ${recordId} AND r.project_id = ${req.projectId}
      `;
      if (!row) throw new NotFoundError('StewardshipRoutine', recordId);
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // PATCH /:id/olos/stewardship-routines/:recordId
  fastify.patch<{ Params: { id: string; recordId: string } }>(
    '/:id/olos/stewardship-routines/:recordId',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer'),
      ],
    },
    async (req) => {
      const { recordId } = ParamsRecordId.parse(req.params);
      const body = RoutinePatchInput.parse(req.body);

      const [existing] = await db`
        SELECT id FROM olos_stewardship_routines
        WHERE id = ${recordId} AND project_id = ${req.projectId}
      `;
      if (!existing) throw new NotFoundError('StewardshipRoutine', recordId);

      const locationPatch =
        body.locationGeometry === undefined
          ? db`location_geometry`
          : body.locationGeometry === null
            ? db`NULL`
            : db`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(body.locationGeometry)}), 4326)`;

      const [updated] = await db`
        UPDATE olos_stewardship_routines SET
          domain_id               = COALESCE(${body.domainId ?? null},   domain_id),
          title                   = COALESCE(${body.title ?? null},      title),
          location_geometry       = ${locationPatch},
          frequency               = COALESCE(${body.frequency ?? null},  frequency),
          steward_role_id         = ${body.stewardRoleId === undefined ? db`steward_role_id` : body.stewardRoleId ?? null},
          checklist_item_ids      = COALESCE(${body.checklistItemIds ?? null}, checklist_item_ids),
          monitoring_requirements = COALESCE(${body.monitoringRequirements ? db.json(body.monitoringRequirements as never) : null}, monitoring_requirements),
          review_cycle            = ${body.reviewCycle === undefined ? db`review_cycle` : body.reviewCycle ?? null},
          updated_at              = now()
        WHERE id = ${recordId}
        RETURNING *, ST_AsGeoJSON(location_geometry)::jsonb AS location_geojson
      `;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_stewardship_routine_updated',
        entityType: 'olos_stewardship_routine',
        entityId: recordId,
      });

      return { data: mapRow(updated as Row), meta: undefined, error: null };
    },
  );

  // DELETE /:id/olos/stewardship-routines/:recordId
  fastify.delete<{ Params: { id: string; recordId: string } }>(
    '/:id/olos/stewardship-routines/:recordId',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer'),
      ],
    },
    async (req, reply) => {
      const { recordId } = ParamsRecordId.parse(req.params);
      const [existing] = await db`
        SELECT id FROM olos_stewardship_routines
        WHERE id = ${recordId} AND project_id = ${req.projectId}
      `;
      if (!existing) throw new NotFoundError('StewardshipRoutine', recordId);

      await db`DELETE FROM olos_stewardship_routines WHERE id = ${recordId}`;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_stewardship_routine_deleted',
        entityType: 'olos_stewardship_routine',
        entityId: recordId,
      });

      reply.code(204);
      return '';
    },
  );
}
