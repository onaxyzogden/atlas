/**
 * Portfolio POI routes — CRUD for the Portfolio Home resource POIs and their
 * POI↔project material flows.
 *
 * A POI is a steward-placed resource node on the Portfolio Map that is NOT a
 * project (composting depot, water source, feed store, aggregation point). It
 * connects to whole projects via directional material flows, modelling
 * inter-project resource exchange. POIs are display/awareness metadata only —
 * they have no effect on Plan, Act, or Observe logic.
 *
 * POIs are PORTFOLIO-scoped, not nested under a project param: they belong to a
 * user (`owner_id`), so routes live at the top-level prefix
 * /api/v1/portfolio-pois rather than under /:projectId. Authorisation is a
 * direct ownership gate (`portfolio_pois.owner_id = req.userId`); flow-create
 * additionally verifies the caller owns the LINKED project.
 *
 * This module owns the `portfolio_pois` + `poi_project_flows` tables
 * (migration 050). Mirrors the cross-project-relationships route conventions
 * (param schemas, safeParse→ValidationError shape-catch, mapRow ISO timestamps,
 * 23505→409).
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  CreatePortfolioPoiInput,
  UpdatePortfolioPoiInput,
  CreatePoiFlowInput,
  UpdatePoiFlowInput,
  type PortfolioPoi,
  type PoiProjectFlow,
} from '@ogden/shared';
import { AppError, ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors.js';

const ParamsPoiId = z.object({ poiId: z.string().uuid() });
const ParamsFlowId = z.object({ poiId: z.string().uuid(), flowId: z.string().uuid() });

// The shared zod instance can differ from the api package's, so
// `error instanceof ZodError` in the global handler misses. Catch by shape and
// rethrow as our own ValidationError (422 + structured payload). Mirrors the
// cross-project-relationships route.
function parseOrThrow<T>(schema: z.ZodType<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) {
    throw new ValidationError(
      'Request validation failed',
      r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  return r.data;
}

interface PoiRow {
  id: string;
  owner_id: string;
  name: string;
  poi_kind: string;
  lng: number;
  lat: number;
  notes: string | null;
  created_at: Date;
}

interface FlowRow {
  id: string;
  poi_id: string;
  project_id: string;
  material_kind: string;
  direction: string;
  label: string | null;
  mass_kg_per_month: number | null;
  volume_l_per_month: number | null;
  energy_kwh_per_month: number | null;
  nutrient_n_kg_per_month: number | null;
  nutrient_p_kg_per_month: number | null;
  nutrient_k_kg_per_month: number | null;
  notes: string | null;
  created_at: Date;
  project_name?: string | null;
}

function mapFlow(row: FlowRow): PoiProjectFlow {
  return {
    id: row.id,
    poiId: row.poi_id,
    projectId: row.project_id,
    materialKind: row.material_kind as PoiProjectFlow['materialKind'],
    direction: row.direction as PoiProjectFlow['direction'],
    label: row.label,
    massKgPerMonth: row.mass_kg_per_month,
    volumeLPerMonth: row.volume_l_per_month,
    energyKwhPerMonth: row.energy_kwh_per_month,
    nutrientNKgPerMonth: row.nutrient_n_kg_per_month,
    nutrientPKgPerMonth: row.nutrient_p_kg_per_month,
    nutrientKKgPerMonth: row.nutrient_k_kg_per_month,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    projectName: row.project_name ?? null,
  };
}

function mapPoi(row: PoiRow, flows: FlowRow[]): PortfolioPoi {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    poiKind: row.poi_kind as PortfolioPoi['poiKind'],
    lng: row.lng,
    lat: row.lat,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    flows: flows.map(mapFlow),
  };
}

export default async function portfolioPoiRoutes(fastify: FastifyInstance) {
  const { db, authenticate } = fastify;

  /** Load a POI and assert the caller owns it. Returns the row. */
  async function requireOwnedPoi(poiId: string, userId: string): Promise<PoiRow> {
    const [poi] = await db<PoiRow[]>`
      SELECT id, owner_id, name, poi_kind, lng, lat, notes, created_at
      FROM portfolio_pois WHERE id = ${poiId}
    `;
    if (!poi) throw new NotFoundError('Portfolio POI', poiId);
    if (poi.owner_id !== userId) {
      throw new ForbiddenError('You do not own this POI');
    }
    return poi;
  }

  // GET /portfolio-pois — list the caller's POIs with their flows.
  fastify.get('/', { preHandler: [authenticate] }, async (req) => {
    const pois = await db<PoiRow[]>`
      SELECT id, owner_id, name, poi_kind, lng, lat, notes, created_at
      FROM portfolio_pois
      WHERE owner_id = ${req.userId}
      ORDER BY created_at ASC
    `;

    const ids = pois.map((p) => p.id);
    let flows: FlowRow[] = [];
    if (ids.length > 0) {
      flows = await db<FlowRow[]>`
        SELECT f.id, f.poi_id, f.project_id, f.material_kind, f.direction,
               f.label, f.mass_kg_per_month, f.volume_l_per_month,
               f.energy_kwh_per_month, f.nutrient_n_kg_per_month,
               f.nutrient_p_kg_per_month, f.nutrient_k_kg_per_month,
               f.notes, f.created_at,
               p.name AS project_name
        FROM poi_project_flows f
        JOIN projects p ON p.id = f.project_id
        WHERE f.poi_id = ANY(${ids})
        ORDER BY f.created_at ASC
      `;
    }

    const flowsByPoi = new Map<string, FlowRow[]>();
    for (const f of flows) {
      const list = flowsByPoi.get(f.poi_id);
      if (list) list.push(f);
      else flowsByPoi.set(f.poi_id, [f]);
    }

    const data = pois.map((p) => mapPoi(p, flowsByPoi.get(p.id) ?? []));
    return { data, meta: { total: data.length }, error: null };
  });

  // POST /portfolio-pois — create a POI owned by the caller.
  fastify.post('/', { preHandler: [authenticate] }, async (req, reply) => {
    const input = parseOrThrow(CreatePortfolioPoiInput, req.body);
    const [row] = await db<PoiRow[]>`
      INSERT INTO portfolio_pois (owner_id, name, poi_kind, lng, lat, notes)
      VALUES (
        ${req.userId}, ${input.name}, ${input.poiKind},
        ${input.lng}, ${input.lat}, ${input.notes ?? null}
      )
      RETURNING id, owner_id, name, poi_kind, lng, lat, notes, created_at
    `;
    reply.code(201);
    return { data: mapPoi(row!, []), meta: undefined, error: null };
  });

  // PATCH /portfolio-pois/:poiId — update a POI (owner only).
  fastify.patch<{ Params: { poiId: string } }>(
    '/:poiId',
    { preHandler: [authenticate] },
    async (req) => {
      const { poiId } = ParamsPoiId.parse(req.params);
      const input = parseOrThrow(UpdatePortfolioPoiInput, req.body);
      const existing = await requireOwnedPoi(poiId, req.userId);

      const name = input.name ?? existing.name;
      const poiKind = input.poiKind ?? existing.poi_kind;
      const lng = input.lng ?? existing.lng;
      const lat = input.lat ?? existing.lat;
      const notes = input.notes !== undefined ? input.notes : existing.notes;

      const [row] = await db<PoiRow[]>`
        UPDATE portfolio_pois
        SET name = ${name}, poi_kind = ${poiKind}, lng = ${lng},
            lat = ${lat}, notes = ${notes}, updated_at = now()
        WHERE id = ${poiId}
        RETURNING id, owner_id, name, poi_kind, lng, lat, notes, created_at
      `;
      return { data: mapPoi(row!, []), meta: undefined, error: null };
    },
  );

  // DELETE /portfolio-pois/:poiId — delete a POI (cascades its flows).
  fastify.delete<{ Params: { poiId: string } }>(
    '/:poiId',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const { poiId } = ParamsPoiId.parse(req.params);
      await requireOwnedPoi(poiId, req.userId);
      await db`DELETE FROM portfolio_pois WHERE id = ${poiId}`;
      reply.code(204);
      return '';
    },
  );

  // POST /portfolio-pois/:poiId/flows — add a flow to a project the caller owns.
  fastify.post<{ Params: { poiId: string } }>(
    '/:poiId/flows',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const { poiId } = ParamsPoiId.parse(req.params);
      const input = parseOrThrow(CreatePoiFlowInput, req.body);
      await requireOwnedPoi(poiId, req.userId);

      // The linked project must exist and be owned by the caller — a steward
      // only wires POI flows to their own projects.
      const [project] = await db<{ id: string; owner_id: string }[]>`
        SELECT id, owner_id FROM projects WHERE id = ${input.projectId}
      `;
      if (!project) throw new NotFoundError('Project', input.projectId);
      if (project.owner_id !== req.userId) {
        throw new ForbiddenError('You do not own the linked project');
      }

      let row: FlowRow | undefined;
      try {
        [row] = await db<FlowRow[]>`
          INSERT INTO poi_project_flows (
            poi_id, project_id, material_kind, direction, label,
            mass_kg_per_month, volume_l_per_month, energy_kwh_per_month,
            nutrient_n_kg_per_month, nutrient_p_kg_per_month, nutrient_k_kg_per_month,
            notes
          ) VALUES (
            ${poiId}, ${input.projectId}, ${input.materialKind}, ${input.direction},
            ${input.label ?? null},
            ${input.massKgPerMonth ?? null}, ${input.volumeLPerMonth ?? null},
            ${input.energyKwhPerMonth ?? null}, ${input.nutrientNKgPerMonth ?? null},
            ${input.nutrientPKgPerMonth ?? null}, ${input.nutrientKKgPerMonth ?? null},
            ${input.notes ?? null}
          )
          RETURNING id, poi_id, project_id, material_kind, direction, label,
                    mass_kg_per_month, volume_l_per_month, energy_kwh_per_month,
                    nutrient_n_kg_per_month, nutrient_p_kg_per_month,
                    nutrient_k_kg_per_month, notes, created_at
        `;
      } catch (err) {
        // 23505 = unique_violation: this (poi, project, material, direction)
        // flow already exists.
        if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
          throw new AppError(
            'CONFLICT',
            'This material flow already exists between the POI and project',
            409,
          );
        }
        throw err;
      }

      reply.code(201);
      return { data: mapFlow(row!), meta: undefined, error: null };
    },
  );

  // PATCH /portfolio-pois/:poiId/flows/:flowId — update a flow (POI owner).
  fastify.patch<{ Params: { poiId: string; flowId: string } }>(
    '/:poiId/flows/:flowId',
    { preHandler: [authenticate] },
    async (req) => {
      const { poiId, flowId } = ParamsFlowId.parse(req.params);
      const input = parseOrThrow(UpdatePoiFlowInput, req.body);
      await requireOwnedPoi(poiId, req.userId);

      const [existing] = await db<FlowRow[]>`
        SELECT id, poi_id, project_id, material_kind, direction, label,
               mass_kg_per_month, volume_l_per_month, energy_kwh_per_month,
               nutrient_n_kg_per_month, nutrient_p_kg_per_month,
               nutrient_k_kg_per_month, notes, created_at
        FROM poi_project_flows WHERE id = ${flowId} AND poi_id = ${poiId}
      `;
      if (!existing) throw new NotFoundError('POI flow', flowId);

      // `undefined` means "field omitted — keep existing"; an explicit `null`
      // means "clear it". So merge with `!== undefined`, never `??`.
      const keep = (v: number | null | undefined, fallback: number | null): number | null =>
        v !== undefined ? v : fallback;

      const materialKind = input.materialKind ?? existing.material_kind;
      const direction = input.direction ?? existing.direction;
      const label = input.label !== undefined ? input.label : existing.label;
      const mass = keep(input.massKgPerMonth, existing.mass_kg_per_month);
      const volume = keep(input.volumeLPerMonth, existing.volume_l_per_month);
      const energy = keep(input.energyKwhPerMonth, existing.energy_kwh_per_month);
      const nutrientN = keep(input.nutrientNKgPerMonth, existing.nutrient_n_kg_per_month);
      const nutrientP = keep(input.nutrientPKgPerMonth, existing.nutrient_p_kg_per_month);
      const nutrientK = keep(input.nutrientKKgPerMonth, existing.nutrient_k_kg_per_month);
      const notes = input.notes !== undefined ? input.notes : existing.notes;

      const [row] = await db<FlowRow[]>`
        UPDATE poi_project_flows
        SET material_kind = ${materialKind}, direction = ${direction},
            label = ${label}, mass_kg_per_month = ${mass},
            volume_l_per_month = ${volume}, energy_kwh_per_month = ${energy},
            nutrient_n_kg_per_month = ${nutrientN},
            nutrient_p_kg_per_month = ${nutrientP},
            nutrient_k_kg_per_month = ${nutrientK}, notes = ${notes}
        WHERE id = ${flowId}
        RETURNING id, poi_id, project_id, material_kind, direction, label,
                  mass_kg_per_month, volume_l_per_month, energy_kwh_per_month,
                  nutrient_n_kg_per_month, nutrient_p_kg_per_month,
                  nutrient_k_kg_per_month, notes, created_at
      `;
      return { data: mapFlow(row!), meta: undefined, error: null };
    },
  );

  // DELETE /portfolio-pois/:poiId/flows/:flowId — remove a flow (POI owner).
  fastify.delete<{ Params: { poiId: string; flowId: string } }>(
    '/:poiId/flows/:flowId',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const { poiId, flowId } = ParamsFlowId.parse(req.params);
      await requireOwnedPoi(poiId, req.userId);

      const [existing] = await db<{ id: string }[]>`
        SELECT id FROM poi_project_flows WHERE id = ${flowId} AND poi_id = ${poiId}
      `;
      if (!existing) throw new NotFoundError('POI flow', flowId);

      await db`DELETE FROM poi_project_flows WHERE id = ${flowId}`;
      reply.code(204);
      return '';
    },
  );
}
