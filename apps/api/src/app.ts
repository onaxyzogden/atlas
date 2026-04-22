/**
 * buildApp — Fastify application factory.
 *
 * Registers all plugins, routes, and error handling without calling .listen().
 * Used by src/index.ts for production and by tests via app.inject().
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Fastify, { type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import scalarPlugin from '@scalar/fastify-api-reference';
import { ZodError } from 'zod';

import { config } from './lib/config.js';
import { AppError } from './lib/errors.js';

import databasePlugin from './plugins/database.js';
import redisPlugin from './plugins/redis.js';
import authPlugin from './plugins/auth.js';
import rbacPlugin from './plugins/rbac.js';
import featureGatePlugin from './plugins/featureGate.js';
import websocketPlugin from './plugins/websocket.js';

import authRoutes from './routes/auth/index.js';
import projectRoutes from './routes/projects/index.js';
import templateRoutes from './routes/templates/index.js';
import layerRoutes from './routes/layers/index.js';
import spiritualRoutes from './routes/spiritual/index.js';
import pipelineRoutes from './routes/pipeline/index.js';
import aiRoutes from './routes/ai/index.js';
import elevationRoutes from './routes/elevation/index.js';
import gaezRoutes from './routes/gaez/index.js';
import { initGaezService } from './services/gaez/GaezRasterService.js';
import soilgridsRoutes from './routes/soilgrids/index.js';
import { initSoilGridsService } from './services/soilgrids/SoilGridsRasterService.js';
import designFeatureRoutes from './routes/design-features/index.js';
import fileRoutes from './routes/files/index.js';
import exportRoutes from './routes/exports/index.js';
import portalRoutes from './routes/portal/index.js';
import publicPortalRoutes from './routes/portal/public.js';
import commentRoutes from './routes/comments/index.js';
import memberRoutes from './routes/members/index.js';
import organizationRoutes from './routes/organizations/index.js';
import activityRoutes from './routes/activity/index.js';
import suggestionRoutes from './routes/suggestions/index.js';

// ── Scaffolded sections (Batch 1: §§2, 3, 4, 26) ──
import basemapTerrainRoutes from './routes/basemap-terrain/index.js';
import siteDataLayersRoutes from './routes/site-data-layers/index.js';
import siteAssessmentRoutes from './routes/site-assessment/index.js';
import adminGovernanceRoutes from './routes/admin-governance/index.js';

// ── Scaffolded sections (Batch 2: §§5, 6, 7, 13) ──
import hydrologyWaterRoutes from './routes/hydrology-water/index.js';
import climateAnalysisRoutes from './routes/climate-analysis/index.js';
import soilEcologyRoutes from './routes/soil-ecology/index.js';
import utilitiesEnergyRoutes from './routes/utilities-energy/index.js';

import { DataPipelineOrchestrator } from './services/pipeline/DataPipelineOrchestrator.js';
import { closeBrowser } from './services/pdf/browserManager.js';
import { subscribeBroadcast } from './lib/broadcast.js';
import wsRoutes from './routes/ws/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    pipeline: DataPipelineOrchestrator;
  }
}

export async function buildApp(opts: FastifyServerOptions = {}) {
  const app = Fastify(opts);

  // ─── Plugins ────────────────────────────────────────────────────────────────

  await app.register(cors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW,
  });

  await app.register(multipart, {
    limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
  });

  await app.register(databasePlugin);
  await app.register(redisPlugin);
  await app.register(authPlugin);
  await app.register(rbacPlugin);
  await app.register(featureGatePlugin);
  await app.register(websocketPlugin);

  // ─── Pipeline orchestrator (populated in onReady once DB + Redis are available)
  app.decorate('pipeline', null as unknown as DataPipelineOrchestrator);

  // ─── Routes ─────────────────────────────────────────────────────────────────

  await app.register(authRoutes,     { prefix: '/api/v1/auth' });
  await app.register(projectRoutes,  { prefix: '/api/v1/projects' });
  await app.register(templateRoutes, { prefix: '/api/v1/templates' });
  await app.register(layerRoutes,    { prefix: '/api/v1/layers' });
  await app.register(spiritualRoutes,{ prefix: '/api/v1/spiritual' });
  await app.register(pipelineRoutes, { prefix: '/api/v1/pipeline' });
  await app.register(aiRoutes,       { prefix: '/api/v1/ai' });
  await app.register(elevationRoutes,{ prefix: '/api/v1/elevation' });
  await app.register(gaezRoutes,     { prefix: '/api/v1/gaez' });
  await app.register(soilgridsRoutes,{ prefix: '/api/v1/soilgrids' });
  await app.register(designFeatureRoutes, { prefix: '/api/v1/design-features' });
  await app.register(fileRoutes,          { prefix: '/api/v1/projects' });
  await app.register(exportRoutes,        { prefix: '/api/v1/projects' });
  await app.register(portalRoutes,        { prefix: '/api/v1/projects' });
  await app.register(publicPortalRoutes,  { prefix: '/api/v1/portal' });
  await app.register(commentRoutes,       { prefix: '/api/v1/projects' });
  await app.register(memberRoutes,        { prefix: '/api/v1/projects' });
  await app.register(organizationRoutes,  { prefix: '/api/v1/organizations' });
  await app.register(activityRoutes,      { prefix: '/api/v1/projects' });
  await app.register(suggestionRoutes,    { prefix: '/api/v1/projects' });
  await app.register(wsRoutes,            { prefix: '/api/v1/ws' });

  // ── Scaffolded sections (Batch 1: §§2, 3, 4, 26) ──
  await app.register(basemapTerrainRoutes, { prefix: '/api/v1/basemap-terrain' });
  await app.register(siteDataLayersRoutes, { prefix: '/api/v1/site-data-layers' });
  await app.register(siteAssessmentRoutes, { prefix: '/api/v1/site-assessment' });
  await app.register(adminGovernanceRoutes,{ prefix: '/api/v1/admin-governance' });

  // ── Scaffolded sections (Batch 2: §§5, 6, 7, 13) ──
  await app.register(hydrologyWaterRoutes,  { prefix: '/api/v1/hydrology-water' });
  await app.register(climateAnalysisRoutes, { prefix: '/api/v1/climate-analysis' });
  await app.register(soilEcologyRoutes,     { prefix: '/api/v1/soil-ecology' });
  await app.register(utilitiesEnergyRoutes, { prefix: '/api/v1/utilities-energy' });

  // ─── GAEZ raster service (manifest loaded if present; absent = disabled) ────

  {
    const gaez = initGaezService(config.GAEZ_DATA_DIR, config.GAEZ_S3_PREFIX ?? null);
    if (gaez.isEnabled()) {
      app.log.info('GAEZ v4 raster service enabled');
    } else {
      app.log.info('GAEZ v4 raster service disabled (no manifest — run ingest:gaez to enable)');
    }
  }

  // ─── SoilGrids raster service (manifest optional; absent = disabled) ────────

  {
    const sg = initSoilGridsService(config.SOILGRIDS_DATA_DIR, config.SOILGRIDS_S3_PREFIX ?? null);
    if (sg.isEnabled()) {
      app.log.info('SoilGrids v2.0 raster service enabled');
    } else {
      app.log.info('SoilGrids v2.0 raster service disabled (no manifest at data/soilgrids)');
    }
  }

  // ─── Migration check (warn only, does not block startup) ─────────────────────

  app.addHook('onReady', async () => {
    try {
      const db = (app as unknown as { db: import('postgres').Sql }).db;
      if (!db) return;

      // Check if schema_migrations table exists
      const [tableExists] = await db`
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'schema_migrations'
        LIMIT 1
      `;

      if (!tableExists) {
        app.log.warn('schema_migrations table not found — run "pnpm migrate" to apply database migrations');
        return;
      }

      const applied = await db`SELECT version FROM schema_migrations`;
      const appliedSet = new Set(applied.map((r) => r.version as string));

      // Read migration files from disk
      const { readdirSync } = await import('fs');
      const { resolve: pathResolve, dirname: pathDirname } = await import('path');
      const { fileURLToPath: toPath } = await import('url');
      const dir = pathResolve(pathDirname(toPath(import.meta.url)), 'db/migrations');
      const files = readdirSync(dir).filter((f: string) => f.endsWith('.sql')).sort();

      const pending = files.filter((f: string) => !appliedSet.has(f.replace(/\.sql$/, '')));
      if (pending.length > 0) {
        app.log.warn(`${pending.length} unapplied migration(s): ${pending.join(', ')} — run "pnpm migrate"`);
      }
    } catch {
      app.log.warn('Could not check migration status — run "pnpm migrate" to ensure database is up to date');
    }
  });

  // ─── Data pipeline workers ───────────────────────────────────────────────────

  app.addHook('onReady', async () => {
    try {
      const db = (app as unknown as { db: import('postgres').Sql }).db;
      const redis = (app as unknown as { redis: import('ioredis').Redis }).redis;

      if (db && redis && redis.status === 'ready') {
        const orchestrator = new DataPipelineOrchestrator(db, redis);
        app.pipeline = orchestrator;
        orchestrator.startWorker();
        orchestrator.startTerrainWorker();
        orchestrator.startWatershedWorker();
        orchestrator.startMicroclimateWorker();
        orchestrator.startSoilRegenerationWorker();
        orchestrator.startNarrativeWorker();
        app.log.info('Data pipeline workers started (tier1-data + tier3-terrain + tier3-watershed + tier3-microclimate + tier3-soil-regeneration + narrative-generation)');

        // Relay Redis pub/sub broadcasts to local WebSocket connections
        const redisSub = subscribeBroadcast(redis, (projectId, event) => {
          app.wsBroadcast(projectId, event);
        });

        // Clean up subscriber on shutdown
        app.addHook('onClose', async () => {
          redisSub.disconnect();
        });

        app.log.info('WebSocket Redis broadcast subscriber active');
      }
    } catch (err) {
      app.log.warn(`Data pipeline workers not started (Redis/DB not available): ${err}`);
    }
  });

  // ─── OpenAPI spec & docs ─────────────────────────────────────────────────────

  const __dirname = dirname(fileURLToPath(import.meta.url));

  app.get('/api/v1/openapi.yaml', async (_req, reply) => {
    const spec = readFileSync(resolve(__dirname, '../../openapi.yaml'), 'utf-8');
    reply.type('text/yaml').send(spec);
  });

  if (config.NODE_ENV !== 'production') {
    await app.register(scalarPlugin, {
      routePrefix: '/api/docs',
      configuration: {
        url: '/api/v1/openapi.yaml',
        theme: 'default',
      },
    });
  }

  // ─── Health check ────────────────────────────────────────────────────────────

  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  }));

  // ─── Cleanup hooks ──────────────────────────────────────────────────────────

  app.addHook('onClose', async () => {
    await closeBrowser();
  });

  // ─── 404 handler (always JSON) ────────────────────────────────────────────────

  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).header('Content-Type', 'application/json; charset=utf-8').send({
      data: null,
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });

  // ─── Global error handler ────────────────────────────────────────────────────

  app.setErrorHandler((error, _req, reply) => {
    reply.header('Content-Type', 'application/json; charset=utf-8');

    if (error instanceof AppError) {
      reply.code(error.statusCode).send({
        data: null,
        error: { code: error.code, message: error.message, details: error.details },
      });
      return;
    }

    if (error instanceof ZodError) {
      reply.code(422).send({
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
      });
      return;
    }

    app.log.error(error);

    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    const message = config.NODE_ENV !== 'production'
      ? (error instanceof Error ? error.message : String(error))
      : 'An unexpected error occurred';

    reply.code(statusCode).send({
      data: null,
      error: { code: 'INTERNAL_ERROR', message },
    });
  });

  return app;
}
