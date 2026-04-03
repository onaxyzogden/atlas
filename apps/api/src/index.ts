import Fastify from 'fastify';
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

const fastify = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      config.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

// ─── Plugins ──────────────────────────────────────────────────────────────────

await fastify.register(cors, {
  origin: config.CORS_ORIGIN,
  credentials: true,
});

await fastify.register(rateLimit, {
  max: config.RATE_LIMIT_MAX,
  timeWindow: config.RATE_LIMIT_WINDOW,
});

await fastify.register(multipart, {
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
});

await fastify.register(databasePlugin);
await fastify.register(redisPlugin);
await fastify.register(authPlugin);

// ─── Routes ───────────────────────────────────────────────────────────────────

await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
await fastify.register(projectRoutes, { prefix: '/api/v1/projects' });
await fastify.register(layerRoutes, { prefix: '/api/v1/layers' });
await fastify.register(spiritualRoutes, { prefix: '/api/v1/spiritual' });
await fastify.register(pipelineRoutes, { prefix: '/api/v1/pipeline' });
await fastify.register(aiRoutes, { prefix: '/api/v1/ai' });

// ─── Health check ─────────────────────────────────────────────────────────────

fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '0.1.0',
}));

// ─── Global error handler ─────────────────────────────────────────────────────

fastify.setErrorHandler((error, _req, reply) => {
  if (error instanceof AppError) {
    reply.code(error.statusCode).send({
      data: null,
      meta: undefined,
      error: { code: error.code, message: error.message, details: error.details },
    });
    return;
  }

  // Convert Zod validation errors into structured 422 responses
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

  fastify.log.error(error);
  reply.code(500).send({
    data: null,
    meta: undefined,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

try {
  await fastify.listen({ port: config.PORT, host: '0.0.0.0' });
  fastify.log.info(`OGDEN API running on port ${config.PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
