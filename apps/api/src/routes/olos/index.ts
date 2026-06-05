/**
 * OLOS routes — composer for the per-project record routes.
 *
 * Registered at prefix /api/v1/projects in src/app.ts. The catalogue routes
 * (catalog.ts) mount separately at /api/v1/olos because they are public and
 * not project-scoped.
 *
 * Route map under /api/v1/projects/:id/olos/:
 *   - observations/                    — ObservationRecord
 *   - plan-decisions/                  — PlanDecisionRecord
 *   - handoffs/                        — ActHandoffPackage (POST gated on APPROVED_PLAN_STATUSES)
 *   - tasks/                           — ActTask
 *   - tasks/:taskId/proofs/            — ProofRecord
 *   - tasks/:taskId/verifications/     — VerificationRecord
 *   - escalations/                     — EscalationRecord
 *   - stewardship-routines/            — StewardshipRoutine
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ResolveConflictInput, ResolveConflictResult } from '@ogden/shared';
import olosObservationRoutes from './observations.js';
import olosPlanDecisionRoutes from './planDecisions.js';
import olosHandoffRoutes from './handoffs.js';
import olosTaskRoutes from './tasks.js';
import olosProofRoutes from './proofs.js';
import olosVerificationRoutes from './verifications.js';
import olosEscalationRoutes from './escalations.js';
import olosStewardshipRoutineRoutes from './stewardshipRoutines.js';
import { OLOS_RECORD_STORES } from './recordSync.js';

const ParamsResolveConflict = z.object({
  id: z.string().uuid(),
  syncLogId: z.string().uuid(),
});

/**
 * One generic conflict-resolution route for all three olos record domains —
 * mirrors act-records' `/project/:projectId/conflicts/:syncLogId/resolve` but
 * keyed on the olos `:id` project param and dispatching the write to the
 * `olos_*` table named by `sync_log.store_key` via OLOS_RECORD_STORES.
 *
 * keep_server is a read no-op (the server row already won the 409); keep_mine is
 * the one sanctioned override — force-write the steward's stored local payload
 * into the structured columns at rev + 1. Idempotent: an already-resolved
 * conflict returns current authoritative state without re-applying keep_mine.
 * Wrapped in a transaction so the record write, sync_log close, and
 * failed_records delete are atomic.
 */
async function olosConflictResolveRoute(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  fastify.post<{ Params: { id: string; syncLogId: string } }>(
    '/:id/olos/conflicts/:syncLogId/resolve',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner', 'designer')] },
    async (req, reply) => {
      const { syncLogId } = ParamsResolveConflict.parse(req.params);
      const { choice } = ResolveConflictInput.parse(req.body);
      const projectId = req.projectId;
      const userId = req.userId;

      // db.begin's TransactionSql lacks a tagged-template call signature under
      // tsc (TS2349) — annotate (sql: any), the repo-wide db.begin convention.
      const outcome = await db.begin(async (sql: any) => {
        const [log] = await sql`
          SELECT id, store_key, record_id, local_payload, resolution_status
          FROM sync_log
          WHERE id = ${syncLogId} AND project_id = ${projectId}
          FOR UPDATE
        `;
        if (!log) return { status: 'not_found' as const };

        const storeKey = log['store_key'] as string;
        const recordId = log['record_id'] as string;
        const store = OLOS_RECORD_STORES[storeKey];
        if (!store) return { status: 'unknown_store' as const, storeKey };

        // Idempotent: a re-resolve returns current state, never re-applies.
        if (log['resolution_status'] === 'resolved') {
          return {
            status: 'ok' as const,
            storeKey,
            recordId,
            authoritative: await store.readAuthoritative(sql, projectId, recordId),
          };
        }

        const authoritative =
          choice === 'keep_mine'
            ? await store.applyKeepMine(
                sql,
                projectId,
                recordId,
                (log['local_payload'] ?? {}) as Record<string, unknown>,
              )
            : await store.readAuthoritative(sql, projectId, recordId);

        await sql`
          UPDATE sync_log SET
            resolution_status = 'resolved',
            resolved_at = now(),
            resolved_by = ${userId}
          WHERE id = ${syncLogId}
        `;
        await sql`DELETE FROM failed_records WHERE sync_log_id = ${syncLogId}`;

        return { status: 'ok' as const, storeKey, recordId, authoritative };
      });

      if (outcome.status === 'not_found') {
        reply.code(404);
        return {
          data: null,
          meta: undefined,
          error: {
            code: 'NOT_FOUND',
            message: `No conflict ${syncLogId} for project ${projectId}`,
          },
        };
      }
      if (outcome.status === 'unknown_store') {
        reply.code(400);
        return {
          data: null,
          meta: undefined,
          error: {
            code: 'UNKNOWN_STORE',
            message: `Conflict ${syncLogId} store_key ${outcome.storeKey} is not an olos record store`,
          },
        };
      }
      if (!outcome.authoritative) {
        reply.code(409);
        return {
          data: null,
          meta: undefined,
          error: {
            code: 'AUTHORITATIVE_RECORD_MISSING',
            message: `Resolved conflict ${syncLogId} but no authoritative record for ${outcome.storeKey}/${outcome.recordId}`,
          },
        };
      }
      return {
        data: ResolveConflictResult.parse({
          storeKey: outcome.storeKey,
          recordId: outcome.recordId,
          rev: outcome.authoritative.rev,
          payload: outcome.authoritative,
          resolutionStatus: 'resolved',
        }),
        meta: undefined,
        error: null,
      };
    },
  );
}

export default async function olosRoutes(fastify: FastifyInstance) {
  await fastify.register(olosObservationRoutes);
  await fastify.register(olosPlanDecisionRoutes);
  await fastify.register(olosHandoffRoutes);
  await fastify.register(olosTaskRoutes);
  await fastify.register(olosProofRoutes);
  await fastify.register(olosVerificationRoutes);
  await fastify.register(olosEscalationRoutes);
  await fastify.register(olosStewardshipRoutineRoutes);
  await fastify.register(olosConflictResolveRoute);
}
