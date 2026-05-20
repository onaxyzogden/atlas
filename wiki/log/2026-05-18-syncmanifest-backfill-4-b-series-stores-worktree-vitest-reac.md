# 2026-05-18 — syncManifest backfill: 4 B-series stores + worktree vitest react-alias fix


**Branch.** `claude/objective-hopper-5dc5a8`.

The `syncManifest` coverage guard ("classifies every persisted ogden- store")
was **failing on the branch** — a real pre-existing bug, *not* flaky/env: it
had been masked because the worktree `vitest.config.ts` pins react via a
hard-coded `resolve(__dirname,'../../node_modules/react')` that exists in the
main tree but **not in a git worktree** (no local `node_modules`), so vitest
failed to resolve `react` and the whole suite silently collapsed to "0 tests".
Four project-scoped persisted stores added by B/A feature work were never
registered, so their data would silently never sync. Classified all four
`versioned-blob` from their actual persisted shape (no guessing; none
ephemeral): `ogden-rotation-plan` `byProject:Record<pid,RotationPlan>` →
`byKey('byProject',null,{})`; `ogden-compost-cycle`
`byProject:Record<pid,CompostBatch[]>` → `byKey('byProject',null,[])`;
`ogden-succession-path` `byProject:Record<pid,SuccessionPath>` →
`byKey('byProject',null,{})`; `ogden-habitat-features` flat `features[]`
projectId-tagged + `temporal()` → `tagged('features')`, `usesTemporal:true`
(mirrors `ogden-soil-samples`); all `schemaVersion:1`. Incidental harness fix:
worktree `vitest.config.ts` react/react-dom alias moved to a
`createRequire(import.meta.url).resolve('react/package.json')` resolver, robust
in any tree. The **main-tree `vitest.config.ts` still has the old hard-coded
path** (works there only incidentally) — upstream port recommended, out of
branch scope. Verified: targeted `syncManifest.test.ts` **10/10**; full
`npx vitest run` (apps/web) **1162/1162, 99 files**, zero regressions
(fetch/ECONNREFUSED = no local API server, unrelated). New ADR
[[2026-05-18-atlas-syncmanifest-bseries-store-backfill]] + index pointer +
`entities/web-app.md` Current State syncService bullet appended. Same
default-off `FLAGS.SYNC_STATE_BLOBS` gate — no tester-facing behavior change.
