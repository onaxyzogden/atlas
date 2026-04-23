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

      // Water phasing & dependency mapping — recommend a build order for on-site
      // water components and flag ordering violations from placed design_features.
      const placedRows = await db<{ subtype: string | null; phase_tag: string | null; label: string | null }[]>`
        SELECT subtype, phase_tag, label
        FROM design_features
        WHERE project_id = ${req.projectId}
          AND subtype IN (
            'pond', 'swale', 'check_dam', 'berm', 'rain_catchment',
            'water_tank', 'irrigation', 'wetland_restoration'
          )
      `;
      const summaryData = row.summary_data as Record<string, unknown>;
      const pondCandidateCount = (summaryData?.pondCandidates as { candidateCount?: number } | undefined)?.candidateCount ?? 0;
      const swaleCandidateCount = (summaryData?.swaleCandidates as { candidateCount?: number } | undefined)?.candidateCount ?? 0;
      const waterPhasing = computeWaterPhasing({
        placed: placedRows,
        pondCandidates: pondCandidateCount,
        swaleCandidates: swaleCandidateCount,
        hasWetland: Boolean(wetlandPlanning?.restorationOpportunity),
      });

      // Overflow / spillway routing — derived from pond candidates' meanSlope.
      const pondCandidatesArr =
        (summaryData?.pondCandidates as { candidates?: { meanSlope: number }[] } | undefined)?.candidates ?? [];
      let overflowRouting: HydrologyWaterSummaryT['overflowRouting'] | undefined;
      if (pondCandidatesArr.length > 0) {
        const slopes = pondCandidatesArr.map((p) => p.meanSlope).filter((s) => isFinite(s));
        const meanOverflowSlopeDeg = slopes.length > 0 ? slopes.reduce((a, b) => a + b, 0) / slopes.length : 0;
        const criticalCount = slopes.filter((s) => s > 8).length;
        const spillwayNotes = criticalCount > 0
          ? `${criticalCount} candidate(s) on steep terrain (>8°) — engineered spillway with armored overflow required. Design for 100-yr storm event.`
          : 'Overflow slopes are gentle — vegetated spillway with rock armoring at outlet is typically sufficient.';
        overflowRouting = {
          pondCount: pondCandidatesArr.length,
          meanOverflowSlopeDeg: Math.round(meanOverflowSlopeDeg * 10) / 10,
          criticalCount,
          spillwayNotes,
        };
      }

      // Roof catchment & rainwater storage — sum roof area across placed structures.
      const structureRows = await db<{ properties: unknown }[]>`
        SELECT properties
        FROM design_features
        WHERE project_id = ${req.projectId}
          AND feature_type = 'structure'
      `;
      let roofCatchment: HydrologyWaterSummaryT['roofCatchment'] | undefined;
      if (structureRows.length > 0 && precipMm > 0) {
        let totalRoofAreaM2 = 0;
        for (const s of structureRows) {
          const props = (s.properties ?? {}) as Record<string, unknown>;
          const roofRaw = props['roof_area_m2'] ?? props['roofAreaM2'] ?? props['area_m2'] ?? props['areaM2'];
          const roof = typeof roofRaw === 'number' ? roofRaw : parseFloat(String(roofRaw ?? ''));
          totalRoofAreaM2 += isFinite(roof) && roof > 0 ? roof : 120; // assumed 120 m² default
        }
        // RWH: area(m²) × precip(m) × 0.85 efficiency = m³; × 264.172 = gal
        const annualHarvestGal = totalRoofAreaM2 * (precipMm / 1000) * 0.85 * 264.172;
        const recommendedStorageGal = (annualHarvestGal / 12) * 1.5; // ~6wk buffer
        const totalRoofSqFt = totalRoofAreaM2 * 10.7639;
        const harvestPerSqFtGal = totalRoofSqFt > 0 ? annualHarvestGal / totalRoofSqFt : 0;
        const notes = structureRows.length === 1
          ? 'Single structure — route downspouts to a first-flush diverter before cistern inlet.'
          : 'Multiple structures — consider a shared cistern at lowest elevation to simplify plumbing.';
        roofCatchment = {
          structureCount: structureRows.length,
          totalRoofAreaM2: Math.round(totalRoofAreaM2),
          annualHarvestGal: Math.round(annualHarvestGal),
          recommendedStorageGal: Math.round(recommendedStorageGal),
          harvestPerSqFtGal: Math.round(harvestPerSqFtGal * 100) / 100,
          notes,
        };
      }

      // Gravity-fed irrigation & livestock water — count pond candidates in
      // the gravity-friendly slope band (1°–10°).
      let gravityIrrigation: HydrologyWaterSummaryT['gravityIrrigation'] | undefined;
      if (pondCandidatesArr.length > 0) {
        const gravityPondCount = pondCandidatesArr.filter((p) => p.meanSlope >= 1 && p.meanSlope <= 10).length;
        if (gravityPondCount > 0) {
          // Each gravity pond can typically serve ~2 ha downslope at parcel scale.
          const estimatedIrrigableHa = gravityPondCount * 2;
          const recommendedTroughCount = Math.max(1, Math.ceil(gravityPondCount / 2));
          const livestockAccessScore: 'low' | 'moderate' | 'high' =
            gravityPondCount >= 4 ? 'high' : gravityPondCount >= 2 ? 'moderate' : 'low';
          gravityIrrigation = {
            gravityPondCount,
            estimatedIrrigableHa,
            recommendedTroughCount,
            livestockAccessScore,
            notes: `${gravityPondCount} pond candidate(s) in the gravity-irrigation slope band — route pressure-compensated lines downslope; place troughs within 400 m of grazing cells.`,
          };
        }
      }

      const summary = HydrologyWaterSummary.parse({
        ...(row.summary_data as Record<string, unknown>),
        ...(waterBudget ? { waterBudget } : {}),
        ...(wetlandPlanning ? { wetlandPlanning } : {}),
        ...(waterPhasing ? { waterPhasing } : {}),
        ...(overflowRouting ? { overflowRouting } : {}),
        ...(roofCatchment ? { roofCatchment } : {}),
        ...(gravityIrrigation ? { gravityIrrigation } : {}),
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

// ── Water phasing & dependency mapping ────────────────────────────────
// Pure function: given placed design_features + candidate counts, derive a
// build-order recommendation and flag any ordering violations. Scope is §5
// diagnostic only; the real phasing UI lives in §15 Timeline.

type WaterComponent =
  | 'pond'
  | 'swale'
  | 'check_dam'
  | 'berm'
  | 'rain_catchment'
  | 'water_tank'
  | 'irrigation'
  | 'wetland_restoration';

interface PhaseRule {
  component: WaterComponent;
  recommendedPhase: 1 | 2 | 3 | 4;
  dependsOn: WaterComponent[];
  rationale: string;
}

const WATER_PHASE_RULES: PhaseRule[] = [
  { component: 'pond', recommendedPhase: 1, dependsOn: [], rationale: 'Earthworks first — ponds anchor the water storage network.' },
  { component: 'berm', recommendedPhase: 1, dependsOn: [], rationale: 'Berms shape overland flow; install with pond earthworks.' },
  { component: 'swale', recommendedPhase: 2, dependsOn: ['pond'], rationale: 'Swales route overflow from ponds along contour.' },
  { component: 'check_dam', recommendedPhase: 2, dependsOn: ['swale'], rationale: 'Check dams slow flow in swales and drainage lines.' },
  { component: 'water_tank', recommendedPhase: 2, dependsOn: [], rationale: 'Cistern capacity needed before catchment plumbing.' },
  { component: 'rain_catchment', recommendedPhase: 3, dependsOn: ['water_tank'], rationale: 'Roof catchment plumbs into existing storage.' },
  { component: 'wetland_restoration', recommendedPhase: 3, dependsOn: ['pond'], rationale: 'Wetland planting follows stable hydrology from ponds.' },
  { component: 'irrigation', recommendedPhase: 4, dependsOn: ['pond', 'water_tank'], rationale: 'Irrigation lines draw from established storage.' },
];

function computeWaterPhasing(input: {
  placed: { subtype: string | null; phase_tag: string | null; label: string | null }[];
  pondCandidates: number;
  swaleCandidates: number;
  hasWetland: boolean;
}): HydrologyWaterSummaryT['waterPhasing'] {
  const placedByType = new Map<string, { phase: string | null; label: string | null }[]>();
  for (const row of input.placed) {
    if (!row.subtype) continue;
    const arr = placedByType.get(row.subtype) ?? [];
    arr.push({ phase: row.phase_tag, label: row.label });
    placedByType.set(row.subtype, arr);
  }

  const components: NonNullable<HydrologyWaterSummaryT['waterPhasing']>['components'] = [];
  for (const rule of WATER_PHASE_RULES) {
    const placed = placedByType.get(rule.component) ?? [];
    let sourceCount = 0;
    let sourceKind: 'placed' | 'candidate' | 'recommended' = 'recommended';
    if (placed.length > 0) {
      sourceCount = placed.length;
      sourceKind = 'placed';
    } else if (rule.component === 'pond' && input.pondCandidates > 0) {
      sourceCount = input.pondCandidates;
      sourceKind = 'candidate';
    } else if (rule.component === 'swale' && input.swaleCandidates > 0) {
      sourceCount = input.swaleCandidates;
      sourceKind = 'candidate';
    } else if (rule.component === 'wetland_restoration' && input.hasWetland) {
      sourceCount = 1;
      sourceKind = 'candidate';
    }
    components.push({
      component: rule.component,
      recommendedPhase: rule.recommendedPhase,
      dependsOn: rule.dependsOn,
      rationale: rule.rationale,
      sourceCount,
      sourceKind,
    });
  }

  const relevant = components.some((c) => c.sourceKind !== 'recommended');
  if (!relevant) return undefined;

  // Violations: a placed feature whose assigned phase precedes any prerequisite
  // that is also placed but assigned to a later phase (or not placed at all
  // when the prerequisite is non-trivial).
  const PHASE_NUM: Record<string, number> = {
    'Phase 1': 1, 'Phase 2': 2, 'Phase 3': 3, 'Phase 4': 4,
    'P1': 1, 'P2': 2, 'P3': 3, 'P4': 4,
  };
  const violations: NonNullable<HydrologyWaterSummaryT['waterPhasing']>['violations'] = [];
  for (const rule of WATER_PHASE_RULES) {
    const placed = placedByType.get(rule.component) ?? [];
    for (const p of placed) {
      const assignedPhaseN = p.phase ? PHASE_NUM[p.phase] : undefined;
      if (!assignedPhaseN) continue;
      for (const req of rule.dependsOn) {
        const reqPlaced = placedByType.get(req) ?? [];
        if (reqPlaced.length === 0) {
          violations.push({
            component: p.label ?? rule.component,
            assignedPhase: p.phase ?? 'unassigned',
            missingPrerequisite: req,
            reason: `${rule.component} depends on ${req} but no ${req} is placed on this site.`,
          });
          continue;
        }
        const minReqPhase = Math.min(
          ...reqPlaced.map((r) => (r.phase ? PHASE_NUM[r.phase] ?? 99 : 99)),
        );
        if (minReqPhase > assignedPhaseN) {
          violations.push({
            component: p.label ?? rule.component,
            assignedPhase: p.phase ?? 'unassigned',
            missingPrerequisite: req,
            reason: `${rule.component} is scheduled in ${p.phase} but required ${req} is not built until a later phase.`,
          });
        }
      }
    }
  }

  const notes = violations.length > 0
    ? 'Ordering violations detected — review phase assignments on the timeline.'
    : 'Recommended sequence follows hydrologic dependencies: earthworks → conveyance → storage → use.';

  return { components, violations, notes };
}
