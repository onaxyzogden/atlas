// Production bundler for @ogden/api.
//
// Why bundle instead of `tsc` emit:
//   The API imports the workspace package `@ogden/shared`, whose package.json
//   `exports` resolve to TypeScript *source* (`./src/index.ts`). That is fine
//   under `tsx` (dev) but fatal under plain `node dist/...` — Node throws
//   ERR_UNKNOWN_FILE_EXTENSION on the `.ts`. `tsc` does not rewrite the bare
//   `@ogden/shared` specifier, so the emitted JS still points at the .ts source.
//
//   esbuild bundles @ogden/shared (and its subpath exports) *into* the output,
//   leaving every real npm dependency external (loaded from node_modules at
//   runtime). The result is a self-contained, flat dist:
//       dist/index.js        ← server entry      (CMD: node dist/index.js)
//       dist/db/migrate.js    ← migration runner  (preDeployCommand)
//   which is exactly the layout the Dockerfile and render.yaml already expect.
//
// Type-checking is still done by `tsc --noEmit` (see the `build` script); this
// step only emits.

import { build } from 'esbuild';
import { readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
);

// Start from a clean dist so stale output from a prior `tsc` emit (nested
// dist/apps/api/src/**) never lingers next to the flat bundle.
rmSync(new URL('./dist', import.meta.url), { recursive: true, force: true });

// Keep every real npm dependency external (resolved from node_modules at
// runtime). Only the @ogden/* workspace packages are bundled in, because they
// resolve to TypeScript source that Node cannot load directly.
const external = Object.keys(pkg.dependencies ?? {}).filter(
  (dep) => !dep.startsWith('@ogden/'),
);

await build({
  entryPoints: ['src/index.ts', 'src/db/migrate.ts'],
  outdir: 'dist',
  outbase: 'src',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: true,
  external,
  // An ESM output that references `require` (via external CJS interop) needs a
  // shim. Source uses `import.meta.url` for paths, so no __dirname shim needed.
  banner: {
    js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);",
  },
  logLevel: 'info',
});

console.log('esbuild: bundled', fileURLToPath(import.meta.url), '→ dist/');
