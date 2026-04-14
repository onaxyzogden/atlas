import fp from 'fastify-plugin';
import { Redis } from 'ioredis';
import type { FastifyInstance } from 'fastify';
import { config } from '../lib/config.js';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    family: 4,
    connectTimeout: 5000,
    retryStrategy(times: number) {
      if (times > 3) return null;       // stop retrying after 3 attempts
      return Math.min(times * 200, 2000);
    },
  });

  try {
    await redis.connect();
    fastify.log.info('Redis connected');
  } catch (err) {
    fastify.log.warn('Redis not available — pipeline workers and pub/sub will be disabled');
  }

  fastify.decorate('redis', redis);

  fastify.addHook('onClose', async () => {
    try { await redis.quit(); } catch { /* already closed */ }
  });
});
