/**
 * Regeneration event routes — CRUD for §7 `regen-stage-intervention-log`.
 *
 * Registered at prefix /api/v1/projects (shares prefix with project/comments
 * routes). Migration 015 defines the underlying `regeneration_events` table;
 * Zod validation from @ogden/shared/regenerationEvent.schema mirrors the
 * CHECK constraints — keep both boundaries character-for-character in sync.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  RegenerationEventInput,
  RegenerationEventUpdateInput,
  RegenerationEventType,
  RegenerationInterventionType,
  RegenerationPhase,
} from '@ogden/shared';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { logActivity } from '../../lib/activityLog.js';

const ParamsEventId = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
});

const ListQuery = z.object({
  eventType: RegenerationEventType.optional(),
  interventionType: RegenerationInterventionType.optional(),
  phase: RegenerationPhase.optional(),
  since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  parentId: z.string().uuid().optional(),
});

function mapRow(row: Record<string, unknown>) {
  const loc = row.location_geojson;
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    authorId: row.author_id as string,
    eventType: row.event_type as string,
    interventionType: (row.intervention_type ?? null) as string | null,
    phase: (row.phase ?? null) as string | null,
    progress: (row.progress ?? null) as string | null,
    title: row.title as string,
    notes: (row.notes ?? null) as string | null,
    eventDate: row.event_date instanceof Date
      ? (row.event_date as Date).toISOString().slice(0, 10)
      : String(row.event_date),
    location: loc ?? null,
    areaHa: row.area_ha != null ? Number(row.area_ha) : null,
    observations: (row.observations ?? {}) as Record<string, unknown>,
    mediaUrls: (row.media_urls ?? []) as string[],
    parentEventId: (row.parent_event_id ?? null) as string | null,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

export default async function regenerationEventRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  // GET /:id/regeneration-events — list events for project
  fastify.get<{ Params: { id: string }; Querystring: Record<string, string> }>(
    '/:id/regeneration-events',
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
        SELECT
          re.*,
          ST_AsGeoJSON(re.location)::jsonb AS location_geojson
        FROM regeneration_events re
        WHERE re.project_id = ${req.projectId}
          AND (${q.eventType ?? null}::text        IS NULL OR re.event_type        = ${q.eventType ?? null})
          AND (${q.interventionType ?? null}::text IS NULL OR re.intervention_type = ${q.interventionType ?? null})
          AND (${q.phase ?? null}::text            IS NULL OR re.phase             = ${q.phase ?? null})
          AND (${q.since ?? null}::date            IS NULL OR re.event_date       >= ${q.since ?? null}::date)
          AND (${q.until ?? null}::date            IS NULL OR re.event_date       <= ${q.until ?? null}::date)
          AND (${q.parentId ?? null}::uuid         IS NULL OR re.parent_event_id   = ${q.parentId ?? null}::uuid)
        ORDER BY re.event_date DESC, re.created_at DESC
      `;

      return { data: rows.map(mapRow), meta: { total: rows.length }, error: null };
    },
  );

  // POST /:id/regeneration-events — create event (owner, designer)
  fastify.post<{ Params: { id: string } }>(
    '/:id/regeneration-events',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer'),
      ],
    },
    async (req, reply) => {
      const body = RegenerationEventInput.parse(req.body);

      const locationExpr = body.location
        ? db`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(body.location)}), 4326)`
        : db`NULL`;

      const [row] = await db`
        INSERT INTO regeneration_events (
          project_id, author_id,
          event_type, intervention_type, phase, progress,
          title, notes, event_date,
          location, area_ha,
          observations, media_urls,
          parent_event_id
        ) VALUES (
          ${req.projectId},
          ${req.userId},
          ${body.eventType},
          ${body.interventionType ?? null},
          ${body.phase ?? null},
          ${body.progress ?? null},
          ${body.title},
          ${body.notes ?? null},
          ${body.eventDate}::date,
          ${locationExpr},
          ${body.areaHa ?? null},
          ${db.json((body.observations ?? {}) as never)},
          ${body.mediaUrls ?? []},
          ${body.parentEventId ?? null}
        )
        RETURNING *,
          ST_AsGeoJSON(location)::jsonb AS location_geojson
      `;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'regeneration_event_created',
        entityType: 'regeneration_event',
        entityId: row!.id as string,
        metadata: {
          eventType: body.eventType,
          interventionType: body.interventionType ?? null,
          title: body.title.slice(0, 100),
        },
      });

      reply.code(201);
      return { data: mapRow(row as Record<string, unknown>), meta: undefined, error: null };
    },
  );

  // PATCH /:id/regeneration-events/:eventId — edit event
  fastify.patch<{ Params: { id: string; eventId: string } }>(
    '/:id/regeneration-events/:eventId',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer'),
      ],
    },
    async (req) => {
      const { eventId } = ParamsEventId.parse(req.params);
      const body = RegenerationEventUpdateInput.parse(req.body);

      const [existing] = await db`
        SELECT id, author_id FROM regeneration_events
        WHERE id = ${eventId} AND project_id = ${req.projectId}
      `;
      if (!existing) throw new NotFoundError('RegenerationEvent', eventId);

      if (existing.author_id !== req.userId && req.projectRole !== 'owner') {
        throw new ForbiddenError('Only the event author or project owner can edit');
      }

      const locationPatch =
        body.location === undefined
          ? db`location`
          : body.location === null
            ? db`NULL`
            : db`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(body.location)}), 4326)`;

      const [updated] = await db`
        UPDATE regeneration_events SET
          event_type        = COALESCE(${body.eventType ?? null},        event_type),
          intervention_type = COALESCE(${body.interventionType ?? null}, intervention_type),
          phase             = COALESCE(${body.phase ?? null},             phase),
          progress          = COALESCE(${body.progress ?? null},          progress),
          title             = COALESCE(${body.title ?? null},             title),
          notes             = COALESCE(${body.notes ?? null},             notes),
          event_date        = COALESCE(${body.eventDate ?? null}::date,   event_date),
          location          = ${locationPatch},
          area_ha           = COALESCE(${body.areaHa ?? null},            area_ha),
          observations      = COALESCE(${body.observations ? db.json(body.observations as never) : null}, observations),
          media_urls        = COALESCE(${body.mediaUrls ?? null},         media_urls),
          parent_event_id   = COALESCE(${body.parentEventId ?? null},     parent_event_id),
          updated_at        = now()
        WHERE id = ${eventId}
        RETURNING *,
          ST_AsGeoJSON(location)::jsonb AS location_geojson
      `;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'regeneration_event_updated',
        entityType: 'regeneration_event',
        entityId: eventId,
      });

      return {
        data: mapRow(updated as Record<string, unknown>),
        meta: undefined,
        error: null,
      };
    },
  );

  // DELETE /:id/regeneration-events/:eventId — delete event (author or owner)
  fastify.delete<{ Params: { id: string; eventId: string } }>(
    '/:id/regeneration-events/:eventId',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer'),
      ],
    },
    async (req, reply) => {
      const { eventId } = ParamsEventId.parse(req.params);

      const [existing] = await db`
        SELECT id, author_id FROM regeneration_events
        WHERE id = ${eventId} AND project_id = ${req.projectId}
      `;
      if (!existing) throw new NotFoundError('RegenerationEvent', eventId);

      if (existing.author_id !== req.userId && req.projectRole !== 'owner') {
        throw new ForbiddenError('Only the event author or project owner can delete');
      }

      await db`DELETE FROM regeneration_events WHERE id = ${eventId}`;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'regeneration_event_deleted',
        entityType: 'regeneration_event',
        entityId: eventId,
      });

      reply.code(204);
      return '';
    },
  );
}
