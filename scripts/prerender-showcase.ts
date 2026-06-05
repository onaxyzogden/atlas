/**
 * Selective Playwright prerender — Phase 3 Task 14.
 *
 * After `vite build` has emitted the SPA shell to `apps/web/dist/`, this
 * script spins up `vite preview`, drives a headless Chromium across the
 * 4 public showcase routes, captures the post-hydration HTML for each, and
 * overwrites the corresponding `index.html` in dist so search engines and
 * link-preview crawlers see the actual rendered content instead of an
 * empty `<div id="root"></div>` shell.
 *
 * Path B from the Task 1 SSG spike — vite-plugin-ssg was rejected because
 * it requires a Vue/React entrypoint refactor; this hand-rolled Playwright
 * approach is selective (only the 4 showcase routes; the rest of the SPA
 * remains client-rendered) and stays out of the build graph.
 *
 * Wired into apps/web/package.json `build` as a postbuild step so the
 * standard `pnpm --filter @ogden/web build` produces a prerendered dist
 * in one command.
 */
import { chromium, type Page } from 'playwright';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PRERENDER_PORT ?? 4173);
const BASE_URL = process.env.PRERENDER_BASE_URL ?? `http://localhost:${PORT}`;
// Resolve repo paths from this script's location, not cwd — `pnpm build`
// invokes us from apps/web/ but the standalone CLI may invoke us from the
// repo root. Both should produce the same DIST_DIR.
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const WEB_DIR = resolve(REPO_ROOT, 'apps/web');
const DIST_DIR = resolve(WEB_DIR, 'dist');
const PREVIEW_BOOT_TIMEOUT_MS = 30_000;
// Settle window for React hydration + Tanstack Router resolution after
// the marker selector resolves. Mirrors the Task 13 settle pattern.
const HYDRATION_SETTLE_MS = 750;

type RouteSpec = {
  /** Path on the dev server, e.g. `/showcase/three-streams/dreaming`. */
  path: string;
  /** Selector that proves the React tree has mounted (not just SPA shell). */
  marker: string;
  /** Relative path under dist/ to write the prerendered HTML to. */
  outRel: string;
};

const ROUTES: RouteSpec[] = [
  {
    path: '/showcase/three-streams',
    // Hero MDX renders <TierChooser /> which emits this nav landmark.
    marker: 'nav[aria-label="Choose your path"]',
    outRel: 'showcase/three-streams/index.html',
  },
  {
    path: '/showcase/three-streams/dreaming',
    // Tier route renders <section data-scene-id="..."> per scene once the
    // snapshot loader resolves; this marker proves both router + snapshot.
    marker: '[data-scene-id]',
    outRel: 'showcase/three-streams/dreaming/index.html',
  },
  {
    path: '/showcase/three-streams/transitioning',
    marker: '[data-scene-id]',
    outRel: 'showcase/three-streams/transitioning/index.html',
  },
  {
    path: '/showcase/three-streams/stewarding',
    marker: '[data-scene-id]',
    outRel: 'showcase/three-streams/stewarding/index.html',
  },
];

async function ensureDistExists(): Promise<void> {
  try {
    await access(join(DIST_DIR, 'index.html'));
  } catch {
    throw new Error(
      `dist/ not found at ${DIST_DIR}. Run \`pnpm --filter @ogden/web build\` first — this script is a postbuild step.`,
    );
  }
}

async function waitForPreview(): Promise<void> {
  const deadline = Date.now() + PREVIEW_BOOT_TIMEOUT_MS;
  let lastErr: unknown = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/`, { method: 'GET' });
      if (res.ok) return;
      lastErr = new Error(`Preview replied ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(
    `Preview server at ${BASE_URL} did not become reachable within ${PREVIEW_BOOT_TIMEOUT_MS}ms. Last error: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`,
  );
}

function spawnPreview(): ChildProcess {
  // `pnpm --filter @ogden/web exec vite preview` runs Vite's preview server
  // against the freshly built dist/. Force the port via flag so it doesn't
  // collide with a running dev server on 5200/5201/5202.
  //
  // `shell: true` is required on Windows to resolve `pnpm.cmd` from PATH.
  const child = spawn(
    'pnpm',
    ['--filter', '@ogden/web', 'exec', 'vite', 'preview', '--port', String(PORT), '--strictPort'],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      cwd: REPO_ROOT,
    },
  );
  child.stdout?.on('data', (buf) => process.stdout.write(`[preview] ${buf}`));
  child.stderr?.on('data', (buf) => process.stderr.write(`[preview] ${buf}`));
  return child;
}

async function killPreview(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.killed) return;
  // SIGTERM is ignored by the npm/pnpm wrapper on Windows; tree-kill via
  // taskkill when we have a PID, fall back to .kill() otherwise.
  if (process.platform === 'win32' && child.pid) {
    await new Promise<void>((resolveKill) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], {
        stdio: 'ignore',
        shell: true,
      });
      killer.on('exit', () => resolveKill());
      killer.on('error', () => resolveKill());
    });
  } else {
    child.kill('SIGTERM');
  }
}

async function prerenderRoute(page: Page, route: RouteSpec): Promise<string> {
  const url = `${BASE_URL}${route.path}`;
  console.log(`[prerender] ${route.path}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForSelector(route.marker, { state: 'attached', timeout: 15_000 });
  // Belt-and-braces: even after the marker attaches, give React + lazy
  // children a beat to flush before snapshotting.
  await page.waitForTimeout(HYDRATION_SETTLE_MS);
  return await page.content();
}

async function main(): Promise<void> {
  await ensureDistExists();

  const preview = spawnPreview();
  // Surface a clean error if the preview process dies during boot/run.
  preview.on('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`[preview] exited unexpectedly with code ${code} signal ${signal}`);
    }
  });

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  const failures: { path: string; error: unknown }[] = [];

  try {
    await waitForPreview();
    browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();

    for (const route of ROUTES) {
      try {
        const html = await prerenderRoute(page, route);
        const outAbs = join(DIST_DIR, route.outRel);
        await mkdir(join(outAbs, '..'), { recursive: true });
        await writeFile(outAbs, html, 'utf8');
        console.log(`[prerender]   wrote ${outAbs} (${html.length.toLocaleString()} chars)`);
      } catch (err) {
        console.error(
          `[prerender]   FAILED ${route.path}:`,
          err instanceof Error ? err.message : err,
        );
        failures.push({ path: route.path, error: err });
      }
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => {
        /* swallow — we're tearing down */
      });
    }
    await killPreview(preview);
  }

  if (failures.length > 0) {
    console.error(`[prerender] ${failures.length} route(s) failed.`);
    process.exit(1);
  }
  console.log(`[prerender] OK — ${ROUTES.length} routes prerendered into ${DIST_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
