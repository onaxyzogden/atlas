/**
 * OLOS ActHandoffPackage routes — bridge from Plan to Act under
 * /api/v1/projects/:id/olos/handoffs.
 *
 * POST is gated on the upstream PlanDecisionRecord's approvalStatus being in
 * APPROVED_PLAN_STATUSES (approved-for-act, conditionally-approved). Any
 * other status is a 409 — the caller must redesign / re-observe / get
 * professional review first.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  APPROVED_PLAN_STATUSES,
  HandoffMaterialSchema,
  HandoffSuccessCriterionSchema,
  HandoffVerificationRequirementSchema,
  HandoffMonitoringRequirementSchema,
  GeoJSONGeometrySchema,
} from '@ogden/shared';
import { AppError, NotFoundError } from '../../lib/errors.js';
import { logActivity } from '../../lib/activityLog.js';

const ParamsRecordId = z.object({
  id: z.string().uuid(),
  recordId: z.string().uuid(),
});

const ListQuery = z.object({
  planDecisionRecordId: z.string().uuid().optional(),
});

const HandoffCreateInput = z.object({
  planDecisionRecordId: z.string().uuid(),
  workScope: z.string().default(''),
  locationGeometry: GeoJSONGeometrySchema.nullish(),
  prerequisites: z.array(z.string()).default([]),
  sequence: z.array(z.string()).default([]),
  materials: z.array(HandoffMaterialSchema).default([]),
  successCriteria: z.array(HandoffSuccessCriterionSchema).default([]),
  verificationRequirements: z
    .array(HandoffVerificationRequirementSchema)
    .default([]),
  monitoringRequirements: z
    .array(HandoffMonitoringRequirementSchema)
    .default([]),
});

const HandoffPatchInput = HandoffCreateInput.partial().omit({
  planDecisionRecordId: true,
});

type Row = Record<string, unknown>;

function mapRow(row: Row) {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    planDecisionRecordId: row.plan_decision_record_id as string,
    workScope: row.work_scope as string,
    locationGeometry: row.location_geojson ?? null,
    prerequisites: (row.prerequisites ?? []) as string[],
    sequence: (row.sequence ?? []) as string[],
    materials: (row.materials ?? []) as unknown[],
    successCriteria: (row.success_criteria ?? []) as unknown[],
    verificationRequirements: (row.verification_requirements ?? []) as unknown[],
    monitoringRequirements: (row.monitoring_requirements ?? []) as unknown[],
    createdBy: (row.created_by ?? null) as string | null,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

export default async function olosHandoffRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  // GET /:id/olos/handoffs
  fastify.get<{ Params: { id: string }; Querystring: Record<string, string> }>(
    '/:id/olos/handoffs',
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
        SELECT h.*, ST_AsGeoJSON(h.location_geometry)::jsonb AS location_geojson
        FROM olos_act_handoff_packages h
        WHERE h.project_id = ${req.projectId}
          AND (${q.planDecisionRecordId ?? null}::uuid IS NULL
               OR h.plan_decision_record_id = ${q.planDecisionRecordId ?? null}::uuid)
        ORDER BY h.created_at DESC
      `;
      return {
        data: rows.map(mapRow),
        meta: { total: rows.length },
        error: null,
      };
    },
  );

  // POST /:id/olos/handoffs
  fastify.post<{ Params: { id: string } }>(
    '/:id/olos/handoffs',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer'),
      ],
    },
    async (req, reply) => {
      const body = HandoffCreateInput.parse(req.body);

      const [decision] = await db`
        SELECT id, approval_status
        FROM olos_plan_decision_records
        WHERE id = ${body.planDecisionRecordId}
          AND project_id = ${req.projectId}
      `;
      if (!decision) {
        throw new NotFoundError(
          'PlanDecisionRecord',
          body.planDecisionRecordId,
        );
      }

      const approvalStatus = decision.approval_status as string;
      if (
        !APPROVED_PLAN_STATUSES.includes(
          approvalStatus as (typeof APPROVED_PLAN_STATUSES)[number],
        )
      ) {
        throw new AppError(
          'HANDOFF_NOT_APPROVED',
          `PlanDecisionRecord ${body.planDecisionRecordId} has approvalStatus='${approvalStatus}', ` +
            `which is not in APPROVED_PLAN_STATUSES (${APPROVED_PLAN_STATUSES.join(', ')}). ` +
            `Resolve upstream before creating an Act handoff.`,
          409,
        );
      }

      const locationExpr = body.locationGeometry
        ? db`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(body.locationGeometry)}), 4326)`
        : db`NULL`;

      const [row] = await db`
        INSERT INTO olos_act_handoff_packages (
          project_id, plan_decision_record_id,
          work_scope, location_geometry,
          prerequisites, sequence,
          materials, success_criteria,
          verification_requirements, monitoring_requirements,
          created_by
        ) VALUES (
          ${req.projectId},
          ${body.planDecisionRecordId},
          ${body.workScope},
          ${locationExpr},
          ${body.prerequisites},
          ${body.sequence},
          ${db.json(body.materials as never)},
          ${db.json(body.successCriteria as never)},
          ${db.json(body.verificationRequirements as never)},
          ${db.json(body.monitoringRequirements as never)},
          ${req.userId}
        )
        RETURNING *, ST_AsGeoJSON(location_geometry)::jsonb AS location_geojson
      `;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_handoff_package_created',
        entityType: 'olos_act_handoff_package',
        entityId: row!.id as string,
        metadata: { planDecisionRecordId: body.planDecisionRecordId },
      });

      reply.code(201);
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // GET /:id/olos/handoffs/:recordId
  fastify.get<{ Params: { id: string; recordId: string } }>(
    '/:id/olos/handoffs/:recordId',
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
        SELECT h.*, ST_AsGeoJSON(h.location_geometry)::jsonb AS location_geojson
        FROM olos_act_handoff_packages h
        WHERE h.id = ${recordId} AND h.project_id = ${req.projectId}
      `;
      if (!row) throw new NotFoundError('ActHandoffPackage', recordId);
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // PATCH /:id/olos/handoffs/:recordId
  fastify.patch<{ Params: { id: string; recordId: string } }>(
    '/:id/olos/handoffs/:recordId',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer'),
      ],
    },
    async (req) => {
      const { recordId } = ParamsRecordId.parse(req.params);
      const body = HandoffPatchInput.parse(req.body);

      const [existing] = await db`
        SELECT id FROM olos_act_handoff_packages
        WHERE id = ${recordId} AND project_id = ${req.projectId}
      `;
      if (!existing) throw new NotFoundError('ActHandoffPackage', recordId);

      const locationPatch =
        body.locationGeometry === undefined
          ? db`location_geometry`
          : body.locationGeometry === null
            ? db`NULL`
            : db`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(body.locationGeometry)}), 4326)`;

      const [updated] = await db`
        UPDATE olos_act_handoff_packages SET
          work_scope                = COALESCE(${body.workScope ?? null},                                            work_scope),
          location_geometry         = ${locationPatch},
          prerequisites             = COALESCE(${body.prerequisites ?? null},                                        prerequisites),
          sequence                  = COALESCE(${body.sequence ?? null},                                             sequence),
          materials                 = COALESCE(${body.materials ? db.json(body.materials as never) : null},          materials),
          success_criteria          = COALESCE(${body.successCriteria ? db.json(body.successCriteria as never) : null}, success_criteria),
          verification_requirements = COALESCE(${body.verificationRequirements ? db.json(body.verificationRequirements as never) : null}, verification_requirements),
          monitoring_requirements   = COALESCE(${body.monitoringRequirements ? db.json(body.monitoringRequirements as never) : null}, monitoring_requirements),
          updated_at                = now()
        WHERE id = ${recordId}
        RETURNING *, ST_AsGeoJSON(location_geometry)::jsonb AS location_geojson
      `;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_handoff_package_updated',
        entityType: 'olos_act_handoff_package',
        entityId: recordId,
      });

      return { data: mapRow(updated as Row), meta: undefined, error: null };
    },
  );

  // DELETE /:id/olos/handoffs/:recordId
  fastify.delete<{ Params: { id: string; recordId: string } }>(
    '/:id/olos/handoffs/:recordId',
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
        SELECT id FROM olos_act_handoff_packages
        WHERE id = ${recordId} AND project_id = ${req.projectId}
      `;
      if (!existing) throw new NotFoundError('ActHandoffPackage', recordId);

      await db`DELETE FROM olos_act_handoff_packages WHERE id = ${recordId}`;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_handoff_package_deleted',
        entityType: 'olos_act_handoff_package',
        entityId: recordId,
      });

      reply.code(204);
      return '';
    },
  );
}
