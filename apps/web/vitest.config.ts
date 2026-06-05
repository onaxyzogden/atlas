import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { createRequire } from 'node:module';

// Resolve the single hoisted react/react-dom via Node's directory walk
// (anchored at apps/web) instead of a fixed `../../node_modules` path. The
// walk finds `<repo>/node_modules/react` from both the main tree AND any
// git worktree (worktrees live inside the repo but have no own node_modules),
// so the dedupe pin below works everywhere without a per-worktree install.
const requireFromWeb = createRequire(__dirname + '/');
const reactDir = dirname(requireFromWeb.resolve('react/package.json'));
const reactDomDir = dirname(requireFromWeb.resolve('react-dom/package.json'));

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    // Forks (not the default `threads` pool) are force-killed by tinypool on
    // teardown. happy-dom can leave a pending OS handle, and the `threads` pool
    // waits for it indefinitely on Windows → `vitest run` never exits and
    // becomes a multi-day zombie. Forks + a bounded teardown guarantee exit.
    pool: 'forks',
    teardownTimeout: 10_000,
    // Even with forks + a bounded teardown, vitest 2.1.x still hangs at exit
    // after all files pass: tinypool's graceful pool.close() waits on a handle
    // a happy-dom worker leaves alive and never returns (a multi-minute zombie
    // on CI). The force-exit reporter ends the run from onFinished — which
    // vitest awaits after results aggregate but before pool.close() — with the
    // correct pass/fail code. 'default' is kept for the run summary.
    reporters: ['default', './scripts/force-exit-reporter.mjs'],
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
      // Paths resolved above via Node module resolution so they hold in any
      // git worktree, not just the main tree.
      react: reactDir,
      'react-dom': reactDomDir,
      // More-specific subpath aliases MUST come first — Vite tests prefix match in order.
      '@ogden/shared/scoring': resolve(__dirname, '../../packages/shared/src/scoring/index.ts'),
      '@ogden/shared/manifest': resolve(__dirname, '../../packages/shared/src/featureManifest.ts'),
      '@ogden/shared/relationships': resolve(__dirname, '../../packages/shared/src/relationships/index.ts'),
      '@ogden/shared/evidence': resolve(__dirname, '../../packages/shared/src/evidence/index.ts'),
      '@ogden/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
