/**
 * OLOS Observation record routes — CRUD on olos_observation_records under
 * /api/v1/projects/:id/olos/observations.
 *
 * Validation mirrors ObservationRecord in @ogden/shared (status enum,
 * evidence-ref shape). The status CHECK constraint in migration 043 is
 * the DB-side enforcement; the Zod parse below catches client errors
 * before they hit Postgres.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  ObserveStatus,
  ObservationEvidenceRefSchema,
  GeoJSONGeometrySchema,
} from '@ogden/shared';
import { NotFoundError } from '../../lib/errors.js';
import { logActivity } from '../../lib/activityLog.js';
import {
  OLOS_STORE_KEYS,
  mapObservationRow,
  surfaceOlosConflict,
  broadcastOlosUpsert,
  toOlosDeltaItem,
} from './recordSync.js';

const ParamsRecordId = z.object({
  id: z.string().uuid(),
  recordId: z.string().uuid(),
});

const ListQuery = z.object({
  objectiveId: z.string().optional(),
  status: ObserveStatus.optional(),
});

// ISO-8601 with offset; absent → full snapshot (epoch) at the call site.
const ChangedSinceQuery = z.object({
  since: z.string().datetime({ offset: true }).optional(),
});

const ObservationCreateInput = z.object({
  objectiveId: z.string().min(1),
  status: ObserveStatus,
  summary: z.string().default(''),
  constraints: z.string().default(''),
  unknowns: z.string().default(''),
  flags: z.array(z.string()).default([]),
  evidenceRefs: z.array(ObservationEvidenceRefSchema).default([]),
  locationGeometry: GeoJSONGeometrySchema.nullish(),
  recommendedNextReview: z.string().datetime().nullish(),
});

// `baseRev` opts a write into the rev-gated sync path (stale → 409). Absent →
// the legacy COALESCE update (non-sync callers) — back-compat, no rev bump.
const ObservationPatchInput = ObservationCreateInput.partial().extend({
  baseRev: z.number().int().nonnegative().optional(),
});

type Row = Record<string, unknown>;

// Row → wire shape (incl. `rev`) lives in recordSync.ts so the conflict surface,
// broadcast, and changed-since delta all share one mapper.
const mapRow = mapObservationRow;

export default async function olosObservationRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  // GET /:id/olos/observations
  fastify.get<{ Params: { id: string }; Querystring: Record<string, string> }>(
    '/:id/olos/observations',
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
        SELECT r.*, ST_AsGeoJSON(r.location_geometry)::jsonb AS location_geojson
        FROM olos_observation_records r
        WHERE r.project_id = ${req.projectId}
          AND (${q.objectiveId ?? null}::text IS NULL OR r.objective_id = ${q.objectiveId ?? null})
          AND (${q.status ?? null}::text      IS NULL OR r.status       = ${q.status ?? null})
        ORDER BY r.recorded_at DESC
      `;
      return {
        data: rows.map(mapRow),
        meta: { total: rows.length },
        error: null,
      };
    },
  );

  // POST /:id/olos/observations
  fastify.post<{ Params: { id: string } }>(
    '/:id/olos/observations',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer'),
      ],
    },
    async (req, reply) => {
      const body = ObservationCreateInput.parse(req.body);

      const locationExpr = body.locationGeometry
        ? db`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(body.locationGeometry)}), 4326)`
        : db`NULL`;

      // A freshly created row has been authoritatively written once → rev = 1
      // (the column DEFAULT 0 is the pre-sync sentinel for legacy backfilled rows
      // only). A baseRev-0 first push then satisfies the 0 <= 0 rev gate.
      const [row] = await db`
        INSERT INTO olos_observation_records (
          project_id, objective_id, status,
          summary, constraints, unknowns, flags,
          evidence_refs, location_geometry,
          recorded_by, recommended_next_review, rev
        ) VALUES (
          ${req.projectId},
          ${body.objectiveId},
          ${body.status},
          ${body.summary},
          ${body.constraints},
          ${body.unknowns},
          ${body.flags},
          ${db.json(body.evidenceRefs as never)},
          ${locationExpr},
          ${req.userId},
          ${body.recommendedNextReview ?? null},
          1
        )
        RETURNING *, ST_AsGeoJSON(location_geometry)::jsonb AS location_geojson
      `;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_observation_created',
        entityType: 'olos_observation_record',
        entityId: row!.id as string,
        metadata: { objectiveId: body.objectiveId, status: body.status },
      });

      const saved = mapRow(row as Row);
      broadcastOlosUpsert(fastify, {
        projectId: req.projectId,
        storeKey: OLOS_STORE_KEYS.observation,
        recordId: saved.id,
        rev: saved.rev,
        payload: saved,
        userId: req.userId,
      });

      reply.code(201);
      return { data: saved, meta: undefined, error: null };
    },
  );

  // GET /:id/olos/observations/changed-since?since=<ISO> — reconnect delta-pull
  // source: every observation whose updated_at is strictly after `since`, oldest
  // first, as the storeKey-generic delta envelope pullOlosRecordDelta consumes.
  // Static `changed-since` out-prioritises the `:recordId` param route.
  fastify.get<{ Params: { id: string }; Querystring: { since?: string } }>(
    '/:id/olos/observations/changed-since',
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
        SELECT r.*, ST_AsGeoJSON(r.location_geometry)::jsonb AS location_geojson
        FROM olos_observation_records r
        WHERE r.project_id = ${req.projectId} AND r.updated_at > ${since}
        ORDER BY r.updated_at ASC
      `;
      return {
        data: rows.map((row) =>
          toOlosDeltaItem(
            OLOS_STORE_KEYS.observation,
            mapRow(row as Row),
            (row.updated_at as Date).toISOString(),
          ),
        ),
        meta: { total: rows.length },
        error: null,
      };
    },
  );

  // GET /:id/olos/observations/:recordId
  fastify.get<{ Params: { id: string; recordId: string } }>(
    '/:id/olos/observations/:recordId',
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
        SELECT r.*, ST_AsGeoJSON(r.location_geometry)::jsonb AS location_geojson
        FROM olos_observation_records r
        WHERE r.id = ${recordId} AND r.project_id = ${req.projectId}
      `;
      if (!row) throw new NotFoundError('ObservationRecord', recordId);
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // PATCH /:id/olos/observations/:recordId
  fastify.patch<{ Params: { id: string; recordId: string } }>(
    '/:id/olos/observations/:recordId',
    {
      preHandler: [
        authenticate,
        resolveProjectRole,
        requireRole('owner', 'designer'),
      ],
    },
    async (req, reply) => {
      const { recordId } = ParamsRecordId.parse(req.params);
      const { baseRev, ...patch } = ObservationPatchInput.parse(req.body);

      const [existing] = await db`
        SELECT id FROM olos_observation_records
        WHERE id = ${recordId} AND project_id = ${req.projectId}
      `;
      if (!existing) throw new NotFoundError('ObservationRecord', recordId);

      const locationPatch =
        patch.locationGeometry === undefined
          ? db`location_geometry`
          : patch.locationGeometry === null
            ? db`NULL`
            : db`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(patch.locationGeometry)}), 4326)`;

      // Rev-gated sync write: bump rev only when the client is not behind the
      // stored rev. A stale write matches 0 rows → surface the conflict (409).
      if (baseRev !== undefined) {
        const [updated] = await db`
          UPDATE olos_observation_records SET
            status                  = COALESCE(${patch.status ?? null},      status),
            summary                 = COALESCE(${patch.summary ?? null},     summary),
            constraints             = COALESCE(${patch.constraints ?? null}, constraints),
            unknowns                = COALESCE(${patch.unknowns ?? null},    unknowns),
            flags                   = COALESCE(${patch.flags ?? null},       flags),
            evidence_refs           = COALESCE(${patch.evidenceRefs ? db.json(patch.evidenceRefs as never) : null}, evidence_refs),
            location_geometry       = ${locationPatch},
            recommended_next_review = COALESCE(${patch.recommendedNextReview ?? null}, recommended_next_review),
            rev                     = rev + 1
          WHERE id = ${recordId} AND rev <= ${baseRev}
          RETURNING *, ST_AsGeoJSON(location_geometry)::jsonb AS location_geojson
        `;

        if (!updated) {
          const [current] = await db`
            SELECT r.*, ST_AsGeoJSON(r.location_geometry)::jsonb AS location_geojson
            FROM olos_observation_records r
            WHERE r.id = ${recordId} AND r.project_id = ${req.projectId}
          `;
          const server = current ? mapRow(current as Row) : null;
          reply.code(409);
          return surfaceOlosConflict(db, {
            projectId: req.projectId,
            storeKey: OLOS_STORE_KEYS.observation,
            recordId,
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
          action: 'olos_observation_updated',
          entityType: 'olos_observation_record',
          entityId: recordId,
        });

        const saved = mapRow(updated as Row);
        broadcastOlosUpsert(fastify, {
          projectId: req.projectId,
          storeKey: OLOS_STORE_KEYS.observation,
          recordId: saved.id,
          rev: saved.rev,
          payload: saved,
          userId: req.userId,
        });
        return { data: saved, meta: undefined, error: null };
      }

      // Legacy path (no baseRev) — unchanged COALESCE update, no rev bump.
      const [updated] = await db`
        UPDATE olos_observation_records SET
          status                  = COALESCE(${patch.status ?? null},      status),
          summary                 = COALESCE(${patch.summary ?? null},     summary),
          constraints             = COALESCE(${patch.constraints ?? null}, constraints),
          unknowns                = COALESCE(${patch.unknowns ?? null},    unknowns),
          flags                   = COALESCE(${patch.flags ?? null},       flags),
          evidence_refs           = COALESCE(${patch.evidenceRefs ? db.json(patch.evidenceRefs as never) : null}, evidence_refs),
          location_geometry       = ${locationPatch},
          recommended_next_review = COALESCE(${patch.recommendedNextReview ?? null}, recommended_next_review),
          updated_at              = now()
        WHERE id = ${recordId}
        RETURNING *, ST_AsGeoJSON(location_geometry)::jsonb AS location_geojson
      `;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_observation_updated',
        entityType: 'olos_observation_record',
        entityId: recordId,
      });

      return { data: mapRow(updated as Row), meta: undefined, error: null };
    },
  );

  // DELETE /:id/olos/observations/:recordId
  fastify.delete<{ Params: { id: string; recordId: string } }>(
    '/:id/olos/observations/:recordId',
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
        SELECT id FROM olos_observation_records
        WHERE id = ${recordId} AND project_id = ${req.projectId}
      `;
      if (!existing) throw new NotFoundError('ObservationRecord', recordId);

      await db`DELETE FROM olos_observation_records WHERE id = ${recordId}`;

      await logActivity(db, {
        projectId: req.projectId,
        userId: req.userId,
        action: 'olos_observation_deleted',
        entityType: 'olos_observation_record',
        entityId: recordId,
      });

      reply.code(204);
      return '';
    },
  );
}
