# 2026-05-17 — Opt-in real-PostGIS testcontainers integration suite (`@ogden/api`)


The deferred real-DB follow-up to the lazy-thenable ADR. Added a minimal,
opt-in PostGIS suite **alongside** the untouched fast mock suite (still
**550/550**, 50 files, zero `*.pgtest.ts` collected, no container).
Local/manual only — no CI, not in `turbo.json`.

`migrate.ts` refactored to export a shared `runMigrations(sql)` (CLI tail
unchanged, `config` import moved to the CLI path, tail gated on
`isCliEntry`). New `vitest.integration.config.ts` (forks/singleFork,
`fileParallelism:false`, **no `DATABASE_URL`**); fast `vitest.config.ts`
gains only an `exclude` for the integration dir + pgtest suffix.
`globalSetup` starts one `postgis/postgis:16-3.4` container, runs
`runMigrations` once, writes the connection URL to a sentinel JSON in
`os.tmpdir()` (the only reliable channel from Vitest `globalSetup` to
forked workers); Docker absent / container-start failure → `{skipped:true}`
sentinel + clear log → **green-skip, never red**. Harness reads the
sentinel synchronously at import (drives `describe.skipIf`), sets
`process.env.DATABASE_URL` **before** the dynamic `import(app.ts)`
(config.ts `process.exit(1)`s on missing env at import). Per-test isolation
is `TRUNCATE … RESTART IDENTITY CASCADE` — deliberately not
transaction-rollback (would mask the writer's real `db.begin`
single-`is_current` invariant + telemetry's per-event FK abort). 4
`*.pgtest.ts`: geodetic boundary acreage vs independent
`ST_Area(::geography)`; `SiteAssessmentWriter` single-`is_current` +
version flip + 30 s debounce + `overall_score` invariant; telemetry
swallowed per-event FK `23503`; regeneration-events SRID-4326 round-trip +
author-or-owner RBAC.

Two real defects caught by the suite's own typecheck/run during
verification and fixed: `fixtures.ts` `sql.json()` rejected
`Record<string, unknown>` (arg cast); `vitest.integration.config.ts` JSDoc
literally contained the glob whose `*/` substring prematurely closed the
block comment and broke esbuild's config load (reworded). Verified: fast
550/550; `@ogden/api` typecheck exit 0; Docker-down `test:integration`
**exit 0** (4 files / 5 tests skipped, clear log); lockfile additive only
(+543 testcontainers/@testcontainers/postgresql 11.14.0). Docker-*up* path
not exercised (Docker Desktop stopped).

**Provenance:** a prior session (`claude/elated-einstein-16895e`) authored
this but it was never persisted to git anywhere — lost to an external
force-push on a shared branch (confirmed via `git log --all -S`, reflog,
worktree/stash search). Re-implemented from the approved plan in a fresh
worktree off `d95ce7a2` (lazy-thenable baseline) and pushed as the isolated
branch `claude/pgtest-testcontainers` (commit `ee58e371`); the contested
branch / diverged origin were not touched. New ADR
`decisions/2026-05-17-atlas-pgtest-testcontainers-suite.md` + index pointer;
`entities/api.md` Current State updated (the "explicitly deferred" line
resolved).
