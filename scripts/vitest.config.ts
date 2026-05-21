import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Scoped vitest config for repo-root `scripts/` directory. The root has no
// vitest config (each workspace owns its own), so tests under `scripts/`
// need an explicit config to be discovered. Keep this minimal — node
// environment, no plugins, no aliases (scripts import via relative paths).
export default defineConfig({
  test: {
    environment: 'node',
    root: resolve(__dirname),
    include: ['__tests__/**/*.test.ts'],
  },
});
