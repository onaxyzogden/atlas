/**
 * OLOS PlanDecisionRecord routes — CRUD on olos_plan_decision_records under
 * /api/v1/projects/:id/olos/plan-decisions.
 *
 * approvalStatus drives the downstream Act handoff. APPROVED_PLAN_STATUSES
 * (approved-for-act, conditionally-approved) is the gate; the handoffs route
 * enforces it at POST time.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  PlanApprovalStatus,
  PlanDecisionOptionSchema,
  PlanRiskFlagSchema,
} from '@ogden/shared';
import { NotFoundError } from '../../lib/errors.js';
import { logActivity } from '../../lib/activityLog.js';

const ParamsRecordId = z.object({
  id: z.string().uuid(),
  recordId: z.string().uuid(),
});

const ListQuery = z.object({
  objectiveId: z.string().optional(),
  approvalStatus: PlanApprovalStatus.optional(),
});

const PlanDecisionCreateInput = z.object({
  objectiveId: z.string().min(1),
  selectedOption: PlanDecisionOptionSchema,
  rejectedOptions: z.array(PlanDecisionOptionSchema).default([]),
  rationale: z.string().default(''),
  assumptions: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  riskFlags: z.array(PlanRiskFlagSchema).default([]),
  upstreamObservationRecordIds: z.array(z.string()).default([]),
  approvalStatus: PlanApprovalStatus,
});

const PlanDecisionPatchInput = PlanDecisionCreateInput.partial();

type Row = Record<string, unknown>;

function mapRow(row: Row) {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    objectiveId: row.objective_id as string,
    selectedOption: row.selected_option as unknown,
    rejectedOptions: (row.rejected_options ?? []) as unknown[],
    rationale: row.rationale as string,
    assumptions: (row.assumptions ?? []) as string[],
    constraints: (row.constraints ?? []) as string[],
    dependencies: (row.dependencies ?? []) as string[],
    riskFlags: (row.risk_flags ?? []) as unknown[],
    upstreamObservationRecordIds: (row.upstream_observation_record_ids ??
      []) as string[],
    approvalStatus: row.approval_status as string,
    decidedBy: (row.decided_by ?? null) as string | null,
    decidedAt: (row.decided_at as Date).toISOString(),
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

export default async function olosPlanDecisionRoutes(
  fastify: FastifyInstance,
) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  // GET /:id/olos/plan-decisions
  fastify.get<{ Params: { id: string }; Querystring: Record<string, string> }>(
    '/:id/olos/plan-decisions',
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
        SELECT *
        FROM olos_plan_decision_records
        WHERE project_id = ${req.projectId}
          AND (${q.objectiveId ?? null}::text     IS NULL OR objective_id    = ${q.objectiveId ?? null})
          AND (${q.approvalStatus ?? null}::text  IS NULL OR approval_status = ${q.approvalStatus ?? null})
        ORDER BY decided_at DESC
      `;
      return {
        data: rows.map(mapRow),
        meta: { total: rows.length },
        error: null,
      };
    },
  );

  // POST /:id/olos/plan-decisions
  fastify.post<{ Params: { id: string } }>(
    '/:id/olos/plan-decisions',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer'),
      ],
    },
    async (req, reply) => {
      const body = PlanDecisionCreateInput.parse(req.body);
      const [row] = await db`
        INSERT INTO olos_plan_decision_records (
          project_id, objective_id,
          selected_option, rejected_options,
          rationale, assumptions, constraints, dependencies,
          risk_flags, upstream_observation_record_ids,
          approval_status, decided_by
        ) VALUES (
          ${req.projectId},
          ${body.objectiveId},
          ${db.json(body.selectedOption as never)},
          ${db.json(body.rejectedOptions as never)},
          ${body.rationale},
          ${body.assumptions},
          ${body.constraints},
          ${body.dependencies},
          ${db.json(body.riskFlags as never)},
          ${body.upstreamObservationRecordIds},
          ${body.approvalStatus},
          ${req.userId}
        )
        RETURNING *
      `;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_plan_decision_created',
        entityType: 'olos_plan_decision_record',
        entityId: row!.id as string,
        metadata: {
          objectiveId: body.objectiveId,
          approvalStatus: body.approvalStatus,
        },
      });

      reply.code(201);
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // GET /:id/olos/plan-decisions/:recordId
  fastify.get<{ Params: { id: string; recordId: string } }>(
    '/:id/olos/plan-decisions/:recordId',
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
        SELECT *
        FROM olos_plan_decision_records
        WHERE id = ${recordId} AND project_id = ${req.projectId}
      `;
      if (!row) throw new NotFoundError('PlanDecisionRecord', recordId);
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // PATCH /:id/olos/plan-decisions/:recordId
  fastify.patch<{ Params: { id: string; recordId: string } }>(
    '/:id/olos/plan-decisions/:recordId',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer'),
      ],
    },
    async (req) => {
      const { recordId } = ParamsRecordId.parse(req.params);
      const body = PlanDecisionPatchInput.parse(req.body);

      const [existing] = await db`
        SELECT id FROM olos_plan_decision_records
        WHERE id = ${recordId} AND project_id = ${req.projectId}
      `;
      if (!existing) throw new NotFoundError('PlanDecisionRecord', recordId);

      const [updated] = await db`
        UPDATE olos_plan_decision_records SET
          selected_option                  = COALESCE(${body.selectedOption ? db.json(body.selectedOption as never) : null}, selected_option),
          rejected_options                 = COALESCE(${body.rejectedOptions ? db.json(body.rejectedOptions as never) : null}, rejected_options),
          rationale                        = COALESCE(${body.rationale ?? null}, rationale),
          assumptions                      = COALESCE(${body.assumptions ?? null}, assumptions),
          constraints                      = COALESCE(${body.constraints ?? null}, constraints),
          dependencies                     = COALESCE(${body.dependencies ?? null}, dependencies),
          risk_flags                       = COALESCE(${body.riskFlags ? db.json(body.riskFlags as never) : null}, risk_flags),
          upstream_observation_record_ids  = COALESCE(${body.upstreamObservationRecordIds ?? null}, upstream_observation_record_ids),
          approval_status                  = COALESCE(${body.approvalStatus ?? null}, approval_status),
          updated_at                       = now()
        WHERE id = ${recordId}
        RETURNING *
      `;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_plan_decision_updated',
        entityType: 'olos_plan_decision_record',
        entityId: recordId,
        metadata: body.approvalStatus
          ? { approvalStatus: body.approvalStatus }
          : undefined,
      });

      return { data: mapRow(updated as Row), meta: undefined, error: null };
    },
  );

  // DELETE /:id/olos/plan-decisions/:recordId
  fastify.delete<{ Params: { id: string; recordId: string } }>(
    '/:id/olos/plan-decisions/:recordId',
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
        SELECT id FROM olos_plan_decision_records
        WHERE id = ${recordId} AND project_id = ${req.projectId}
      `;
      if (!existing) throw new NotFoundError('PlanDecisionRecord', recordId);

      await db`DELETE FROM olos_plan_decision_records WHERE id = ${recordId}`;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_plan_decision_deleted',
        entityType: 'olos_plan_decision_record',
        entityId: recordId,
      });

      reply.code(204);
      return '';
    },
  );
}
