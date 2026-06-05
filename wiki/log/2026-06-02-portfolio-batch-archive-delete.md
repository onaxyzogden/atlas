# 2026-06-02 -- Portfolio batch archive / delete multi-select + cascade orphan-gap closure

**Branch.** `feat/atlas-permaculture` (two explicit-path commits: `df95eac1`
slices 1+2 -> `3b3f000a` slices 3-5; rebased out-of-band, divergence-checked,
**not pushed**). Plan: `~/.claude/plans/how-should-triggered-protocol-starry-aho.md`.
ADR: [[decisions/2026-06-02-portfolio-batch-archive-delete]]. Approval doc:
`stages/feature-portfolio-batch-delete-review.md` (destructive gate, `review`).

Gave the v3 Portfolio (`/v3/portfolio`) its first archive/delete capability: a
"Select" toggle enters multi-select on BOTH live surfaces (dashboard card grid +
map list), and a sticky bottom bar batch-archives, batch-unarchives, or
batch-deletes the checked projects. A "Show archived" toggle swaps the visible
set so archive stays reversible. Builtins/samples are never selectable.

## Slice 1 -- cascade orphan-gap fix (`df95eac1`)

`cascadeDeleteProject` extended to clear the 9 OLOS `byProject` stores +
`planStratumProgress` (4 maps) + `useSiteDataStore.clearProject(projectId)`,
each wrapped in the existing `safeDelete`. Pure local-cache cleanup -- the
server `DELETE` already `ON DELETE CASCADE`s these rows. NEW
`cascadeDelete.test.ts` (`@vitest-environment happy-dom`, mocks geodataCache; a
`ByProjectStore` cast resolved a TS2349 from the union of setState signatures):
3 tests -- purge across every store, sibling `p2` preserved.

## Slice 2 -- batch store wrappers (`df95eac1`)

`projectStore.ts`: `BatchResult { ok, failed }` + `runBatch(ids, op)`
(Promise.allSettled tally); `archiveProjects` / `unarchiveProjects` /
`deleteProjects` loop the proven per-id action. NEW `projectStore.batch.test.ts`
(5): tally + empty input, deleteProjects, archive/unarchive round-trip, builtin
no-op. Combined suite 8 green (bounded, `pool='forks'`).

## Slices 3-5 -- select-mode host + both surfaces (`3b3f000a`, 11 files, +533)

- NEW `PortfolioBatchActionBar.tsx` (+ `.module.css`) -- sticky bar: count text +
  Cancel + (Unarchive | Archive) + Delete, `busy` guard.
- `PortfolioHomePage.tsx` (+ `.module.css`) -- owns `selectMode`, `selectedIds:
  Set`, `showArchived`, `confirmKind`, `busy`; exports the `PortfolioSelectMode`
  bundle threaded into both surfaces. `visibleProjects = showArchived ?
  archivedProjects : activeProjects`. Top-bar "Select"/"Done" + "Show archived
  (N)"/"Showing archived" toggles; "+ New project" hidden in select mode.
  `runBatchOp(kind)` calls the store wrapper over `[...selectedIds]`, toasts
  ok/failed, exits select. Three `ConfirmDestructiveDialog`s -- archive/unarchive
  `tone="warn"`, delete `tone="danger"` + `typedConfirmation="delete"`.
- `PortfolioDashboardView.tsx` + `ProjectUrgencyCard.tsx` (+ `.module.css`) --
  card root becomes `role="checkbox"` + `aria-checked` in select mode; click
  toggles instead of navigating; corner check; footer button toggles vs opens.
- `PortfolioMapPage.tsx` + `PortfolioProjectList.tsx` (+ `.module.css`) -- rows
  become `role="checkbox"` in select mode, suspending the map-briefing select.
- Builtins skipped in `toggleSelected`; the per-id actions no-op on them anyway.

## Verification

- **tsc:** `apps/web` -> EXIT 0 (own files; pre-existing unrelated Act-taxonomy /
  financial WIP failures, e.g. `computeProjectBreakEven.test.ts` `fenceOnlyFeatures`,
  are foreign and not committed here).
- **vitest:** cascade (3) + batch (5) green, bounded `pool='forks'`.
- **Live preview** (DOM driven via `preview_eval` -- CSS can't select by button
  text; eval-then-screenshot drifted into project routes several times, so state
  was driven and asserted atomically inside a single IIFE before each capture):
  - Map list: 13 selectable rows of 17 (4 builtins inert); two checked ->
    `2 projects selected` + `Archive (2) / Delete (2)` (screenshot).
  - Dashboard grid: same shared selection, green-check cards, `Archive (3) /
    Delete (3)` (screenshot).
  - Archive one smoke-test project -> warn confirm -> 17 -> 16, leaves active
    list, "Show archived (1)".
  - Show archived -> archived-only view, bar swaps to `Unarchive (1) / Delete (1)`
    (screenshot) -> Unarchive -> restored, 0 archived, back to 17. **Test data
    returned to original state.**
  - **Hard-delete NOT run live** -- autonomous permanent deletion is a prohibited
    action; deferred to operator-triggered verification. Delete + orphan-clear
    are covered authoritatively by the two unit suites.

## Process / covenant

Explicit-path commits (own files by name, never `git add -A`; tree carries heavy
foreign WIP -- financial/economics, plan-strata, projectTypeTaxonomy, scratch
`.txt`/`.py` files -- all left untouched). `git diff --cached --name-only`
verified 11 files before commit. Slice 1's first attempt had captured 2 foreign
files because an out-of-band rebase wiped the index mid-commit; recovered
non-destructively (`reset --soft`, `restore --staged`, re-stage by path) per the
documented hazard ([[project-branch-rebase]],
[[feedback-commit-immediately-on-rebased-branches]]). Commit messages via repo
file + `git commit -F` (submodule `.git` is a file). Branch fetched +
divergence-checked, not pushed. Builtins/samples respected; no project data
permanently deleted ([[feedback-no-deletion]]); CSRA model untouched
([[fiqh-csra-erased-2026-05-04]]); ASCII-only copy.

## Deferred

- Hard-delete live verification (operator to trigger).
- Dedicated archived-projects management page; server-side soft-delete columns.
