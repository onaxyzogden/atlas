# 2026-05-17 — Opt-in real-PostGIS testcontainers integration suite

**Status:** Accepted · `claude/pgtest-testcontainers` (commit `ee58e371`)
**Scope:** `apps/api/src/db/migrate.ts` (extract `runMigrations`), `apps/api/vitest.config.ts` (exclude only), `apps/api/vitest.integration.config.ts` (new), `apps/api/package.json` (script + 2 devDeps), `apps/api/src/tests/integration/**` (new: sentinel/globalSetup/harness/fixtures + 4 `*.pgtest.ts`)
**Relates to:** `decisions/2026-05-17-atlas-mock-db-lazy-thenable.md` (this is the explicitly-deferred real-DB follow-up it named)

## Context

The lazy-thenable ADR closed the "11 failing" tests and established that
`@ogden/api` is **mock-DB by design**. It also named the structural risk it
could not address: a FIFO queue mock cannot reproduce real Postgres/PostGIS
behaviors, so a mock that "passes" can mask a prod break. Four such surfaces
exist: the boundary route's geodetic `ST_Area(::geography)`,
`SiteAssessmentWriter`'s `db.begin` single-`is_current` invariant + 30 s
debounce, telemetry's per-event swallowed FK violation (pg `23503`), and
regeneration-events' SRID-4326 round-trip + ownership-join RBAC. A real-DB
harness was explicitly deferred there; this is that follow-up.

**Amanah Gate:** Passed — test-infrastructure hardening for a halal
land-stewardship tool. No riba/gharar.

## Decision

Add a **minimal, opt-in** real-PostGIS suite **alongside** the untouched fast
mock suite (still 550/550). Local/manual only — no CI, no `turbo.json` task.

- `migrate.ts`: extract `export async function runMigrations(sql)` (one
  source of truth for migration semantics; accepts injected `sql`, no
  `sql.end()`/`process.exit`). CLI tail unchanged, now calls it; top-level
  `config` import moved onto the CLI path; CLI tail gated on `isCliEntry`.
- `vitest.integration.config.ts`: `include` only `**/*.pgtest.ts` under
  `src/tests/integration/`, `globalSetup`, `forks`+`singleFork`,
  `fileParallelism:false`. Does **not** set `DATABASE_URL` (harness sets it
  at runtime). Fast `vitest.config.ts` gains an `exclude` for the
  integration dir + the pgtest suffix; nothing else touched.
- `globalSetup.ts`: probe Docker; absent → write `{skipped:true}` sentinel
  and return. Else start one `postgis/postgis:16-3.4` container, run
  `runMigrations` once, write the connection URL to a sentinel JSON in
  `os.tmpdir()`. **Never throws** — container-start failure → skip sentinel
  + clear log → green-skip, never red.
- `harness.ts`: reads the sentinel synchronously at import so
  `INTEGRATION_ENABLED` drives `describe.skipIf(...)` at collection time.
  `getHarness()` sets `process.env.DATABASE_URL` from the sentinel **before**
  the dynamic `await import('../../app.js')` (config.ts validates env at
  import and would `process.exit(1)` otherwise). Per-test isolation is
  `TRUNCATE … RESTART IDENTITY CASCADE`, deliberately **not**
  transaction-rollback (a savepoint wrapper would mask the writer's real
  `db.begin` invariant and telemetry's per-event FK abort).

## Why

The sentinel JSON file is the only reliable channel from Vitest
`globalSetup` (main process) to forked workers — `globalSetup` `process.env`
mutations do not propagate to `forks` workers. Dynamic `import()` of
`app.ts` after env is set is the minimal way around `config.ts`'s
import-time `process.exit(1)`. One shared container per run (no
`.withReuse()`) for determinism. TRUNCATE over rollback is the whole point:
the suite exists to lock behaviors a savepoint would hide.

## How to apply

- New PostGIS-dependent surface worth locking → add a `*.pgtest.ts` under
  `src/tests/integration/`, `describe.skipIf(!INTEGRATION_ENABLED)`, use
  `getHarness`/`resetDb`/`closeHarness` + `fixtures.ts` seeds.
- **Hard rule:** never static-`import` `app.ts`/`config.ts`/
  `plugins/database.ts`/`db/migrate.ts` from a pgtest or the harness — dynamic
  `import()` only, after env is set. `SiteAssessmentWriter.ts` is pure (takes
  `db` as a param) so a static import of it is safe.
- Run via `corepack pnpm --filter @ogden/api test:integration`. Never add it
  to `turbo.json` — a skip-or-run side-effecting suite must never be cached.
- Windows: Docker Desktop must be in **Linux-containers** mode; Windows-
  containers mode passes the `docker info` probe but fails container start →
  green-skip via the globalSetup try/catch.

## Consequences

- Two real defects were caught by the suite's own typecheck/run during
  verification and fixed: (1) `fixtures.ts` `sql.json()` rejected
  `Record<string, unknown>` (argument cast added); (2)
  `vitest.integration.config.ts` JSDoc literally contained the glob
  `**/` `*.pgtest.ts` whose `*/` substring prematurely closed the block
  comment and broke esbuild's config load (comment reworded). Both are
  evidence the harness pulls its weight before a single DB row is written.
- Migration filename duplicate numeric prefixes (016–019 ×2) are **not**
  fixed — sorted-filename order is what prod uses and is faithfully
  reproduced. Out of scope.

## Verification (Windows / `corepack pnpm`)

- Fast suite unchanged: `--filter @ogden/api test` → **550/550**, 50 files,
  zero `*.pgtest.ts` collected, no container.
- `--filter @ogden/api typecheck` → exit 0.
- Docker **down**: `--filter @ogden/api test:integration` → **exit 0**,
  4 files / 5 tests green-skipped, clear `[pgtest] Docker not available`
  log, zero failures.
- Lockfile additive only: `pnpm-lock.yaml` +543 (testcontainers /
  @testcontainers/postgresql 11.14.0), `apps/api/package.json` +5/-1.
- **Not exercised here:** the Docker-*up* path (one container, migrations,
  4 files pass) — Docker Desktop was stopped on the dev machine. The
  green-skip path is proven; the run-with-Docker path needs Docker up in
  Linux-containers mode.

## Provenance note

A prior session (`claude/elated-einstein-16895e`) authored this work but it
was never persisted to git anywhere (lost to an external force-push on a
shared branch). It was re-implemented from the approved plan in a fresh
worktree off `d95ce7a2` (the lazy-thenable baseline) and pushed as the
isolated branch `claude/pgtest-testcontainers` — the contested branch was
not touched.
