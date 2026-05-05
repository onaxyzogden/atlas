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

import { Queue, Worker, type Job, type ConnectionOptions } from 'bullmq';
import type { Redis } from 'ioredis';
import type postgres from 'postgres';
import { ADAPTER_REGISTRY, LAYER_TYPES, DATA_COMPLETENESS_WEIGHTS } from '@ogden/shared';
import type { LayerType, Tier1LayerType, Country } from '@ogden/shared';
import { SsurgoAdapter } from './adapters/SsurgoAdapter.js';
import { UsgsElevationAdapter } from './adapters/UsgsElevationAdapter.js';
import { NrcanHrdemAdapter } from './adapters/NrcanHrdemAdapter.js';
import { OmafraCanSisAdapter } from './adapters/OmafraCanSisAdapter.js';
import { NhdAdapter } from './adapters/NhdAdapter.js';
import { OhnAdapter } from './adapters/OhnAdapter.js';
import { NwiFemaAdapter } from './adapters/NwiFemaAdapter.js';
import { ConservationAuthorityAdapter } from './adapters/ConservationAuthorityAdapter.js';
import { NoaaClimateAdapter } from './adapters/NoaaClimateAdapter.js';
import { EcccClimateAdapter } from './adapters/EcccClimateAdapter.js';
import { NlcdAdapter } from './adapters/NlcdAdapter.js';
import { AafcLandCoverAdapter } from './adapters/AafcLandCoverAdapter.js';
import { UsCountyGisAdapter } from './adapters/UsCountyGisAdapter.js';
import { OntarioMunicipalAdapter } from './adapters/OntarioMunicipalAdapter.js';
import { NwisGroundwaterAdapter } from './adapters/NwisGroundwaterAdapter.js';
import { PgmnGroundwaterAdapter } from './adapters/PgmnGroundwaterAdapter.js';
import { IgracGroundwaterAdapter } from './adapters/IgracGroundwaterAdapter.js';
import { CpcadAdapter } from './adapters/CpcadAdapter.js';
import { NlcdLandCoverAdapter } from './adapters/NlcdLandCoverAdapter.js';
import { AciLandCoverAdapter } from './adapters/AciLandCoverAdapter.js';
import { WorldCoverLandCoverAdapter } from './adapters/WorldCoverLandCoverAdapter.js';
import { getNlcdService } from '../landcover/NlcdRasterService.js';
import { getAciService } from '../landcover/AciRasterService.js';
import { getWorldCoverService } from '../landcover/WorldCoverRasterService.js';
import { config as appConfig } from '../../lib/config.js';
import { AppError } from '../../lib/errors.js';
import { NasaPowerAdapter } from './adapters/NasaPowerAdapter.js';
import { publishBroadcast } from '../../lib/broadcast.js';
import { TerrainAnalysisProcessor } from '../terrain/TerrainAnalysisProcessor.js';
import { WatershedRefinementProcessor } from '../terrain/WatershedRefinementProcessor.js';
import { MicroclimateProcessor } from '../terrain/MicroclimateProcessor.js';
import { SoilRegenerationProcessor } from '../terrain/SoilRegenerationProcessor.js';
import { PollinatorOpportunityProcessor } from '../terrain/PollinatorOpportunityProcessor.js';
import { maybeWriteAssessmentIfTier3Complete } from '../assessments/SiteAssessmentWriter.js';
import { claudeClient } from '../ai/ClaudeClient.js';
import { writeAiOutput } from '../ai/AiOutputWriter.js';
import { buildNarrativeContext } from '../ai/NarrativeContextBuilder.js';

export interface ProjectContext {
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
function resolveAdapter(
  layerType: Tier1LayerType,
  country: Country,
  db?: postgres.Sql,
): DataSourceAdapter {
  const config = ADAPTER_REGISTRY[layerType]?.[country];
  if (!config) return new ManualFlagAdapter(`unknown_${layerType}`, layerType);

  // Real adapter implementations
  if (config.adapter === 'SsurgoAdapter') {
    return new SsurgoAdapter(config.source, layerType);
  }
  if (config.adapter === 'UsgsElevationAdapter') {
    return new UsgsElevationAdapter(config.source, layerType);
  }
  if (config.adapter === 'NrcanHrdemAdapter') {
    return new NrcanHrdemAdapter(config.source, layerType);
  }
  if (config.adapter === 'OmafraCanSisAdapter') {
    return new OmafraCanSisAdapter(config.source, layerType);
  }
  if (config.adapter === 'NhdAdapter') {
    return new NhdAdapter(config.source, layerType);
  }
  if (config.adapter === 'OhnAdapter') {
    return new OhnAdapter(config.source, layerType);
  }
  if (config.adapter === 'NwiFemaAdapter') {
    return new NwiFemaAdapter(config.source, layerType);
  }
  if (config.adapter === 'ConservationAuthorityAdapter') {
    return new ConservationAuthorityAdapter(config.source, layerType);
  }
  if (config.adapter === 'NoaaClimateAdapter') {
    return new NoaaClimateAdapter(config.source, layerType);
  }
  if (config.adapter === 'EcccClimateAdapter') {
    return new EcccClimateAdapter(config.source, layerType);
  }
  if (config.adapter === 'NlcdAdapter') {
    // Per ADR 2026-05-05-pollinator-corridor-raster-pipeline: when operator
    // has populated the NLCD tile dir AND flipped LANDCOVER_TILES_READY, the
    // raster-sample NlcdLandCoverAdapter takes over. Pre-flip behaviour (and
    // any boot where the manifest is empty) stays on the legacy WMS path.
    if (appConfig.LANDCOVER_TILES_READY) {
      const nlcd = getNlcdService();
      if (nlcd && nlcd.isEnabled()) {
        return new NlcdLandCoverAdapter(config.source, layerType, nlcd);
      }
    }
    return new NlcdAdapter(config.source, layerType);
  }
  if (config.adapter === 'AafcLandCoverAdapter') {
    if (appConfig.LANDCOVER_TILES_READY) {
      const aci = getAciService();
      if (aci && aci.isEnabled()) {
        return new AciLandCoverAdapter(config.source, layerType, aci);
      }
    }
    return new AafcLandCoverAdapter(config.source, layerType);
  }
  if (config.adapter === 'WorldCoverLandCoverAdapter') {
    // INTL slot — has no legacy fallback; if disabled, ManualFlagAdapter
    // (the bottom-of-function default) takes over.
    if (appConfig.LANDCOVER_TILES_READY) {
      const wc = getWorldCoverService();
      if (wc && wc.isEnabled()) {
        return new WorldCoverLandCoverAdapter(config.source, layerType, wc);
      }
    }
    return new ManualFlagAdapter(config.source, layerType);
  }
  if (config.adapter === 'UsCountyGisAdapter') {
    return new UsCountyGisAdapter(config.source, layerType);
  }
  if (config.adapter === 'OntarioMunicipalAdapter') {
    return new OntarioMunicipalAdapter(config.source, layerType);
  }
  if (config.adapter === 'NwisGroundwaterAdapter') {
    return new NwisGroundwaterAdapter(config.source, layerType);
  }
  if (config.adapter === 'PgmnGroundwaterAdapter') {
    return new PgmnGroundwaterAdapter(config.source, layerType);
  }
  if (config.adapter === 'IgracGroundwaterAdapter') {
    // Per ADR 2026-05-04-igrac-global-groundwater-fallback: this adapter
    // reads from local PostGIS rather than calling an external API at
    // request time, so it needs a `db` handle threaded from the
    // orchestrator instance. Misconfiguration (db missing) is a
    // pipeline wiring bug, not an adapter-runtime error — fail loud.
    if (!db) {
      throw new AppError(
        'PIPELINE_MISCONFIGURED',
        'IgracGroundwaterAdapter requires a db handle; resolveAdapter was called without one',
        500,
      );
    }
    return new IgracGroundwaterAdapter(config.source, layerType, db);
  }
  if (config.adapter === 'NasaPowerAdapter') {
    // INTL bucket for climate. Globally valid, grid-interpolated.
    return new NasaPowerAdapter(config.source, layerType);
  }
  if (config.adapter === 'CpcadAdapter') {
    // Per ADR 2026-05-04-tiered-conservation-overlay (Phase 8.2-B.4):
    // CA-tier conservation overlay reads from local PostGIS
    // `conservation_overlay_features` WHERE source='CPCAD'. Requires
    // db handle — same pattern as IgracGroundwaterAdapter.
    if (!db) {
      throw new AppError(
        'PIPELINE_MISCONFIGURED',
        'CpcadAdapter requires a db handle; resolveAdapter was called without one',
        500,
      );
    }
    return new CpcadAdapter(config.source, layerType, db);
  }

  // All Tier 1 adapters implemented — fallthrough should not occur in practice
  return new ManualFlagAdapter(config.source, layerType);
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export class DataPipelineOrchestrator {
  private queue: Queue;
  private terrainQueue: Queue;
  private watershedQueue: Queue;
  private microclimateQueue: Queue;
  private soilRegenerationQueue: Queue;
  private narrativeQueue: Queue;
  private terrainProcessor: TerrainAnalysisProcessor;
  private watershedProcessor: WatershedRefinementProcessor;
  private microclimateProcessor: MicroclimateProcessor;
  private soilRegenerationProcessor: SoilRegenerationProcessor;
  private pollinatorOpportunityProcessor: PollinatorOpportunityProcessor;
  private readonly connOpts: ConnectionOptions;

  constructor(
    private readonly db: postgres.Sql,
    private readonly redis: Redis,
  ) {
    // BullMQ needs its own connections — pass config, not the shared instance
    this.connOpts = {
      host: redis.options.host ?? '127.0.0.1',
      port: redis.options.port ?? 6379,
      password: redis.options.password,
      family: redis.options.family as 4 | 6 | undefined,
      maxRetriesPerRequest: null,        // required by BullMQ workers
    };
    this.queue = new Queue('tier1-data', { connection: this.connOpts });
    this.terrainQueue = new Queue('tier3-terrain', { connection: this.connOpts });
    this.watershedQueue = new Queue('tier3-watershed', { connection: this.connOpts });
    this.microclimateQueue = new Queue('tier3-microclimate', { connection: this.connOpts });
    this.soilRegenerationQueue = new Queue('tier3-soil-regeneration', { connection: this.connOpts });
    this.narrativeQueue = new Queue('narrative-generation', { connection: this.connOpts });
    this.terrainProcessor = new TerrainAnalysisProcessor(db);
    this.watershedProcessor = new WatershedRefinementProcessor(db);
    this.microclimateProcessor = new MicroclimateProcessor(db);
    this.soilRegenerationProcessor = new SoilRegenerationProcessor(db);
    this.pollinatorOpportunityProcessor = new PollinatorOpportunityProcessor(db);
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
      { connection: this.connOpts, concurrency: 5 },
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
          WHERE project_id = ${projectId} AND job_type = 'compute_terrain' AND status IN ('queued', 'failed')
        `;

        try {
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
        } finally {
          // Enqueue microclimate regardless of terrain outcome. Terrain failure
          // must not silently suppress microclimate; the processor itself throws
          // a clear error if terrain_analysis is missing, and attempts:3 buys
          // retry headroom if the UPDATE 'complete' commit races the read.
          await this.db`
            INSERT INTO data_pipeline_jobs (project_id, job_type, status)
            VALUES (${projectId}, 'compute_microclimate', 'queued')
          `;
          await this.microclimateQueue.add('compute_microclimate', { projectId }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 10000 },
            removeOnComplete: 50,
            removeOnFail: 25,
          });
        }

        await job.updateProgress(100);

        // Fires once when all 4 Tier-3 jobs for this project are complete.
        // The writer is idempotent + debounced, so concurrent invocations
        // from parallel workers are safe. On a non-skipped write we also
        // enqueue narrative generation.
        await this.handleTier3Completion(projectId);
      },
      { connection: this.connOpts, concurrency: 2 },
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
          WHERE project_id = ${projectId} AND job_type = 'compute_microclimate' AND status IN ('queued', 'failed')
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

        // Fires once when all 4 Tier-3 jobs for this project are complete.
        // The writer is idempotent + debounced, so concurrent invocations
        // from parallel workers are safe. On a non-skipped write we also
        // enqueue narrative generation.
        await this.handleTier3Completion(projectId);
      },
      { connection: this.connOpts, concurrency: 2 },
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
          WHERE project_id = ${projectId} AND job_type = 'compute_watershed' AND status IN ('queued', 'failed')
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

        // Fires once when all 4 Tier-3 jobs for this project are complete.
        // The writer is idempotent + debounced, so concurrent invocations
        // from parallel workers are safe. On a non-skipped write we also
        // enqueue narrative generation.
        await this.handleTier3Completion(projectId);
      },
      { connection: this.connOpts, concurrency: 2 },
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
          WHERE project_id = ${projectId} AND job_type = 'compute_soil_regeneration' AND status IN ('queued', 'failed')
        `;

        try {
          await this.soilRegenerationProcessor.process(projectId);

          // Pollinator enrichment: runs after soil-regen. Non-fatal — failures
          // are logged but do not fail the soil-regen job. Pollinator output is
          // read-side only (not wired into scoring), so this keeps
          // verify-scoring-parity delta at 0.000.
          try {
            await this.pollinatorOpportunityProcessor.process(projectId);
          } catch (pollErr) {
            const pollMsg = pollErr instanceof Error ? pollErr.message : String(pollErr);
            console.warn(`[pollinator_opportunity] ${projectId}: ${pollMsg}`);
          }

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

        // Fires once when all 4 Tier-3 jobs for this project are complete.
        // The writer is idempotent + debounced, so concurrent invocations
        // from parallel workers are safe. On a non-skipped write we also
        // enqueue narrative generation.
        await this.handleTier3Completion(projectId);
      },
      { connection: this.connOpts, concurrency: 2 },
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

    // Bookend start — flip the queued fetch_tier1 row to running so observers
    // (and the verification harness) can see the job is in flight.
    await this.db`
      UPDATE data_pipeline_jobs
      SET status = 'running', started_at = now()
      WHERE project_id = ${projectId} AND job_type = 'fetch_tier1' AND status IN ('queued', 'failed')
    `;

    try {
      // Fan out — fetch all layer types in parallel. Each layer is wrapped so
      // an adapter exception or store-UPDATE error marks the row as 'failed'
      // (instead of leaving it stuck in 'fetching') and logs the real cause.
      const outcomes = await Promise.all(
        LAYER_TYPES.map((layerType) => this.fetchAndStoreLayer(layerType, ctx)),
      );

      const failed = outcomes.filter((o) => o.status === 'failed');
      if (failed.length > 0) {
        console.error(
          `${failed.length}/${LAYER_TYPES.length} layers failed for project ${projectId}: ` +
            failed.map((o) => `${o.layerType}=${o.error}`).join('; '),
        );
      }

      // Recompute data completeness score
      await this.updateCompletenessScore(projectId);

      // Gate — require every Tier-1 layer the Tier-3 workers depend on to have
      // landed cleanly. If anything is missing we throw rather than enqueue a
      // doomed Tier-3 fan-out; the catch below surfaces the reason on the
      // fetch_tier1 row instead of four opaque Tier-3 failures.
      const completeLayers = new Set(
        outcomes.filter((o) => o.status === 'complete').map((o) => o.layerType),
      );
      const REQUIRED_TIER1: Tier1LayerType[] = [
        'elevation', 'soils', 'watershed', 'wetlands_flood', 'land_cover', 'climate',
      ];
      const missing = REQUIRED_TIER1.filter((t) => !completeLayers.has(t));
      if (missing.length > 0) {
        throw new Error(
          `tier1 incomplete — cannot start tier-3; missing: ${missing.join(', ')}`,
        );
      }

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
        attempts: 3,
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

      // Microclimate is enqueued from the terrain worker's tail (finally block)
      // so it fires after terrain_analysis is written — no first-attempt race —
      // while still firing on terrain failure.

      await this.db`
        UPDATE data_pipeline_jobs
        SET status = 'complete', completed_at = now()
        WHERE project_id = ${projectId} AND job_type = 'fetch_tier1' AND status = 'running'
      `;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.db`
        UPDATE data_pipeline_jobs
        SET status = 'failed', error_message = ${message}
        WHERE project_id = ${projectId} AND job_type = 'fetch_tier1' AND status = 'running'
      `;
      throw err;
    }

    await job.updateProgress(100);
  }

  /**
   * Fetch a single Tier-1 layer and persist its result. Any error — from the
   * adapter itself or from the store UPDATE — is caught here, logged with the
   * layer name and full error, and written back as `fetch_status='failed'` so
   * the row never gets stuck in `'fetching'`. Returns a per-layer outcome the
   * caller uses for rollup logging.
   */
  private async fetchAndStoreLayer(
    layerType: Tier1LayerType,
    ctx: ProjectContext,
  ): Promise<{ layerType: Tier1LayerType; status: 'complete' | 'failed'; error?: string }> {
    try {
      const result = await this.fetchLayer(layerType, ctx);
      await this.storeLayerResult(result, ctx);
      return { layerType, status: 'complete' };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      console.error(`[tier1] layer=${layerType} project=${ctx.projectId} error=${message}`, stack);
      try {
        await this.db`
          UPDATE project_layers SET
            fetch_status = 'failed',
            metadata     = ${this.db.json({ error: message } as never) as unknown as string},
            fetched_at   = now()
          WHERE project_id = ${ctx.projectId} AND layer_type = ${layerType}
        `;
      } catch (markErr) {
        const m = markErr instanceof Error ? markErr.message : String(markErr);
        console.error(`[tier1] layer=${layerType} failed to mark row as failed: ${m}`);
      }
      return { layerType, status: 'failed', error: message };
    }
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

    const adapter = resolveAdapter(layerType, ctx.country, this.db);
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
        geojson_data     = ${result.geojsonData ? this.db.json(result.geojsonData as never) as unknown as string : null},
        summary_data     = ${result.summaryData ? this.db.json(result.summaryData as never) as unknown as string : null},
        raster_url       = ${result.rasterUrl ?? null},
        wms_url          = ${result.wmsUrl ?? null},
        wms_layers       = ${result.wmsLayers ?? null},
        metadata         = ${result.metadata ? this.db.json(result.metadata as never) as unknown as string : null},
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

  /**
   * Post-Tier-3 hook — runs the canonical assessment writer, and when it
   * actually writes (not debounced/skipped) enqueues narrative generation.
   * Writer + narrative failures never fail the calling Tier-3 worker.
   */
  private async handleTier3Completion(projectId: string): Promise<void> {
    let wroteAssessment = false;
    try {
      const result = await maybeWriteAssessmentIfTier3Complete(this.db, projectId);
      wroteAssessment = !!result && !result.skipped;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.db`
        INSERT INTO data_pipeline_jobs (project_id, job_type, status, error_message)
        VALUES (${projectId}, 'write_assessment', 'failed', ${message})
      `.catch(() => { /* best-effort */ });
    }

    if (!wroteAssessment) return;
    if (!claudeClient.isConfigured()) return;

    try {
      await this.db`
        INSERT INTO data_pipeline_jobs (project_id, job_type, status)
        VALUES (${projectId}, 'generate_narrative', 'queued')
      `;
      await this.narrativeQueue.add('generate_narrative', { projectId }, {
        attempts: 2,
        backoff: { type: 'exponential', delay: 15000 },
        removeOnComplete: 50,
        removeOnFail: 25,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[narrative] enqueue failed for project ${projectId}: ${message}`);
    }
  }

  /** Start the BullMQ worker that generates site narrative + design recommendation. */
  startNarrativeWorker(): Worker {
    return new Worker(
      'narrative-generation',
      async (job: Job) => {
        const { projectId } = job.data as { projectId: string };

        await this.db`
          UPDATE data_pipeline_jobs
          SET status = 'running', started_at = now()
          WHERE project_id = ${projectId} AND job_type = 'generate_narrative' AND status IN ('queued', 'failed')
        `;

        try {
          const contextText = await buildNarrativeContext(this.db, projectId);
          if (!contextText) {
            throw new Error(`narrative context unavailable — project ${projectId} not found or has no layers`);
          }

          const [narrative, recommendation] = await Promise.all([
            claudeClient.generateSiteNarrative({ projectId, contextText }),
            claudeClient.generateDesignRecommendation({ projectId, contextText }),
          ]);

          await writeAiOutput(this.db, narrative);
          await writeAiOutput(this.db, recommendation);

          await this.db`
            UPDATE data_pipeline_jobs
            SET status = 'complete', completed_at = now()
            WHERE project_id = ${projectId} AND job_type = 'generate_narrative' AND status = 'running'
          `;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          await this.db`
            UPDATE data_pipeline_jobs
            SET status = 'failed', error_message = ${message}
            WHERE project_id = ${projectId} AND job_type = 'generate_narrative' AND status = 'running'
          `;
          throw err;
        }

        await job.updateProgress(100);
      },
      { connection: this.connOpts, concurrency: 1 },
    );
  }
}
