# 2026-06-02 — Portfolio batch archive / delete + cascade orphan-gap closure

**Status:** Adopted
**Branch:** `feat/atlas-permaculture` (two explicit-path commits: `df95eac1`
slices 1+2 → `3b3f000a` slices 3–5; rebased out-of-band, divergence-checked,
**not pushed**).
**Plan:** `~/.claude/plans/how-should-triggered-protocol-starry-aho.md`
**Approval:** [stages/feature-portfolio-batch-delete-review.md](../../stages/feature-portfolio-batch-delete-review.md) (destructive-capability gate, status `review`)
**Related:** [2026-05-07 Act stage page](2026-05-07-atlas-act-stage-page.md), entity [act-tier-shell](../entities/act-tier-shell.md)

## Context

The v3 Portfolio (`/v3/portfolio`) had **no way to delete or archive a project**
from its primary surfaces. The store already exposed the per-project primitives
(`deleteProject`, `archiveProject`, `unarchiveProject` — all async, API-synced,
builtin-guarded) and a full multi-select pattern existed, but **only** on the
retiring legacy `HomePage.tsx` ("compare mode"). The two live v3 surfaces — the
dashboard card grid (`PortfolioDashboardView`) and the map list
(`PortfolioProjectList`) — had no selection and no per-project actions.

Two latent problems compounded this:

1. **No reversibility surface.** The host hard-filtered archived projects out
   of view, so archive would have been a one-way trip with no UI to undo it.
2. **Orphan gap on hard-delete.** `cascadeDeleteProject` cleared 13 stores but
   **missed** ~10 OLOS Act/Plan/Observe stores + `planStratumStore` (4 maps) +
   `siteDataStore`, so a hard-delete would orphan their localStorage records.

Operator decisions (AskUserQuestion, locked): (a) surface = **both** the
dashboard grid and the map list; (b) operations = batch **Archive + Delete**;
(c) orphan gap = **fix now**.

**Amanah Gate.** Data-stewardship tooling over the operator's own projects — no
riba/gharar. Permanent delete is gated behind type-to-confirm; archive is the
reversible default.

## Decision

### 1. Close the cascade orphan gap (`cascadeDelete.ts`, slice 1, `df95eac1`)

Every missing store is keyed `byProject: Record<projectId, …>`, so clearing =
drop the project key, wrapped in the file's existing `safeDelete(label, fn)`:

```ts
safeDelete('olos:actTasks', () => useActTaskStore.setState((s) => {
  const { [projectId]: _drop, ...byProject } = s.byProject; return { byProject };
}));
```

Applied to the 9 OLOS `byProject` stores + `planStratumProgress` (4 maps:
`byProject`, `celebratedByProject`, `deferredByProject`, `valuesByProject`) +
`useSiteDataStore.getState().clearProject(projectId)` (existing API). No new
server calls — the server `DELETE /api/v1/projects/:id` already
`ON DELETE CASCADE`s these rows; this is purely local-cache cleanup.

### 2. Batch store wrappers (`projectStore.ts`, slice 2, `df95eac1`)

`export interface BatchResult { ok: number; failed: number }` +
`export async function runBatch(ids, op)` (Promise.allSettled tally). Three
thin wrappers loop the proven per-id action and return the tally:
`archiveProjects` / `unarchiveProjects` / `deleteProjects`. Components stay free
of loop/error plumbing; one place owns the result toast.

### 3. Select-mode host + batch bar (slices 3–5, `3b3f000a`)

Selection is **owned once in `PortfolioHomePage`** (`selectMode`, `selectedIds:
Set`, `showArchived`, `confirmKind`, `busy`) and threaded into both surfaces via
a `PortfolioSelectMode` bundle, so one toolbar drives either view.

- **Top bar:** a "Select" / "Done" toggle and a "Show archived (N)" / "Showing
  archived" toggle. `visibleProjects = showArchived ? archivedProjects :
  activeProjects`. "+ New project" hides in select mode.
- **`PortfolioBatchActionBar`** (NEW) — sticky bottom bar rendered when
  `selectMode && selectedCount > 0`: count text + Cancel + (Unarchive | Archive,
  by the archived toggle) + Delete, with a `busy` guard.
- **Dashboard grid:** `ProjectUrgencyCard` gains `selectMode/selected/
  onToggleSelect`; in select mode the BentoBox root becomes
  `role="checkbox"` + `aria-checked`, the click toggles selection instead of
  navigating, and a corner check renders.
- **Map list:** `PortfolioProjectList` rows likewise become
  `role="checkbox"` in select mode, suspending the normal map-briefing select.
- **Builtins are never selectable** — `toggleSelected` skips `isBuiltin`, and
  the per-id store actions no-op on them anyway.

### 4. Confirmation UX (reuse `ConfirmDestructiveDialog`)

- **Delete:** `tone="danger"` + `typedConfirmation="delete"` — body names the
  count and permanence.
- **Archive / Unarchive:** single `tone="warn"` confirm (reversible).
- Result toast: `toast.success('N projects archived/restored/deleted.')`;
  partial failure → `toast.error('ok …, failed …')`.

## Verification

- **Typecheck:** `pnpm --filter @ogden/web run typecheck` — EXIT 0 (touched
  files; pre-existing unrelated Act-taxonomy / financial WIP failures ignored).
- **Tests (bounded, `pool='forks'`):** `cascadeDelete.test.ts` (3) +
  `projectStore.batch.test.ts` (5) green — cascade purges the deleted project
  across every store while a sibling is preserved; wrappers tally ok/failed,
  handle partial failure, archive/unarchive round-trip, no-op on builtins.
- **Live (Claude_Preview, native pg on 5432):**
  - Select on the **map list** → checkboxes + bar `Archive (2) · Delete (2)`
    (screenshot); builtin "Moontrance Creek (Sample)" inert.
  - Select on the **dashboard grid** → green-check cards, shared selection, bar
    `Archive (3) · Delete (3)` (screenshot).
  - **Archive** one project → warn confirm → portfolio 17 → 16, project leaves
    the active list, "Show archived (1)".
  - **Show archived** → archived-only view, bar swaps to `Unarchive (1) ·
    Delete (1)` (screenshot) → **Unarchive** restores it (0 archived, back to 17).
  - **Hard-delete + orphan-clear: not exercised live** — autonomous permanent
    deletion is a prohibited action; left for operator-triggered verification.
    The delete path + cascade orphan-clear are authoritatively covered by the
    two unit suites above.

## Scope deferrals

- Dedicated archived-projects management page (the "Show archived" toggle covers
  reversibility for now).
- Server-side soft-delete columns (`deletedAt`/`archivedAt`) — archive remains a
  `status` flip.
- Legacy `HomePage.tsx` compare mode left untouched (no-deletion rule).

## Files

**New:** `apps/web/src/v3/portfolio/PortfolioBatchActionBar.tsx` (+ `.module.css`);
`stages/feature-portfolio-batch-delete-review.md`;
`apps/web/src/store/__tests__/cascadeDelete.test.ts`;
`apps/web/src/store/__tests__/projectStore.batch.test.ts`.

**Modified:** `apps/web/src/store/cascadeDelete.ts`;
`apps/web/src/store/projectStore.ts`;
`apps/web/src/v3/portfolio/PortfolioHomePage.tsx` (+ `.module.css`);
`PortfolioDashboardView.tsx`; `ProjectUrgencyCard.tsx` (+ `.module.css`);
`PortfolioMapPage.tsx`; `PortfolioProjectList.tsx` (+ `.module.css`).

## Process / covenant

Two explicit-path commits (own files by name, `git diff --cached --name-only`
verified — 3b3f000a staged exactly the 11 intended files; foreign WIP confirmed
untouched). Slice 1's first attempt captured foreign WIP because an out-of-band
rebase wiped the index between `git add` and `git commit`; recovered
non-destructively (`reset --soft`, `restore --staged` the 2 foreign files,
re-staged by path). Commit message via repo file + `git commit -F` (submodule
`.git` is a file, here-docs break). Branch fetched + divergence-checked, **not
pushed**. Foreign WIP untouched; CSRA model untouched; ASCII-only copy.
