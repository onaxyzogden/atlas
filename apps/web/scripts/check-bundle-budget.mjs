/**
 * Bundle-budget guard — fail LOUD if a built entry's first-paint payload
 * regresses past the gzipped ceiling locked in bundle-budget.json.
 *
 * Why this exists
 * ---------------
 * The public showcase (showcase.html) is a SECOND Vite entry whose entire
 * reason for existing (Phase 3.5 "Prong B", ADR 2026-05-21-atlas-showcase-
 * bundle-split) is to ship a lean marketing portal that does NOT drag in the
 * authed app's heavy graph:
 *   - maplibre-gl            ~234 kB gz
 *   - @turf/turf             ~145 kB gz
 *   - FAO EcoCrop dataset    ~109 kB gz
 *   - SiteIntelligencePanel  ~120 kB gz  (panel-compute + panel-sections)
 *
 * A single stray STATIC import from any `src/showcase/**` module into that
 * graph silently re-pulls hundreds of kB into the showcase entry's eager
 * <script>/<link> closure. That is exactly the regression class we just fixed
 * (a shared `tokens.ts` leaf that Rollup co-located into the lazy
 * panel-sections chunk, bridging showcase-app -> panel-sections). It is
 * invisible in code review and in a normal build log.
 *
 * This guard makes such a regression a hard failure: it parses the BUILT
 * entry HTML, sums the gzipped size of every asset the browser must fetch for
 * first paint (eager module scripts + render-blocking stylesheets), and
 * compares the total against the ceiling in bundle-budget.json. Re-leaking any
 * heavy chunk (>= 53 kB gz, the smallest of the four) blows the ceiling by an
 * order of magnitude, so the guard trips immediately.
 *
 * Usage (run AFTER a build so dist/ exists):
 *   node scripts/check-bundle-budget.mjs            # check  — exit 1 if over
 *   node scripts/check-bundle-budget.mjs --update   # re-lock ceilings to now
 *
 * `--update` is the deliberate "I grew the bundle on purpose" escape hatch: it
 * recomputes each budget's actual size and writes a fresh ceiling (current +
 * headroom) back to bundle-budget.json. Treat that diff as a reviewable
 * ratchet, the same as any other budget bump.
 *
 * Zero dependencies (node: builtins only) so it runs in any git worktree with
 * no install, exactly like check-react-resolution.mjs.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const webDir = dirname(fileURLToPath(import.meta.url)).replace(/[/\\]scripts$/, '');
const budgetPath = resolve(webDir, 'bundle-budget.json');
const UPDATE = process.argv.includes('--update');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const KIB = 1024;

function die(msg) {
  console.error(`\n${RED}✖ bundle-budget guard FAILED${RESET}\n\n${msg}\n`);
  process.exit(1);
}

if (!existsSync(budgetPath)) die(`No bundle-budget.json at ${budgetPath}`);

let budget;
try {
  budget = JSON.parse(readFileSync(budgetPath, 'utf8'));
} catch (err) {
  die(`bundle-budget.json is not valid JSON:\n  ${err.message}`);
}
if (!Array.isArray(budget.budgets) || budget.budgets.length === 0) {
  die('bundle-budget.json must contain a non-empty "budgets" array.');
}

// Headroom for --update: lock at current + max(5%, 2 KiB), rounded up to a
// whole KiB. That sits comfortably below the smallest heavy chunk (~53 kB gz),
// so any re-leak still trips the guard, while tolerating routine +/- few-kB
// churn (e.g. a minor framework dep bump) without a CI false alarm.
function ceilingFor(bytes) {
  const padded = bytes + Math.max(Math.ceil(bytes * 0.05), 2 * KIB);
  return Math.ceil(padded / KIB) * KIB;
}

const kb = (bytes) => `${(bytes / KIB).toFixed(1)} kB`;

// Extract the eager first-paint asset URLs from a built HTML entry. Eager =
// render/exec-blocking on first paint: <script type=module src> and
// <link rel=stylesheet href>. <link rel=modulepreload> is counted only when a
// budget opts in via "includeModulePreload" — the authed entry preloads its
// static closure that way, whereas the showcase entry inlines its module
// scripts directly and needs no opt-in.
function eagerAssets(html, includeModulePreload) {
  const urls = new Set();
  for (const m of html.matchAll(/<(script|link)\b([^>]*)>/gi)) {
    const tag = m[1].toLowerCase();
    const attrs = m[2];
    const attr = (name) => {
      const a = attrs.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'));
      return a ? a[1] : null;
    };
    let url = null;
    if (tag === 'script' && /\btype=["']module["']/i.test(attrs)) {
      url = attr('src');
    } else if (tag === 'link') {
      const rel = (attr('rel') || '').toLowerCase();
      if (rel === 'stylesheet' || (includeModulePreload && rel === 'modulepreload')) {
        url = attr('href');
      }
    }
    // Only hashed build output under /assets/ counts; skip /registerSW.js,
    // /favicon.svg, /manifest.webmanifest, and any external URL.
    if (url && url.startsWith('/assets/')) urls.add(url.replace(/^\//, ''));
  }
  return [...urls];
}

let anyOver = false;
const nextBudgets = [];

for (const b of budget.budgets) {
  const htmlAbs = resolve(webDir, b.html);
  if (!existsSync(htmlAbs)) {
    die(
      `Budget "${b.name}": ${b.html} not found.\n` +
        '  Build first: corepack pnpm --filter @ogden/web build',
    );
  }
  const assets = eagerAssets(readFileSync(htmlAbs, 'utf8'), !!b.includeModulePreload);
  if (assets.length === 0) {
    die(`Budget "${b.name}": no eager /assets/ found in ${b.html} — build layout or parser changed?`);
  }

  const rows = assets
    .map((rel) => {
      const abs = resolve(webDir, 'dist', rel);
      if (!existsSync(abs)) {
        die(`Budget "${b.name}": asset referenced by ${b.html} is missing on disk: dist/${rel}`);
      }
      return { rel, gz: gzipSync(readFileSync(abs)).length };
    })
    .sort((a, c) => c.gz - a.gz);
  const total = rows.reduce((sum, r) => sum + r.gz, 0);

  console.log(`\n${b.name}  ${DIM}(${b.html})${RESET}`);
  for (const r of rows) console.log(`  ${DIM}${kb(r.gz).padStart(9)}${RESET}  ${r.rel}`);
  console.log(`  ${'-'.repeat(9)}`);

  if (UPDATE) {
    const next = ceilingFor(total);
    const prev = typeof b.maxGzipBytes === 'number' ? kb(b.maxGzipBytes) : 'unset';
    console.log(`  ${kb(total).padStart(9)}  total  ->  ceiling ${GREEN}${kb(next)}${RESET} ${DIM}(was ${prev})${RESET}`);
    nextBudgets.push({ ...b, maxGzipBytes: next });
  } else {
    const ceiling = b.maxGzipBytes;
    if (typeof ceiling !== 'number') {
      die(`Budget "${b.name}" has no numeric maxGzipBytes. Run \`bundlesize:update\` to set it.`);
    }
    const margin = ceiling - total;
    const over = margin < 0;
    if (over) anyOver = true;
    const verdict = over
      ? `${RED}✖ OVER by ${kb(-margin)}${RESET}`
      : `${GREEN}✔${RESET} ${DIM}${kb(margin)} headroom${RESET}`;
    console.log(`  ${kb(total).padStart(9)}  total   ${DIM}ceiling ${kb(ceiling)}${RESET}   ${verdict}`);
  }
}

if (UPDATE) {
  writeFileSync(budgetPath, `${JSON.stringify({ ...budget, budgets: nextBudgets }, null, 2)}\n`);
  console.log(`\n${GREEN}✔ bundle-budget.json updated${RESET}  ${DIM}(${relative(webDir, budgetPath)})${RESET}\n`);
} else if (anyOver) {
  console.error(`\n${RED}✖ bundle-budget guard FAILED${RESET} — a first-paint payload exceeded its locked ceiling.`);
  console.error(
    `${DIM}If the growth is intentional, re-lock with: corepack pnpm --filter @ogden/web bundlesize:update${RESET}\n`,
  );
  process.exit(1);
} else {
  console.log(`\n${GREEN}✔ bundle-budget guard OK${RESET}\n`);
}
