/**
 * Soil-regeneration routes — D.3 + F.3.
 *
 * Producer of the per-year SOM trajectory backing the Apricot-Lane J-curve
 * (migration 031, `som_trajectory_yearly`). D.3 emitted whole-project
 * rows only; F.3 adds optional per-zone series via the `zones[]` POST
 * payload and the `?zoneId` GET query, both fully backward-compatible.
 *
 * Covenant: appreciation of stewarded land value, not investor yield.
 * See [[fiqh-csra-erased-2026-05-04]].
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  projectSomTrajectory,
  projectSomTrajectoryWithZones,
} from '../../services/terrain/algorithms/soilRegeneration.js';
import type { SomYearRow } from '../../services/terrain/algorithms/soilRegeneration.js';

const ParamsProjectId = z.object({ projectId: z.string().uuid() });

const ZoneTrajectoryBody = z.object({
  zoneId: z.string().min(1).max(128),
  baseline_pct: z.number().min(0).max(20),
  target_pct: z.number().min(0).max(20),
  annualSeqRate_tChaYr: z.number().min(0).max(10),
});

const RecomputeBody = z.object({
  baseline_pct: z.number().min(0).max(20),
  target_pct: z.number().min(0).max(20),
  annualSeqRate_tChaYr: z.number().min(0).max(10),
  horizonYears: z.number().int().min(1).max(50).default(10),
  regenerationStartYear: z.number().int().min(0).max(50).default(0),
  // F.3: optional per-zone trajectories. Each entry uses the
  // project-level horizonYears + regenerationStartYear; only the
  // baseline / target / mature seq rate vary per zone.
  zones: z.array(ZoneTrajectoryBody).max(50).optional(),
});

const GetQuery = z.object({
  // F.3: filter to a specific zone trajectory. Omit (or pass empty)
  // to get the whole-project rows (the D.3 default behaviour).
  zoneId: z.string().min(1).max(128).optional(),
});

function parseRow(row: Record<string, unknown>): SomYearRow {
  return {
    year: Number(row['year']),
    som_stock_tc: Number(row['som_stock_tc']),
    sequestration_tcyr: Number(row['sequestration_tcyr']),
    j_curve_stage: String(row['j_curve_stage']) as SomYearRow['j_curve_stage'],
  };
}

export default async function soilRegenerationRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole, requireRole } = fastify;

  // GET /project/:projectId/som-trajectory — any project member.
  // F.3: optional ?zoneId filter; default = whole-project rows (zone_id IS NULL).
  fastify.get<{ Params: { projectId: string }; Querystring: { zoneId?: string } }>(
    '/project/:projectId/som-trajectory',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      const { projectId } = ParamsProjectId.parse(req.params);
      const { zoneId } = GetQuery.parse(req.query ?? {});

      const rows = zoneId
        ? await db`
            SELECT year, som_stock_tc, sequestration_tcyr, j_curve_stage
            FROM som_trajectory_yearly
            WHERE project_id = ${projectId} AND zone_id = ${zoneId}
            ORDER BY year ASC
          `
        : await db`
            SELECT year, som_stock_tc, sequestration_tcyr, j_curve_stage
            FROM som_trajectory_yearly
            WHERE project_id = ${projectId} AND zone_id IS NULL
            ORDER BY year ASC
          `;

      return { data: rows.map(parseRow), meta: { total: rows.length }, error: null };
    },
  );

  // POST /project/:projectId/som-trajectory/recompute — owner | designer.
  // Whole-project rows are upserted via DELETE-then-INSERT inside a
  // transaction to side-step the NULL-zone UNIQUE quirk (Postgres treats
  // NULL as distinct in UNIQUE constraints).
  // F.3: when `zones[]` is present, also DELETE-then-INSERT per-zone
  // rows scoped by (project_id, zone_id, year). UNIQUE behaves normally
  // for non-NULL zone_id, so an INSERT after the scoped DELETE is safe.
  fastify.post<{ Params: { projectId: string } }>(
    '/project/:projectId/som-trajectory/recompute',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner', 'designer')] },
    async (req) => {
      const { projectId } = ParamsProjectId.parse(req.params);
      const body = RecomputeBody.parse(req.body);

      const { projectRows, zoneRows } = projectSomTrajectoryWithZones(body);

      await db.begin(async (sql: any) => {
        await sql`
          DELETE FROM som_trajectory_yearly
          WHERE project_id = ${projectId} AND zone_id IS NULL
        `;
        for (const row of projectRows) {
          await sql`
            INSERT INTO som_trajectory_yearly (
              project_id, zone_id, year,
              som_stock_tc, sequestration_tcyr, j_curve_stage, source
            ) VALUES (
              ${projectId}, NULL, ${row.year},
              ${row.som_stock_tc}, ${row.sequestration_tcyr},
              ${row.j_curve_stage}, 'modeled'
            )
          `;
        }

        // F.3: clear + reinsert per-zone rows for any zone in this payload.
        const touchedZoneIds = Array.from(new Set(zoneRows.map((r) => r.zoneId)));
        for (const zoneId of touchedZoneIds) {
          await sql`
            DELETE FROM som_trajectory_yearly
            WHERE project_id = ${projectId} AND zone_id = ${zoneId}
          `;
        }
        for (const row of zoneRows) {
          await sql`
            INSERT INTO som_trajectory_yearly (
              project_id, zone_id, year,
              som_stock_tc, sequestration_tcyr, j_curve_stage, source
            ) VALUES (
              ${projectId}, ${row.zoneId}, ${row.year},
              ${row.som_stock_tc}, ${row.sequestration_tcyr},
              ${row.j_curve_stage}, 'modeled'
            )
          `;
        }
      });

      return {
        data: {
          rowCount: projectRows.length + zoneRows.length,
          trajectory: projectRows,
          zoneRowCount: zoneRows.length,
          zoneIds: Array.from(new Set(zoneRows.map((r) => r.zoneId))),
        },
        meta: undefined,
        error: null,
      };
    },
  );
}

// Re-export for callers that still want the v1 producer without the zones wrapper.
export { projectSomTrajectory };
