import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Inline zustand so its bare `react` import is rewritten by the
    // resolve.alias below (externalized deps bypass the alias and pull
    // zustand's own nested react copy → duplicate-React hook crash).
    server: { deps: { inline: ['zustand'] } },
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
    // Zustand ships a nested react copy; without pinning, a store-bound hook
    // rendered in a component test hits a second React instance and throws
    // "Cannot read properties of null (reading 'useCallback')". Exact-match
    // aliases force the single hoisted copy without shadowing react/jsx-runtime.
    dedupe: ['react', 'react-dom'],
    alias: {
      // Pin react/react-dom to the single hoisted copy (Vite matches `react`
      // exactly and `react/*`, but not `react-dom`, so jsx-runtime still works).
      react: resolve(__dirname, '../../node_modules/react'),
      'react-dom': resolve(__dirname, '../../node_modules/react-dom'),
      // More-specific subpath aliases MUST come first — Vite tests prefix match in order.
      '@ogden/shared/scoring': resolve(__dirname, '../../packages/shared/src/scoring/index.ts'),
      '@ogden/shared/manifest': resolve(__dirname, '../../packages/shared/src/featureManifest.ts'),
      '@ogden/shared/relationships': resolve(__dirname, '../../packages/shared/src/relationships/index.ts'),
      '@ogden/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
