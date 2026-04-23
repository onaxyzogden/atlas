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
      const [project] = await db<{ acreage: string | null; country: string | null }[]>`
        SELECT acreage::text, country FROM projects WHERE id = ${req.projectId}
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

      // Wetland & riparian planning — rule-based block from wetlands_flood layer.
      let wetlandPlanning: HydrologyWaterSummaryT['wetlandPlanning'] | undefined;
      if (byType['wetlands_flood']) {
        const featureCount = numField(wetS, 'wetland_feature_count');
        const hasForested = Boolean(wetS['has_forested_wetland']);
        const hasEmergent = Boolean(wetS['has_emergent_wetland']);
        const dominantSystem = strField(wetS, 'dominant_wetland_system') || 'Unknown';
        const nwiCodes = Array.isArray(wetS['nwi_codes'])
          ? (wetS['nwi_codes'] as unknown[]).filter((c): c is string => typeof c === 'string')
          : [];
        const sfha = Boolean(wetS['sfha']);
        const regulated = Boolean(wetS['regulated']);
        const requiresPermits = Boolean(wetS['requires_permits']);

        // Coverage % — estimated from feature count until polygon-area intersection.
        // Rule of thumb: each NWI polygon averages ~2 ha at parcel scale; cap at 80%.
        const acresProp = acreage ?? 10;
        const estimatedHa = featureCount * 2;
        const coveragePct = Math.min(80, Math.round((estimatedHa / (acresProp * 0.4047)) * 100 * 10) / 10);

        // Setback recommendation by wetland class
        const recommendedSetbackM = hasForested ? 30 : hasEmergent ? 15 : sfha ? 10 : 0;

        // Buffer recommendation by dominant system + mean slope
        const slopeDeg = numField(elevS, 'mean_slope_deg');
        const slopeFactor = slopeDeg > 15 ? 1.5 : slopeDeg > 8 ? 1.2 : 1.0;
        const baseBuffer = dominantSystem === 'Riverine' ? 60
          : dominantSystem === 'Lacustrine' ? 50
          : hasForested ? 45
          : hasEmergent ? 30
          : 15;
        const recommendedBufferM = Math.round(baseBuffer * slopeFactor);

        // Restoration opportunity: forested/emergent wetland present outside active SFHA
        const restorationOpportunity = (hasForested || hasEmergent) && !sfha;

        // Regulatory notes by country
        const country = project?.country ?? 'US';
        const regulatoryNotes = country === 'CA'
          ? 'Ontario: Provincially Significant Wetlands protected under ESA 2007; Conservation Authority permits required within regulated areas.'
          : sfha
          ? 'US: FEMA SFHA — development requires floodplain development permit + possible LOMA. Wetlands may trigger CWA §404 Section 10 review.'
          : regulated
          ? 'US: Wetlands present — CWA §404 permit (Army Corps) may be required for fill or disturbance. Consult state/local regulations.'
          : 'US: No SFHA or wetland triggers identified. Confirm local zoning setbacks before disturbing riparian margins.';

        wetlandPlanning = {
          coveragePct,
          dominantSystem,
          hasForested,
          hasEmergent,
          nwiCodes,
          sfha,
          regulated,
          requiresPermits,
          recommendedSetbackM,
          recommendedBufferM,
          restorationOpportunity,
          regulatoryNotes,
        };
      }

      const summary = HydrologyWaterSummary.parse({
        ...(row.summary_data as Record<string, unknown>),
        ...(waterBudget ? { waterBudget } : {}),
        ...(wetlandPlanning ? { wetlandPlanning } : {}),
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
