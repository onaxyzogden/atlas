/**
 * Vitest globalSetup for the opt-in real-PostGIS suite.
 *
 * DEFAULT RULE: this file must NEVER throw. Docker absent, wrong Docker mode
 * (Windows non-Linux-containers), or any container-start failure writes a
 * `{skipped:true}` sentinel and returns — the suite green-skips (exit 0),
 * never red. A red integration suite on a machine without Docker would make
 * the opt-in suite worse than useless for local dev.
 *
 * STRICT MODE: when `PGTEST_REQUIRE_DB` is set (CI sets it), green-skip is a
 * lie we cannot afford — the whole point of running this in CI is to exercise
 * the real DB. So Docker-unavailable / container-start-failure THROWS instead,
 * turning a would-be silent green-skip into a red build.
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

// CI opts into strict mode: a green-skip here means the suite tested nothing,
// which in CI must fail the build rather than pass silently.
const REQUIRE_DB =
  process.env.PGTEST_REQUIRE_DB === '1' ||
  process.env.PGTEST_REQUIRE_DB === 'true';

// Module-level so teardown() can stop it. Typed loosely to avoid a static
// type dependency that would couple this file to the testcontainers types
// before the dynamic import.
let started: { stop: () => Promise<unknown> } | null = null;

export async function setup(): Promise<void> {
  if (!dockerAvailable()) {
    if (REQUIRE_DB) {
      throw new Error(
        '[pgtest] PGTEST_REQUIRE_DB is set but Docker is unavailable — ' +
          'refusing to green-skip. The integration suite must run a real ' +
          'PostGIS container in this environment (CI).',
      );
    }
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
    if (REQUIRE_DB) {
      // Strict mode: surface the real failure instead of masking it green.
      throw err instanceof Error
        ? err
        : new Error(`[pgtest] container start/migrate failed: ${String(err)}`);
    }
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
