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
} from '@ogden/shared';
import { NotFoundError } from '../../lib/errors.js';
import { logActivity } from '../../lib/activityLog.js';

const ParamsProofId = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  proofId: z.string().uuid(),
});

const ProofCreateInput = z.object({
  proofType: ProofType,
  fileUri: z.string().nullish(),
  note: z.string().nullish(),
  measurementValue: z.number().nullish(),
  measurementUnit: z.string().nullish(),
  geotag: ProofGeotagSchema.nullish(),
  capturedAt: z.string().datetime().optional(),
  verificationStatus: ProofVerificationStatus.default('pending'),
});

const ProofPatchInput = ProofCreateInput.partial();

type Row = Record<string, unknown>;

function mapRow(row: Row) {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    taskId: row.task_id as string,
    proofType: row.proof_type as string,
    fileUri: (row.file_uri ?? null) as string | null,
    note: (row.note ?? null) as string | null,
    measurementValue:
      row.measurement_value === null ? null : Number(row.measurement_value),
    measurementUnit: (row.measurement_unit ?? null) as string | null,
    geotag: (row.geotag ?? null) as unknown,
    capturedAt: (row.captured_at as Date).toISOString(),
    submittedBy: (row.submitted_by ?? null) as string | null,
    verificationStatus: row.verification_status as string,
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

      const [row] = await db`
        INSERT INTO olos_proof_records (
          project_id, task_id,
          proof_type, file_uri, note,
          measurement_value, measurement_unit,
          geotag, captured_at,
          submitted_by, verification_status
        ) VALUES (
          ${req.projectId},
          ${taskId},
          ${body.proofType},
          ${body.fileUri ?? null},
          ${body.note ?? null},
          ${body.measurementValue ?? null},
          ${body.measurementUnit ?? null},
          ${body.geotag ? db.json(body.geotag as never) : null},
          ${body.capturedAt ?? new Date().toISOString()},
          ${req.userId},
          ${body.verificationStatus}
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

      reply.code(201);
      return { data: mapRow(row as Row), meta: undefined, error: null };
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
    async (req) => {
      const { taskId, proofId } = ParamsProofId.parse(req.params);
      const body = ProofPatchInput.parse(req.body);

      const [existing] = await db`
        SELECT id FROM olos_proof_records
        WHERE id = ${proofId}
          AND task_id = ${taskId}
          AND project_id = ${req.projectId}
      `;
      if (!existing) throw new NotFoundError('ProofRecord', proofId);

      const [updated] = await db`
        UPDATE olos_proof_records SET
          proof_type          = COALESCE(${body.proofType ?? null}, proof_type),
          file_uri            = ${body.fileUri === undefined ? db`file_uri` : body.fileUri ?? null},
          note                = ${body.note === undefined ? db`note` : body.note ?? null},
          measurement_value   = ${body.measurementValue === undefined ? db`measurement_value` : body.measurementValue ?? null},
          measurement_unit    = ${body.measurementUnit === undefined ? db`measurement_unit` : body.measurementUnit ?? null},
          geotag              = ${body.geotag === undefined ? db`geotag` : body.geotag === null ? null : db.json(body.geotag as never)},
          captured_at         = COALESCE(${body.capturedAt ?? null}, captured_at),
          verification_status = COALESCE(${body.verificationStatus ?? null}, verification_status),
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
