/**
 * OLOS VerificationRecord routes — POST/GET on a task under
 * /api/v1/projects/:id/olos/tasks/:taskId/verifications.
 *
 * A passing VerificationRecord (outcome=pass) is expected to be followed by
 * a PATCH on the parent ActTask flipping its status to verified-complete;
 * a failing one (outcome=fail | needs-rework) by a PATCH flipping the task
 * to needs-rework with the requiredReworkIds populated. The route does not
 * auto-transition the task — keeping the two writes explicit makes the
 * audit trail unambiguous.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  VerificationOutcome,
  VerificationCriterionResultSchema,
} from '@ogden/shared';
import { NotFoundError } from '../../lib/errors.js';
import { logActivity } from '../../lib/activityLog.js';

const VerificationCreateInput = z.object({
  outcome: VerificationOutcome,
  criteriaChecked: z.array(VerificationCriterionResultSchema).default([]),
  notes: z.string().nullish(),
  requiredReworkIds: z.array(z.string()).default([]),
  proofRecordIds: z.array(z.string().uuid()).default([]),
  verifiedAt: z.string().datetime().optional(),
});

const VerificationPatchInput = VerificationCreateInput.partial();

type Row = Record<string, unknown>;

function mapRow(row: Row) {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    taskId: row.task_id as string,
    verifierId: (row.verifier_id ?? null) as string | null,
    outcome: row.outcome as string,
    criteriaChecked: (row.criteria_checked ?? []) as unknown[],
    notes: (row.notes ?? null) as string | null,
    requiredReworkIds: (row.required_rework_ids ?? []) as string[],
    proofRecordIds: (row.proof_record_ids ?? []) as string[],
    verifiedAt: (row.verified_at as Date).toISOString(),
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

async function ensureTask(
  db: FastifyInstance['db'],
  projectId: string,
  taskId: string,
) {
  const [task] = await db`
    SELECT id FROM olos_act_tasks
    WHERE id = ${taskId} AND project_id = ${projectId}
  `;
  if (!task) throw new NotFoundError('ActTask', taskId);
}

const ParamsVerificationId = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  verificationId: z.string().uuid(),
});

export default async function olosVerificationRoutes(
  fastify: FastifyInstance,
) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  // GET /:id/olos/tasks/:taskId/verifications
  fastify.get<{ Params: { id: string; taskId: string } }>(
    '/:id/olos/tasks/:taskId/verifications',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer', 'reviewer', 'viewer'),
      ],
    },
    async (req) => {
      const { taskId } = z
        .object({ id: z.string().uuid(), taskId: z.string().uuid() })
        .parse(req.params);
      await ensureTask(db, req.projectId, taskId);
      const rows = await db`
        SELECT * FROM olos_verification_records
        WHERE task_id = ${taskId} AND project_id = ${req.projectId}
        ORDER BY verified_at DESC
      `;
      return {
        data: rows.map(mapRow),
        meta: { total: rows.length },
        error: null,
      };
    },
  );

  // POST /:id/olos/tasks/:taskId/verifications
  fastify.post<{ Params: { id: string; taskId: string } }>(
    '/:id/olos/tasks/:taskId/verifications',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer', 'reviewer'),
      ],
    },
    async (req, reply) => {
      const { taskId } = z
        .object({ id: z.string().uuid(), taskId: z.string().uuid() })
        .parse(req.params);
      const body = VerificationCreateInput.parse(req.body);
      await ensureTask(db, req.projectId, taskId);

      const [row] = await db`
        INSERT INTO olos_verification_records (
          project_id, task_id,
          verifier_id, outcome,
          criteria_checked, notes,
          required_rework_ids, proof_record_ids,
          verified_at
        ) VALUES (
          ${req.projectId},
          ${taskId},
          ${req.userId},
          ${body.outcome},
          ${db.json(body.criteriaChecked as never)},
          ${body.notes ?? null},
          ${body.requiredReworkIds},
          ${body.proofRecordIds}::uuid[],
          ${body.verifiedAt ?? new Date().toISOString()}
        )
        RETURNING *
      `;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_verification_created',
        entityType: 'olos_verification_record',
        entityId: row!.id as string,
        metadata: { taskId, outcome: body.outcome },
      });

      reply.code(201);
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // GET /:id/olos/tasks/:taskId/verifications/:verificationId
  fastify.get<{
    Params: { id: string; taskId: string; verificationId: string };
  }>(
    '/:id/olos/tasks/:taskId/verifications/:verificationId',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer', 'reviewer', 'viewer'),
      ],
    },
    async (req) => {
      const { taskId, verificationId } = ParamsVerificationId.parse(req.params);
      const [row] = await db`
        SELECT * FROM olos_verification_records
        WHERE id = ${verificationId}
          AND task_id = ${taskId}
          AND project_id = ${req.projectId}
      `;
      if (!row) throw new NotFoundError('VerificationRecord', verificationId);
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // PATCH /:id/olos/tasks/:taskId/verifications/:verificationId
  fastify.patch<{
    Params: { id: string; taskId: string; verificationId: string };
  }>(
    '/:id/olos/tasks/:taskId/verifications/:verificationId',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer', 'reviewer'),
      ],
    },
    async (req) => {
      const { taskId, verificationId } = ParamsVerificationId.parse(req.params);
      const body = VerificationPatchInput.parse(req.body);

      const [existing] = await db`
        SELECT id FROM olos_verification_records
        WHERE id = ${verificationId}
          AND task_id = ${taskId}
          AND project_id = ${req.projectId}
      `;
      if (!existing) {
        throw new NotFoundError('VerificationRecord', verificationId);
      }

      const [updated] = await db`
        UPDATE olos_verification_records SET
          outcome             = COALESCE(${body.outcome ?? null}, outcome),
          criteria_checked    = COALESCE(${body.criteriaChecked ? db.json(body.criteriaChecked as never) : null}, criteria_checked),
          notes               = ${body.notes === undefined ? db`notes` : body.notes ?? null},
          required_rework_ids = COALESCE(${body.requiredReworkIds ?? null}, required_rework_ids),
          proof_record_ids    = COALESCE(${body.proofRecordIds ?? null}::uuid[], proof_record_ids),
          verified_at         = COALESCE(${body.verifiedAt ?? null}, verified_at),
          updated_at          = now()
        WHERE id = ${verificationId}
        RETURNING *
      `;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_verification_updated',
        entityType: 'olos_verification_record',
        entityId: verificationId,
      });

      return { data: mapRow(updated as Row), meta: undefined, error: null };
    },
  );

  // DELETE /:id/olos/tasks/:taskId/verifications/:verificationId
  fastify.delete<{
    Params: { id: string; taskId: string; verificationId: string };
  }>(
    '/:id/olos/tasks/:taskId/verifications/:verificationId',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer'),
      ],
    },
    async (req, reply) => {
      const { taskId, verificationId } = ParamsVerificationId.parse(req.params);
      const [existing] = await db`
        SELECT id FROM olos_verification_records
        WHERE id = ${verificationId}
          AND task_id = ${taskId}
          AND project_id = ${req.projectId}
      `;
      if (!existing) {
        throw new NotFoundError('VerificationRecord', verificationId);
      }

      await db`DELETE FROM olos_verification_records WHERE id = ${verificationId}`;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_verification_deleted',
        entityType: 'olos_verification_record',
        entityId: verificationId,
      });

      reply.code(204);
      return '';
    },
  );
}
