# 2026-05-25 — ci(api): gate the integration suite, strict no-green-skip mode

Branch `feat/atlas-permaculture`. Follow-up to the same-day `seedProject`
`org_id` fix ([[log/2026-05-25-pgtest-fixture-org-id-not-null]]): wire the
opt-in real-PostGIS `*.pgtest.ts` suite into CI so an `org_id`-class regression
can't silently green-skip.

## Problem
The suite was local/manual only. `globalSetup.ts` green-skips (writes a
`{skipped:true}` sentinel, exits 0) whenever Docker is unavailable — correct
for local dev, but it makes the suite useless as a CI gate: a run that never
actually starts PostGIS still passes green. There was also **no PR-gating CI at
all** in the repo — only `deploy.yml` (push→Pages) and
`evidence-replay-nightly.yml` (cron).

## Change
1. **Strict mode** in `globalSetup.ts`: reads `PGTEST_REQUIRE_DB`. When set,
   Docker-unavailable and container-start-failure **throw** (red) instead of
   writing a skip sentinel. Default (unset) keeps the local green-skip. The
   "must NEVER throw" hard-rule comment relaxed to "unless `PGTEST_REQUIRE_DB`
   is set."
2. **Workflow** `.github/workflows/api-integration.yml`: `pull_request` +
   `push`, path-filtered (`apps/api/**`, `packages/shared/**`, `pnpm-lock.yaml`,
   the workflow itself). ubuntu-latest, pnpm v9, node 20, `pnpm install
   --frozen-lockfile`, then `pnpm --filter @ogden/api test:integration` with
   `PGTEST_REQUIRE_DB=1`. `concurrency` cancels superseded runs (branch is
   force-pushed often, [[project-branch-rebase]]).
3. **Turbo**: `test:integration` task added to `turbo.json` with `cache:false`
   (container-backed — a cached "pass" must never replace a real run).

## Verification
- Strict mode + Docker up: `pnpm --filter @ogden/api test:integration` →
  **7 files / 12 tests green** (~34s). Flag doesn't break the happy path.
- Strict mode + Docker forced-unavailable (`DOCKER_HOST=tcp://127.0.0.1:1`):
  **exit 1**, error `[pgtest] PGTEST_REQUIRE_DB is set but Docker is
  unavailable — refusing to green-skip…`. Guard fires as designed.
- `@ogden/api` `tsc --noEmit`: my edited files (`globalSetup.ts`,
  `fixtures.ts`) are clean. One **pre-existing** error remains at
  `builtins-project-type.pgtest.ts:112` (committed in `4ab1e52d`, not this
  work) — the new workflow runs the suite via esbuild (no `tsc`), so it is
  unaffected. Flagged separately.

## Scope / deferred
- Workflow runs **only** `test:integration`. The fast mock `test` suite (550)
  and `lint` remain ungated — no PR CI exists for them; out of this task's
  scope.
- No Redis service provisioned: `ECONNREFUSED:6379` is logged but no assertion
  depends on it.

## Files
- `apps/api/src/tests/integration/globalSetup.ts` — strict-mode guard
- `.github/workflows/api-integration.yml` — new gating workflow
- `turbo.json` — `test:integration` task (`cache:false`)

ADR: [[decisions/2026-05-25-atlas-pgtest-ci-gating-strict-mode]].
