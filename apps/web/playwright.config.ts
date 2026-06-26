import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E smoke suite for the offline-demo path (pre-launch audit F4).
 *
 * The suite builds the FEATURE_DEMO_OFFLINE bundle and serves it with
 * `vite preview` — it never touches a live API. The webServer command chains
 * the build (../../scripts/build-offline-demo.mjs sets the flag before Vite
 * loads its config) and the preview server, so a single `playwright test`
 * invocation produces and serves a faithful offline build.
 *
 * Run:  corepack pnpm --filter @ogden/web run test:e2e
 */

const PORT = 4317;
const HOST = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // Thin smoke suite: one preview server, serial execution keeps it simple and
  // avoids several Cesium-loading contexts contending for resources at once.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: HOST,
    // The offline build ships a PWA service worker (generateSW + autoUpdate).
    // Block it so smoke runs are deterministic — none of the happy paths under
    // test depend on the SW, and its precache would otherwise serve stale shells
    // across reloads.
    serviceWorkers: 'block',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Build the offline bundle, then serve dist. `&&` runs under the OS shell
    // (cmd.exe on Windows), where it short-circuits if the build fails so the
    // error surfaces instead of a server that boots a stale/missing dist.
    command:
      'node ../../scripts/build-offline-demo.mjs && corepack pnpm exec vite preview --port 4317 --strictPort',
    url: HOST,
    timeout: 240_000, // a cold Cesium build is slow
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
