import type { FastifyInstance } from 'fastify';
import { HydrologyWaterResponse, HydrologyWaterSummary } from '@ogden/shared';

/**
 * Section 5 — Hydrology & Water Systems Planning ([P1])
 *
 * Canonical read-path for the three P1 items of the feature manifest:
 *   - water-flow-runoff-visualization
 *   - watershed-delineation
 *   - drainage-line-flood-accumulation
 *
 * The data itself is written by WatershedRefinementProcessor (Tier-3
 * pipeline) into project_layers as layer_type='watershed_derived'. This
 * route surfaces the typed envelope; it does not recompute anything.
 */
export default async function hydrology_waterRoutes(fastify: FastifyInstance) {
  const { db, authenticate, resolveProjectRole } = fastify;

  fastify.get<{ Params: { projectId: string } }>(
    '/:projectId',
    { preHandler: [authenticate, fastify.requirePhase('P1'), resolveProjectRole] },
    async (req) => {
      const [boundary] = await db`
        SELECT parcel_boundary IS NOT NULL AS has_boundary
        FROM projects WHERE id = ${req.projectId}
      `;
      if (!boundary?.has_boundary) {
        return {
          data: HydrologyWaterResponse.parse({
            status: 'not_ready',
            projectId: req.projectId,
            reason: 'no_boundary',
          }),
          meta: undefined,
          error: null,
        };
      }

      const [row] = await db`
        SELECT
          summary_data, geojson_data, fetch_status,
          attribution_text, data_date, fetched_at
        FROM project_layers
        WHERE project_id = ${req.projectId}
          AND layer_type = 'watershed_derived'
      `;

      if (!row || row.fetch_status !== 'complete' || !row.summary_data) {
        const reason =
          !row || row.fetch_status === 'pending' || row.fetch_status === 'fetching'
            ? 'pipeline_pending'
            : 'pipeline_failed';
        return {
          data: HydrologyWaterResponse.parse({
            status: 'not_ready',
            projectId: req.projectId,
            reason,
          }),
          meta: undefined,
          error: null,
        };
      }

      const summary = HydrologyWaterSummary.parse(row.summary_data);
      return {
        data: HydrologyWaterResponse.parse({
          status: 'ready',
          projectId: req.projectId,
          summary,
          geojson: row.geojson_data ?? { type: 'FeatureCollection', features: [] },
          attribution: row.attribution_text ?? null,
          dataDate: row.data_date ? new Date(row.data_date).toISOString().slice(0, 10) : null,
          fetchedAt: row.fetched_at ? new Date(row.fetched_at).toISOString() : null,
        }),
        meta: undefined,
        error: null,
      };
    },
  );
}
