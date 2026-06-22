# 2026-06-20 -- Tier-0/Reception decision workbench restacked to a single list-first column

## What

The Plan Tier-0 Declaration / Tier-2 Reception decision workbench (`ActTierZeroWorkbench`) was re-laid-out from a side-by-side 2-column grid (left list / right form) into a **single stacked column**: the decision list is now full-width and scrollable when nothing is selected, and on selecting a task the list collapses to the chosen tile (kept between the upper section and the workspace) followed by the capture workspace below it. Operator brief:

> "list of tasks to be full width of workbench container and show scrollable list of tasks when no task is selected. Once a task is selected, collapse list and render workspace for the selected task along with the chosen tasks' tile remaining between the upper section and the task workspace."

## Operator decisions (AskUserQuestion, 2026-06-20)

1. **Scope = BOTH Declaration + Reception** -- one shared code path, no per-mode branch.
2. **Entry = open on the list, NO auto-select** -- the workbench opens on the full list; switching objectives (0.1 -> 0.2) also resets to the list.
3. **Back to list = BOTH affordances** -- a dedicated "All decisions" back button AND clicking the persistent selected tile both return to the full list.

A fourth decision came up at commit time: HEAD was on `fix/web-ci-baseline`, not `main`. Operator chose **"Switch to main, commit there."**

## How

`ActTierZeroWorkbench` is mounted **only** by `PlanTierShell` (the `!inShell` bare-grid return is dead legacy) -- so this is a Plan-only change with NO Act-parity concern.

- **`ActTierZeroWorkbench.tsx`** -- `selectedItemId` defaults to `null` (was `checklist[0]?.id`); reset effect `setSelectedItemId(null)` keyed on `[activeObjectiveId]`. The 2-column grid JSX was replaced by a single `<div className={stack}>`: strips -> `<DecisionList ... collapsed={Boolean(selectedItem)} onBack={() => setSelectedItemId(null)} />` -> a conditional `<section className={workspace}>` (only when a task is selected) holding `TeamRegistryPanel` (declaration + `TEAM_OBJECTIVE_ID`) + `DecisionWorkingPanel` with all current props unchanged.
- **`ActTierZeroWorkbench.module.css`** -- added `.stack` (flex column, gap, `min-height:0`, `overflow-y:auto`, padding, slate body bg), `.stackInShell` (`height:auto; flex:1 1 auto`), `.workspace` (flex column, cream working-surface bg, top border/margin). Old `.root`/`.rootInShell`/`.left`/`.right` preserved (empty-state `data-empty` + dead legacy path still reference them).
- **`DecisionList.tsx`** -- reused (not forked) via new optional `collapsed?`/`onBack?` props. Header ("ACTIVE DECISION" + objective title + focused question) and the "YOUR DECISIONS N/M" count render unchanged in both states (they ARE the always-on upper section). The rows array + the row click-target are gated by `collapsedToTile = collapsed && selectedItemId !== null`: collapsed renders only the selected tile (preceded by a `data-testid="decision-back"` back button using lucide `ArrowLeft`, ASCII not a glyph), and the tile's click handler calls `onBack` instead of re-selecting; group dividers are suppressed when collapsed. `modeFor` / feed resolution / `showActHandoff` / `showObserveOutput` untouched.
- **`copy/act.ts`** -- new `ACT_COPY.decisionList.backToList = "All decisions"`.
- **`DecisionList.module.css`** -- new `.backBtn` + `.backBtnIcon`.

Rationale-flush preserved: `DecisionWorkingPanel`'s unmount cleanup flushes to the OUTGOING item id when the back button unmounts the panel.

## Verify

Project `typecheck` (`corepack pnpm -C apps/web run typecheck`) EXIT 0 / 0 errors (the script does not typecheck test files, so the historical 6-error foreign baseline does not surface). Bounded vitest (`--pool=forks --testTimeout=15000`) **219/219** across all four suites: `ActTierZeroWorkbench.test.tsx` 174 + `DecisionList.test.tsx` 40 (new `collapsed (stacked workbench) mode` describe block, 6 cases) + `.declaration` 3 + `.reception` 2. Preview NOT driven -- deterministic hang on v3 map mounts ([[project-screenshot-hang]]); DOM/unit is the signal, no visual-pass claimed.

## Git

Repo was on `fix/web-ci-baseline` with foreign WIP (`AppShell.tsx`/`bootAuthed.ts`/`demoSession.ts`/`projectStore.ts`) that differs between branches and blocked a literal `git switch main`. Per the operator's "commit on main" choice, used a temporary `main` worktree (`../atlas-main-wt`): the 9 files are byte-identical in committed state on both branches (none appear in `git diff --name-only main HEAD`), so the working versions were copied in and committed there, then the worktree was removed and the 9 files restored in the primary tree so the work lives solely as the `main` commit.

Commit **`1803f2ee`** on `main` (9 files, +441/-165), **NOT pushed** -- atop the existing unpushed backlog. 9 files: `ActTierZeroWorkbench.tsx` + `.module.css`, `DecisionList.tsx` + `.module.css`, `copy/act.ts`, and the four test suites.

## Amanah

CLEAR -- pure layout / information-architecture chrome; no capital, sale, or advance-purchase surface touched ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). No ADR filed: this is layout, not architecture.

Entity [[entities/plan-tier-shell]]. Same tier-shell family as [[log/2026-06-19-atlas-threshold3-switcher-clickable]].
