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
import websocketPlugin from './plugins/websocket.js';

import authRoutes from './routes/auth/index.js';
import projectRoutes from './routes/projects/index.js';
import layerRoutes from './routes/layers/index.js';
import spiritualRoutes from './routes/spiritual/index.js';
import pipelineRoutes from './routes/pipeline/index.js';
import aiRoutes from './routes/ai/index.js';
import elevationRoutes from './routes/elevation/index.js';
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
import { DataPipelineOrchestrator } from './services/pipeline/DataPipelineOrchestrator.js';
import { closeBrowser } from './services/pdf/browserManager.js';
import { subscribeBroadcast } from './lib/broadcast.js';
import wsRoutes from './routes/ws/index.js';

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
  await app.register(websocketPlugin);

  // ─── Routes ─────────────────────────────────────────────────────────────────

  await app.register(authRoutes,     { prefix: '/api/v1/auth' });
  await app.register(projectRoutes,  { prefix: '/api/v1/projects' });
  await app.register(layerRoutes,    { prefix: '/api/v1/layers' });
  await app.register(spiritualRoutes,{ prefix: '/api/v1/spiritual' });
  await app.register(pipelineRoutes, { prefix: '/api/v1/pipeline' });
  await app.register(aiRoutes,       { prefix: '/api/v1/ai' });
  await app.register(elevationRoutes,{ prefix: '/api/v1/elevation' });
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

  // ─── Data pipeline workers ───────────────────────────────────────────────────

  app.addHook('onReady', async () => {
    try {
      const db = (app as unknown as { db: import('postgres').Sql }).db;
      const redis = (app as unknown as { redis: import('ioredis').Redis }).redis;

      if (db && redis) {
        const orchestrator = new DataPipelineOrchestrator(db, redis);
        orchestrator.startWorker();
        orchestrator.startTerrainWorker();
        orchestrator.startWatershedWorker();
        orchestrator.startMicroclimateWorker();
        orchestrator.startSoilRegenerationWorker();
        app.log.info('Data pipeline workers started (tier1-data + tier3-terrain + tier3-watershed + tier3-microclimate + tier3-soil-regeneration)');

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
      app.log.warn('Data pipeline workers not started (Redis/DB not available)');
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

  // ─── Global error handler ────────────────────────────────────────────────────

  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({
        data: null,
        meta: undefined,
        error: { code: error.code, message: error.message, details: error.details },
      });
      return;
    }

    if (error instanceof ZodError) {
      reply.code(422).send({
        data: null,
        meta: undefined,
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
    reply.code(500).send({
      data: null,
      meta: undefined,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
  });

  return app;
}
