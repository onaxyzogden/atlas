# ADR: Gate the @ogden/api integration suite in CI with a strict no-green-skip mode

**Date:** 2026-05-25
**Status:** accepted

**Context:**
The opt-in real-PostGIS integration suite (`apps/api` `*.pgtest.ts`, run via
`pnpm --filter @ogden/api test:integration`) was local/manual only — no CI, not
in `turbo.json`. Its `globalSetup.ts` green-skips (writes a `{skipped:true}`
sentinel, exits 0) whenever Docker is unavailable, so the suite is a no-op for
developers without Docker. That same green-skip makes it useless as a CI gate:
a regression like the `seedProject` `org_id` NOT-NULL break
([[log/2026-05-25-pgtest-fixture-org-id-not-null]]) would have failed every
pgtest at insert time, yet a naive CI run could still pass green if Docker
weren't actually exercising the suite. We want a gate that can never silently
test nothing.

**Decision:**
1. **Strict mode flag.** `globalSetup.ts` now reads `PGTEST_REQUIRE_DB`. When
   set, Docker-unavailable and container-start-failure **throw** (red build)
   instead of writing a skip sentinel. The default (flag unset) keeps the local
   green-skip behavior unchanged — strict mode is CI-only. The file's "must
   NEVER throw" hard rule is relaxed to "never throw unless `PGTEST_REQUIRE_DB`
   is set."
2. **Dedicated workflow** `.github/workflows/api-integration.yml`: runs on
   `pull_request` and `push`, path-filtered to `apps/api/**`,
   `packages/shared/**`, `pnpm-lock.yaml`, and the workflow file. ubuntu-latest
   (Docker preinstalled) → testcontainers `postgis/postgis:16-3.4` works
   out of the box. Sets `PGTEST_REQUIRE_DB=1`. `concurrency` cancels superseded
   runs (relevant because `feat/atlas-permaculture` is force-pushed often,
   [[project-branch-rebase]]).
3. **Turbo task** `test:integration` added to `turbo.json` with `cache:false`
   (container-backed; a cached "pass" must never substitute for a real run).

**Consequences:**
- A green-skip in CI is now impossible: if the runner can't start PostGIS, the
  build goes red instead of falsely passing.
- The workflow runs `test:integration` directly via the pnpm filter (esbuild
  transpile, no `tsc` typecheck) and does **not** run the fast mock `test`
  suite or `lint` — those remain ungated (no PR-gating CI exists for them yet;
  deferred). A pre-existing `tsc` error in `builtins-project-type.pgtest.ts:112`
  is therefore not surfaced by this workflow.
- No Redis service is provisioned: the suite logs `ECONNREFUSED:6379` but no
  assertion depends on Redis (verified — suite is 12/12 green without it).
- Supersedes the "Local/manual only — no CI" note in
  [[decisions/2026-05-17-atlas-pgtest-testcontainers-suite]].
