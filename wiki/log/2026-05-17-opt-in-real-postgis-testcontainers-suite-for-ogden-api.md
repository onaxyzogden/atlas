# 2026-05-17 — Opt-in real-PostGIS testcontainers suite for `@ogden/api`


**Branch.** `claude/elated-einstein-16895e`.

Defense against the mock/real divergence class recurring after the prior
lazy-thenable fix (550/550). Added a second, **opt-in** Vitest project
(`test:integration`, never `test`) running 4 focused `*.pgtest.ts` against one
`postgis/postgis:16-3.4` testcontainer; the fast mock suite is byte-unchanged
(**550/550**, excludes `src/tests/integration/**`+`**/*.pgtest.ts`).
Local/manual only — no CI job, no `turbo.json` task. `migrate.ts` refactored
to `export runMigrations(sql)` (one source of truth for prod CLI +
integration globalSetup). **Load-bearing fix surfaced by the Docker-down
run only** (invisible to typecheck): migrate.ts's top-level `import { config }`
+ unconditional CLI tail ran on import → globalSetup importing `runMigrations`
hit `config.ts`'s import-time `process.exit(1)` → suite went **red instead of
green-skipping**; fixed via lazy `await import('../lib/config.js')` inside
`migrateCli()` + an `isCliEntry` (`resolve(process.argv[1]) === fileURLToPath`)
guard. Container lifecycle in `globalSetup` (one container, `runMigrations`
parity, sentinel JSON in `os.tmpdir()` → forked workers since globalSetup
`process.env` doesn't propagate); Docker absent / container-start failure
writes `{skipped:true}` and green-skips, never red. Per-test isolation =
`TRUNCATE … CASCADE` (deliberately not txn-rollback — a savepoint would mask
the `db.begin`/FK-abort behaviors the suite exists to lock). 4 locked
surfaces: geodetic `ST_Area(::geography)` acreage; `SiteAssessmentWriter`
single-`is_current` + 30 s debounce + clamped `overall_score`; telemetry
swallowed per-event FK `23503`; regeneration-events SRID-4326 round-trip +
ownership-join RBAC. New: `vitest.integration.config.ts`,
`src/tests/integration/{sentinel,globalSetup,harness,fixtures}.ts` + 4
`*.pgtest.ts`; `package.json` +2 devDeps (`testcontainers`,
`@testcontainers/postgresql` @ `11.14.0`) + `test:integration` script;
`vitest.config.ts` +exclude. Verified: fast `pnpm --filter @ogden/api test`
**550/550** (50 files, no container, no pgtest collected); `typecheck` exit 0;
Docker-down `test:integration` **exit 0**, 4 files / 5 tests green-skipped
with clear log; lockfile sanity (only testcontainers, +538 lines).
**Deferred:** the with-Docker run is unverified (Docker Desktop stopped this
session) — one outstanding manual `test:integration` in Linux-containers mode
before relying on the 4 pgtests; CI wiring intentionally not done (user:
local-only). ADR: `decisions/2026-05-17-atlas-pgtest-testcontainers-suite.md`.
