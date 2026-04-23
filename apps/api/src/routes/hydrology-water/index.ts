import type { FastifyInstance } from 'fastify';
import { HydrologyWaterResponse, HydrologyWaterSummary, type HydrologyWaterSummary as HydrologyWaterSummaryT } from '@ogden/shared';
import { computeHydrologyMetrics } from '@ogden/shared/scoring';

type SummaryRecord = Record<string, unknown>;
function summaryOf(row: { summary_data: unknown } | undefined): SummaryRecord {
  const raw = row?.summary_data;
  return raw && typeof raw === 'object' ? (raw as SummaryRecord) : {};
}
function numField(s: SummaryRecord, k: string): number {
  const v = s[k];
  return typeof v === 'number' && isFinite(v) ? v : 0;
}
function strField(s: SummaryRecord, k: string): string {
  const v = s[k];
  return typeof v === 'string' ? v : '';
}

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

      // Water budget — derive on the fly from climate/soils/elevation/wetlands
      // layers. Block is optional; omitted if any supporting layer is absent.
      const [project] = await db<{ acreage: string | null }[]>`
        SELECT acreage::text FROM projects WHERE id = ${req.projectId}
      `;
      const supportingRows = await db<{
        layer_type: string;
        summary_data: unknown;
      }[]>`
        SELECT layer_type, summary_data
        FROM project_layers
        WHERE project_id = ${req.projectId}
          AND fetch_status = 'complete'
          AND layer_type IN ('climate', 'soils', 'elevation', 'wetlands_flood', 'watershed')
      `;
      const byType = Object.fromEntries(
        supportingRows.map((r) => [r.layer_type, r]),
      );
      const climateS = summaryOf(byType['climate']);
      const soilsS = summaryOf(byType['soils']);
      const elevS = summaryOf(byType['elevation']);
      const wetS = summaryOf(byType['wetlands_flood']);
      const watershedS = summaryOf(byType['watershed']);

      const precipMm = numField(climateS, 'annual_precip_mm');
      const acreage = project?.acreage !== null && project?.acreage !== undefined
        ? parseFloat(project.acreage) : null;

      let waterBudget: HydrologyWaterSummaryT['waterBudget'] | undefined;
      if (precipMm > 0 && acreage && acreage > 0) {
        const monthlyNormals = (climateS['_monthly_normals'] as
          { month: number; mean_max_c: number | null; mean_min_c: number | null; precip_mm: number }[] | undefined) ?? null;
        const catchRaw = parseFloat(String(watershedS['catchment_area_ha'] ?? ''));
        const hm = computeHydrologyMetrics({
          precipMm,
          catchmentHa: isFinite(catchRaw) ? catchRaw : null,
          propertyAcres: acreage,
          slopeDeg: numField(elevS, 'mean_slope_deg') || 3,
          hydrologicGroup: strField(soilsS, 'hydrologic_group') || 'B',
          drainageClass: strField(soilsS, 'drainage_class') || 'well drained',
          floodZone: strField(wetS, 'flood_zone') || 'Zone X',
          wetlandPct: numField(wetS, 'wetland_pct'),
          annualTempC: numField(climateS, 'annual_temp_mean_c') || 9,
          monthlyNormals,
          awcCmCm: numField(soilsS, 'awc_cm_cm'),
          rootingDepthCm: numField(soilsS, 'rooting_depth_cm'),
        });
        waterBudget = {
          annualRainfallGal: hm.annualRainfallGal,
          rwhPotentialGal: hm.rwhPotentialGal,
          recommendedStorageGal: hm.rwhStorageGal,
          irrigationDemandGal: hm.irrigationDemandGal,
          surplusGal: hm.surplusGal,
          droughtBufferDays: hm.droughtBufferDays,
          waterBalanceMm: hm.waterBalanceMm,
          aridityClass: hm.aridityClass,
        };
      }

      const summary = HydrologyWaterSummary.parse({
        ...(row.summary_data as Record<string, unknown>),
        ...(waterBudget ? { waterBudget } : {}),
      });
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
