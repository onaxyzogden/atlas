/**
 * Compost reading routes — the time-series at the heart of Act + Observe.
 *
 * Readings are created under a pile
 * (POST /api/v1/compost/piles/:pileId/readings) and listed in chronological
 * order — that ascending list IS the temperature curve the Observe screen
 * draws. Read/updated/deleted by id (/api/v1/compost/readings/:readingId).
 *
 * source = manual | sensor. Manual entry is what these routes serve; sensor
 * rows arrive via the device-token ingest endpoint (Phase 4) and carry a
 * device_id. temp_c / moisture_pct are numeric(…) → coerced from string.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CompostReadingSource } from '@ogden/shared';
import {
  requireOrgMember,
  requireOrgWriter,
  requireOrgOwnerOrResourceOwner,
  getPileContext,
  getReadingContext,
} from '../../lib/compostAccess.js';

const ParamsPileId = z.object({ pileId: z.string().uuid() });
const ParamsReadingId = z.object({ readingId: z.string().uuid() });

const ListQuery = z.object({
  source: CompostReadingSource.optional(),
});

const ReadingCreateInput = z.object({
  tempC: z.number().min(-20).max(120),
  moisturePct: z.number().min(0).max(100).optional(),
  turned: z.boolean().optional(),
  note: z.string().optional(),
  source: CompostReadingSource.optional(),
  deviceId: z.string().uuid().optional(),
  proofPhotoUri: z.string().optional(),
  capturedAt: z.string().datetime().optional(),
});

const ReadingPatchInput = ReadingCreateInput.partial();

type Row = Record<string, unknown>;

const num = (v: unknown): number | null => (v == null ? null : Number(v));

function mapRow(row: Row) {
  return {
    id: row.id as string,
    pileId: row.pile_id as string,
    tempC: Number(row.temp_c),
    moisturePct: num(row.moisture_pct),
    turned: row.turned as boolean,
    note: (row.note ?? null) as string | null,
    source: row.source as string,
    deviceId: (row.device_id ?? null) as string | null,
    proofPhotoUri: (row.proof_photo_uri ?? null) as string | null,
    capturedAt: (row.captured_at as Date).toISOString(),
    recordedBy: (row.recorded_by ?? null) as string | null,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

export default async function compostReadingRoutes(fastify: FastifyInstance) {
  const { db, authenticate } = fastify;

  // GET /piles/:pileId/readings — the curve, chronological
  fastify.get<{ Params: { pileId: string }; Querystring: Record<string, string> }>(
    '/piles/:pileId/readings',
    { preHandler: [authenticate] },
    async (req) => {
      const { pileId } = ParamsPileId.parse(req.params);
      const q = ListQuery.parse(req.query);
      const { orgId } = await getPileContext(db, pileId);
      await requireOrgMember(db, orgId, req.userId);
      const rows = await db`
        SELECT * FROM compost_readings
        WHERE pile_id = ${pileId}
          AND (${q.source ?? null}::text IS NULL OR source = ${q.source ?? null})
        ORDER BY captured_at ASC
      `;
      return { data: rows.map(mapRow), meta: { total: rows.length }, error: null };
    },
  );

  // POST /piles/:pileId/readings — log a reading
  fastify.post<{ Params: { pileId: string } }>(
    '/piles/:pileId/readings',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const { pileId } = ParamsPileId.parse(req.params);
      const body = ReadingCreateInput.parse(req.body);
      const { orgId } = await getPileContext(db, pileId);
      await requireOrgWriter(db, orgId, req.userId);

      const [row] = await db`
        INSERT INTO compost_readings (
          pile_id, temp_c, moisture_pct, turned, note,
          source, device_id, proof_photo_uri, captured_at, recorded_by
        ) VALUES (
          ${pileId},
          ${body.tempC},
          ${body.moisturePct ?? null},
          ${body.turned ?? false},
          ${body.note ?? null},
          ${body.source ?? 'manual'},
          ${body.deviceId ?? null},
          ${body.proofPhotoUri ?? null},
          ${body.capturedAt ? new Date(body.capturedAt) : db`now()`},
          ${req.userId}
        )
        RETURNING *
      `;

      reply.code(201);
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // GET /readings/:readingId
  fastify.get<{ Params: { readingId: string } }>(
    '/readings/:readingId',
    { preHandler: [authenticate] },
    async (req) => {
      const { readingId } = ParamsReadingId.parse(req.params);
      const { orgId } = await getReadingContext(db, readingId);
      await requireOrgMember(db, orgId, req.userId);
      const [row] = await db`SELECT * FROM compost_readings WHERE id = ${readingId}`;
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // PATCH /readings/:readingId — correct a logged reading
  fastify.patch<{ Params: { readingId: string } }>(
    '/readings/:readingId',
    { preHandler: [authenticate] },
    async (req) => {
      const { readingId } = ParamsReadingId.parse(req.params);
      const body = ReadingPatchInput.parse(req.body);
      const { orgId } = await getReadingContext(db, readingId);
      await requireOrgWriter(db, orgId, req.userId);

      const [row] = await db`
        UPDATE compost_readings SET
          temp_c          = COALESCE(${body.tempC ?? null}, temp_c),
          moisture_pct    = ${body.moisturePct === undefined ? db`moisture_pct` : (body.moisturePct ?? null)},
          turned          = COALESCE(${body.turned ?? null}, turned),
          note            = ${body.note === undefined ? db`note` : (body.note ?? null)},
          source          = COALESCE(${body.source ?? null}, source),
          device_id       = ${body.deviceId === undefined ? db`device_id` : (body.deviceId ?? null)},
          proof_photo_uri = ${body.proofPhotoUri === undefined ? db`proof_photo_uri` : (body.proofPhotoUri ?? null)},
          captured_at     = COALESCE(${body.capturedAt ? new Date(body.capturedAt) : null}, captured_at),
          updated_at      = now()
        WHERE id = ${readingId}
        RETURNING *
      `;
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // DELETE /readings/:readingId
  fastify.delete<{ Params: { readingId: string } }>(
    '/readings/:readingId',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const { readingId } = ParamsReadingId.parse(req.params);
      const { orgId, recordedBy } = await getReadingContext(db, readingId);
      await requireOrgOwnerOrResourceOwner(db, orgId, req.userId, recordedBy);
      await db`DELETE FROM compost_readings WHERE id = ${readingId}`;
      reply.code(204);
      return '';
    },
  );
}
