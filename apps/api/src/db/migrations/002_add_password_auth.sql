-- Migration 002: add password_hash for direct email/password auth
-- Run: psql $DATABASE_URL -f src/db/migrations/002_add_password_auth.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
