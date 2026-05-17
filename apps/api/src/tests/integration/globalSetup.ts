/**
 * Vitest globalSetup for the opt-in real-PostGIS suite.
 *
 * HARD RULE: this file must NEVER throw. Docker absent, wrong Docker mode
 * (Windows non-Linux-containers), or any container-start failure writes a
 * `{skipped:true}` sentinel and returns — the suite green-skips (exit 0),
 * never red. A red integration suite on a machine without Docker would make
 * the opt-in suite worse than useless.
 *
 * `runMigrations` is imported statically; that is only safe because
 * `migrate.ts` was made import-safe (no top-level `config` import, CLI tail
 * gated on `isCliEntry`). Do not add a static import of `app.ts` /
 * `config.ts` / `plugins/database.ts` here — `config.ts` validates env at
 * import and would `process.exit(1)` in this (env-less) process.
 */

import { execFileSync } from 'child_process';
import { writeFileSync, rmSync } from 'fs';
import postgres from 'postgres';
import { runMigrations } from '../../db/migrate.js';
import { SENTINEL_PATH, type Sentinel } from './sentinel.js';

function writeSentinel(s: Sentinel): void {
  writeFileSync(SENTINEL_PATH, JSON.stringify(s), 'utf-8');
}

function dockerAvailable(): boolean {
  try {
    execFileSync('docker', ['info'], { stdio: 'ignore', timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}

// Module-level so teardown() can stop it. Typed loosely to avoid a static
// type dependency that would couple this file to the testcontainers types
// before the dynamic import.
let started: { stop: () => Promise<unknown> } | null = null;

export async function setup(): Promise<void> {
  if (!dockerAvailable()) {
    writeSentinel({ skipped: true, reason: 'docker-unavailable' });
    console.warn(
      '\n[pgtest] Docker not available — integration suite GREEN-SKIPPED ' +
        '(this is expected and NOT a failure).\n',
    );
    return;
  }

  try {
    const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
    const container = await new PostgreSqlContainer('postgis/postgis:16-3.4').start();
    started = container;

    const databaseUrl = container.getConnectionUri();

    const sql = postgres(databaseUrl, { max: 1, connect_timeout: 30, onnotice: () => {} });
    try {
      await runMigrations(sql);
    } finally {
      await sql.end();
    }

    writeSentinel({ skipped: false, databaseUrl });
    console.log('\n[pgtest] postgis/postgis:16-3.4 container ready; migrations applied.\n');
  } catch (err) {
    writeSentinel({ skipped: true, reason: 'container-start-failed' });
    console.warn(
      '\n[pgtest] Container start/migrate failed — integration suite ' +
        'GREEN-SKIPPED (NOT a failure). On Windows ensure Docker Desktop is ' +
        'in Linux-containers mode.\n',
      err instanceof Error ? err.message : err,
    );
  }
}

export async function teardown(): Promise<void> {
  try {
    if (started) await started.stop();
  } catch {
    /* best-effort */
  }
  try {
    rmSync(SENTINEL_PATH, { force: true });
  } catch {
    /* best-effort */
  }
}
