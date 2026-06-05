# 2026-05-21 — wip-pre-mtc-restore reconcile: paused on concurrent-session collision

Follow-up to [2026-05-21-mtc-observe-baseline-restoration.md](./2026-05-21-mtc-observe-baseline-restoration.md).
Goal of this session: (Phase A) reconcile the `wip-pre-mtc-restore`
stash onto `feat/atlas-permaculture`, then (Phase B) instrument the 68
unguarded zustand `persist.rehydrate()` call sites so the next silent
rehydrate failure is diagnosable. Plan file:
`~/.claude/plans/reconcile-wip-pre-mtc-restore-or-if-tingly-fern.md`.

## What happened

Phase A was interrupted by an **active concurrent session** writing to
the same repo, branch, and git index. Timeline:

1. `git fetch` showed branch in sync (0/0). Working tree already held
   foreign concurrent edits → stashed them aside as
   `foreign-edits-during-stash-reconcile-2026-05-21` (now `stash@{0}`).
2. `git stash apply` of `wip-pre-mtc-restore` (this git lacks
   `--3way` on `stash apply`; plain apply uses merge by default).
   - Anticipated `elementCatalog.ts` conflict did **not** occur — it
     auto-merged (HEAD already carried the `defaultWidthM` work).
   - Actual conflict: `packages/shared/src/builtEnvironment.ts` — both
     sides added the same `widthM` zod field, differing only in doc
     comment. Resolved in favour of the upstream/HEAD wording (it
     references `LINE_KIND_DEFAULT_WIDTH_M`).
   - The two untracked migrations `036`/`037` from the stash were
     **already committed** on HEAD (`f007b8f2`), so they were skipped.
3. Type-check (`tsc --noEmit`, needs `--max-old-space-size=8192` or it
   OOMs) reported the only *new* errors introduced by the stash are two
   test fixtures missing the now-required `defaultOrgId` field:
   `apps/web/src/components/SessionExpiredBanner.test.tsx` and
   `apps/web/src/store/sessionExpiredStore.test.ts`. All other tsc
   errors are pre-existing foreign issues (SelectionFloater, HostUnion*).
4. **Mid-reconcile the shared git index changed under us** — the other
   session staged its own commit-in-progress (a cashflow-tooltip
   primitive) and my applied content got un-staged back to the working
   tree. Paused here rather than risk capturing their work under my
   commit or having mine swept into theirs. User chose "pause until
   other session idle."
5. Armed a git-quiescence monitor. The other session then **committed**
   — HEAD advanced `95b6ad9a → 37619c30`, landing:
   - `37619c30 feat(atlas/economics): S8-F ARIA-grade tooltip for cashflow card`
   - `c1c2ef45 feat(plan): width-aware line-width paint for DesignElementLayers`
   - `8ff17011 feat(plan): DesignElement.widthM optional per-feature override`
   The widthM commits (`8ff17011`, `c1c2ef45`) absorbed a chunk of what
   `wip-pre-mtc-restore` carried, so the stash is now **partially
   redundant**.

## Current state at session close

- **Nothing destructive was run.** No reset, no checkout, no force.
- `stash@{1}: wip-pre-mtc-restore` is **intact** — the authoritative
  copy of the pending work. `git stash apply` never drops it.
- Working tree is dirty with 10 files: 8 are my stash-apply residue
  (`apps/api/src/routes/auth/index.ts`,
  `apps/api/src/routes/organizations/index.ts`,
  `apps/web/src/lib/apiClient.ts`, `apps/web/src/store/authStore.ts`,
  `apps/web/src/store/builtEnvironmentStore.ts`, two `*.module.css`,
  `packages/shared/src/schemas/collaboration.schema.ts`); 2 are foreign
  uncommitted edits that are **not** mine and must not be touched
  (`apps/web/src/v3/plan/layers/inlineEditSchemas.ts`,
  `apps/web/src/v3/observe/components/overlays/SectorCompassOverlay.tsx`).
- Phase B (rehydrate instrumentation) was **not started**.
- Only this wiki log is being committed this session; the tangled
  reconcile is intentionally **not** committed.

## Recommended next session

Do the reconcile in an **isolated git worktree** (per the plan's risk
section) so no concurrent session can mutate the index mid-flight:

1. `git worktree add ../atlas-reconcile feat/atlas-permaculture`
2. In the worktree: `git stash apply stash@{1}` (or cherry-pick the
   still-divergent files — re-diff against HEAD first, since the widthM
   work already landed and several stash files may now be no-ops).
3. Fix the two `defaultOrgId` test fixtures.
4. `tsc --noEmit` (8 GB heap) green, then commit + push
   `--force-with-lease`, then `git stash drop stash@{1}`.
5. Proceed to Phase B: shared `rehydrateWithLogging` helper at
   `apps/web/src/store/persistRehydrate.ts`, wire into the 2 MTC-loss
   stores first, then the remaining ~62 bare `.rehydrate()` sites;
   augment the 2 existing `onRehydrateStorage` callbacks
   (`closedLoopStore.ts`, `builtEnvironmentStoreV2.ts`) with error
   logging rather than the helper.

## Lesson

This branch has chronic concurrent-session contention (see the long
stash list: `parallel-session-*`, `pre-rebase-*`, `foreign-edits-*`).
Stash reconciliation on the live working copy is fragile here — the
index is shared and gets mutated mid-operation. Future stash/rebase
reconciles on `feat/atlas-permaculture` should use a dedicated worktree.
