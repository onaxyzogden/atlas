/**
 * Pre-test guard: fail LOUD if React can't be resolved the same way
 * `vitest.config.ts` resolves it, before the suite runs.
 *
 * Why this exists
 * ---------------
 * pnpm uses a hoisted node-linker, so `react` lives at the repo-root
 * `atlas/node_modules`, never in `apps/web/node_modules`. A git worktree
 * gets NO `node_modules` of its own (gitignored, no post-create install),
 * but the worktree dir is physically nested inside `atlas/`, so Node's
 * parent-directory module walk still reaches `atlas/node_modules/react`.
 *
 * `vitest.config.ts` historically hardcoded a RELATIVE react alias
 * (`../../node_modules/react`). In a worktree that pointed at a path that
 * does not exist, so every React-importing test file failed to *collect*
 * with `Failed to resolve import "react"`. Pure-logic tests still passed,
 * so the run looked "mostly green" while silently masking ~37 files of
 * real coverage. That class of failure is easy to wave away as an
 * environment quirk — exactly why it went unnoticed.
 *
 * This script mirrors the config's `createRequire`-anchored resolution. If
 * react / react-dom can't be resolved, or resolve to a non-existent dir, it
 * exits non-zero with actionable guidance so `npm test` fails immediately
 * and unmistakably instead of producing a misleading partial-green suite.
 *
 * It deliberately does NOT depend on vitest or any test framework so it can
 * run as a plain `pretest` npm hook in any worktree with zero install.
 */

import { createRequire } from 'node:module';
import { existsSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const webDir = dirname(fileURLToPath(import.meta.url)).replace(/[/\\]scripts$/, '');

// Anchor resolution at apps/web exactly like vitest.config.ts does, so this
// check and the test runner agree on which react copy is in play.
const requireFromWeb = createRequire(webDir + '/');

function fail(msg) {
  console.error('\n\x1b[31m✖ react-resolution guard FAILED\x1b[0m\n');
  console.error(msg);
  console.error(
    '\nThis usually means you are in a git worktree without a hoisted ' +
      "`node_modules`, or `vitest.config.ts`'s react alias regressed back " +
      'to a hardcoded relative path. The alias must resolve react via Node ' +
      'module resolution (createRequire), not a fixed `../../node_modules` ' +
      'path, so it works in the main tree AND every worktree.\n\n' +
      'Run `pnpm install` at the atlas repo root if react is genuinely ' +
      'missing, otherwise fix the alias in apps/web/vitest.config.ts.\n',
  );
  process.exit(1);
}

let reactPkg;
let reactDomPkg;
try {
  reactPkg = requireFromWeb.resolve('react/package.json');
  reactDomPkg = requireFromWeb.resolve('react-dom/package.json');
} catch (err) {
  fail(`Could not resolve react/react-dom from ${webDir}:\n  ${err.message}`);
}

for (const [name, pkg] of [
  ['react', reactPkg],
  ['react-dom', reactDomPkg],
]) {
  const dir = dirname(pkg);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    fail(`Resolved ${name} package dir does not exist: ${dir}`);
  }
}

// Single-copy invariant: zustand ships a nested react; if the copy zustand
// sees differs from the copy apps/web sees, the vitest dedupe/alias pin is
// the only thing preventing a "second React instance" hook crash. Surface a
// drift here rather than as an opaque `useCallback of null` at test time.
try {
  const requireFromZustand = createRequire(
    dirname(requireFromWeb.resolve('zustand/package.json')) + '/',
  );
  const zustandReact = requireFromZustand.resolve('react/package.json');
  if (dirname(zustandReact) !== dirname(reactPkg)) {
    console.warn(
      '\x1b[33m⚠ react-resolution guard: zustand resolves a DIFFERENT ' +
        'react copy than apps/web.\x1b[0m\n' +
        `  apps/web : ${dirname(reactPkg)}\n` +
        `  zustand  : ${dirname(zustandReact)}\n` +
        '  The vitest.config.ts `react` alias + `dedupe` + ' +
        '`server.deps.inline:[zustand]` pin MUST stay in place or ' +
        'store-bound component tests will crash on a second React instance.',
    );
  }
} catch {
  // zustand not resolvable (e.g. partial install) — the react/react-dom
  // checks above already cover the primary regression; don't hard-fail here.
}

console.log(
  `\x1b[32m✔ react-resolution guard OK\x1b[0m  react → ${dirname(reactPkg)}`,
);
