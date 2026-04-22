import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/computeScores.ts',
        'src/lib/visionFit.ts',
        'src/features/financial/engine/**',
        'src/features/rules/RulesEngine.ts',
        'src/lib/syncService.ts',
        'src/lib/layerFetcher.ts',
      ],
    },
  },
  resolve: {
    alias: {
      // More-specific subpath aliases MUST come first — Vite tests prefix match in order.
      '@ogden/shared/scoring': resolve(__dirname, '../../packages/shared/src/scoring/index.ts'),
      '@ogden/shared/manifest': resolve(__dirname, '../../packages/shared/src/featureManifest.ts'),
      '@ogden/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
