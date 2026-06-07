import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Forks are force-killed on teardown; the default `threads` pool can hang
    // indefinitely on a leaked handle (mirrors apps/web). Keeps `vitest run`
    // from turning into a zombie process. The integration config already does this.
    pool: 'forks',
    teardownTimeout: 10_000,
    exclude: [...configDefaults.exclude, 'src/tests/integration/**', '**/*.pgtest.ts'],
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
