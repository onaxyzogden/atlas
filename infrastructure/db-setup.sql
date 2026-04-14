-- infrastructure/db-setup.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- OGDEN Atlas — PostgreSQL initial setup
-- Run as the postgres superuser against your local instance.
--
-- Usage:
--   psql -U postgres -f infrastructure/db-setup.sql
--
-- This script is idempotent — safe to re-run without side effects.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create database (guarded — avoids error if it already exists)
SELECT 'CREATE DATABASE ogden_atlas'
  WHERE NOT EXISTS (
    SELECT FROM pg_database WHERE datname = 'ogden_atlas'
  )\gexec

-- 2. Switch into ogden_atlas for the remaining statements
\connect ogden_atlas

-- 3. Enable extensions (superuser required)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 4. Create the application user (guarded)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ogden_app') THEN
    CREATE USER ogden_app WITH PASSWORD 'CHANGE_ME';
  END IF;
END
$$;

-- 5. Database-level privileges
GRANT ALL PRIVILEGES ON DATABASE ogden_atlas TO ogden_app;

-- 6. Schema privileges (required in PostgreSQL 15+ where public is restricted)
GRANT USAGE  ON SCHEMA public TO ogden_app;
GRANT CREATE ON SCHEMA public TO ogden_app;
