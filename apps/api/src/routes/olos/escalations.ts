/**
 * OLOS EscalationRecord routes — feedback loop under
 * /api/v1/projects/:id/olos/escalations.
 *
 * Escalations can originate from any Stage and route to any Stage. Listed
 * here as a project-scoped flat collection (no task-prefix) because Act may
 * raise an escalation against an Objective or a Stage broadly, not always a
 * specific task.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  EscalationSeverity,
  EscalationStatus,
  EscalationTriggerKind,
  Stage,
  UniversalDomain,
} from '@ogden/shared';
import { NotFoundError } from '../../lib/errors.js';
import { logActivity } from '../../lib/activityLog.js';

const ParamsRecordId = z.object({
  id: z.string().uuid(),
  recordId: z.string().uuid(),
});

const ListQuery = z.object({
  taskId: z.string().uuid().optional(),
  status: EscalationStatus.optional(),
  severity: EscalationSeverity.optional(),
  routedToStage: Stage.optional(),
});

const EscalationCreateInput = z.object({
  taskId: z.string().uuid().nullish(),
  objectiveId: z.string().nullish(),
  triggerKind: EscalationTriggerKind,
  triggerNote: z.string().default(''),
  severity: EscalationSeverity.default('medium'),
  routedToStage: Stage,
  routedToDomain: UniversalDomain.nullish(),
  requestedAction: z.string().default(''),
  status: EscalationStatus.default('open'),
});

const EscalationPatchInput = EscalationCreateInput.partial().extend({
  resolutionNote: z.string().nullish(),
  resolvedAt: z.string().datetime().nullish(),
});

type Row = Record<string, unknown>;

function mapRow(row: Row) {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    taskId: (row.task_id ?? null) as string | null,
    objectiveId: (row.objective_id ?? null) as string | null,
    triggerKind: row.trigger_kind as string,
    triggerNote: row.trigger_note as string,
    severity: row.severity as string,
    routedToStage: row.routed_to_stage as string,
    routedToDomain: (row.routed_to_domain ?? null) as string | null,
    requestedAction: row.requested_action as string,
    status: row.status as string,
    raisedBy: (row.raised_by ?? null) as string | null,
    raisedAt: (row.raised_at as Date).toISOString(),
    resolvedBy: (row.resolved_by ?? null) as string | null,
    resolvedAt:
      row.resolved_at instanceof Date
        ? (row.resolved_at as Date).toISOString()
        : null,
    resolutionNote: (row.resolution_note ?? null) as string | null,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

export default async function olosEscalationRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  // GET /:id/olos/escalations
  fastify.get<{ Params: { id: string }; Querystring: Record<string, string> }>(
    '/:id/olos/escalations',
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
        FROM olos_escalation_records
        WHERE project_id = ${req.projectId}
          AND (${q.taskId ?? null}::uuid        IS NULL OR task_id         = ${q.taskId ?? null}::uuid)
          AND (${q.status ?? null}::text        IS NULL OR status          = ${q.status ?? null})
          AND (${q.severity ?? null}::text      IS NULL OR severity        = ${q.severity ?? null})
          AND (${q.routedToStage ?? null}::text IS NULL OR routed_to_stage = ${q.routedToStage ?? null})
        ORDER BY raised_at DESC
      `;
      return {
        data: rows.map(mapRow),
        meta: { total: rows.length },
        error: null,
      };
    },
  );

  // POST /:id/olos/escalations
  fastify.post<{ Params: { id: string } }>(
    '/:id/olos/escalations',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer'),
      ],
    },
    async (req, reply) => {
      const body = EscalationCreateInput.parse(req.body);

      if (body.taskId) {
        const [task] = await db`
          SELECT id FROM olos_act_tasks
          WHERE id = ${body.taskId} AND project_id = ${req.projectId}
        `;
        if (!task) throw new NotFoundError('ActTask', body.taskId);
      }

      const [row] = await db`
        INSERT INTO olos_escalation_records (
          project_id, task_id, objective_id,
          trigger_kind, trigger_note, severity,
          routed_to_stage, routed_to_domain,
          requested_action, status,
          raised_by
        ) VALUES (
          ${req.projectId},
          ${body.taskId ?? null},
          ${body.objectiveId ?? null},
          ${body.triggerKind},
          ${body.triggerNote},
          ${body.severity},
          ${body.routedToStage},
          ${body.routedToDomain ?? null},
          ${body.requestedAction},
          ${body.status},
          ${req.userId}
        )
        RETURNING *
      `;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_escalation_created',
        entityType: 'olos_escalation_record',
        entityId: row!.id as string,
        metadata: {
          triggerKind: body.triggerKind,
          severity: body.severity,
          routedToStage: body.routedToStage,
        },
      });

      reply.code(201);
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // GET /:id/olos/escalations/:recordId
  fastify.get<{ Params: { id: string; recordId: string } }>(
    '/:id/olos/escalations/:recordId',
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
        FROM olos_escalation_records
        WHERE id = ${recordId} AND project_id = ${req.projectId}
      `;
      if (!row) throw new NotFoundError('EscalationRecord', recordId);
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // PATCH /:id/olos/escalations/:recordId
  fastify.patch<{ Params: { id: string; recordId: string } }>(
    '/:id/olos/escalations/:recordId',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer'),
      ],
    },
    async (req) => {
      const { recordId } = ParamsRecordId.parse(req.params);
      const body = EscalationPatchInput.parse(req.body);

      const [existing] = await db`
        SELECT id FROM olos_escalation_records
        WHERE id = ${recordId} AND project_id = ${req.projectId}
      `;
      if (!existing) throw new NotFoundError('EscalationRecord', recordId);

      const resolvingNow =
        body.status === 'resolved' || body.status === 'dismissed';

      const [updated] = await db`
        UPDATE olos_escalation_records SET
          trigger_kind     = COALESCE(${body.triggerKind ?? null}, trigger_kind),
          trigger_note     = COALESCE(${body.triggerNote ?? null}, trigger_note),
          severity         = COALESCE(${body.severity ?? null}, severity),
          routed_to_stage  = COALESCE(${body.routedToStage ?? null}, routed_to_stage),
          routed_to_domain = ${body.routedToDomain === undefined ? db`routed_to_domain` : body.routedToDomain ?? null},
          requested_action = COALESCE(${body.requestedAction ?? null}, requested_action),
          status           = COALESCE(${body.status ?? null}, status),
          resolution_note  = ${body.resolutionNote === undefined ? db`resolution_note` : body.resolutionNote ?? null},
          resolved_by      = ${resolvingNow ? req.userId : db`resolved_by`},
          resolved_at      = ${
            body.resolvedAt !== undefined
              ? body.resolvedAt
              : resolvingNow
                ? db`now()`
                : db`resolved_at`
          }::timestamptz,
          updated_at       = now()
        WHERE id = ${recordId}
        RETURNING *
      `;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_escalation_updated',
        entityType: 'olos_escalation_record',
        entityId: recordId,
        metadata: body.status ? { status: body.status } : undefined,
      });

      return { data: mapRow(updated as Row), meta: undefined, error: null };
    },
  );

  // DELETE /:id/olos/escalations/:recordId
  fastify.delete<{ Params: { id: string; recordId: string } }>(
    '/:id/olos/escalations/:recordId',
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
        SELECT id FROM olos_escalation_records
        WHERE id = ${recordId} AND project_id = ${req.projectId}
      `;
      if (!existing) throw new NotFoundError('EscalationRecord', recordId);

      await db`DELETE FROM olos_escalation_records WHERE id = ${recordId}`;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_escalation_deleted',
        entityType: 'olos_escalation_record',
        entityId: recordId,
      });

      reply.code(204);
      return '';
    },
  );
}
