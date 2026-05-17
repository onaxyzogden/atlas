/**
 * Migration runner — applies .sql files from the migrations directory in order.
 *
 * Usage:  pnpm migrate   (or:  tsx src/db/migrate.ts)
 *
 * Tracks applied migrations in a `schema_migrations` table.
 * Idempotent — running twice will not re-apply already-applied migrations.
 */

import { readdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, 'migrations');

/**
 * Apply all pending migrations against the given connection, in
 * sorted-filename order, each file in its own transaction, tracked in
 * `schema_migrations`. Idempotent. Returns the number of files applied.
 *
 * Caller owns the connection lifecycle — this never calls `sql.end()` or
 * `process.exit`. Shared by the CLI tail below and the testcontainers
 * integration harness so test and prod migrate identically.
 */
export async function runMigrations(sql: postgres.Sql): Promise<number> {
  // Ensure the tracking table exists
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version   TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // Read applied migrations
  const applied = await sql`SELECT version FROM schema_migrations ORDER BY version`;
  const appliedSet = new Set(applied.map((r) => r.version as string));

  // Discover migration files sorted by name (numeric prefix guarantees order)
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let count = 0;

  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    if (appliedSet.has(version)) {
      console.log(`  ✓ ${file} (already applied)`);
      continue;
    }

    const filePath = resolve(MIGRATIONS_DIR, file);
    const content = readFileSync(filePath, 'utf-8');

    console.log(`  → Applying ${file} ...`);

    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx.unsafe(
        'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
        [version, file],
      );
    });

    console.log(`  ✓ ${file} applied`);
    count++;
  }

  if (count === 0) {
    console.log('\nAll migrations already applied.');
  } else {
    console.log(`\n${count} migration(s) applied successfully.`);
  }

  return count;
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

async function migrateCli() {
  // Imported lazily so that `import { runMigrations }` from a test harness
  // never triggers config.ts's import-time env validation (process.exit).
  const { config } = await import('../lib/config.js');
  const sql = postgres(config.DATABASE_URL, {
    max: 1,
    connect_timeout: 10,
    onnotice: () => {},
  });
  try {
    await runMigrations(sql);
  } finally {
    await sql.end();
  }
}

// Run the CLI only when this module is the process entry point — NOT when it
// is imported (e.g. by the testcontainers globalSetup, which has no env).
const isCliEntry =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntry) {
  console.log('Running migrations...\n');
  migrateCli()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\nMigration failed:', err);
      process.exit(1);
    });
}
