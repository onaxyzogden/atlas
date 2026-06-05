#!/usr/bin/env node
/**
 * lint-bento-surfaces.mjs — Phase 6 of the BentoBox canonicalisation
 * (ADR 2026-05-27-atlas-bento-box-canonical-surface).
 *
 * Forbids NEW raw surface-contract class declarations under
 * `apps/web/src/**\/*.module.css`. The "surface contract" — what makes
 * something a bento candidate — is a class rule body containing **all
 * three** of:
 *   - background: …
 *   - border: …            (the shorthand; `border-color`/`border-style`
 *                           split rules are intentionally not counted —
 *                           they are usually layout decoration, not a
 *                           container surface)
 *   - border-radius: …
 *
 * New surfaces should consume `<BentoBox>` from
 * `apps/web/src/components/ui/`. The Phase 4e audit (commit `eaec4a27`)
 * recorded 194 legacy-palette `.card` surfaces under `features/**` plus
 * the canonical primitive itself, the deprecated `Card.module.css`
 * forwarding shell, three Phase-2 in-place clones pending the
 * postcss `composes:` fix, and the four exception categories pinned in
 * Slices 4b–4d (full-bleed, chrome-surface bento, themed-canvas bento,
 * `GuidanceCard` inner-bento clone). These are baked into the BASELINE
 * count below — a non-zero ratchet that holds the line until Phase 6
 * follow-up token-migrates or wrap-migrates them.
 *
 * Usage:
 *   node scripts/lint-bento-surfaces.mjs           # exits non-zero on regression
 *   node scripts/lint-bento-surfaces.mjs --list    # print every detected surface
 *   node scripts/lint-bento-surfaces.mjs --update  # rewrite the baseline (humans only)
 *
 * Exit codes:
 *   0  count <= baseline (no regression)
 *   1  count > baseline (a new raw surface slipped in; consume BentoBox)
 *   2  count < baseline AND --update not passed (good news! re-ratchet
 *      by re-running with --update so the line stays tight)
 */

import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCAN_ROOT = path.join(REPO_ROOT, 'apps', 'web', 'src');
const BASELINE_PATH = path.join(__dirname, 'lint-bento-surfaces.baseline.json');

const args = new Set(process.argv.slice(2));
const LIST_MODE = args.has('--list');
const UPDATE_MODE = args.has('--update');

/** Recursive .module.css walker — no glob dependency. */
async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // Skip the usual suspects so the lint stays fast.
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.turbo') continue;
      yield* walk(full);
    } else if (e.isFile() && e.name.endsWith('.module.css')) {
      yield full;
    }
  }
}

/**
 * Strip block + line comments so `border:` inside a `/* … *​/` doesn't
 * count as a real declaration. Cheap regex; CSS forbids nested comments.
 */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Walk top-level rule blocks and return [{selector, body}] for each.
 * Skips at-rules (@media / @supports / etc.) — their contents are scanned
 * separately as inner rule blocks via a second pass.
 */
function* iterRules(src) {
  let depth = 0;
  let start = 0;
  let selectorStart = 0;
  let inRule = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') {
      if (depth === 0) {
        const selector = src.slice(selectorStart, i).trim();
        start = i + 1;
        inRule = !selector.startsWith('@');
        if (!inRule) {
          // Recurse into at-rule body — find its matching close brace
          // and scan the inner content as its own stream.
        }
      }
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const selector = src.slice(selectorStart, start - 1).trim();
        const body = src.slice(start, i);
        if (selector.startsWith('@')) {
          // Recurse into the at-rule body as a fresh stream.
          yield* iterRules(body);
        } else {
          yield { selector, body };
        }
        selectorStart = i + 1;
      }
    }
  }
}

/** True iff this rule body declares all three of background, border, border-radius. */
function isSurfaceContract(body) {
  // Anchor on declaration boundaries to avoid matching inside values
  // (e.g. `background: ... border-box ...` — no, that's the property name
  // `background` which we want to count anyway).
  const hasBackground = /(^|[;{}\s])background\s*:/i.test(body);
  const hasBorder = /(^|[;{}\s])border\s*:/i.test(body);
  const hasRadius = /(^|[;{}\s])border-radius\s*:/i.test(body);
  return hasBackground && hasBorder && hasRadius;
}

/** Split a comma-separated selector list and return canonical class-rule selectors only. */
function classSelectors(selector) {
  return selector
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^\./.test(s)); // only class-led rules count as surface declarations
}

async function scan() {
  const findings = [];
  for await (const file of walk(SCAN_ROOT)) {
    const raw = await readFile(file, 'utf8');
    const src = stripComments(raw);
    for (const { selector, body } of iterRules(src)) {
      if (!isSurfaceContract(body)) continue;
      const classes = classSelectors(selector);
      if (classes.length === 0) continue;
      findings.push({
        file: path.relative(REPO_ROOT, file).replace(/\\/g, '/'),
        selector,
      });
    }
  }
  return findings;
}

async function loadBaseline() {
  try {
    const txt = await readFile(BASELINE_PATH, 'utf8');
    const json = JSON.parse(txt);
    return json.count ?? 0;
  } catch {
    return null;
  }
}

async function writeBaseline(count) {
  const payload = {
    count,
    updated: new Date().toISOString().slice(0, 10),
    note: 'Ratchet baseline for raw surface-contract class declarations under apps/web/src/**/*.module.css. New surfaces should consume <BentoBox>. See ADR 2026-05-27-atlas-bento-box-canonical-surface.md and scripts/lint-bento-surfaces.mjs.',
  };
  await writeFile(BASELINE_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

const findings = await scan();
const count = findings.length;
const baseline = await loadBaseline();

if (LIST_MODE) {
  for (const f of findings) {
    process.stdout.write(`${f.file}\t${f.selector}\n`);
  }
  process.stdout.write(`\nTotal: ${count}\n`);
}

if (UPDATE_MODE) {
  await writeBaseline(count);
  process.stdout.write(`baseline written: ${count}\n`);
  process.exit(0);
}

if (baseline === null) {
  process.stderr.write(
    `lint-bento-surfaces: no baseline yet. Run with --update to seed.\n`,
  );
  process.exit(2);
}

if (count > baseline) {
  process.stderr.write(
    `lint-bento-surfaces: regression — ${count} raw surface declarations found (baseline ${baseline}).\n` +
      `  New raw surfaces under apps/web/src/**/*.module.css are not allowed.\n` +
      `  Consume <BentoBox> from components/ui instead, or add the documented exception to the allowlist.\n` +
      `  Run with --list to see every detected surface.\n`,
  );
  process.exit(1);
}

if (count < baseline) {
  process.stderr.write(
    `lint-bento-surfaces: count ${count} < baseline ${baseline}.\n` +
      `  Good news — a surface was migrated to BentoBox or removed.\n` +
      `  Re-ratchet by running:  node scripts/lint-bento-surfaces.mjs --update\n`,
  );
  process.exit(2);
}

process.stdout.write(`lint-bento-surfaces: ok (${count} surfaces at baseline)\n`);
process.exit(0);
