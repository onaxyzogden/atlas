/**
 * Integration harness — shared by every `*.pgtest.ts`.
 *
 * HARD RULE: NO static `import` of `app.ts`, `config.ts`,
 * `plugins/database.ts`, or `db/migrate.ts` from this file or any pgtest.
 * `config.ts` parses `process.env` at module import and `process.exit(1)`s on
 * missing env. The app is pulled in via dynamic `await import('../../app.js')`
 * ONLY AFTER `process.env.DATABASE_URL` has been set from the sentinel.
 * (`SiteAssessmentWriter.ts` is pure — takes `db` as a param — so a static
 * import of it in a pgtest is safe.)
 *
 * The sentinel is read synchronously at import so `INTEGRATION_ENABLED` can
 * drive `describe.skipIf(!INTEGRATION_ENABLED)` at collection time.
 * globalSetup always completes before workers spawn, so the file exists.
 */

import { readFileSync } from 'fs';
import type { FastifyInstance } from 'fastify';
import type postgres from 'postgres';
import { SENTINEL_PATH, type Sentinel } from './sentinel.js';

function readSentinel(): Sentinel {
  try {
    return JSON.parse(readFileSync(SENTINEL_PATH, 'utf-8')) as Sentinel;
  } catch {
    // No sentinel → treat as skipped (globalSetup green-skipped or not run).
    return { skipped: true, reason: 'no-sentinel' };
  }
}

const sentinel = readSentinel();

export const INTEGRATION_ENABLED =
  !sentinel.skipped && typeof sentinel.databaseUrl === 'string';

interface Harness {
  app: FastifyInstance;
  sql: postgres.Sql;
}

let cached: Harness | null = null;

export async function getHarness(): Promise<Harness> {
  if (cached) return cached;
  if (!INTEGRATION_ENABLED) {
    throw new Error('getHarness() called while integration suite is disabled');
  }

  // Env MUST be set before app.ts → config.ts is imported.
  process.env.DATABASE_URL = sentinel.databaseUrl!;
  process.env.NODE_ENV ??= 'test';
  process.env.JWT_SECRET ??= 'test-secret-key-for-vitest-smoke-tests-32ch';
  process.env.REDIS_URL ??= 'redis://localhost:6379';

  const [{ buildApp }, { default: postgresFactory }] = await Promise.all([
    import('../../app.js'),
    import('postgres'),
  ]);

  const app = await buildApp({ logger: false });
  await app.ready();

  const sql = postgresFactory(sentinel.databaseUrl!, {
    max: 4,
    onnotice: () => {},
  });

  cached = { app, sql };
  return cached;
}

/**
 * Per-test isolation. Deliberately TRUNCATE … CASCADE, NOT a transaction
 * rollback: a savepoint/rollback wrapper would turn `SiteAssessmentWriter`'s
 * real `db.begin` into a nested savepoint and mask both the single-
 * `is_current` invariant and telemetry's per-event FK abort — exactly the
 * behaviors this suite exists to lock.
 */
const TRUNCATE_TABLES = [
  'act_interaction_events',
  'regeneration_events',
  'site_assessments',
  'data_pipeline_jobs',
  'project_layers',
  'project_members',
  'projects',
  'organizations',
  'users',
].join(', ');

export async function resetDb(sql: postgres.Sql): Promise<void> {
  await sql.unsafe(`TRUNCATE ${TRUNCATE_TABLES} RESTART IDENTITY CASCADE`);
}

export async function closeHarness(): Promise<void> {
  if (!cached) return;
  const { app, sql } = cached;
  cached = null;
  try {
    await app.close();
  } finally {
    await sql.end();
  }
}
