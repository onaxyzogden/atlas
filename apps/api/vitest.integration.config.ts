import { defineConfig } from 'vitest/config';

/**
 * Opt-in real-PostGIS integration suite. NEVER run by `pnpm test` (the fast
 * mock suite excludes the integration dir and the pgtest.ts suffix). Run
 * explicitly via `pnpm --filter @ogden/api test:integration`.
 *
 * `globalSetup` starts one `postgis/postgis:16-3.4` testcontainer, runs the
 * real migrations, and writes its connection URL to a sentinel JSON file in
 * `os.tmpdir()` (globalSetup `process.env` mutations do not propagate to
 * forked workers). Docker absent → green-skip, never red.
 *
 * NOTE: DATABASE_URL is deliberately NOT set here — the harness sets it at
 * runtime from the sentinel, before the dynamic `import('../../app.js')`.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/integration/**/*.pgtest.ts'],
    globalSetup: ['src/tests/integration/globalSetup.ts'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-key-for-vitest-smoke-tests-32ch',
      REDIS_URL: 'redis://localhost:6379',
      TESTCONTAINERS_RYUK_DISABLED: 'true',
    },
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
