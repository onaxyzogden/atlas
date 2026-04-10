/**
 * buildApp — Fastify application factory.
 *
 * Registers all plugins, routes, and error handling without calling .listen().
 * Used by src/index.ts for production and by tests via app.inject().
 */

import Fastify, { type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { ZodError } from 'zod';

import { config } from './lib/config.js';
import { AppError } from './lib/errors.js';

import databasePlugin from './plugins/database.js';
import redisPlugin from './plugins/redis.js';
import authPlugin from './plugins/auth.js';

import authRoutes from './routes/auth/index.js';
import projectRoutes from './routes/projects/index.js';
import layerRoutes from './routes/layers/index.js';
import spiritualRoutes from './routes/spiritual/index.js';
import pipelineRoutes from './routes/pipeline/index.js';
import aiRoutes from './routes/ai/index.js';
import elevationRoutes from './routes/elevation/index.js';
import designFeatureRoutes from './routes/design-features/index.js';
import fileRoutes from './routes/files/index.js';
import { DataPipelineOrchestrator } from './services/pipeline/DataPipelineOrchestrator.js';

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
        app.log.info('Data pipeline workers started (tier1-data + tier3-terrain + tier3-watershed)');
      }
    } catch (err) {
      app.log.warn('Data pipeline workers not started (Redis/DB not available)');
    }
  });

  // ─── Health check ────────────────────────────────────────────────────────────

  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  }));

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
