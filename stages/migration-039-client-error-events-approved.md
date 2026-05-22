# Migration 039 — client_error_events (approval)

**Status:** approved
**Date:** 2026-05-21
**Author:** Claude Code (with Yousef approval, this session)

## What
Adds a new table `client_error_events` to back a general client-error
telemetry sink (first consumer: zustand persist-rehydrate failures). Part of
the [client-error telemetry sink plan](../../../../.claude/plans/client-error-telemetry-sink.md).

## Why this needs an approval doc
Per MILOS CI/CD safety flags, any data migration requires a `stages/`
approval doc before it lands.

## Blast-radius assessment
- **Additive only.** `CREATE TABLE IF NOT EXISTS` + new indexes. No `ALTER`,
  no `DROP`, no data backfill, no change to any existing table.
- **Forward-only.** No down-migration (consistent with the repo's other
  forward-only migrations).
- **FKs:** `user_id` → `users(id) ON DELETE CASCADE`; `project_id` is
  **nullable** → `projects(id) ON DELETE SET NULL` (a rehydrate failure has
  no project context and may fire pre-login).
- **Re-runnable:** `IF NOT EXISTS` guards make re-application a no-op.

## Verification
- Applies cleanly in the pgtest (testcontainers) harness.
- New backend route insert verified by unit + pgtest integration tests.

## Rollback
If ever needed: `DROP TABLE IF EXISTS client_error_events;` (no dependents).
