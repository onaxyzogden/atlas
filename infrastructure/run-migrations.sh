#!/usr/bin/env bash
# infrastructure/run-migrations.sh
#
# Applies pending SQL migrations to the local PostgreSQL database.
# Reads DATABASE_URL from apps/api/.env.
# Safe to run multiple times — already-applied migrations are tracked in
# schema_migrations and skipped automatically.
#
# Usage:
#   bash infrastructure/run-migrations.sh
#
# Requirements:
#   - psql (PostgreSQL client) on PATH
#   - apps/api/.env with DATABASE_URL set
#   - PostgreSQL server running and reachable

set -euo pipefail

# ── Paths ─────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/apps/api/.env"
MIGRATIONS_DIR="$REPO_ROOT/apps/api/src/db/migrations"

# ── Load DATABASE_URL from .env ───────────────────────────────────────────────

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[MIGRATE][ERROR] env file not found: $ENV_FILE"
  echo "               Copy apps/api/.env.example → apps/api/.env and fill in values."
  exit 1
fi

DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2-)"

if [[ -z "$DATABASE_URL" ]]; then
  echo "[MIGRATE][ERROR] DATABASE_URL is not set in $ENV_FILE"
  exit 1
fi

# Mask credentials in log output
DB_LOG="$(echo "$DATABASE_URL" | sed 's|://[^:]*:[^@]*@|://***:***@|')"
echo "[MIGRATE] Connecting: $DB_LOG"
echo "[MIGRATE] Migrations: $MIGRATIONS_DIR"
echo ""

# ── Verify psql is available ──────────────────────────────────────────────────

if ! command -v psql &>/dev/null; then
  echo "[MIGRATE][ERROR] psql not found. Install PostgreSQL client tools."
  echo "               Windows: https://www.postgresql.org/download/windows/"
  echo "               Or use: winget install PostgreSQL.PostgreSQL"
  exit 1
fi

# ── Verify database is reachable ──────────────────────────────────────────────

if ! psql "$DATABASE_URL" --no-psqlrc -q -c "SELECT 1;" &>/dev/null; then
  echo "[MIGRATE][ERROR] Cannot connect to database."
  echo "               Is PostgreSQL running? Check DATABASE_URL in $ENV_FILE"
  exit 1
fi

# ── Ensure schema_migrations tracking table exists ────────────────────────────

psql "$DATABASE_URL" --no-psqlrc -q -c "
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version     text        PRIMARY KEY,
    applied_at  timestamptz NOT NULL DEFAULT now()
  );
"

# ── Apply migrations in filename order ────────────────────────────────────────

APPLIED=0
SKIPPED=0
FAILED=0
FOUND=0

for migration_file in "$MIGRATIONS_DIR"/*.sql; do
  [[ -f "$migration_file" ]] || continue
  FOUND=$((FOUND + 1))
  version="$(basename "$migration_file")"

  # Check if already recorded in schema_migrations
  already_applied="$(psql "$DATABASE_URL" --no-psqlrc -t -A -c \
    "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version';")"

  if [[ "$already_applied" -gt 0 ]]; then
    echo "  ✓  $version — already applied, skipping"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo "  →  $version — applying ..."

  # -1 wraps the migration file in a single transaction.
  # If any statement fails, the whole migration rolls back and psql exits non-zero.
  if psql "$DATABASE_URL" --no-psqlrc -q -1 -f "$migration_file"; then
    psql "$DATABASE_URL" --no-psqlrc -q -c \
      "INSERT INTO schema_migrations (version) VALUES ('$version');"
    echo "     ✓  $version — done"
    APPLIED=$((APPLIED + 1))
  else
    echo ""
    echo "[MIGRATE][ERROR] Migration failed: $version"
    echo "               The migration was rolled back. Fix the error above and re-run."
    FAILED=$((FAILED + 1))
    break
  fi
done

if [[ "$FOUND" -eq 0 ]]; then
  echo "[MIGRATE][ERROR] No .sql files found in $MIGRATIONS_DIR"
  exit 1
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "[MIGRATE] Done — $APPLIED applied · $SKIPPED skipped · $FAILED failed"

if [[ "$FAILED" -gt 0 ]]; then
  exit 1
fi
