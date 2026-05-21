/**
 * Scene-image snapshot pipeline — Phase 3 Task 13.
 *
 * Drives a headless Chromium via Playwright through the dev-only capture
 * route (`/showcase/three-streams/_capture?scene=<id>`), grabs a PNG of the
 * `[data-testid="showcase-map"]` element, transcodes to .webp via sharp,
 * and writes the result to `apps/web/public/showcase/scenes/<id>.webp`.
 *
 * The dev server must already be running on http://localhost:5200 — the
 * script connects and fails loudly if it can't. Invoke via the root
 * `snapshot:scenes` npm script.
 *
 * Only the 8 shared scenes are captured. Tier-specific scenes do not yet
 * declare a `mapState` in their MDX frontmatter and would not produce a
 * meaningful map thumbnail.
 */
import { chromium, type Page } from 'playwright';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { SHARED_SCENES, type SceneId } from '../apps/web/src/showcase/data/sceneManifest.js';

const BASE_URL = process.env.SNAPSHOT_BASE_URL ?? 'http://localhost:5200';
const OUT_DIR = resolve(process.cwd(), 'apps/web/public/showcase/scenes');
const VIEWPORT = { width: 1200, height: 720 };
// Settle window for MapLibre tile fetches + paint. 2.5s is a comfortable
// floor across cold and warm cache states on the Esri World Imagery basemap.
const SETTLE_MS = 2500;

function safeId(id: SceneId): string {
  // Tier-prefixed scenes use `/` in their id (e.g. dreaming/vision); the
  // controller's spec is `id.replace('/', '__')`, which keeps the on-disk
  // name flat. SHARED_SCENES have no `/`, so this is a no-op for the v1
  // capture set, but the rule is preserved for future tier coverage.
  return id.replace('/', '__');
}

async function capture(page: Page, sceneId: SceneId): Promise<Buffer> {
  const url = `${BASE_URL}/showcase/three-streams/_capture?scene=${encodeURIComponent(sceneId)}`;
  // `waitUntil: 'networkidle'` is the right anchor for a map-heavy page —
  // it waits until the tile fetch storm settles instead of returning on
  // first paint. The follow-on selector wait + timeout is belt-and-braces.
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForSelector('[data-testid="showcase-map"]', { state: 'attached', timeout: 15_000 });
  await page.waitForTimeout(SETTLE_MS);
  return await page.locator('[data-testid="showcase-map"]').screenshot({ type: 'png' });
}

async function pngToWebp(png: Buffer): Promise<Buffer> {
  // quality 82 is the sweet spot for these flat-tone map captures —
  // visually lossless at typical thumbnail sizes, ~40% the size of PNG.
  return await sharp(png).webp({ quality: 82 }).toBuffer();
}

async function ensureDevServerUp() {
  // Cheap reachability probe with a short timeout — gives a clear failure
  // message before Playwright fires up Chromium and gets stuck on goto().
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch(`${BASE_URL}/showcase/three-streams`, { signal: ctrl.signal });
    if (!res.ok) {
      throw new Error(`Dev server replied ${res.status} for ${BASE_URL}/showcase/three-streams`);
    }
  } catch (err) {
    throw new Error(
      `Could not reach dev server at ${BASE_URL}. Start it in another window with:\n  pnpm --filter @ogden/web dev\n\nOriginal error: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  await ensureDevServerUp();
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  const failures: { id: SceneId; error: unknown }[] = [];
  try {
    for (const id of SHARED_SCENES) {
      const safe = safeId(id);
      const outPath = `${OUT_DIR}/${safe}.webp`;
      try {
        console.log(`[snapshot] capturing ${id}…`);
        const png = await capture(page, id);
        const webp = await pngToWebp(png);
        await writeFile(outPath, webp);
        console.log(`[snapshot]   wrote ${outPath} (${webp.byteLength.toLocaleString()} bytes)`);
      } catch (err) {
        console.error(`[snapshot]   FAILED ${id}:`, err instanceof Error ? err.message : err);
        failures.push({ id, error: err });
      }
    }
  } finally {
    await browser.close();
  }

  if (failures.length > 0) {
    console.error(`[snapshot] ${failures.length} scene(s) failed.`);
    process.exit(1);
  }
  console.log(`[snapshot] OK — ${SHARED_SCENES.length} scenes captured to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
