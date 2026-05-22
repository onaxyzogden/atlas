#!/usr/bin/env node
/**
 * SessionStart hook — ensure this working tree has a node_modules.
 *
 * Why: this repo uses pnpm with a hoisted node-linker, so dependencies live in
 * the repo-root node_modules. Git worktrees start WITHOUT a node_modules (it is
 * .gitignored and there is no per-worktree install step). Tooling that walks
 * parent directories (node's require resolution, `npx`, the vitest config's
 * `createRequire` alias) still finds the main checkout's node_modules, but
 * anything that expects a local node_modules — and a clean `pnpm install`-based
 * CI parity — does not. This hook installs once per fresh worktree so every
 * tool works without per-file patching.
 *
 * Behaviour:
 *  - Fast path: if node_modules already exists, exit immediately (fires every
 *    session, so this must stay cheap).
 *  - Otherwise run `pnpm install` in the working-tree root.
 *  - Never blocks/fails session start: always exits 0; install output is routed
 *    to stderr so it never pollutes the SessionStart stdout context channel.
 */
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = process.cwd();

if (existsSync(resolve(root, 'node_modules'))) {
  process.exit(0); // already installed
}

// Disable corepack's interactive "download this version?" prompt so the hook
// can never hang waiting on stdin during session start.
const env = { ...process.env, COREPACK_ENABLE_DOWNLOAD_PROMPT: '0' };

/**
 * Resolve a working pnpm invocation. Prefer a pnpm already on PATH; otherwise
 * fall back to `corepack pnpm` — corepack ships with Node (this script is run by
 * node, so corepack is present) and honours the repo's `packageManager` pin, so
 * it works even where pnpm itself was never put on PATH (the common Windows
 * case here, where pnpm is only reachable via corepack).
 */
function resolveInstaller() {
  for (const cmd of ['pnpm', 'corepack pnpm']) {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore', env });
      return cmd;
    } catch {
      /* try next */
    }
  }
  return null;
}

const pm = resolveInstaller();
if (!pm) {
  process.stderr.write(
    '[ensure-deps] neither `pnpm` nor `corepack pnpm` is available — skipping. ' +
      'Install pnpm (or enable corepack) and run `pnpm install` manually.\n',
  );
  process.exit(0);
}

process.stderr.write(
  `[ensure-deps] node_modules missing in this worktree — running \`${pm} install\` ` +
    '(first run here; may take a few minutes)...\n',
);

try {
  // fds: ignore stdin, send child stdout+stderr to OUR stderr (fd 2) so the
  // SessionStart stdout context channel stays clean.
  execSync(`${pm} install`, { cwd: root, stdio: ['ignore', 2, 2], env });
  process.stderr.write('[ensure-deps] dependencies installed.\n');
} catch (err) {
  process.stderr.write(
    `[ensure-deps] ${pm} install failed: ${err && err.message ? err.message : err}\n` +
      `[ensure-deps] run \`${pm} install\` manually in this directory.\n`,
  );
}

process.exit(0); // never block session start
