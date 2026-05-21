/**
 * Soil-regeneration routes — D.3.
 *
 * Producer of the per-year SOM trajectory backing the Apricot-Lane J-curve
 * (migration 031, `som_trajectory_yearly`). Whole-project rows (zone_id
 * NULL) only in v1; per-zone series is deferred.
 *
 * Covenant: appreciation of stewarded land value, not investor yield.
 * See [[fiqh-csra-erased-2026-05-04]].
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { projectSomTrajectory } from '../../services/terrain/algorithms/soilRegeneration.js';
import type { SomYearRow } from '../../services/terrain/algorithms/soilRegeneration.js';

const ParamsProjectId = z.object({ projectId: z.string().uuid() });

const RecomputeBody = z.object({
  baseline_pct: z.number().min(0).max(20),
  target_pct: z.number().min(0).max(20),
  annualSeqRate_tChaYr: z.number().min(0).max(10),
  horizonYears: z.number().int().min(1).max(50).default(10),
  regenerationStartYear: z.number().int().min(0).max(50).default(0),
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
  fastify.get<{ Params: { projectId: string } }>(
    '/project/:projectId/som-trajectory',
    { preHandler: [authenticate, resolveProjectRole] },
    async (req) => {
      const { projectId } = ParamsProjectId.parse(req.params);

      const rows = await db`
        SELECT year, som_stock_tc, sequestration_tcyr, j_curve_stage
        FROM som_trajectory_yearly
        WHERE project_id = ${projectId} AND zone_id IS NULL
        ORDER BY year ASC
      `;

      return { data: rows.map(parseRow), meta: { total: rows.length }, error: null };
    },
  );

  // POST /project/:projectId/som-trajectory/recompute — owner | designer.
  // DELETE-then-INSERT inside a transaction to side-step the NULL-zone UNIQUE
  // quirk (Postgres treats NULL as distinct in UNIQUE constraints).
  fastify.post<{ Params: { projectId: string } }>(
    '/project/:projectId/som-trajectory/recompute',
    { preHandler: [authenticate, resolveProjectRole, requireRole('owner', 'designer')] },
    async (req) => {
      const { projectId } = ParamsProjectId.parse(req.params);
      const body = RecomputeBody.parse(req.body);

      const trajectory = projectSomTrajectory(body);

      await db.begin(async (sql: any) => {
        await sql`
          DELETE FROM som_trajectory_yearly
          WHERE project_id = ${projectId} AND zone_id IS NULL
        `;
        for (const row of trajectory) {
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
      });

      return {
        data: { rowCount: trajectory.length, trajectory },
        meta: undefined,
        error: null,
      };
    },
  );
}
