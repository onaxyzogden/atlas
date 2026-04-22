import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // More-specific subpath MUST come first — Vite prefix-matches in order.
      // Mirrors apps/web/vite.config.ts so the monorepo's @ogden/shared/scoring
      // subpath resolves identically in API tests and in the web bundle.
      '@ogden/shared/scoring': resolve(__dirname, '../../packages/shared/src/scoring/index.ts'),
      '@ogden/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://test:test@localhost:5432/test_db',
      JWT_SECRET: 'test-secret-key-for-vitest-smoke-tests-32ch',
      REDIS_URL: 'redis://localhost:6379',
    },
    coverage: {
      provider: 'v8',
      include: ['src/routes/**', 'src/lib/**', 'src/services/**'],
    },
  },
});
