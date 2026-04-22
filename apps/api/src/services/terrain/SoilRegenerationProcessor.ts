/**
 * SoilRegenerationProcessor — orchestrates 5 soil regeneration analyses
 * and stores results in project_layers with layer_type 'soil_regeneration'.
 *
 * Triggered as a BullMQ job after Tier 1 soils + land cover fetches complete
 * (from processTier1Job). Does NOT depend on terrain analysis.
 *
 * Operates on zone-based data (soil polygons + land cover polygons) rather
 * than raster grids — a key architectural difference from terrain/watershed/
 * microclimate processors.
 *
 * Confidence inherits from the lower of soils and land cover source confidence.
 */

import type postgres from 'postgres';
import {
  computeRestorationPriority,
  computeDisturbedLand,
  computeCarbonSequestration,
  computeInterventionRecommendations,
  computeRegenerationSequence,
  landCoverToDisturbance,
  drainageToCompaction,
  type SoilZone,
  type LandCoverZone,
  type AnalysisZone,
} from './algorithms/soilRegeneration.js';

interface SoilRegenContext {
  projectId: string;
  bbox: [number, number, number, number];
  zones: AnalysisZone[];
  confidence: 'high' | 'medium' | 'low';
  dataSources: string[];
}

export class SoilRegenerationProcessor {
  constructor(private readonly db: postgres.Sql) {}

  async process(projectId: string): Promise<void> {
    const ctx = await this.loadContext(projectId);
    if (!ctx) {
      throw new Error(`Project ${projectId}: missing boundary or source layers not ready`);
    }

    // Run all 5 analyses (some depend on prior results)
    const restorationPriority = computeRestorationPriority(ctx.zones);
    const disturbedLand = computeDisturbedLand(ctx.zones);
    const carbonSequestration = computeCarbonSequestration(ctx.zones);
    const interventions = computeInterventionRecommendations(ctx.zones);
    const sequence = computeRegenerationSequence(ctx.zones, disturbedLand, interventions);

    const computedAt = new Date().toISOString();

    // Assemble summary with WithConfidence shape
    const summaryData = {
      restorationPriority: {
        totalAreaHa: restorationPriority.totalAreaHa,
        criticalAreaPct: restorationPriority.criticalAreaPct,
        highPriorityAreaPct: restorationPriority.highPriorityAreaPct,
        zones: restorationPriority.zones,
      },
      disturbedLand: {
        disturbedAreaPct: disturbedLand.disturbedAreaPct,
        dominantDisturbance: disturbedLand.dominantDisturbance,
        zones: disturbedLand.zones,
      },
      carbonSequestration: {
        totalCurrentSOC_tC: carbonSequestration.totalCurrentSOC_tC,
        totalPotentialSOC_tC: carbonSequestration.totalPotentialSOC_tC,
        totalAnnualSeq_tCyr: carbonSequestration.totalAnnualSeq_tCyr,
        meanSeqPotential: carbonSequestration.meanSeqPotential,
        zones: carbonSequestration.zones,
      },
      interventions: {
        interventionSummary: interventions.interventionSummary,
        zones: interventions.zones,
      },
      regenerationSequence: {
        sitewidePhaseSummary: sequence.sitewidePhaseSummary,
        zones: sequence.zones,
      },
      confidence: ctx.confidence,
      dataSources: ctx.dataSources,
      computedAt,
    };

    // Assemble GeoJSON — zone-based point features at bbox subdivision centroids
    const geojsonFeatures = ctx.zones.map((zone) => {
      const priority = restorationPriority.zones.find((z) => z.zoneId === zone.zoneId);
      const disturbed = disturbedLand.zones.find((z) => z.zoneId === zone.zoneId);
      const carbon = carbonSequestration.zones.find((z) => z.zoneId === zone.zoneId);
      const intervention = interventions.zones.find((z) => z.zoneId === zone.zoneId);

      // Approximate centroid from zone index and bbox
      const centroid = zoneIndexToCentroid(zone.zoneId, ctx.zones.length, ctx.bbox);

      return {
        type: 'Feature' as const,
        properties: {
          zoneId: zone.zoneId,
          priorityClass: priority?.priorityClass ?? 'low',
          priorityScore: priority?.priorityScore ?? 0,
          disturbanceType: disturbed?.disturbanceType ?? 'intact',
          severityScore: disturbed?.severityScore ?? 0,
          sequestrationPotential: carbon?.sequestrationPotential ?? 'low',
          annualSeqRate: carbon?.annualSeqRate_tChaYr ?? 0,
          primaryIntervention: intervention?.primaryIntervention ?? 'cover_crop_candidate',
          suitabilityScore: intervention?.suitabilityScore ?? 0,
          areaHa: zone.areaHa,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: centroid,
        },
      };
    });

    const geojsonData = {
      type: 'FeatureCollection',
      features: geojsonFeatures,
    };

    const dataDate = computedAt.split('T')[0] ?? computedAt;

    // UPSERT into project_layers as soil_regeneration
    await this.db`
      INSERT INTO project_layers (
        project_id, layer_type, source_api, fetch_status,
        confidence, data_date, attribution_text,
        geojson_data, summary_data, metadata, fetched_at
      ) VALUES (
        ${ctx.projectId},
        'soil_regeneration',
        ${'derived_soil_regeneration'},
        'complete',
        ${ctx.confidence},
        ${dataDate},
        ${'Derived from soil survey data and land cover classification'},
        ${JSON.stringify(geojsonData)},
        ${JSON.stringify(summaryData)},
        ${JSON.stringify({
          zoneCount: ctx.zones.length,
          sourceLayerCount: ctx.dataSources.length,
        })},
        now()
      )
      ON CONFLICT (project_id, layer_type) DO UPDATE SET
        source_api       = EXCLUDED.source_api,
        fetch_status     = EXCLUDED.fetch_status,
        confidence       = EXCLUDED.confidence,
        data_date        = EXCLUDED.data_date,
        attribution_text = EXCLUDED.attribution_text,
        geojson_data     = EXCLUDED.geojson_data,
        summary_data     = EXCLUDED.summary_data,
        metadata         = EXCLUDED.metadata,
        fetched_at       = EXCLUDED.fetched_at
    `;
  }

  private async loadContext(projectId: string): Promise<SoilRegenContext | null> {
    // Load project boundary
    const [project] = await this.db`
      SELECT
        p.id, p.country,
        ST_XMin(p.parcel_boundary::geometry) AS min_lon,
        ST_YMin(p.parcel_boundary::geometry) AS min_lat,
        ST_XMax(p.parcel_boundary::geometry) AS max_lon,
        ST_YMax(p.parcel_boundary::geometry) AS max_lat
      FROM projects p
      WHERE p.id = ${projectId} AND p.parcel_boundary IS NOT NULL
    `;

    if (!project) return null;

    const bbox: [number, number, number, number] = [
      Number(project.min_lon),
      Number(project.min_lat),
      Number(project.max_lon),
      Number(project.max_lat),
    ];

    // Load source layers
    const layers = await this.db`
      SELECT layer_type, fetch_status, confidence, summary_data
      FROM project_layers
      WHERE project_id = ${projectId}
        AND layer_type IN ('soils', 'land_cover', 'elevation')
    `;

    const getLayer = (type: string) =>
      layers.find((l) => (l as Record<string, unknown>).layer_type === type);

    const soilsLayer = getLayer('soils');
    const landCoverLayer = getLayer('land_cover');
    const elevationLayer = getLayer('elevation');

    // Guard: required inputs must be fetched and have summary_data. Without
    // this check the parsers silently fall through to hard-coded defaults
    // ("1 zone, loam, 3% OM"), producing a meaningless assessment. Fail loudly
    // instead so the job is marked failed and the writer's gate stays closed.
    const needsSoils =
      !soilsLayer ||
      soilsLayer.fetch_status !== 'complete' ||
      soilsLayer.summary_data == null;
    const needsLandCover =
      !landCoverLayer ||
      landCoverLayer.fetch_status !== 'complete' ||
      landCoverLayer.summary_data == null;
    if (needsSoils || needsLandCover) {
      const missing: string[] = [];
      if (needsSoils) missing.push(`soils(status=${soilsLayer?.fetch_status ?? 'missing'})`);
      if (needsLandCover) missing.push(`land_cover(status=${landCoverLayer?.fetch_status ?? 'missing'})`);
      throw new Error(
        `soil_regeneration: required Tier-1 layers not ready — ${missing.join(', ')}`,
      );
    }

    // Parse soils into SoilZone[]
    const soilZones = parseSoilZones(soilsLayer, elevationLayer, bbox);

    // Parse land cover into LandCoverZone[]
    const landCoverZones = parseLandCoverZones(landCoverLayer, bbox);

    // Combine into AnalysisZone[] — 1:1 pairing
    const zoneCount = Math.max(soilZones.length, landCoverZones.length);
    const zones: AnalysisZone[] = [];
    for (let i = 0; i < zoneCount; i++) {
      const soil = soilZones[i % soilZones.length]!;
      const lc = landCoverZones[i % landCoverZones.length]!;
      zones.push({
        zoneId: i,
        soil,
        landCover: lc,
        slopeDeg: soil.slopeDeg,
        areaHa: Math.min(soil.areaHa, lc.areaHa),
      });
    }

    // Confidence = lower of soils and land_cover
    const soilsConf = (soilsLayer?.confidence as 'high' | 'medium' | 'low') ?? 'low';
    const lcConf = (landCoverLayer?.confidence as 'high' | 'medium' | 'low') ?? 'low';
    const confidence = lowerConfidence(soilsConf, lcConf);

    const dataSources: string[] = ['soils', 'land_cover'];
    if (elevationLayer) dataSources.push('elevation');

    return { projectId, bbox, zones, confidence, dataSources };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseSoilZones(
  soilsLayer: Record<string, unknown> | undefined,
  elevationLayer: Record<string, unknown> | undefined,
  bbox: [number, number, number, number],
): SoilZone[] {
  const summary = soilsLayer?.summary_data as Record<string, unknown> | null;
  const elevSummary = elevationLayer?.summary_data as Record<string, unknown> | null;
  const defaultSlope = (elevSummary?.meanSlope as number) ?? 5;

  // If summary contains a zones array, parse it
  const rawZones = summary?.zones as Array<Record<string, unknown>> | undefined;
  if (rawZones && rawZones.length > 0) {
    return rawZones.map((z, i) => ({
      id: i,
      drainageClass: (z.drainageClass as SoilZone['drainageClass']) ?? 'moderate',
      organicMatterPct: (z.organicMatterPct as number) ?? 3.0,
      textureClass: (z.textureClass as SoilZone['textureClass']) ?? 'loam',
      compactionRisk: drainageToCompaction((z.drainageClass as string) ?? 'moderate'),
      slopeDeg: (z.slopeDeg as number) ?? defaultSlope,
      areaHa: (z.areaHa as number) ?? estimateAreaHa(bbox),
    }));
  }

  // Fallback: single default zone from summary-level fields or defaults
  const drainage = (summary?.drainageClass as SoilZone['drainageClass']) ?? 'moderate';
  return [{
    id: 0,
    drainageClass: drainage,
    organicMatterPct: (summary?.organicMatterPct as number) ?? 3.0,
    textureClass: (summary?.textureClass as SoilZone['textureClass']) ?? 'loam',
    compactionRisk: drainageToCompaction(drainage),
    slopeDeg: defaultSlope,
    areaHa: estimateAreaHa(bbox),
  }];
}

function parseLandCoverZones(
  landCoverLayer: Record<string, unknown> | undefined,
  bbox: [number, number, number, number],
): LandCoverZone[] {
  const summary = landCoverLayer?.summary_data as Record<string, unknown> | null;

  // If summary contains a zones/classes array, parse it
  const rawZones = (summary?.zones ?? summary?.classes) as Array<Record<string, unknown>> | undefined;
  if (rawZones && rawZones.length > 0) {
    return rawZones.map((z, i) => {
      const coverClass = (z.coverClass ?? z.className ?? z.name ?? 'grassland') as string;
      return {
        id: i,
        coverClass,
        disturbanceLevel: (z.disturbanceLevel as number) ?? landCoverToDisturbance(coverClass),
        areaHa: (z.areaHa as number) ?? estimateAreaHa(bbox),
      };
    });
  }

  // Fallback: single zone
  const coverClass = (summary?.dominantClass as string) ?? 'grassland';
  return [{
    id: 0,
    coverClass,
    disturbanceLevel: landCoverToDisturbance(coverClass),
    areaHa: estimateAreaHa(bbox),
  }];
}

function estimateAreaHa(bbox: [number, number, number, number]): number {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const centerLat = (minLat + maxLat) / 2;
  const latSpanM = (maxLat - minLat) * 111320;
  const lngSpanM = (maxLon - minLon) * 111320 * Math.cos((centerLat * Math.PI) / 180);
  return +((latSpanM * lngSpanM) / 10000).toFixed(2); // m² to ha
}

function zoneIndexToCentroid(
  zoneId: number,
  totalZones: number,
  bbox: [number, number, number, number],
): [number, number] {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  if (totalZones <= 1) {
    return [(minLon + maxLon) / 2, (minLat + maxLat) / 2];
  }
  // Distribute centroids evenly across the bbox
  const cols = Math.ceil(Math.sqrt(totalZones));
  const row = Math.floor(zoneId / cols);
  const col = zoneId % cols;
  const rows = Math.ceil(totalZones / cols);
  return [
    minLon + ((col + 0.5) / cols) * (maxLon - minLon),
    maxLat - ((row + 0.5) / rows) * (maxLat - minLat),
  ];
}

function lowerConfidence(
  a: 'high' | 'medium' | 'low',
  b: 'high' | 'medium' | 'low',
): 'high' | 'medium' | 'low' {
  const rank = { high: 2, medium: 1, low: 0 };
  const minRank = Math.min(rank[a], rank[b]);
  return minRank === 2 ? 'high' : minRank === 1 ? 'medium' : 'low';
}
