#!/usr/bin/env node
/**
 * Run all SQL migration files in order.
 *
 * Reads every *.sql file from src/db/migrations/ sorted by filename,
 * and executes each via `psql $DATABASE_URL -f <file>`.
 *
 * Skips gracefully if DATABASE_URL is not set or psql is not installed.
 */

import { readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(__dirname, '..', 'src', 'db', 'migrations');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.log('⚠  DATABASE_URL not set — skipping migrations (app will run in local-only mode)');
  process.exit(0);
}

// Collect and sort migration files
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.log('No migration files found.');
  process.exit(0);
}

console.log(`Running ${files.length} migration(s)…`);

let failed = 0;
for (const file of files) {
  const filePath = resolve(migrationsDir, file);
  try {
    execSync(`psql "${dbUrl}" -f "${filePath}"`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000,
    });
    console.log(`  ✓ ${file}`);
  } catch (err) {
    // Common case: table/column already exists — that's fine (IF NOT EXISTS handles it)
    const stderr = err.stderr?.toString() ?? '';
    if (stderr.includes('already exists') || stderr.includes('duplicate')) {
      console.log(`  ✓ ${file} (already applied)`);
    } else {
      console.log(`  ✗ ${file}: ${stderr.trim() || err.message}`);
      failed++;
    }
  }
}

if (failed > 0) {
  console.log(`⚠  ${failed} migration(s) had errors — the app will still start but some features may not work.`);
} else {
  console.log('All migrations applied.');
}

// Always exit 0 so dev servers still start even if DB is unavailable
process.exit(0);
