# 2026-05-25 — ci(web): gate typecheck + test + build on PRs (closes last PR-CI gap)

**Branch.** `feat/atlas-permaculture` (`016c6d0b`).

Closed the open gap flagged by the same-day api work
([[log/2026-05-25-api-ci-fast-checks-gating]]): `apps/web` had **no PR
CI** — only `deploy.yml` built it, and only on `push` to `main`. A type
or test regression on `@ogden/web` could merge to the feature branch
unchecked and surface only at deploy time. With this workflow,
monorepo-wide PR coverage is complete (`api-ci` + `api-integration` +
`web-ci`).

**New workflow** `.github/workflows/web-ci.yml`, three **parallel** jobs:
- `typecheck` (timeout 15) → `pnpm --filter @ogden/web typecheck` — reuses
  the existing 8 GB-heap script (`node --max-old-space-size=8192 … tsc
  --noEmit`; web is large, plain `tsc` risks OOM). Covers source **and**
  test files.
- `test` (timeout 15) → `pnpm --filter @ogden/web test` — vitest, node
  env, **no Docker, no secrets**.
- `build` (timeout 20) → `pnpm --filter @ogden/web build` with
  `env: NODE_OPTIONS: --max-old-space-size=7168` +
  `VITE_MAPTILER_KEY: ${{ secrets.VITE_MAPTILER_KEY }}` — mirrors
  `deploy.yml`'s proven build step (runs `tsc && vite build` plus the
  Playwright Chromium `prerender:showcase` postbuild, deploy-proven on
  ubuntu-latest, so no explicit `playwright install` step needed).

Runner setup mirrors `api-ci.yml` / `deploy.yml` verbatim:
`actions/checkout@v4`, `pnpm/action-setup@v4` (version 9),
`setup-node@v4` (node 20 + pnpm cache), `pnpm install --frozen-lockfile`,
`paths` filters (`apps/web/**`, `packages/shared/**`, `pnpm-lock.yaml`,
the workflow file), `permissions: contents: read`,
`concurrency … cancel-in-progress` (force-push churn
[[project-branch-rebase]]).

**No build step for typecheck/test** — `@ogden/shared` resolves to source
(`packages/shared/package.json` `exports` → `./src/index.ts`; web
`tsconfig.json` `paths["@ogden/shared"]`), same no-prebuild pattern as the
api workflows.

**Green-baseline-before-gating (steward-required).** The user explicitly
did not want a red first CI run, so HEAD was verified in a **throwaway git
worktree** on the committed SHA (`git worktree add ../atlas-headcheck`)
— never disturbing the 33 uncommitted in-progress web files in the main
tree. Initial verification found `typecheck` + `build` **red** at HEAD
from **3 real committed test-file type errors** (test passed regardless —
vitest/esbuild strip types):
- `v3/plan/impact/__tests__/planImpactFlag.test.ts:143` — `'flag' is
  possibly 'undefined'` → cast the destructured tuple `as [PlanImpactFlag]`
  (matches the in-file idiom at line 129).
- `v3/plan/layers/__tests__/HostUnionContextMenu.test.tsx:58` —
  `number | undefined` not assignable to `number | bigint` → non-null
  assert `mock.invocationCallOrder[0]!` (twice).
- `v3/plan/layers/__tests__/HostUnionDrilldownCard.test.tsx:25` —
  `"understory"` not a `GuildLayer` → `'sub_canopy'` (a real
  `GuildLayer` from `polycultureStore.ts`; the test reads `m.layer`
  dynamically + the component keys `LAYER_LABEL`/`LAYER_TINT` records by
  `GuildLayer`, so the change is contract-safe).

A 4th initial error (`routes/index.tsx:61` cannot find
`PlanConflictsPage.js`) was a **transient stale-worktree artifact** (the
branch rebases live out-of-band [[project-branch-rebase]]; the file exists
at newer HEAD) — self-resolved, not touched.

**Verified green at the committed SHA `016c6d0b`** (fresh worktree,
`pnpm install --frozen-lockfile`):
- `pnpm --filter @ogden/web typecheck` → **exit 0**.
- `pnpm --filter @ogden/web test` → **exit 0, 237 files / 2269 passed /
  4 skipped** (~85 s).
- `build` not re-run locally — `deploy.yml` is the standing proof it works
  on ubuntu-latest.

The 3 fixes + the workflow shipped together in `016c6d0b`. The 33
unrelated uncommitted web files were **not** committed (foreign WIP
[[feedback-no-deletion]]); explicit-path commit per
[[feedback-commit-immediately-on-rebased-branches]]. With this, the
"`apps/web` PR CI remains the open gap" note in
[[log/2026-05-25-api-ci-fast-checks-gating]] is closed.
