# 2026-05-25 — ci(api): gate fast lint + mock-test checks on PRs

**Branch.** `feat/atlas-permaculture`.

Closed the deferred item from the same-day CI-gating work
([[log/2026-05-25-pgtest-ci-gating-strict-mode]]): the fast `@ogden/api`
checks — `lint` (`tsc --noEmit`) and the mock-DB `test` suite — were
still ungated; only the slow real-PostGIS `*.pgtest.ts` suite
(`api-integration.yml`) gated PRs.

**New workflow** `.github/workflows/api-ci.yml`, two **parallel** jobs:
- `lint` → `pnpm --filter @ogden/api lint`
- `test` → `pnpm --filter @ogden/api test` (the mock suite — `vi.mock`'d
  db plugin, in-process FIFO queue, **no Docker**)

Runner setup mirrors the proven `api-integration.yml` verbatim:
`pnpm/action-setup@v4` (version 9), `setup-node@20` + pnpm cache,
`pnpm install --frozen-lockfile`, identical `paths` filters
(`apps/api/**`, `packages/shared/**`, `pnpm-lock.yaml`, the workflow
file), `permissions: contents: read`, and
`concurrency … cancel-in-progress` (force-push churn
[[project-branch-rebase]]).

**No build step, no `turbo.json` change.** `@ogden/shared` resolves to
source (`packages/shared/package.json` `exports` → `./src/index.ts`;
api `tsconfig.json` `paths["@ogden/shared"]` → `../../packages/shared/src/index.ts`),
so both jobs run against TS source directly via the pnpm filter — same
no-`tsc`-prebuild pattern the integration workflow uses.

**Scope decision (steward-chosen):** `apps/api` only. `apps/web`
lint/test deliberately **not** gated — the web `tsc` state is uncertain
(uncommitted web changes + stray `apps/web/tsc_*.txt` scratch files in
the tree), so a web gate could land red. `packages/shared` not added
either (its health surfaces through the api jobs, which include shared
src).

**Preconditions verified locally at branch HEAD before gating:**
- `corepack pnpm --filter @ogden/api lint` → exit 0
- `corepack pnpm --filter @ogden/api test` → exit 0, **696 passed /
  3 skipped** (65 files, ~52s; the wiki's older "550/550" has grown).

Together with `api-integration.yml`, `@ogden/api` now has full PR
gating: fast type-check + mock suite (this workflow) and the heavier
real-PostGIS integration suite. `apps/web` PR CI remains the open gap.
