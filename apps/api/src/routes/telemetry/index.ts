/**
 * Telemetry routes — Act-stage interaction event log + affinity aggregate,
 * plus the general client-error sink.
 *
 * Registered at prefix /api/v1/telemetry (see app.ts).
 *
 * Backs the affinity-validation pipeline that lets us move past the
 * pen-and-paper review of projectTypeModuleAffinity.ts. POST ingests
 * batched events from the web client buffer; GET returns a server-side
 * aggregate grouped by (projectType, module, eventType).
 *
 * POST /client-errors captures front-end failures (persist rehydrate, api
 * client, error boundary, unhandled rejection) into client_error_events
 * (migration 039). project_id is optional there — a rehydrate failure has
 * no project context.
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
  PostClientErrorsBody,
  PostShowcaseEventsBody,
  PostShowcaseFeedbackBody,
  type ActInteractionEventInput,
} from '@ogden/shared';
import type { JwtPayload } from '../../plugins/auth.js';

export default async function telemetryRoutes(fastify: FastifyInstance) {
  const { db, authenticate } = fastify;

  // POST /act-interactions — bulk-insert a batch of events.
  fastify.post(
    '/act-interactions',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const body = PostActInteractionsBody.parse(req.body);

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

  // POST /client-errors — bulk-insert a batch of front-end error events.
  // project_id is optional (null for global-store failures like persist
  // rehydrate). Auth-required: no open write endpoint. Best-effort per
  // event, mirroring /act-interactions.
  fastify.post(
    '/client-errors',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const body = PostClientErrorsBody.parse(req.body);

      const userId = req.userId;
      let ingested = 0;

      for (const evt of body.events) {
        try {
          await db`
            INSERT INTO client_error_events (
              user_id, project_id, session_id, occurred_at,
              source, name, message, stack, context, url, user_agent, app_version
            ) VALUES (
              ${userId},
              ${evt.projectId},
              ${evt.sessionId},
              ${evt.occurredAt},
              ${evt.source},
              ${evt.name},
              ${evt.message},
              ${evt.stack ?? null},
              ${db.json(evt.context as never) as unknown as string},
              ${evt.url ?? null},
              ${evt.userAgent ?? null},
              ${evt.appVersion ?? null}
            )
          `;
          ingested += 1;
        } catch (err) {
          // FK miss (unknown project_id) or constraint violation: drop the
          // single event and continue. Telemetry is best-effort; one bad
          // event must not poison a whole batch.
          fastify.log.warn(
            { err, source: evt.source, projectId: evt.projectId },
            'telemetry: skipped client error during bulk insert',
          );
        }
      }

      reply.code(201);
      return { data: { ingested }, meta: undefined, error: null };
    },
  );

  // POST /showcase-events — PUBLIC bulk-insert for cold-visitor showcase
  // telemetry. No authenticate preHandler: a showcase visitor is anonymous by
  // definition (see migration 040 + showcaseTelemetry.schema.ts). user_id is
  // stamped best-effort only if a bearer token happens to be present (e.g. a
  // visitor_registered event posted right after sign-up). Rate-limited tighter
  // than the global default since it accepts unauthenticated writes.
  fastify.post(
    '/showcase-events',
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
        },
      },
    },
    async (req, reply) => {
      const body = PostShowcaseEventsBody.parse(req.body);

      // Best-effort user resolution: a cold visitor has no token, but a
      // post-registration event may carry one. Never required.
      let userId: string | null = null;
      try {
        const payload = await req.jwtVerify<JwtPayload>();
        userId = payload.sub;
      } catch {
        userId = null;
      }

      let ingested = 0;

      for (const evt of body.events) {
        try {
          await db`
            INSERT INTO showcase_visitor_events (
              session_id, occurred_at, tier, event_type,
              user_id, project_id, payload
            ) VALUES (
              ${evt.sessionId},
              ${evt.occurredAt},
              ${evt.tier},
              ${evt.eventType},
              ${userId},
              ${evt.projectId},
              ${db.json(evt.payload as never) as unknown as string}
            )
          `;
          ingested += 1;
        } catch (err) {
          // FK miss (unknown project_id) or constraint violation: drop the
          // single event and continue. Telemetry is best-effort; one bad
          // event must not poison a whole batch.
          fastify.log.warn(
            { err, eventType: evt.eventType, sessionId: evt.sessionId },
            'telemetry: skipped showcase event during bulk insert',
          );
        }
      }

      reply.code(201);
      return { data: { ingested }, meta: undefined, error: null };
    },
  );

  // POST /showcase-feedback — PUBLIC single-row insert for the qualitative
  // half of the observation loop (FeedbackForm.tsx). No authenticate
  // preHandler: feedback comes from anonymous cold visitors (see migration
  // 041 + showcaseTelemetry.schema.ts). `message` is the one required field;
  // the DB CHECK + this route + the form all reject empty/whitespace. Rate-
  // limited like /showcase-events since it accepts unauthenticated writes.
  fastify.post(
    '/showcase-feedback',
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
        },
      },
    },
    async (req, reply) => {
      const body = PostShowcaseFeedbackBody.parse(req.body);

      // Defence-in-depth: the schema enforces min(1), but trim and re-check so
      // a whitespace-only message can never reach the table (the DB CHECK is
      // the final backstop).
      const message = body.message.trim();
      if (message.length === 0) {
        reply.code(400);
        return {
          data: null,
          meta: undefined,
          error: { code: 'EMPTY_MESSAGE', message: 'Feedback message is required.' },
        };
      }

      await db`
        INSERT INTO showcase_feedback (
          session_id, tier, rating, message, contact
        ) VALUES (
          ${body.sessionId},
          ${body.tier},
          ${body.rating},
          ${message},
          ${body.contact}
        )
      `;

      reply.code(201);
      return { data: { ok: true }, meta: undefined, error: null };
    },
  );

  // GET /act-interactions/aggregate — server-side aggregate for the dashboard.
  fastify.get<{ Querystring: { projectId?: string; from?: string; to?: string } }>(
    '/act-interactions/aggregate',
    { preHandler: [authenticate] },
    async (req) => {
      const query = GetActAffinityAggregateQuery.parse(req.query);

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
