# 2026-05-18 — syncManifest backfill: 4 B-series stores + worktree vitest react-alias fix

**Status:** Accepted · **Branch:** `claude/objective-hopper-5dc5a8`
**Builds on** the Full `syncService` Coverage Phase 1–2 registry. Does not
change the transport design — purely closes a coverage-guard gap opened by
B-series feature work, plus an incidental test-harness fix.

## Context

The `syncManifest` coverage guard (`__tests__/syncManifest.test.ts` →
"classifies every persisted ogden- store") was **failing on the branch** —
a real pre-existing bug that had been masked by a now-fixed vitest
react-resolution issue, *not* a flaky/environment failure. Four
project-scoped persisted stores added by B/A-series feature work were never
registered in `syncManifest.ts`, so their data would silently never sync:

- `ogden-rotation-plan` (B3 rotational-grazing sequencer)
- `ogden-compost-cycle` (B2 compost-cycle designer)
- `ogden-succession-path` (B1 Year0→Year30 succession designer)
- `ogden-habitat-features` (A2 habitat-feature inventory)

## Decisions

1. **All four are `versioned-blob`, project-scoped.** Each was classified
   from its actual persisted data shape, matching the documented sibling
   precedent — no guessing, none were ephemeral/device-local:
   - `ogden-rotation-plan` — `byProject: Record<projectId, RotationPlan>` →
     `byKey('byProject', null, {})` (mirrors `ogden-compost-inventory`).
   - `ogden-compost-cycle` — `byProject: Record<projectId, CompostBatch[]>`
     → `byKey('byProject', null, [])`.
   - `ogden-succession-path` — `byProject: Record<projectId, SuccessionPath>`
     → `byKey('byProject', null, {})`.
   - `ogden-habitat-features` — flat `features[]` each carrying `projectId`,
     wrapped in `temporal()` → `tagged('features')`, `usesTemporal: true`
     (mirrors `ogden-soil-samples`).
   `schemaVersion: 1` for all (each store's `persist` `version: 1`).

2. **Worktree vitest config moved to a `createRequire`-resolved react
   alias.** Both `apps/web/vitest.config.ts` (worktree *and* main tree) pin
   react/react-dom via a hard-coded `resolve(__dirname,
   '../../node_modules/react')`. That path exists in the main tree but **not
   in a git worktree** (no local `node_modules`), so vitest failed to
   resolve `react` and the *entire suite silently collapsed to "0 tests"* —
   which is what had been masking the coverage-guard failure. The worktree
   config now resolves the single hoisted copy via
   `createRequire(import.meta.url).resolve('react/package.json')`, robust
   regardless of tree location. **The main tree's `vitest.config.ts` still
   has the old hard-coded path** (works there only incidentally) — porting
   this same fix upstream is recommended to stop future worktrees hitting
   the same silent-zero-tests trap.

## Verification

- `npx vitest run src/lib/__tests__/syncManifest.test.ts` — 10/10 pass.
- Full `npx vitest run` (apps/web) — **1162/1162 pass, 99 files**, zero
  regressions. (fetch/ECONNREFUSED noise = no local API server, unrelated.)

## Deferred / Notes

- Same default-off `FLAGS.SYNC_STATE_BLOBS` gate as the rest of the blob
  path — no behavior change for testers until the flag flips.
- Main-tree `vitest.config.ts` createRequire port (recommended, not done
  here — out of this branch's scope).
