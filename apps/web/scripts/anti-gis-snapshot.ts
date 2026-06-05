/**
 * Anti-GIS mobile snapshot — Phase F.1 (post-Phase-E follow-up).
 *
 * Drives a headless Chromium via Playwright through the Apricot-Lane
 * Observe surface on a 390×844 mobile viewport, asserts the
 * Land Verdict + first Next Best Action render above the fold (the
 * Anti-GIS Rule: "a land steward must understand status + next action
 * in under 30 seconds on a mobile device"), and writes a PNG
 * screenshot as durable evidence.
 *
 * The dev server must already be running on http://localhost:5200
 * (`pnpm --filter @ogden/web dev`).
 *
 * The Apricot-Lane fixture lives behind the standard auth gate. To
 * exercise it through Playwright, capture a Playwright `storageState`
 * for a logged-in session in advance and point the env var at it:
 *
 *   $env:ANTI_GIS_STORAGE_STATE = "path/to/storageState.json"
 *   pnpm --filter @ogden/web run anti-gis:snapshot
 *
 * Without `ANTI_GIS_STORAGE_STATE`, the script still launches and
 * captures whatever the unauthenticated route resolves to (usually
 * the login screen); the assertion will fail loudly. That's the
 * intended "minimum viable evidence" flow.
 *
 * Reference: matches the programmatic Playwright pattern in
 * `scripts/snapshot-scene-images.ts`.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { APRICOT_LANE_PROJECT_ID } from '@ogden/shared';

const BASE_URL = process.env.ANTI_GIS_BASE_URL ?? 'http://localhost:5200';
const STORAGE_STATE = process.env.ANTI_GIS_STORAGE_STATE;
const OUT_DIR = resolve(process.cwd(), 'apps/web/screenshots');
const OUT_PATH = `${OUT_DIR}/anti-gis-apricot-lane.png`;

// 390 × 844 is the iPhone 12 / 13 / 14 viewport — the canonical
// reference device for the Anti-GIS <30s glance gate.
const VIEWPORT = { width: 390, height: 844 };
const SETTLE_MS = 2500;

async function ensureDevServerUp() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch(BASE_URL, { signal: ctrl.signal });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Dev server replied ${res.status} for ${BASE_URL}`);
    }
  } catch (err) {
    throw new Error(
      `Could not reach dev server at ${BASE_URL}. Start it in another window:\n` +
        `  pnpm --filter @ogden/web dev\n\nOriginal error: ${
          err instanceof Error ? err.message : String(err)
        }`,
    );
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  await ensureDevServerUp();
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const contextOptions: Parameters<typeof browser.newContext>[0] = {
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
  };
  if (STORAGE_STATE) {
    contextOptions.storageState = STORAGE_STATE;
    console.log(`[anti-gis] using storage state from ${STORAGE_STATE}`);
  } else {
    console.warn(
      '[anti-gis] ANTI_GIS_STORAGE_STATE not set — the Apricot-Lane route will likely redirect to /login.',
    );
  }

  const ctx = await browser.newContext(contextOptions);
  const page = await ctx.newPage();

  const url = `${BASE_URL}/v3/project/${APRICOT_LANE_PROJECT_ID}/observe`;
  console.log(`[anti-gis] navigating to ${url}`);

  let assertionFailures: string[] = [];
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(SETTLE_MS);

    // The Land Verdict card carries the role="region" + aria-label
    // mounted in features/dashboard/LandVerdictCard.tsx; the Next Best
    // Action queue mounts under NextBestActionsPanel. We use heading
    // text as the most stable selector since the components do not
    // expose data-testid today.
    const verdictHeading = page.getByRole('heading', { name: /verdict|conditional opportunity/i }).first();
    const nextActionHeading = page
      .getByRole('heading', { name: /next best action/i })
      .first();

    // Above-the-fold check: bounding box bottom must be inside the viewport.
    for (const [label, locator] of [
      ['Land Verdict', verdictHeading],
      ['Next Best Action', nextActionHeading],
    ] as const) {
      try {
        await locator.waitFor({ state: 'visible', timeout: 5_000 });
        const box = await locator.boundingBox();
        if (!box) {
          assertionFailures.push(`${label}: bounding box unavailable`);
          continue;
        }
        const bottom = box.y + box.height;
        if (bottom > VIEWPORT.height) {
          assertionFailures.push(
            `${label}: below the fold (bottom=${bottom.toFixed(0)}px > viewport=${VIEWPORT.height}px)`,
          );
        } else {
          console.log(
            `[anti-gis] ✓ ${label} above the fold (bottom=${bottom.toFixed(0)}px)`,
          );
        }
      } catch (err) {
        assertionFailures.push(
          `${label}: not visible within 5s (${
            err instanceof Error ? err.message : String(err)
          })`,
        );
      }
    }
  } finally {
    await page.screenshot({ path: OUT_PATH, fullPage: false });
    console.log(`[anti-gis] screenshot written to ${OUT_PATH}`);
    await browser.close();
  }

  if (assertionFailures.length > 0) {
    console.error(`[anti-gis] FAIL — ${assertionFailures.length} assertion(s) failed:`);
    for (const f of assertionFailures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log('[anti-gis] OK — Verdict + Next Best Action above the fold on 390×844 mobile viewport.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
