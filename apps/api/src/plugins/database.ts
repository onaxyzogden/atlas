import fp from 'fastify-plugin';
import postgres from 'postgres';
import type { FastifyInstance } from 'fastify';
import { config } from '../lib/config.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: postgres.Sql;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const sql = postgres(config.DATABASE_URL, {
    max: 20,
    idle_timeout: 30,
    connect_timeout: 10,
    onnotice: () => {},
  });

  // Verify connection
  await sql`SELECT 1`;
  fastify.log.info('PostgreSQL connected');

  fastify.decorate('db', sql);

  fastify.addHook('onClose', async () => {
    await sql.end();
  });
});
