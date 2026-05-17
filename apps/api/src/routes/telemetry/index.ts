/**
 * Telemetry routes — Act-stage interaction event log + affinity aggregate.
 *
 * Registered at prefix /api/v1/telemetry (see app.ts).
 *
 * Backs the affinity-validation pipeline that lets us move past the
 * pen-and-paper review of projectTypeModuleAffinity.ts. POST ingests
 * batched events from the web client buffer; GET returns a server-side
 * aggregate grouped by (projectType, module, eventType).
 *
 * No project-role preHandler is applied: telemetry is per-user, not
 * per-project, and aggregate reads filter by req.userId. POST trusts
 * the project_id supplied per-event; FK constraints catch unknown
 * project ids.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  PostActInteractionsBody,
  GetActAffinityAggregateQuery,
  type ActInteractionEventInput,
} from '@ogden/shared';
import { ValidationError } from '../../lib/errors.js';

// PostActInteractionsBody / GetActAffinityAggregateQuery live in @ogden/shared,
// which can resolve a different `zod` instance than the api package — a thrown
// ZodError then misses `instanceof ZodError` in the global handler. Parse by
// shape and rethrow as our own ValidationError so the response is consistent
// (422 + structured payload). See routes/relationships/index.ts for the same
// pattern.
function parseOrThrow<T>(schema: { safeParse(v: unknown): z.SafeParseReturnType<unknown, T> }, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success) {
    throw new ValidationError(
      'Request validation failed',
      r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  return r.data;
}

export default async function telemetryRoutes(fastify: FastifyInstance) {
  const { db, authenticate } = fastify;

  // POST /act-interactions — bulk-insert a batch of events.
  fastify.post(
    '/act-interactions',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const body = parseOrThrow(PostActInteractionsBody, req.body);

      const userId = req.userId;
      let ingested = 0;

      for (const evt of body.events) {
        try {
          await db`
            INSERT INTO act_interaction_events (
              project_id, user_id, session_id, occurred_at,
              project_type, module, event_type, payload
            ) VALUES (
              ${evt.projectId},
              ${userId},
              ${evt.sessionId},
              ${evt.occurredAt},
              ${evt.projectType},
              ${evt.module},
              ${evt.eventType},
              ${db.json(evt.payload as never) as unknown as string}
            )
          `;
          ingested += 1;
        } catch (err) {
          // FK miss (unknown project_id) or constraint violation: drop the
          // single event and continue. Telemetry is best-effort; one bad
          // event must not poison a whole batch.
          fastify.log.warn(
            { err, eventType: evt.eventType, projectId: evt.projectId },
            'telemetry: skipped event during bulk insert',
          );
        }
      }

      reply.code(201);
      return { data: { ingested }, meta: undefined, error: null };
    },
  );

  // GET /act-interactions/aggregate — server-side aggregate for the dashboard.
  fastify.get<{ Querystring: { projectId?: string; from?: string; to?: string } }>(
    '/act-interactions/aggregate',
    { preHandler: [authenticate] },
    async (req) => {
      const query = parseOrThrow(GetActAffinityAggregateQuery, req.query);

      // Build WHERE clause with optional filters. The postgres tagged-template
      // engine accepts conditional fragments via db`...`; compose by
      // concatenating sub-fragments.
      const userFilter = db`user_id = ${req.userId}`;
      const projectFilter = query.projectId
        ? db` AND project_id = ${query.projectId}`
        : db``;
      const fromFilter = query.from
        ? db` AND occurred_at >= ${query.from}`
        : db``;
      const toFilter = query.to
        ? db` AND occurred_at < ${query.to}`
        : db``;

      const rows = await db`
        SELECT
          project_type,
          module,
          event_type,
          count(*)::int               AS touch_count,
          count(DISTINCT session_id)::int AS distinct_sessions,
          AVG(NULLIF((payload->>'dwellMs')::int, 0))::float AS avg_dwell_ms
        FROM act_interaction_events
        WHERE ${userFilter}${projectFilter}${fromFilter}${toFilter}
        GROUP BY project_type, module, event_type
        ORDER BY project_type NULLS LAST, module, event_type
      `;

      return {
        data: {
          rows: rows.map((r) => ({
            projectType: (r.project_type ?? null) as string | null,
            module: r.module as string,
            eventType: r.event_type as string,
            touchCount: Number(r.touch_count ?? 0),
            distinctSessions: Number(r.distinct_sessions ?? 0),
            avgDwellMs: r.avg_dwell_ms == null ? null : Number(r.avg_dwell_ms),
          })),
        },
        meta: undefined,
        error: null,
      };
    },
  );
}

// Re-export the input shape for tests.
export type { ActInteractionEventInput };
