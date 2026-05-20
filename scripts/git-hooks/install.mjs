#!/usr/bin/env node
/**
 * One-time installer for the parallel-session-coordination pre-push hook.
 * Sets `core.hooksPath` to `scripts/git-hooks` and ensures the POSIX hook
 * is executable. Zero-dep alternative to husky.
 *
 * Run once per clone:
 *   node scripts/git-hooks/install.mjs
 *
 * See wiki/concepts/parallel-session-coordination.md.
 */
import { execSync } from 'node:child_process';
import { chmodSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const hookPath = join(repoRoot, 'scripts', 'git-hooks', 'pre-push');

if (!existsSync(hookPath)) {
  console.error(`Hook missing: ${hookPath}`);
  process.exit(1);
}

execSync('git config core.hooksPath scripts/git-hooks', {
  cwd: repoRoot,
  stdio: 'inherit',
});

if (process.platform !== 'win32') {
  chmodSync(hookPath, 0o755);
}

console.log('Installed: core.hooksPath = scripts/git-hooks');
console.log('Hook active: pre-push (wiki/log/ deletion guard)');
