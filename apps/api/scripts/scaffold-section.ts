/**
 * scaffold-section.ts — mechanical generator for a new feature section
 * conforming to the standard module shape defined in
 * `feature-sections-1-30-the-stateless-lollipop.md`.
 *
 * Usage:
 *   pnpm --filter @ogden/api exec tsx scripts/scaffold-section.ts <id> <slug> "<name>" [phase]
 *
 *   <id>     — integer 1-30
 *   <slug>   — kebab-case, used for route prefix and feature folder
 *   <name>   — human-readable title
 *   [phase]  — default phase tag for this section's stub, default P1
 *
 * Produces (idempotent per file — refuses to overwrite):
 *   1. `packages/shared/src/schemas/section<id>.schema.ts` (Zod stub)
 *   2. `apps/api/src/routes/<slug>/index.ts` (Fastify plugin skeleton)
 *   3. `apps/web/src/features/<slug>/index.ts`            }
 *   4. `apps/web/src/features/<slug>/<Slug>Page.tsx`      } feature folder
 *   5. `apps/web/src/features/<slug>/CONTEXT.md`          }
 *   6. Appends a stub entry to `packages/shared/src/featureManifest.ts`
 *   7. Appends `app.register(<slug>Routes, { prefix: '/api/v1/<slug>' });`
 *      to `apps/api/src/app.ts` (imports too)
 *
 * Side effects stop on first existing artifact — re-run is safe.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

type Phase = 'P1' | 'P2' | 'P3' | 'P4' | 'MT' | 'FUTURE';

const VALID_PHASES: readonly Phase[] = ['P1', 'P2', 'P3', 'P4', 'MT', 'FUTURE'];

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '../../..');

function die(msg: string): never {
  process.stderr.write(`scaffold-section: ${msg}\n`);
  process.exit(1);
}

function toPascal(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function writeNew(filePath: string, content: string): void {
  if (existsSync(filePath)) {
    die(`refusing to overwrite existing file: ${filePath}`);
  }
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf-8');
  process.stdout.write(`  + ${filePath}\n`);
}

function main() {
  const [, , idArg, slug, name, phaseArg = 'P1'] = process.argv;
  if (!idArg || !slug || !name) {
    die('usage: tsx scaffold-section.ts <id> <slug> "<name>" [phase]');
  }
  const id = Number.parseInt(idArg, 10);
  if (!Number.isInteger(id) || id < 1 || id > 30) {
    die(`id must be integer 1-30, got ${idArg}`);
  }
  if (!/^[a-z][a-z0-9-]*$/.test(slug)) {
    die(`slug must be kebab-case, got "${slug}"`);
  }
  const phase = phaseArg.toUpperCase() as Phase;
  if (!VALID_PHASES.includes(phase)) {
    die(`phase must be one of ${VALID_PHASES.join(', ')}, got ${phaseArg}`);
  }

  const pascal = toPascal(slug);

  // 1. Schema stub
  const schemaPath = resolve(
    repoRoot,
    `packages/shared/src/schemas/section${id}.schema.ts`,
  );
  writeNew(
    schemaPath,
    `import { z } from 'zod';\n\n` +
      `// Section ${id} — ${name}\n` +
      `// Generated stub. Replace with the real Zod types as this section\n` +
      `// takes shape. Keep input/output types colocated.\n\n` +
      `export const ${pascal}Placeholder = z.object({});\n` +
      `export type ${pascal}Placeholder = z.infer<typeof ${pascal}Placeholder>;\n`,
  );

  // 2. API route skeleton
  const routePath = resolve(
    repoRoot,
    `apps/api/src/routes/${slug}/index.ts`,
  );
  writeNew(
    routePath,
    `import type { FastifyInstance } from 'fastify';\n\n` +
      `/**\n` +
      ` * Section ${id} — ${name} ([${phase}])\n` +
      ` * Generated stub from scaffold-section.ts. Add handlers inline.\n` +
      ` */\n` +
      `export default async function ${slug.replace(/-/g, '_')}Routes(fastify: FastifyInstance) {\n` +
      `  const { authenticate } = fastify;\n\n` +
      `  fastify.get('/', { preHandler: [authenticate, fastify.requirePhase('${phase}')] }, async () => {\n` +
      `    return { data: [], meta: { total: 0 }, error: null };\n` +
      `  });\n` +
      `}\n`,
  );

  // 3. Feature folder
  const featureDir = resolve(repoRoot, `apps/web/src/features/${slug}`);
  writeNew(
    resolve(featureDir, 'index.ts'),
    `export { default as ${pascal}Page } from './${pascal}Page';\n`,
  );
  writeNew(
    resolve(featureDir, `${pascal}Page.tsx`),
    `// Section ${id} — ${name} ([${phase}])\n` +
      `// Generated stub from scaffold-section.ts.\n\n` +
      `export default function ${pascal}Page() {\n` +
      `  return <div data-section-id=\"${id}\">${name} — coming soon</div>;\n` +
      `}\n`,
  );

  // 4. CONTEXT.md from template
  const tmplPath = resolve(
    repoRoot,
    'apps/web/src/features/_templates/SECTION_CONTEXT.md.tmpl',
  );
  if (!existsSync(tmplPath)) {
    die(`CONTEXT.md template missing at ${tmplPath}`);
  }
  const tmpl = readFileSync(tmplPath, 'utf-8');
  const contextContent = tmpl
    .replace(/\{\{ID\}\}/g, String(id))
    .replace(/\{\{NAME\}\}/g, name)
    .replace(/\{\{SLUG\}\}/g, slug)
    .replace(/\{\{PHASES\}\}/g, phase);
  writeNew(resolve(featureDir, 'CONTEXT.md'), contextContent);

  // 5. Append manifest stub
  const manifestPath = resolve(
    repoRoot,
    'packages/shared/src/featureManifest.ts',
  );
  const manifest = readFileSync(manifestPath, 'utf-8');
  const stubEntry =
    `  {\n` +
    `    id: ${id},\n` +
    `    slug: '${slug}',\n` +
    `    name: '${name.replace(/'/g, "\\'")}',\n` +
    `    phases: ['${phase}'],\n` +
    `    status: 'stub',\n` +
    `    features: [],\n` +
    `  },\n`;
  const insertMarker = '  // Sections 2-30 are appended here';
  if (!manifest.includes(insertMarker)) {
    die(`manifest insert marker not found in ${manifestPath}`);
  }
  if (manifest.includes(`id: ${id},\n    slug: '${slug}'`)) {
    process.stdout.write(`  (manifest already has section ${id}; skipping)\n`);
  } else {
    const updated = manifest.replace(insertMarker, stubEntry + insertMarker);
    writeFileSync(manifestPath, updated, 'utf-8');
    process.stdout.write(`  ~ ${manifestPath}\n`);
  }

  // 6. Register route in app.ts
  const appPath = resolve(repoRoot, 'apps/api/src/app.ts');
  const appSrc = readFileSync(appPath, 'utf-8');
  const importLine = `import ${slug.replace(/-/g, '_')}Routes from './routes/${slug}/index.js';\n`;
  const registerLine = `  await app.register(${slug.replace(/-/g, '_')}Routes, { prefix: '/api/v1/${slug}' });\n`;

  if (appSrc.includes(importLine)) {
    process.stdout.write(`  (app.ts already imports ${slug} routes; skipping)\n`);
  } else {
    const importMarker = "import wsRoutes from './routes/ws/index.js';";
    const registerMarker = "await app.register(wsRoutes,";
    if (!appSrc.includes(importMarker) || !appSrc.includes(registerMarker)) {
      die('app.ts registration markers not found — abort to avoid corrupting the file');
    }
    const withImport = appSrc.replace(importMarker, importLine + importMarker);
    const fullyUpdated = withImport.replace(
      /( {2}await app\.register\(wsRoutes,[^\n]+\n)/,
      (m) => registerLine + m,
    );
    writeFileSync(appPath, fullyUpdated, 'utf-8');
    process.stdout.write(`  ~ ${appPath}\n`);
  }

  process.stdout.write(`\nSection ${id} (${slug}) scaffolded.\n`);
  process.stdout.write(`Next: fill schema, wire real handlers, update CONTEXT.md.\n`);
}

main();
