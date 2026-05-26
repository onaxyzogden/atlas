/**
 * OLOS Observation record routes — CRUD on olos_observation_records under
 * /api/v1/projects/:id/olos/observations.
 *
 * Validation mirrors ObservationRecord in @ogden/shared (status enum,
 * evidence-ref shape). The status CHECK constraint in migration 043 is
 * the DB-side enforcement; the Zod parse below catches client errors
 * before they hit Postgres.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  ObserveStatus,
  ObservationEvidenceRefSchema,
  GeoJSONGeometrySchema,
} from '@ogden/shared';
import { NotFoundError } from '../../lib/errors.js';
import { logActivity } from '../../lib/activityLog.js';

const ParamsRecordId = z.object({
  id: z.string().uuid(),
  recordId: z.string().uuid(),
});

const ListQuery = z.object({
  objectiveId: z.string().optional(),
  status: ObserveStatus.optional(),
});

const ObservationCreateInput = z.object({
  objectiveId: z.string().min(1),
  status: ObserveStatus,
  summary: z.string().default(''),
  constraints: z.string().default(''),
  unknowns: z.string().default(''),
  flags: z.array(z.string()).default([]),
  evidenceRefs: z.array(ObservationEvidenceRefSchema).default([]),
  locationGeometry: GeoJSONGeometrySchema.nullish(),
  recommendedNextReview: z.string().datetime().nullish(),
});

const ObservationPatchInput = ObservationCreateInput.partial();

type Row = Record<string, unknown>;

function mapRow(row: Row) {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    objectiveId: row.objective_id as string,
    status: row.status as string,
    summary: row.summary as string,
    constraints: row.constraints as string,
    unknowns: row.unknowns as string,
    flags: (row.flags ?? []) as string[],
    evidenceRefs: (row.evidence_refs ?? []) as unknown[],
    locationGeometry: row.location_geojson ?? null,
    recordedBy: (row.recorded_by ?? null) as string | null,
    recordedAt: (row.recorded_at as Date).toISOString(),
    recommendedNextReview:
      row.recommended_next_review instanceof Date
        ? (row.recommended_next_review as Date).toISOString()
        : null,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

export default async function olosObservationRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  // GET /:id/olos/observations
  fastify.get<{ Params: { id: string }; Querystring: Record<string, string> }>(
    '/:id/olos/observations',
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
        FROM olos_observation_records r
        WHERE r.project_id = ${req.projectId}
          AND (${q.objectiveId ?? null}::text IS NULL OR r.objective_id = ${q.objectiveId ?? null})
          AND (${q.status ?? null}::text      IS NULL OR r.status       = ${q.status ?? null})
        ORDER BY r.recorded_at DESC
      `;
      return {
        data: rows.map(mapRow),
        meta: { total: rows.length },
        error: null,
      };
    },
  );

  // POST /:id/olos/observations
  fastify.post<{ Params: { id: string } }>(
    '/:id/olos/observations',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer'),
      ],
    },
    async (req, reply) => {
      const body = ObservationCreateInput.parse(req.body);

      const locationExpr = body.locationGeometry
        ? db`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(body.locationGeometry)}), 4326)`
        : db`NULL`;

      const [row] = await db`
        INSERT INTO olos_observation_records (
          project_id, objective_id, status,
          summary, constraints, unknowns, flags,
          evidence_refs, location_geometry,
          recorded_by, recommended_next_review
        ) VALUES (
          ${req.projectId},
          ${body.objectiveId},
          ${body.status},
          ${body.summary},
          ${body.constraints},
          ${body.unknowns},
          ${body.flags},
          ${db.json(body.evidenceRefs as never)},
          ${locationExpr},
          ${req.userId},
          ${body.recommendedNextReview ?? null}
        )
        RETURNING *, ST_AsGeoJSON(location_geometry)::jsonb AS location_geojson
      `;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_observation_created',
        entityType: 'olos_observation_record',
        entityId: row!.id as string,
        metadata: { objectiveId: body.objectiveId, status: body.status },
      });

      reply.code(201);
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // GET /:id/olos/observations/:recordId
  fastify.get<{ Params: { id: string; recordId: string } }>(
    '/:id/olos/observations/:recordId',
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
        FROM olos_observation_records r
        WHERE r.id = ${recordId} AND r.project_id = ${req.projectId}
      `;
      if (!row) throw new NotFoundError('ObservationRecord', recordId);
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // PATCH /:id/olos/observations/:recordId
  fastify.patch<{ Params: { id: string; recordId: string } }>(
    '/:id/olos/observations/:recordId',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer'),
      ],
    },
    async (req) => {
      const { recordId } = ParamsRecordId.parse(req.params);
      const body = ObservationPatchInput.parse(req.body);

      const [existing] = await db`
        SELECT id FROM olos_observation_records
        WHERE id = ${recordId} AND project_id = ${req.projectId}
      `;
      if (!existing) throw new NotFoundError('ObservationRecord', recordId);

      const locationPatch =
        body.locationGeometry === undefined
          ? db`location_geometry`
          : body.locationGeometry === null
            ? db`NULL`
            : db`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(body.locationGeometry)}), 4326)`;

      const [updated] = await db`
        UPDATE olos_observation_records SET
          status                  = COALESCE(${body.status ?? null},      status),
          summary                 = COALESCE(${body.summary ?? null},     summary),
          constraints             = COALESCE(${body.constraints ?? null}, constraints),
          unknowns                = COALESCE(${body.unknowns ?? null},    unknowns),
          flags                   = COALESCE(${body.flags ?? null},       flags),
          evidence_refs           = COALESCE(${body.evidenceRefs ? db.json(body.evidenceRefs as never) : null}, evidence_refs),
          location_geometry       = ${locationPatch},
          recommended_next_review = COALESCE(${body.recommendedNextReview ?? null}, recommended_next_review),
          updated_at              = now()
        WHERE id = ${recordId}
        RETURNING *, ST_AsGeoJSON(location_geometry)::jsonb AS location_geojson
      `;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_observation_updated',
        entityType: 'olos_observation_record',
        entityId: recordId,
      });

      return { data: mapRow(updated as Row), meta: undefined, error: null };
    },
  );

  // DELETE /:id/olos/observations/:recordId
  fastify.delete<{ Params: { id: string; recordId: string } }>(
    '/:id/olos/observations/:recordId',
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
        SELECT id FROM olos_observation_records
        WHERE id = ${recordId} AND project_id = ${req.projectId}
      `;
      if (!existing) throw new NotFoundError('ObservationRecord', recordId);

      await db`DELETE FROM olos_observation_records WHERE id = ${recordId}`;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_observation_deleted',
        entityType: 'olos_observation_record',
        entityId: recordId,
      });

      reply.code(204);
      return '';
    },
  );
}
