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
import {
  OLOS_STORE_KEYS,
  mapVerificationRow,
  surfaceOlosConflict,
  broadcastOlosUpsert,
  toOlosDeltaItem,
} from './recordSync.js';

// ISO-8601 with offset; absent → full snapshot (epoch) at the call site.
const ChangedSinceQuery = z.object({
  since: z.string().datetime({ offset: true }).optional(),
});

const VerificationCreateInput = z.object({
  outcome: VerificationOutcome,
  criteriaChecked: z.array(VerificationCriterionResultSchema).default([]),
  notes: z.string().nullish(),
  requiredReworkIds: z.array(z.string()).default([]),
  proofRecordIds: z.array(z.string().uuid()).default([]),
  verifiedAt: z.string().datetime().optional(),
});

// `baseRev` opts a write into the rev-gated sync path (stale → 409). Absent →
// the legacy COALESCE update (non-sync callers) — back-compat, no rev bump.
const VerificationPatchInput = VerificationCreateInput.partial().extend({
  baseRev: z.number().int().nonnegative().optional(),
});

type Row = Record<string, unknown>;

// Row → wire shape (incl. `rev`) lives in recordSync.ts so the conflict surface,
// broadcast, and changed-since delta all share one mapper.
const mapRow = mapVerificationRow;

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

      // Fresh row → rev = 1 (DEFAULT 0 is the pre-sync sentinel for legacy
      // backfilled rows only); a baseRev-0 first push then clears the 0 <= 0 gate.
      const [row] = await db`
        INSERT INTO olos_verification_records (
          project_id, task_id,
          verifier_id, outcome,
          criteria_checked, notes,
          required_rework_ids, proof_record_ids,
          verified_at, rev
        ) VALUES (
          ${req.projectId},
          ${taskId},
          ${req.userId},
          ${body.outcome},
          ${db.json(body.criteriaChecked as never)},
          ${body.notes ?? null},
          ${body.requiredReworkIds},
          ${body.proofRecordIds}::uuid[],
          ${body.verifiedAt ?? new Date().toISOString()},
          1
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

      const saved = mapRow(row as Row);
      broadcastOlosUpsert(fastify, {
        projectId: req.projectId,
        storeKey: OLOS_STORE_KEYS.verification,
        recordId: saved.id,
        rev: saved.rev,
        payload: saved,
        userId: req.userId,
      });

      reply.code(201);
      return { data: saved, meta: undefined, error: null };
    },
  );

  // GET /:id/olos/verifications/changed-since?since=<ISO> — project-scoped
  // reconnect delta-pull source across ALL tasks (NOT nested under
  // /tasks/:taskId), oldest first, as the storeKey-generic delta envelope.
  fastify.get<{ Params: { id: string }; Querystring: { since?: string } }>(
    '/:id/olos/verifications/changed-since',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer', 'reviewer', 'viewer'),
      ],
    },
    async (req) => {
      const since = ChangedSinceQuery.parse(req.query).since ?? '1970-01-01T00:00:00.000Z';
      const rows = await db`
        SELECT * FROM olos_verification_records
        WHERE project_id = ${req.projectId} AND updated_at > ${since}
        ORDER BY updated_at ASC
      `;
      return {
        data: rows.map((row) =>
          toOlosDeltaItem(
            OLOS_STORE_KEYS.verification,
            mapRow(row as Row),
            (row.updated_at as Date).toISOString(),
          ),
        ),
        meta: { total: rows.length },
        error: null,
      };
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
    async (req, reply) => {
      const { taskId, verificationId } = ParamsVerificationId.parse(req.params);
      const { baseRev, ...patch } = VerificationPatchInput.parse(req.body);

      const [existing] = await db`
        SELECT id FROM olos_verification_records
        WHERE id = ${verificationId}
          AND task_id = ${taskId}
          AND project_id = ${req.projectId}
      `;
      if (!existing) {
        throw new NotFoundError('VerificationRecord', verificationId);
      }

      // Rev-gated sync write: bump rev only when the client is not behind the
      // stored rev. A stale write matches 0 rows → surface the conflict (409).
      if (baseRev !== undefined) {
        const [updated] = await db`
          UPDATE olos_verification_records SET
            outcome             = COALESCE(${patch.outcome ?? null}, outcome),
            criteria_checked    = COALESCE(${patch.criteriaChecked ? db.json(patch.criteriaChecked as never) : null}, criteria_checked),
            notes               = ${patch.notes === undefined ? db`notes` : patch.notes ?? null},
            required_rework_ids = COALESCE(${patch.requiredReworkIds ?? null}, required_rework_ids),
            proof_record_ids    = COALESCE(${patch.proofRecordIds ?? null}::uuid[], proof_record_ids),
            verified_at         = COALESCE(${patch.verifiedAt ?? null}, verified_at),
            rev                 = rev + 1
          WHERE id = ${verificationId} AND rev <= ${baseRev}
          RETURNING *
        `;

        if (!updated) {
          const [current] = await db`
            SELECT * FROM olos_verification_records
            WHERE id = ${verificationId} AND project_id = ${req.projectId}
          `;
          const server = current ? mapRow(current as Row) : null;
          reply.code(409);
          return surfaceOlosConflict(db, {
            projectId: req.projectId,
            storeKey: OLOS_STORE_KEYS.verification,
            recordId: verificationId,
            baseRev,
            localPayload: patch as Record<string, unknown>,
            serverRev: server?.rev ?? null,
            serverPayload: server,
            userId: req.userId,
          });
        }

        await logActivity(db, {
          projectId: req.projectId,
          userId: req.userId,
          action: 'olos_verification_updated',
          entityType: 'olos_verification_record',
          entityId: verificationId,
        });

        const saved = mapRow(updated as Row);
        broadcastOlosUpsert(fastify, {
          projectId: req.projectId,
          storeKey: OLOS_STORE_KEYS.verification,
          recordId: saved.id,
          rev: saved.rev,
          payload: saved,
          userId: req.userId,
        });
        return { data: saved, meta: undefined, error: null };
      }

      // Legacy path (no baseRev) — unchanged COALESCE update, no rev bump.
      const [updated] = await db`
        UPDATE olos_verification_records SET
          outcome             = COALESCE(${patch.outcome ?? null}, outcome),
          criteria_checked    = COALESCE(${patch.criteriaChecked ? db.json(patch.criteriaChecked as never) : null}, criteria_checked),
          notes               = ${patch.notes === undefined ? db`notes` : patch.notes ?? null},
          required_rework_ids = COALESCE(${patch.requiredReworkIds ?? null}, required_rework_ids),
          proof_record_ids    = COALESCE(${patch.proofRecordIds ?? null}::uuid[], proof_record_ids),
          verified_at         = COALESCE(${patch.verifiedAt ?? null}, verified_at),
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
