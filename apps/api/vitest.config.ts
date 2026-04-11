import { defineConfig } from 'vitest/config';

export default defineConfig({
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
