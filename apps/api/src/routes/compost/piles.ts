/**
 * Compost pile routes — CRUD on compost_piles.
 *
 * A pile is one batch + its Plan payload (dimensions, targets, recipe layers,
 * build checklist, objectives). Created under a site
 * (POST /api/v1/compost/sites/:siteId/piles); the pile inherits the site's
 * org_id. Read/updated/deleted by id (/api/v1/compost/piles/:pileId).
 *
 * Validation reuses the shared compost sub-schemas; the JSONB columns
 * (recipe_layers / build_checklist / objectives) round-trip as parsed arrays.
 * numeric(…) columns come back from postgres.js as strings, so mapRow coerces
 * them with Number().
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  CompostPileStatus,
  CompostDimensionsSchema,
  CompostRecipeLayerSchema,
  CompostChecklistItemSchema,
  CompostPlanObjectiveSchema,
} from '@ogden/shared';
import {
  requireOrgMember,
  requireOrgWriter,
  requireOrgOwnerOrResourceOwner,
  getSiteContext,
  getPileContext,
} from '../../lib/compostAccess.js';

const ParamsSiteId = z.object({ siteId: z.string().uuid() });
const ParamsPileId = z.object({ pileId: z.string().uuid() });

const PileCreateInput = z.object({
  name: z.string().min(1),
  cycleLabel: z.string().optional(),
  status: CompostPileStatus.optional(),
  dimensions: CompostDimensionsSchema.nullish(),
  targetCnRatio: z.number().positive().optional(),
  targetMoisturePct: z.number().min(0).max(100).optional(),
  targetTempMinC: z.number().optional(),
  targetTempMaxC: z.number().optional(),
  recipeLayers: z.array(CompostRecipeLayerSchema).optional(),
  buildChecklist: z.array(CompostChecklistItemSchema).optional(),
  objectives: z.array(CompostPlanObjectiveSchema).optional(),
});

const PilePatchInput = PileCreateInput.partial();

type Row = Record<string, unknown>;

const num = (v: unknown): number | null => (v == null ? null : Number(v));

function mapRow(row: Row) {
  const hasDims =
    row.length_ft != null || row.width_ft != null || row.height_ft != null;
  return {
    id: row.id as string,
    siteId: row.site_id as string,
    orgId: row.org_id as string,
    ownerId: (row.owner_id ?? null) as string | null,
    name: row.name as string,
    cycleLabel: (row.cycle_label ?? null) as string | null,
    status: row.status as string,
    dimensions: hasDims
      ? {
          lengthFt: num(row.length_ft),
          widthFt: num(row.width_ft),
          heightFt: num(row.height_ft),
        }
      : null,
    targetCnRatio: num(row.target_cn_ratio),
    targetMoisturePct: num(row.target_moisture_pct),
    targetTempMinC: num(row.target_temp_min_c),
    targetTempMaxC: num(row.target_temp_max_c),
    recipeLayers: (row.recipe_layers ?? []) as unknown[],
    buildChecklist: (row.build_checklist ?? []) as unknown[],
    objectives: (row.objectives ?? []) as unknown[],
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

export default async function compostPileRoutes(fastify: FastifyInstance) {
  const { db, authenticate } = fastify;

  // GET /sites/:siteId/piles — list piles at a site
  fastify.get<{ Params: { siteId: string } }>(
    '/sites/:siteId/piles',
    { preHandler: [authenticate] },
    async (req) => {
      const { siteId } = ParamsSiteId.parse(req.params);
      const { orgId } = await getSiteContext(db, siteId);
      await requireOrgMember(db, orgId, req.userId);
      const rows = await db`
        SELECT * FROM compost_piles WHERE site_id = ${siteId}
        ORDER BY created_at DESC
      `;
      return { data: rows.map(mapRow), meta: { total: rows.length }, error: null };
    },
  );

  // POST /sites/:siteId/piles — create a pile (inherits the site's org)
  fastify.post<{ Params: { siteId: string } }>(
    '/sites/:siteId/piles',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const { siteId } = ParamsSiteId.parse(req.params);
      const body = PileCreateInput.parse(req.body);
      const { orgId } = await getSiteContext(db, siteId);
      await requireOrgWriter(db, orgId, req.userId);

      const dims = body.dimensions ?? null;
      const [row] = await db`
        INSERT INTO compost_piles (
          site_id, org_id, owner_id, name, cycle_label, status,
          length_ft, width_ft, height_ft,
          target_cn_ratio, target_moisture_pct, target_temp_min_c, target_temp_max_c,
          recipe_layers, build_checklist, objectives
        ) VALUES (
          ${siteId},
          ${orgId},
          ${req.userId},
          ${body.name},
          ${body.cycleLabel ?? null},
          ${body.status ?? 'planning'},
          ${dims?.lengthFt ?? null},
          ${dims?.widthFt ?? null},
          ${dims?.heightFt ?? null},
          ${body.targetCnRatio ?? null},
          ${body.targetMoisturePct ?? null},
          ${body.targetTempMinC ?? null},
          ${body.targetTempMaxC ?? null},
          ${db.json((body.recipeLayers ?? []) as never)},
          ${db.json((body.buildChecklist ?? []) as never)},
          ${db.json((body.objectives ?? []) as never)}
        )
        RETURNING *
      `;

      reply.code(201);
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // GET /piles/:pileId
  fastify.get<{ Params: { pileId: string } }>(
    '/piles/:pileId',
    { preHandler: [authenticate] },
    async (req) => {
      const { pileId } = ParamsPileId.parse(req.params);
      const { orgId } = await getPileContext(db, pileId);
      await requireOrgMember(db, orgId, req.userId);
      const [row] = await db`SELECT * FROM compost_piles WHERE id = ${pileId}`;
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // PATCH /piles/:pileId
  fastify.patch<{ Params: { pileId: string } }>(
    '/piles/:pileId',
    { preHandler: [authenticate] },
    async (req) => {
      const { pileId } = ParamsPileId.parse(req.params);
      const body = PilePatchInput.parse(req.body);
      const { orgId } = await getPileContext(db, pileId);
      await requireOrgWriter(db, orgId, req.userId);

      // dimensions: undefined → keep; null → clear all three; object → set all.
      const dimsGiven = body.dimensions !== undefined;
      const dims = body.dimensions ?? null;

      const [row] = await db`
        UPDATE compost_piles SET
          name                = COALESCE(${body.name ?? null}, name),
          cycle_label         = ${body.cycleLabel === undefined ? db`cycle_label` : (body.cycleLabel ?? null)},
          status              = COALESCE(${body.status ?? null}, status),
          length_ft           = ${dimsGiven ? (dims?.lengthFt ?? null) : db`length_ft`},
          width_ft            = ${dimsGiven ? (dims?.widthFt ?? null) : db`width_ft`},
          height_ft           = ${dimsGiven ? (dims?.heightFt ?? null) : db`height_ft`},
          target_cn_ratio     = COALESCE(${body.targetCnRatio ?? null}, target_cn_ratio),
          target_moisture_pct = COALESCE(${body.targetMoisturePct ?? null}, target_moisture_pct),
          target_temp_min_c   = COALESCE(${body.targetTempMinC ?? null}, target_temp_min_c),
          target_temp_max_c   = COALESCE(${body.targetTempMaxC ?? null}, target_temp_max_c),
          recipe_layers       = COALESCE(${body.recipeLayers ? db.json(body.recipeLayers as never) : null}, recipe_layers),
          build_checklist     = COALESCE(${body.buildChecklist ? db.json(body.buildChecklist as never) : null}, build_checklist),
          objectives          = COALESCE(${body.objectives ? db.json(body.objectives as never) : null}, objectives),
          updated_at          = now()
        WHERE id = ${pileId}
        RETURNING *
      `;
      return { data: mapRow(row as Row), meta: undefined, error: null };
    },
  );

  // DELETE /piles/:pileId — cascades to readings (FK ON DELETE CASCADE)
  fastify.delete<{ Params: { pileId: string } }>(
    '/piles/:pileId',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const { pileId } = ParamsPileId.parse(req.params);
      const { orgId, ownerId } = await getPileContext(db, pileId);
      await requireOrgOwnerOrResourceOwner(db, orgId, req.userId, ownerId);
      await db`DELETE FROM compost_piles WHERE id = ${pileId}`;
      reply.code(204);
      return '';
    },
  );
}
