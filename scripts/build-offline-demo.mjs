/**
 * build-offline-demo.mjs — produce the apps/web bundle with the offline-demo
 * flag baked in, for the Playwright E2E smoke suite (pre-launch audit F4).
 *
 * Why a dedicated script (not `FEATURE_DEMO_OFFLINE=true vite build`):
 *   - apps/web/vite.config.ts reads `process.env.FEATURE_DEMO_OFFLINE` inside its
 *     `define` block AT CONFIG-EVAL TIME, so the flag must already be set on the
 *     Node process before Vite loads the config. Inline `FOO=bar cmd`
 *     env-prefixing does not work in Windows cmd/PowerShell, so we set it here
 *     and drive Vite through its Node API — one cross-platform entry point.
 *   - Calling Vite's build() directly skips the `tsc &&` precheck and the heavy
 *     `postbuild` showcase prerender that the `pnpm --filter @ogden/web build`
 *     npm script chains; the smoke suite only needs the main offline bundle.
 *
 * Output: apps/web/dist — served by `vite preview` from the Playwright webServer
 * (see apps/web/playwright.config.ts).
 */
import { build } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDir, '..', 'apps', 'web');

// MUST precede build() — see header. The `define` block bakes this in as a literal.
process.env.FEATURE_DEMO_OFFLINE = 'true';
// Belt-and-braces for H3: the guest tour needs the builtin seeds; flags.ts also
// ORs FEATURE_DEMO_OFFLINE into SEED_SAMPLES, this makes the intent explicit.
process.env.FEATURE_SEED_SAMPLES = 'true';

await build({
  root: webRoot,
  configFile: resolve(webRoot, 'vite.config.ts'),
  logLevel: 'info',
});

// eslint-disable-next-line no-console -- progress line for the Playwright webServer log
console.log('[build-offline-demo] apps/web/dist built with FEATURE_DEMO_OFFLINE=true');
