/**
 * PollinatorOpportunityProcessor — emits a pollinator-specific opportunity
 * layer: patch grid of cells labelled by habitat quality and corridor role,
 * plus a site-wide corridorReadiness index.
 *
 * Design contract with the rest of the pipeline:
 *
 *   - Reads `land_cover` + `wetlands_flood` summaries + project centroid.
 *   - Emits `project_layers.pollinator_opportunity` (geojson_data +
 *     summary_data). Does NOT participate in scoring: computeScores.ts
 *     does not reference pollinator_opportunity, so verify-scoring-parity
 *     stays at delta 0.000.
 *   - Runs in the same BullMQ worker as SoilRegenerationProcessor,
 *     invoked *after* soil-regen completes. On failure, the job is
 *     marked failed for the soil-regen job_type — this keeps the
 *     pollinator output tightly coupled to land-cover readiness without
 *     adding a separate queue.
 *
 * Honest scoping (mirrored verbatim into the dashboard caveat):
 *
 *   - The "patch grid" is a synthesized NxN cell grid over the project
 *     bbox, NOT polygonized land cover. We do not have a spatial
 *     polygon layer for NLCD/AAFC at the parcel scale in the current
 *     pipeline. Each cell's habitat quality is deterministically
 *     sampled from the aggregate land-cover class distribution (so
 *     the same project gets the same output every run). This is
 *     explicitly documented in the output caveat and in the wiki.
 *
 *   - Corridor role is computed from 4-neighbor grid adjacency — a
 *     vector patch-graph approximation. True raster least-cost-path
 *     on a habitat-friction surface remains deferred.
 */

import type postgres from 'postgres';
import pino from 'pino';
import {
  POLLINATOR_SUPPORTIVE_WEIGHTS,
  POLLINATOR_LIMITING_WEIGHTS,
  lookupEcoregion,
  type EcoregionId,
} from '@ogden/shared';
import type { Feature, Polygon } from 'geojson';
import { config } from '../../lib/config.js';
import {
  runPolygonFrictionPath,
  withTimeout,
  type PolygonPathResult,
} from './pollinatorPolygonPath.js';
import { getNlcdService } from '../landcover/NlcdRasterService.js';
import { getAciService } from '../landcover/AciRasterService.js';
import { getWorldCoverService } from '../landcover/WorldCoverRasterService.js';
import type {
  LandCoverRasterServiceBase,
  ParcelBbox4326,
} from '../landcover/LandCoverRasterServiceBase.js';
import type { LandCoverSourceId } from '@ogden/shared';

const logger = pino({ name: 'PollinatorOpportunityProcessor' });

interface ProjectContext {
  projectId: string;
  bbox: [number, number, number, number];
  centroidLat: number;
  centroidLng: number;
  /** ISO-2 country (or 'INTL' fallback) — drives polygon-path service selection. */
  country: 'US' | 'CA' | 'INTL';
  /** Parcel boundary as GeoJSON (for clipToBbox) or null when only bbox is known. */
  parcelGeoJson: { type: 'Polygon'; coordinates: number[][][] } | null;
  classes: Record<string, number>;
  treeCanopyPct: number;
  wetlandPct: number;
  hasRiparianBuffer: boolean;
  confidence: 'high' | 'medium' | 'low';
}

type HabitatQuality = 'high' | 'moderate' | 'low' | 'hostile';
type ConnectivityRole = 'core' | 'stepping_stone' | 'isolated' | 'matrix';

interface Patch {
  patchId: number;
  row: number;
  col: number;
  /** Cell centroid [lng, lat]. */
  centroid: [number, number];
  /** 0-1 supportive score weighted by cover distribution. */
  habitatScore: number;
  habitatQuality: HabitatQuality;
  connectivityRole: ConnectivityRole;
  /** Cover class (deterministically sampled) that determined habitat quality. */
  dominantClass: string;
  areaHa: number;
}

const GRID_SIZE = 5; // 5×5 patch grid per project

/**
 * Classify a 0-1 supportive weight into habitat quality bands. Tuned so
 * pasture/grassland (weight ≈ 0.9-1.0) lands in 'high', mixed forest
 * (0.7) in 'moderate', intensive crop / developed (limiting) in
 * 'hostile'.
 */
function classifyHabitat(score: number, isLimiting: boolean): HabitatQuality {
  if (isLimiting) return 'hostile';
  if (score >= 0.85) return 'high';
  if (score >= 0.5) return 'moderate';
  if (score > 0) return 'low';
  return 'hostile';
}

/**
 * Deterministic "stratified sampling" from the aggregate class
 * distribution. Given N = GRID_SIZE*GRID_SIZE cells and a classes dict
 * with %-cover by class, assign each cell a class so that overall
 * class counts respect the aggregate pcts. Order is shuffled with a
 * simple seeded PRNG keyed on projectId for run-to-run stability.
 *
 * This is NOT a spatial model. Adjacent cells do not preferentially
 * share cover class. For true spatial patch structure we'd need a
 * polygonized land-cover source (deferred).
 */
function assignClassesToCells(
  classes: Record<string, number>,
  projectId: string,
): string[] {
  const N = GRID_SIZE * GRID_SIZE;
  const entries = Object.entries(classes)
    .filter(([, pct]) => pct > 0)
    .sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return new Array(N).fill('Grassland/Herbaceous');
  }

  // Allocate cells per class proportional to pct. Largest remainder
  // method to hit exactly N.
  const totalPct = entries.reduce((s, [, p]) => s + p, 0);
  const quotas = entries.map(([name, pct]) => ({
    name,
    raw: (pct / totalPct) * N,
    int: Math.floor((pct / totalPct) * N),
  }));
  let remaining = N - quotas.reduce((s, q) => s + q.int, 0);
  quotas.sort((a, b) => b.raw - b.int - (a.raw - a.int));
  for (const q of quotas) {
    if (remaining <= 0) break;
    q.int += 1;
    remaining -= 1;
  }

  const assigned: string[] = [];
  for (const q of quotas) {
    for (let i = 0; i < q.int; i++) assigned.push(q.name);
  }
  while (assigned.length < N) assigned.push(entries[0]![0]);
  assigned.length = N;

  // Seeded shuffle: Mulberry32 seeded from projectId hash.
  let h = 2166136261;
  for (let i = 0; i < projectId.length; i++) {
    h ^= projectId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h = (h + 0x6D2B79F5) | 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = assigned.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [assigned[i], assigned[j]] = [assigned[j]!, assigned[i]!];
  }
  return assigned;
}

function buildGrid(ctx: ProjectContext): Patch[] {
  const [minLng, minLat, maxLng, maxLat] = ctx.bbox;
  const cellLng = (maxLng - minLng) / GRID_SIZE;
  const cellLat = (maxLat - minLat) / GRID_SIZE;

  // Approximate total bbox area in hectares (for per-cell areaHa).
  const latMidRad = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const meanLngKm = 111.32 * Math.cos(latMidRad);
  const areaKm2 = Math.abs(maxLng - minLng) * meanLngKm * Math.abs(maxLat - minLat) * 111.32;
  const areaHaPerCell = (areaKm2 * 100) / (GRID_SIZE * GRID_SIZE);

  const cellClasses = assignClassesToCells(ctx.classes, ctx.projectId);

  const patches: Patch[] = [];
  let patchId = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const dominantClass = cellClasses[patchId] ?? 'Grassland/Herbaceous';
      const supportiveWeight = POLLINATOR_SUPPORTIVE_WEIGHTS[dominantClass] ?? 0;
      const limitingWeight = POLLINATOR_LIMITING_WEIGHTS[dominantClass];
      const isLimiting = limitingWeight != null && limitingWeight >= 0.5;

      // Canopy bonus: if project has edge-sweet-spot canopy, bump mid-
      // quality patches up a notch on the assumption the tree cover is
      // distributed across patches. This is approximate but consistent
      // with the heuristic's canopyBonus logic.
      let score = supportiveWeight;
      if (ctx.treeCanopyPct >= 10 && ctx.treeCanopyPct <= 60 && score > 0) {
        score = Math.min(1, score + 0.1);
      }
      // Wetland bonus per patch proportional to wetland_pct.
      if (ctx.wetlandPct > 5 && /wetland|swamp|marsh/i.test(dominantClass)) {
        score = Math.min(1, score + 0.1);
      }

      const centroid: [number, number] = [
        minLng + cellLng * (c + 0.5),
        minLat + cellLat * (r + 0.5),
      ];

      patches.push({
        patchId,
        row: r,
        col: c,
        centroid,
        habitatScore: score,
        habitatQuality: classifyHabitat(score, isLimiting),
        connectivityRole: 'matrix', // placeholder; filled by connectivity pass
        dominantClass,
        areaHa: Math.max(0.1, areaHaPerCell),
      });
      patchId += 1;
    }
  }
  return patches;
}

/**
 * Patch-graph connectivity: for each supportive patch (high or moderate
 * habitat), count 4-neighbor supportive patches on the grid. Assign:
 *   - 'core'          ≥ 2 supportive neighbors AND self is high
 *   - 'stepping_stone' 1-2 supportive neighbors AND self is moderate
 *   - 'isolated'       0 supportive neighbors AND self is high/moderate
 *   - 'matrix'         low/hostile background
 */
function assignConnectivityRoles(patches: Patch[]): void {
  const byIndex = new Map<string, Patch>();
  for (const p of patches) byIndex.set(`${p.row},${p.col}`, p);

  const isSupportive = (q: HabitatQuality) => q === 'high' || q === 'moderate';

  for (const p of patches) {
    if (!isSupportive(p.habitatQuality)) {
      p.connectivityRole = 'matrix';
      continue;
    }
    const neighbors: Patch[] = [];
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const n = byIndex.get(`${p.row + dr},${p.col + dc}`);
      if (n && isSupportive(n.habitatQuality)) neighbors.push(n);
    }
    if (p.habitatQuality === 'high' && neighbors.length >= 2) {
      p.connectivityRole = 'core';
    } else if (neighbors.length >= 1) {
      p.connectivityRole = 'stepping_stone';
    } else {
      p.connectivityRole = 'isolated';
    }
  }
}

/**
 * Aggregate `corridorReadiness` in [0, 1]: (core + 0.5 * stepping_stone)
 * divided by total supportive patches. 0 when there are no supportive
 * patches at all — a meaningful signal for urban / intensive-crop sites.
 */
function computeCorridorReadiness(patches: Patch[]): number {
  let core = 0;
  let step = 0;
  let supportive = 0;
  for (const p of patches) {
    if (p.habitatQuality === 'high' || p.habitatQuality === 'moderate') supportive += 1;
    if (p.connectivityRole === 'core') core += 1;
    else if (p.connectivityRole === 'stepping_stone') step += 1;
  }
  if (supportive === 0) return 0;
  return Math.max(0, Math.min(1, (core + 0.5 * step) / supportive));
}

export class PollinatorOpportunityProcessor {
  constructor(private readonly db: postgres.Sql) {}

  async process(projectId: string): Promise<void> {
    const ctx = await this.loadContext(projectId);
    if (!ctx) {
      // Soft-skip if prerequisites aren't there. The soil-regen worker
      // already fails loudly on missing inputs; if we got here and
      // loadContext returns null, land_cover simply hasn't populated
      // — no point writing a meaningless pollinator layer.
      return;
    }

    // Phase 5 (ADR 2026-05-05) — try the polygon-friction path first when
    // the feature flag is set. Returns null on any failure (no clip
    // provider wired yet, raster manifest missing, GDAL absent, timeout).
    // Falls through to the synthesized grid path in that case.
    const polygonResult = config.POLLINATOR_USE_POLYGON_FRICTION
      ? await this.tryPolygonPath(ctx)
      : null;

    const patches = buildGrid(ctx);
    assignConnectivityRoles(patches);
    const corridorReadiness = polygonResult
      ? polygonResult.permeableFraction  // polygon path: connectivity ≈ permeable area share
      : computeCorridorReadiness(patches);

    const ecoregionId = lookupEcoregion(ctx.centroidLat, ctx.centroidLng);

    const geojsonData = {
      type: 'FeatureCollection' as const,
      features: patches.map((p) => ({
        type: 'Feature' as const,
        properties: {
          patchId: p.patchId,
          habitatQuality: p.habitatQuality,
          habitatScore: Math.round(p.habitatScore * 100) / 100,
          connectivityRole: p.connectivityRole,
          dominantClass: p.dominantClass,
          areaHa: Math.round(p.areaHa * 10) / 10,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: p.centroid,
        },
      })),
    };

    const coreCount = patches.filter((p) => p.connectivityRole === 'core').length;
    const stepCount = patches.filter((p) => p.connectivityRole === 'stepping_stone').length;
    const isolatedCount = patches.filter((p) => p.connectivityRole === 'isolated').length;
    const highCount = patches.filter((p) => p.habitatQuality === 'high').length;
    const moderateCount = patches.filter((p) => p.habitatQuality === 'moderate').length;

    const summaryData = {
      corridorReadiness: Math.round(corridorReadiness * 100) / 100,
      patchCount: patches.length,
      gridSize: GRID_SIZE,
      ecoregionId: ecoregionId as EcoregionId | null,
      patchesByQuality: {
        high: highCount,
        moderate: moderateCount,
        low: patches.filter((p) => p.habitatQuality === 'low').length,
        hostile: patches.filter((p) => p.habitatQuality === 'hostile').length,
      },
      patchesByRole: {
        core: coreCount,
        stepping_stone: stepCount,
        isolated: isolatedCount,
        matrix: patches.filter((p) => p.connectivityRole === 'matrix').length,
      },
      confidence: ctx.confidence,
      dataSources: ['land_cover', 'wetlands_flood'],
      computedAt: new Date().toISOString(),
      // Phase 5 provenance — distinguishes polygon-friction path from
      // the legacy synthesized-grid path. Stays 'synthesized_grid' until
      // a real raster clip arrives via Phase 6 ingest.
      samplingMethod: polygonResult ? 'polygon' : 'synthesized_grid',
      polygonPath: polygonResult
        ? {
            source: polygonResult.source,
            vintage: polygonResult.vintage,
            pixelCount: polygonResult.pixelCount,
            polygonizeMs: polygonResult.polygonizeMs,
            permeableAreaM2: Math.round(polygonResult.permeableAreaM2),
            hostileAreaM2: Math.round(polygonResult.hostileAreaM2),
            permeableFraction: Math.round(polygonResult.permeableFraction * 100) / 100,
          }
        : null,
      caveat: polygonResult
        ? 'Polygon-friction path: corridorReadiness derived from polygonized land-cover area share with friction <= 3 (forest/wetland/shrubland/grassland). 5×5 patch grid retained for UI continuity but role assignment uses polygon-derived permeability.'
        : 'Patch grid is a 5×5 synthesized lattice sampled deterministically from aggregate land-cover %. For rigorous corridor analysis a polygonized land-cover source + raster least-cost-path is required (deferred).',
    };

    const dataDate = new Date().toISOString().split('T')[0]!;

    await this.db`
      INSERT INTO project_layers (
        project_id, layer_type, source_api, fetch_status,
        confidence, data_date, attribution_text,
        geojson_data, summary_data, metadata, fetched_at
      ) VALUES (
        ${ctx.projectId},
        'pollinator_opportunity',
        ${'derived_pollinator_opportunity'},
        'complete',
        ${ctx.confidence},
        ${dataDate},
        ${'Derived from NLCD/AAFC land cover + wetlands summaries; CEC Level III ecoregion lookup. Patch grid synthesized.'},
        ${this.db.json(geojsonData as never) as unknown as string},
        ${this.db.json(summaryData as never) as unknown as string},
        ${this.db.json({
          gridSize: GRID_SIZE,
          ecoregionId,
        } as never) as unknown as string},
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

  /**
   * Attempt the polygon-friction path (Phase 5 / ADR 2026-05-05). Returns
   * null on any failure so the caller can fall back to the synthesized
   * grid. Wrapped in `POLLINATOR_POLYGON_TIMEOUT_MS` to bound the spend.
   *
   * Phase-5-minimal scaffolding: the actual `clipProvider` wiring (which
   * needs `clipToBbox` on `LandCoverRasterServiceBase`) lands in Phase 6
   * alongside the operator ingest job. Until then, this returns null,
   * the processor falls through, and the legacy synthesized-grid path
   * remains the production behaviour. The flag is exercised in fixture
   * tests (Phase 7) by injecting a stub clipProvider.
   */
  private async tryPolygonPath(ctx: ProjectContext): Promise<PolygonPathResult | null> {
    if (!ctx.parcelGeoJson) {
      logger.info(
        { project: ctx.projectId },
        'polygon-path: parcel_geojson missing — falling back to synthesized grid',
      );
      return null;
    }

    // Country → service resolver. US → NLCD, CA → ACI, INTL → WorldCover.
    let service: LandCoverRasterServiceBase | null = null;
    let source: LandCoverSourceId;
    if (ctx.country === 'US') {
      service = getNlcdService();
      source = 'NLCD';
    } else if (ctx.country === 'CA') {
      service = getAciService();
      source = 'ACI';
    } else {
      service = getWorldCoverService();
      source = 'WorldCover';
    }

    if (!service) {
      logger.info(
        { project: ctx.projectId, country: ctx.country, source },
        'polygon-path: raster service not initialised — falling back to synthesized grid',
      );
      return null;
    }

    const parcel: Feature<Polygon> = {
      type: 'Feature',
      properties: {},
      geometry: ctx.parcelGeoJson,
    };

    // ClipProvider adapter — converts the shared-package signature
    // (parcel + bufferKm) into the service's ParcelBbox4326 input. The
    // service handles the buffer-aware bbox internally via its own
    // bbox-of-feature + buffer logic when needed; for now we feed the
    // parcel's bbox plus a coarse degree-buffer derived from bufferKm.
    const resolvedService = service;
    const clipProvider = async (
      p: Feature<Polygon>,
      bufferKm: number,
    ): Promise<import('@ogden/shared').RasterClip> => {
      const coords = p.geometry.coordinates[0] ?? [];
      let minLng = Infinity;
      let minLat = Infinity;
      let maxLng = -Infinity;
      let maxLat = -Infinity;
      for (const ring of p.geometry.coordinates) {
        for (const [lng, lat] of ring) {
          if (lng! < minLng) minLng = lng!;
          if (lat! < minLat) minLat = lat!;
          if (lng! > maxLng) maxLng = lng!;
          if (lat! > maxLat) maxLat = lat!;
        }
      }
      void coords;
      // Degree buffer derived from bufferKm. One degree of latitude is
      // ≈111 km at all latitudes, but one degree of longitude shrinks
      // with cos(lat) — at 60° N a degree of longitude is only ~55 km,
      // so a flat bufferKm/111 under-buffers the longitude axis by 50%.
      // Floor cosLat at 0.1 to cap buffer expansion near the poles
      // (above ~84° latitude); beyond that the parcel falls into
      // multi-tile-stitch territory where the synthesized-grid
      // fallback is the correct answer anyway.
      const latBuf = bufferKm / 111;
      const meanLatRad = ((minLat + maxLat) / 2) * (Math.PI / 180);
      const cosLat = Math.max(0.1, Math.cos(meanLatRad));
      const lngBuf = bufferKm / (111 * cosLat);
      const bbox: ParcelBbox4326 = {
        minLng: minLng - lngBuf,
        minLat: minLat - latBuf,
        maxLng: maxLng + lngBuf,
        maxLat: maxLat + latBuf,
      };
      const clip = await resolvedService.clipToBbox(bbox);
      if (!clip) {
        throw new Error('clipToBbox returned null');
      }
      return clip;
    };

    const promise = runPolygonFrictionPath({
      source,
      parcel,
      bufferKm: 2,
      clipProvider,
    });

    const result = await withTimeout(promise, config.POLLINATOR_POLYGON_TIMEOUT_MS);
    if (!result) {
      logger.info(
        { project: ctx.projectId, source },
        'polygon-path: timed out or returned null — falling back to synthesized grid',
      );
      return null;
    }
    logger.info(
      {
        project: ctx.projectId,
        source: result.source,
        vintage: result.vintage,
        pixelCount: result.pixelCount,
        polygonizeMs: result.polygonizeMs,
        permeableFraction: result.permeableFraction,
      },
      'polygon-path: success',
    );
    return result;
  }

  private async loadContext(projectId: string): Promise<ProjectContext | null> {
    const [project] = await this.db`
      SELECT
        p.id,
        p.country,
        ST_XMin(p.parcel_boundary::geometry) AS min_lon,
        ST_YMin(p.parcel_boundary::geometry) AS min_lat,
        ST_XMax(p.parcel_boundary::geometry) AS max_lon,
        ST_YMax(p.parcel_boundary::geometry) AS max_lat,
        ST_Y(p.centroid::geometry) AS centroid_lat,
        ST_X(p.centroid::geometry) AS centroid_lng,
        ST_AsGeoJSON(p.parcel_boundary::geometry) AS parcel_geojson
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

    const layers = await this.db`
      SELECT layer_type, fetch_status, confidence, summary_data
      FROM project_layers
      WHERE project_id = ${projectId}
        AND layer_type IN ('land_cover', 'wetlands_flood')
    `;

    const getLayer = (type: string) =>
      layers.find((l) => (l as Record<string, unknown>).layer_type === type);

    const landCoverLayer = getLayer('land_cover');
    const wetlandsLayer = getLayer('wetlands_flood');

    if (
      !landCoverLayer ||
      landCoverLayer.fetch_status !== 'complete' ||
      landCoverLayer.summary_data == null
    ) {
      return null; // Soft-skip — land_cover not ready.
    }

    const lcSummary = landCoverLayer.summary_data as Record<string, unknown>;
    const classes = (lcSummary.classes as Record<string, number>) ?? {};
    const treeCanopyPct = Number(lcSummary.tree_canopy_pct ?? 0) || 0;

    const wSummary = (wetlandsLayer?.summary_data as Record<string, unknown>) ?? {};
    const wetlandPct = Number(wSummary.wetland_pct ?? 0) || 0;
    const riparian = wSummary.riparian_buffer_m;
    const hasRiparianBuffer =
      typeof riparian === 'number'
        ? riparian > 0
        : typeof riparian === 'string'
          ? !/not detected|none|^\s*$/i.test(riparian)
          : false;

    let parcelGeoJson: { type: 'Polygon'; coordinates: number[][][] } | null = null;
    if (project.parcel_geojson) {
      try {
        const geo = JSON.parse(String(project.parcel_geojson)) as {
          type: string;
          coordinates: number[][][] | number[][][][];
        };
        if (geo.type === 'Polygon') {
          parcelGeoJson = { type: 'Polygon', coordinates: geo.coordinates as number[][][] };
        } else if (geo.type === 'MultiPolygon') {
          // Take the first polygon ring — clipToBbox only needs the bbox so
          // the simplification is acceptable for the polygon-path entry.
          const first = (geo.coordinates as number[][][][])[0];
          if (first) parcelGeoJson = { type: 'Polygon', coordinates: first };
        }
      } catch {
        parcelGeoJson = null;
      }
    }

    const rawCountry = String(project.country ?? '').toUpperCase();
    const country: 'US' | 'CA' | 'INTL' =
      rawCountry === 'US' ? 'US' : rawCountry === 'CA' ? 'CA' : 'INTL';

    return {
      projectId,
      bbox,
      centroidLat: Number(project.centroid_lat),
      centroidLng: Number(project.centroid_lng),
      country,
      parcelGeoJson,
      classes,
      treeCanopyPct,
      wetlandPct,
      hasRiparianBuffer,
      confidence: (landCoverLayer.confidence as 'high' | 'medium' | 'low') ?? 'low',
    };
  }
}
