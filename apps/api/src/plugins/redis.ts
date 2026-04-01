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
  });

  await redis.connect();
  fastify.log.info('Redis connected');

  fastify.decorate('redis', redis);

  fastify.addHook('onClose', async () => {
    await redis.quit();
  });
});
