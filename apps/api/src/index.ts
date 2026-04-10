import { buildApp } from './app.js';
import { config } from './lib/config.js';

const app = await buildApp({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      config.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

try {
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
  app.log.info(`OGDEN API running on port ${config.PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
