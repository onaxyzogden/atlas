/**
 * OLOS ProofRecord routes — attach evidence to an ActTask under
 * /api/v1/projects/:id/olos/tasks/:taskId/proofs.
 *
 * Multipart file upload is handled separately (see proof_uploads route in
 * the regenerationEvents pattern). This route accepts a pre-uploaded
 * fileUri (e.g., the S3 key returned by an upload endpoint) plus optional
 * measurement / note / geotag metadata.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  ProofType,
  ProofGeotagSchema,
  ProofVerificationStatus,
  ProofDetailsSchema,
} from '@ogden/shared';
import { NotFoundError } from '../../lib/errors.js';
import { logActivity } from '../../lib/activityLog.js';
import {
  OLOS_STORE_KEYS,
  mapProofRow,
  surfaceOlosConflict,
  broadcastOlosUpsert,
  toOlosDeltaItem,
} from './recordSync.js';

const ParamsProofId = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  proofId: z.string().uuid(),
});

// ISO-8601 with offset; absent → full snapshot (epoch) at the call site.
const ChangedSinceQuery = z.object({
  since: z.string().datetime({ offset: true }).optional(),
});

const ProofCreateInput = z.object({
  proofType: ProofType,
  fileUri: z.string().nullish(),
  note: z.string().nullish(),
  measurementValue: z.number().nullish(),
  measurementUnit: z.string().nullish(),
  geotag: ProofGeotagSchema.nullish(),
  details: ProofDetailsSchema.nullish(),
  capturedAt: z.string().datetime().optional(),
  verificationStatus: ProofVerificationStatus.default('pending'),
});

// `baseRev` opts a write into the rev-gated sync path (stale → 409). Absent →
// the legacy COALESCE update (non-sync callers) — back-compat, no rev bump.
const ProofPatchInput = ProofCreateInput.partial().extend({
  baseRev: z.number().int().nonnegative().optional(),
});

type Row = Record<string, unknown>;

// Row → wire shape (incl. `rev`) lives in recordSync.ts so the conflict surface,
// broadcast, and changed-since delta all share one mapper.
const mapRow = mapProofRow;

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

export default async function olosProofRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  // GET /:id/olos/tasks/:taskId/proofs
  fastify.get<{ Params: { id: string; taskId: string } }>(
    '/:id/olos/tasks/:taskId/proofs',
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
        SELECT * FROM olos_proof_records
        WHERE task_id = ${taskId} AND project_id = ${req.projectId}
        ORDER BY captured_at DESC
      `;
      return {
        data: rows.map(mapRow),
        meta: { total: rows.length },
        error: null,
      };
    },
  );

  // POST /:id/olos/tasks/:taskId/proofs
  fastify.post<{ Params: { id: string; taskId: string } }>(
    '/:id/olos/tasks/:taskId/proofs',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer'),
      ],
    },
    async (req, reply) => {
      const { taskId } = z
        .object({ id: z.string().uuid(), taskId: z.string().uuid() })
        .parse(req.params);
      const body = ProofCreateInput.parse(req.body);
      await ensureTask(db, req.projectId, taskId);

      // Fresh row → rev = 1 (DEFAULT 0 is the pre-sync sentinel for legacy
      // backfilled rows only); a baseRev-0 first push then clears the 0 <= 0 gate.
      const [row] = await db`
        INSERT INTO olos_proof_records (
          project_id, task_id,
          proof_type, file_uri, note,
          measurement_value, measurement_unit,
          geotag, details, captured_at,
          submitted_by, verification_status, rev
        ) VALUES (
          ${req.projectId},
          ${taskId},
          ${body.proofType},
          ${body.fileUri ?? null},
          ${body.note ?? null},
          ${body.measurementValue ?? null},
          ${body.measurementUnit ?? null},
          ${body.geotag ? db.json(body.geotag as never) : null},
          ${body.details ? db.json(body.details as never) : null},
          ${body.capturedAt ?? new Date().toISOString()},
          ${req.userId},
          ${body.verificationStatus},
          1
        )
        RETURNING *
      `;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_proof_created',
        entityType: 'olos_proof_record',
        entityId: row!.id as string,
        metadata: { taskId, proofType: body.proofType },
      });

      const saved = mapRow(row as Row);
      broadcastOlosUpsert(fastify, {
        projectId: req.projectId,
        storeKey: OLOS_STORE_KEYS.proof,
        recordId: saved.id,
        rev: saved.rev,
        payload: saved,
        userId: req.userId,
      });

      reply.code(201);
      return { data: saved, meta: undefined, error: null };
    },
  );

  // GET /:id/olos/proofs/changed-since?since=<ISO> — project-scoped reconnect
  // delta-pull source across ALL tasks (NOT nested under /tasks/:taskId), oldest
  // first, as the storeKey-generic delta envelope.
  fastify.get<{ Params: { id: string }; Querystring: { since?: string } }>(
    '/:id/olos/proofs/changed-since',
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
        SELECT * FROM olos_proof_records
        WHERE project_id = ${req.projectId} AND updated_at > ${since}
        ORDER BY updated_at ASC
      `;
      return {
        data: rows.map((row) =>
          toOlosDeltaItem(
            OLOS_STORE_KEYS.proof,
            mapRow(row as Row),
            (row.updated_at as Date).toISOString(),
          ),
        ),
        meta: { total: rows.length },
        error: null,
      };
    },
  );

  // GET /:id/olos/tasks/:taskId/proofs/:proofId
  fastify.get<{ Params: { id: string; taskId: string; proofId: string } }>(
    '/:id/olos/tasks/:taskId/proofs/:proofId',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer', 'reviewer', 'viewer'),
      ],
    },
    async (req) => {
      const { taskId, proofId } = ParamsProofId.parse(req.params);
      const [row] = await db`
        SELECT * FROM olos_proof_records
        WHERE id = ${proofId}
          AND task_id = ${taskId}
          AND project_id = ${req.projectId}
      `;
      if (!row) throw new NotFoundError('ProofRecord', proofId);
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // PATCH /:id/olos/tasks/:taskId/proofs/:proofId
  fastify.patch<{ Params: { id: string; taskId: string; proofId: string } }>(
    '/:id/olos/tasks/:taskId/proofs/:proofId',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer'),
      ],
    },
    async (req, reply) => {
      const { taskId, proofId } = ParamsProofId.parse(req.params);
      const { baseRev, ...patch } = ProofPatchInput.parse(req.body);

      const [existing] = await db`
        SELECT id FROM olos_proof_records
        WHERE id = ${proofId}
          AND task_id = ${taskId}
          AND project_id = ${req.projectId}
      `;
      if (!existing) throw new NotFoundError('ProofRecord', proofId);

      // Rev-gated sync write: bump rev only when the client is not behind the
      // stored rev. A stale write matches 0 rows → surface the conflict (409).
      if (baseRev !== undefined) {
        const [updated] = await db`
          UPDATE olos_proof_records SET
            proof_type          = COALESCE(${patch.proofType ?? null}, proof_type),
            file_uri            = ${patch.fileUri === undefined ? db`file_uri` : patch.fileUri ?? null},
            note                = ${patch.note === undefined ? db`note` : patch.note ?? null},
            measurement_value   = ${patch.measurementValue === undefined ? db`measurement_value` : patch.measurementValue ?? null},
            measurement_unit    = ${patch.measurementUnit === undefined ? db`measurement_unit` : patch.measurementUnit ?? null},
            geotag              = ${patch.geotag === undefined ? db`geotag` : patch.geotag === null ? null : db.json(patch.geotag as never)},
            details             = ${patch.details === undefined ? db`details` : patch.details === null ? null : db.json(patch.details as never)},
            captured_at         = COALESCE(${patch.capturedAt ?? null}, captured_at),
            verification_status = COALESCE(${patch.verificationStatus ?? null}, verification_status),
            rev                 = rev + 1
          WHERE id = ${proofId} AND rev <= ${baseRev}
          RETURNING *
        `;

        if (!updated) {
          const [current] = await db`
            SELECT * FROM olos_proof_records
            WHERE id = ${proofId} AND project_id = ${req.projectId}
          `;
          const server = current ? mapRow(current as Row) : null;
          reply.code(409);
          return surfaceOlosConflict(db, {
            projectId: req.projectId,
            storeKey: OLOS_STORE_KEYS.proof,
            recordId: proofId,
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
          action: 'olos_proof_updated',
          entityType: 'olos_proof_record',
          entityId: proofId,
        });

        const saved = mapRow(updated as Row);
        broadcastOlosUpsert(fastify, {
          projectId: req.projectId,
          storeKey: OLOS_STORE_KEYS.proof,
          recordId: saved.id,
          rev: saved.rev,
          payload: saved,
          userId: req.userId,
        });
        return { data: saved, meta: undefined, error: null };
      }

      // Legacy path (no baseRev) — unchanged COALESCE update, no rev bump.
      const [updated] = await db`
        UPDATE olos_proof_records SET
          proof_type          = COALESCE(${patch.proofType ?? null}, proof_type),
          file_uri            = ${patch.fileUri === undefined ? db`file_uri` : patch.fileUri ?? null},
          note                = ${patch.note === undefined ? db`note` : patch.note ?? null},
          measurement_value   = ${patch.measurementValue === undefined ? db`measurement_value` : patch.measurementValue ?? null},
          measurement_unit    = ${patch.measurementUnit === undefined ? db`measurement_unit` : patch.measurementUnit ?? null},
          geotag              = ${patch.geotag === undefined ? db`geotag` : patch.geotag === null ? null : db.json(patch.geotag as never)},
          details             = ${patch.details === undefined ? db`details` : patch.details === null ? null : db.json(patch.details as never)},
          captured_at         = COALESCE(${patch.capturedAt ?? null}, captured_at),
          verification_status = COALESCE(${patch.verificationStatus ?? null}, verification_status),
          updated_at          = now()
        WHERE id = ${proofId}
        RETURNING *
      `;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_proof_updated',
        entityType: 'olos_proof_record',
        entityId: proofId,
      });

      return { data: mapRow(updated as Row), meta: undefined, error: null };
    },
  );

  // DELETE /:id/olos/tasks/:taskId/proofs/:proofId
  fastify.delete<{ Params: { id: string; taskId: string; proofId: string } }>(
    '/:id/olos/tasks/:taskId/proofs/:proofId',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer'),
      ],
    },
    async (req, reply) => {
      const { taskId, proofId } = ParamsProofId.parse(req.params);
      const [existing] = await db`
        SELECT id FROM olos_proof_records
        WHERE id = ${proofId}
          AND task_id = ${taskId}
          AND project_id = ${req.projectId}
      `;
      if (!existing) throw new NotFoundError('ProofRecord', proofId);

      await db`DELETE FROM olos_proof_records WHERE id = ${proofId}`;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_proof_deleted',
        entityType: 'olos_proof_record',
        entityId: proofId,
      });

      reply.code(204);
      return '';
    },
  );
}
