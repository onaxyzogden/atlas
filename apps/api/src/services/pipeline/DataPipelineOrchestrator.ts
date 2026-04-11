/**
 * DataPipelineOrchestrator
 *
 * Reads project.country to route each Tier 1 data layer job to the correct
 * national adapter via the ADAPTER_REGISTRY. The orchestrator itself is
 * country-blind — all country logic lives in the adapter registry and
 * individual adapter implementations.
 *
 * Pattern: DataSourceAdapter
 *   Each external data source implements:
 *     fetchForBoundary(boundary: GeoJSON.Feature, context: ProjectContext): Promise<AdapterResult>
 *     getConfidence(result): ConfidenceLevel
 *     getAttributionText(): string
 *
 * Sprint 3 will implement each adapter fully.
 * This file establishes the architectural skeleton.
 */

import { Queue, Worker, type Job } from 'bullmq';
import type { Redis } from 'ioredis';
import type postgres from 'postgres';
import { ADAPTER_REGISTRY, LAYER_TYPES, DATA_COMPLETENESS_WEIGHTS } from '@ogden/shared';
import type { LayerType, Tier1LayerType, Country } from '@ogden/shared';
import { publishBroadcast } from '../../lib/broadcast.js';
import { TerrainAnalysisProcessor } from '../terrain/TerrainAnalysisProcessor.js';
import { WatershedRefinementProcessor } from '../terrain/WatershedRefinementProcessor.js';
import { MicroclimateProcessor } from '../terrain/MicroclimateProcessor.js';
import { SoilRegenerationProcessor } from '../terrain/SoilRegenerationProcessor.js';

interface ProjectContext {
  projectId: string;
  country: Country;
  provinceState: string | null;
  conservationAuthId: string | null;
  boundaryGeojson: unknown;
  centroidLat: number | null;
  centroidLng: number | null;
}

export interface AdapterResult {
  layerType: LayerType;
  sourceApi: string;
  attributionText: string;
  confidence: 'high' | 'medium' | 'low';
  dataDate: string | null;
  geojsonData?: unknown;
  summaryData?: unknown;
  rasterUrl?: string;
  wmsUrl?: string;
  wmsLayers?: string;
  metadata?: Record<string, unknown>;
}

// ─── Adapter Interface ────────────────────────────────────────────────────────

export interface DataSourceAdapter {
  readonly sourceId: string;
  fetchForBoundary(boundary: unknown, context: ProjectContext): Promise<AdapterResult>;
  getConfidence(result: AdapterResult): 'high' | 'medium' | 'low';
  getAttributionText(): string;
}

// ─── Stub adapters (Sprint 3 will implement each fully) ──────────────────────

class ManualFlagAdapter implements DataSourceAdapter {
  constructor(
    public readonly sourceId: string,
    private readonly layerType: LayerType,
  ) {}

  async fetchForBoundary(_boundary: unknown, _ctx: ProjectContext): Promise<AdapterResult> {
    return {
      layerType: this.layerType,
      sourceApi: this.sourceId,
      attributionText: 'Data unavailable for this region — manual entry required.',
      confidence: 'low',
      dataDate: null,
      summaryData: { unavailable: true, reason: 'no_adapter_for_region' },
    };
  }

  getConfidence(): 'low' {
    return 'low';
  }

  getAttributionText(): string {
    return 'Manual flag — no automated source available for this region.';
  }
}

// Sprint 3: Replace each stub with a real implementation
function resolveAdapter(layerType: Tier1LayerType, country: Country): DataSourceAdapter {
  const config = ADAPTER_REGISTRY[layerType]?.[country];
  if (!config) return new ManualFlagAdapter(`unknown_${layerType}`, layerType);

  // Stubs — Sprint 3 will import and instantiate the real adapter classes
  return new ManualFlagAdapter(config.source, layerType);
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export class DataPipelineOrchestrator {
  private queue: Queue;
  private terrainQueue: Queue;
  private watershedQueue: Queue;
  private microclimateQueue: Queue;
  private soilRegenerationQueue: Queue;
  private terrainProcessor: TerrainAnalysisProcessor;
  private watershedProcessor: WatershedRefinementProcessor;
  private microclimateProcessor: MicroclimateProcessor;
  private soilRegenerationProcessor: SoilRegenerationProcessor;

  constructor(
    private readonly db: postgres.Sql,
    private readonly redis: Redis,
  ) {
    this.queue = new Queue('tier1-data', { connection: redis as never });
    this.terrainQueue = new Queue('tier3-terrain', { connection: redis as never });
    this.watershedQueue = new Queue('tier3-watershed', { connection: redis as never });
    this.microclimateQueue = new Queue('tier3-microclimate', { connection: redis as never });
    this.soilRegenerationQueue = new Queue('tier3-soil-regeneration', { connection: redis as never });
    this.terrainProcessor = new TerrainAnalysisProcessor(db);
    this.watershedProcessor = new WatershedRefinementProcessor(db);
    this.microclimateProcessor = new MicroclimateProcessor(db);
    this.soilRegenerationProcessor = new SoilRegenerationProcessor(db);
  }

  /** Enqueue a Tier 1 data fetch for a project. Called after boundary is set. */
  async enqueueTier1Fetch(projectId: string): Promise<string> {
    const job = await this.queue.add('fetch_tier1', { projectId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
    return job.id ?? projectId;
  }

  /** Start the BullMQ worker that processes Tier 1 fetch jobs. */
  startWorker(): Worker {
    return new Worker(
      'tier1-data',
      async (job: Job) => {
        const { projectId } = job.data as { projectId: string };
        await this.processTier1Job(projectId, job);
      },
      { connection: this.redis as never, concurrency: 5 },
    );
  }

  /** Start the BullMQ worker that processes Tier 3 terrain analysis jobs. */
  startTerrainWorker(): Worker {
    return new Worker(
      'tier3-terrain',
      async (job: Job) => {
        const { projectId } = job.data as { projectId: string };

        await this.db`
          UPDATE data_pipeline_jobs
          SET status = 'running', started_at = now()
          WHERE project_id = ${projectId} AND job_type = 'compute_terrain' AND status = 'queued'
        `;

        try {
          await this.terrainProcessor.process(projectId);

          await this.db`
            UPDATE data_pipeline_jobs
            SET status = 'complete', completed_at = now()
            WHERE project_id = ${projectId} AND job_type = 'compute_terrain' AND status = 'running'
          `;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          await this.db`
            UPDATE data_pipeline_jobs
            SET status = 'failed', error_message = ${message}
            WHERE project_id = ${projectId} AND job_type = 'compute_terrain' AND status = 'running'
          `;
          throw err;
        }

        // Trigger microclimate analysis after terrain completes
        await this.db`
          INSERT INTO data_pipeline_jobs (project_id, job_type, status)
          VALUES (${projectId}, 'compute_microclimate', 'queued')
        `;
        await this.microclimateQueue.add('compute_microclimate', { projectId }, {
          attempts: 2,
          backoff: { type: 'exponential', delay: 10000 },
          removeOnComplete: 50,
          removeOnFail: 25,
        });

        await job.updateProgress(100);
      },
      { connection: this.redis as never, concurrency: 2 },
    );
  }

  /** Start the BullMQ worker that processes Tier 3 microclimate jobs. */
  startMicroclimateWorker(): Worker {
    return new Worker(
      'tier3-microclimate',
      async (job: Job) => {
        const { projectId } = job.data as { projectId: string };

        await this.db`
          UPDATE data_pipeline_jobs
          SET status = 'running', started_at = now()
          WHERE project_id = ${projectId} AND job_type = 'compute_microclimate' AND status = 'queued'
        `;

        try {
          await this.microclimateProcessor.process(projectId);

          await this.db`
            UPDATE data_pipeline_jobs
            SET status = 'complete', completed_at = now()
            WHERE project_id = ${projectId} AND job_type = 'compute_microclimate' AND status = 'running'
          `;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          await this.db`
            UPDATE data_pipeline_jobs
            SET status = 'failed', error_message = ${message}
            WHERE project_id = ${projectId} AND job_type = 'compute_microclimate' AND status = 'running'
          `;
          throw err;
        }

        await job.updateProgress(100);
      },
      { connection: this.redis as never, concurrency: 2 },
    );
  }

  /** Start the BullMQ worker that processes Tier 3 watershed refinement jobs. */
  startWatershedWorker(): Worker {
    return new Worker(
      'tier3-watershed',
      async (job: Job) => {
        const { projectId } = job.data as { projectId: string };

        await this.db`
          UPDATE data_pipeline_jobs
          SET status = 'running', started_at = now()
          WHERE project_id = ${projectId} AND job_type = 'compute_watershed' AND status = 'queued'
        `;

        try {
          await this.watershedProcessor.process(projectId);

          await this.db`
            UPDATE data_pipeline_jobs
            SET status = 'complete', completed_at = now()
            WHERE project_id = ${projectId} AND job_type = 'compute_watershed' AND status = 'running'
          `;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          await this.db`
            UPDATE data_pipeline_jobs
            SET status = 'failed', error_message = ${message}
            WHERE project_id = ${projectId} AND job_type = 'compute_watershed' AND status = 'running'
          `;
          throw err;
        }

        await job.updateProgress(100);
      },
      { connection: this.redis as never, concurrency: 2 },
    );
  }

  /** Start the BullMQ worker that processes Tier 3 soil regeneration jobs. */
  startSoilRegenerationWorker(): Worker {
    return new Worker(
      'tier3-soil-regeneration',
      async (job: Job) => {
        const { projectId } = job.data as { projectId: string };

        await this.db`
          UPDATE data_pipeline_jobs
          SET status = 'running', started_at = now()
          WHERE project_id = ${projectId} AND job_type = 'compute_soil_regeneration' AND status = 'queued'
        `;

        try {
          await this.soilRegenerationProcessor.process(projectId);

          await this.db`
            UPDATE data_pipeline_jobs
            SET status = 'complete', completed_at = now()
            WHERE project_id = ${projectId} AND job_type = 'compute_soil_regeneration' AND status = 'running'
          `;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          await this.db`
            UPDATE data_pipeline_jobs
            SET status = 'failed', error_message = ${message}
            WHERE project_id = ${projectId} AND job_type = 'compute_soil_regeneration' AND status = 'running'
          `;
          throw err;
        }

        await job.updateProgress(100);
      },
      { connection: this.redis as never, concurrency: 2 },
    );
  }

  private async processTier1Job(projectId: string, job: Job): Promise<void> {
    // Load project context
    const [project] = await this.db`
      SELECT
        id, country, province_state, conservation_auth_id,
        ST_AsGeoJSON(parcel_boundary)::jsonb AS boundary_geojson,
        ST_Y(centroid::geometry) AS centroid_lat,
        ST_X(centroid::geometry) AS centroid_lng
      FROM projects
      WHERE id = ${projectId} AND parcel_boundary IS NOT NULL
    `;

    if (!project) {
      throw new Error(`Project ${projectId} not found or has no boundary`);
    }

    const ctx: ProjectContext = {
      projectId,
      country: (project.country ?? 'US') as Country,
      provinceState: project.province_state ?? null,
      conservationAuthId: project.conservation_auth_id ?? null,
      boundaryGeojson: project.boundary_geojson,
      centroidLat: project.centroid_lat ? Number(project.centroid_lat) : null,
      centroidLng: project.centroid_lng ? Number(project.centroid_lng) : null,
    };

    // Fan out — fetch all layer types in parallel
    const results = await Promise.allSettled(
      LAYER_TYPES.map((layerType) =>
        this.fetchLayer(layerType, ctx).then((result) => this.storeLayerResult(result, ctx)),
      ),
    );

    const failed = results.filter((r: PromiseSettledResult<void>) => r.status === 'rejected');
    if (failed.length > 0) {
      console.error(`${failed.length}/${LAYER_TYPES.length} layers failed for project ${projectId}`);
    }

    // Recompute data completeness score
    await this.updateCompletenessScore(projectId);

    // Trigger assessment computation
    await this.db`
      INSERT INTO data_pipeline_jobs (project_id, job_type, status)
      VALUES (${projectId}, 'compute_assessment', 'queued')
    `;

    // Trigger Tier 3 terrain analysis
    await this.db`
      INSERT INTO data_pipeline_jobs (project_id, job_type, status)
      VALUES (${projectId}, 'compute_terrain', 'queued')
    `;
    await this.terrainQueue.add('compute_terrain', { projectId }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: 50,
      removeOnFail: 25,
    });

    // Trigger Tier 3 watershed refinement
    await this.db`
      INSERT INTO data_pipeline_jobs (project_id, job_type, status)
      VALUES (${projectId}, 'compute_watershed', 'queued')
    `;
    await this.watershedQueue.add('compute_watershed', { projectId }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: 50,
      removeOnFail: 25,
    });

    // Trigger Tier 3 soil regeneration (depends on soils + land_cover, not terrain)
    await this.db`
      INSERT INTO data_pipeline_jobs (project_id, job_type, status)
      VALUES (${projectId}, 'compute_soil_regeneration', 'queued')
    `;
    await this.soilRegenerationQueue.add('compute_soil_regeneration', { projectId }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: 50,
      removeOnFail: 25,
    });

    await job.updateProgress(100);
  }

  private async fetchLayer(layerType: Tier1LayerType, ctx: ProjectContext): Promise<AdapterResult> {
    // Mark layer as fetching
    await this.db`
      INSERT INTO project_layers (project_id, layer_type, source_api, fetch_status)
      VALUES (
        ${ctx.projectId},
        ${layerType},
        ${ADAPTER_REGISTRY[layerType]?.[ctx.country]?.source ?? 'unknown'},
        'fetching'
      )
      ON CONFLICT (project_id, layer_type) DO UPDATE SET fetch_status = 'fetching'
    `;

    const adapter = resolveAdapter(layerType, ctx.country);
    return adapter.fetchForBoundary(ctx.boundaryGeojson, ctx);
  }

  private async storeLayerResult(result: AdapterResult, ctx: ProjectContext): Promise<void> {
    await this.db`
      UPDATE project_layers SET
        source_api       = ${result.sourceApi},
        fetch_status     = 'complete',
        confidence       = ${result.confidence},
        data_date        = ${result.dataDate},
        attribution_text = ${result.attributionText},
        geojson_data     = ${result.geojsonData ? JSON.stringify(result.geojsonData) : null},
        summary_data     = ${result.summaryData ? JSON.stringify(result.summaryData) : null},
        raster_url       = ${result.rasterUrl ?? null},
        wms_url          = ${result.wmsUrl ?? null},
        wms_layers       = ${result.wmsLayers ?? null},
        metadata         = ${result.metadata ? JSON.stringify(result.metadata) : null},
        fetched_at       = now()
      WHERE project_id = ${ctx.projectId} AND layer_type = ${result.layerType}
    `;

    // Broadcast layer completion to connected WebSocket clients
    publishBroadcast(this.redis, ctx.projectId, {
      type: 'layer_complete',
      payload: { layerType: result.layerType, confidence: result.confidence },
      userId: 'system',
      userName: null,
      timestamp: new Date().toISOString(),
    });
  }

  private async updateCompletenessScore(projectId: string): Promise<void> {
    const layers = await this.db`
      SELECT layer_type, fetch_status, confidence
      FROM project_layers
      WHERE project_id = ${projectId}
    `;

    let score = 0;
    for (const layer of layers) {
      const weight = DATA_COMPLETENESS_WEIGHTS[layer.layer_type as LayerType] ?? 0;
      const layerScore =
        layer.fetch_status === 'complete'
          ? layer.confidence === 'high'
            ? 1.0
            : layer.confidence === 'medium'
              ? 0.7
              : 0.4
          : 0;
      score += weight * layerScore * 100;
    }

    await this.db`
      UPDATE projects SET data_completeness_score = ${Math.round(score * 10) / 10}
      WHERE id = ${projectId}
    `;
  }
}
