# 2026-05-20 — Session close: archive/delete project actions lost to out-of-band rebase

**Branch:** `feat/atlas-permaculture`
**Outcome:** Net-zero code. The archive/delete feature implemented earlier in
this session window was wiped by a parallel-session rebase before it was
committed. Session-close documents the loss so the next session can replay
the diff from the transcript instead of re-discovering the gap.

## What was supposed to ship

Two reversible-vs-permanent project lifecycle actions across three surfaces:

- **Archive** — soft, `projects.status = 'archived'`, restorable from `/archive`.
- **Delete** — hard, cascades server-side via FKs + client-side via
  `cascadeDeleteProject`.

Backend slice (`apps/api/src/routes/projects/index.ts`): `POST /:id/archive` +
`POST /:id/unarchive` (owner-only, `refuseIfBuiltin`, mirrors the
`POST /:id/boundary` pattern); `GET /projects?status=active|archived|all`
extension with default `active`. No schema migration — `'archived'` already
existed in the `ProjectStatus` Zod enum and every dependent table already
had `ON DELETE CASCADE`.

Frontend slice (`apps/web/src/...`): three new `apiClient` helpers
(`projects.archive` / `unarchive` / `list({status})`); two new
`projectStore` actions (`archiveProject` / `unarchiveProject`) plus the
existing local-only `deleteProject` made `async` and wired through
`api.projects.delete()` before running the local cascade; new reusable
`ConfirmDestructiveDialog` with `warn` (archive) and `danger` (delete,
typed-confirmation) tones; per-row kebab on `/v3/project`
(`ProjectsLandingPage` — the live project list, excludes builtin samples);
overflow menu in `MobileProjectShell` top bar; new `/archive` page with
Restore + Delete-forever buttons.

End-to-end-verified in-browser before compaction.

## What happened

Between the in-browser verification and the session-close commit, a parallel
session on the same branch executed an external rebase (the recurring pattern
captured in [[project_branch_rebase]]). The rebase replayed unrelated commits
(B3.x rotation criteria, Phase 0 showcase blocker close, Phase B5 design-map
wiring) onto a new base, and the uncommitted archive/delete work was wiped
from the working tree — files vanished, no trace left in the index, no
trace left in any commit.

When this session resumed for the close-out, the post-compaction summary
asserted the implementation files were "verified intact." They were not:

- `apps/web/src/components/ui/ConfirmDestructiveDialog.tsx` — absent
- `apps/web/src/pages/ArchivePage.tsx` — absent
- `apps/web/src/store/projectStore.ts` archive/unarchive actions — absent
- `apps/api/src/routes/projects/index.ts` `:id/archive` route — absent
- The kebab and dialogs on `ProjectsLandingPage` — absent

Mid-resume, the parallel session had also paused mid-rebase with an
unresolved `wiki/log.md` conflict. A pre-edit prepend to `wiki/log.md`
from this session landed inside the conflict's "ours" half and was
discarded along with everything else when the parallel session resolved
their rebase. The orphaned `wiki/log/2026-05-20-archive-and-delete-projects.md`
written before the rebase status was understood was likewise not committed
(and is gone now that the working tree is clean post-resolution).

## Why it happened

Two compounding causes:

1. **Verify-then-commit-later is unsafe on this branch.** The cadence of
   external rebases on `feat/atlas-permaculture` is short enough that any
   gap between editing files and creating a local commit is a window where
   the work can be wiped. The earlier session followed a "implement →
   verify in browser → commit at session close" rhythm; the rebase landed
   inside that gap.

2. **No pre-flight check for in-flight rebases.** When the resume turn
   began, it accepted the compaction summary's claim that files existed
   rather than re-checking disk state, and it did not check for
   `.git/rebase-merge` / `.git/rebase-apply` directories in the submodule.
   Both signals would have surfaced the blocker earlier.

## What to do next session

1. **Replay the archive/delete diff from the transcript.** The full
   implementation is captured turn-by-turn at
   `C:\Users\MY OWN AXIS\.claude\projects\C--Users-MY-OWN-AXIS-Documents-MAQASID-OS---V2-1-atlas\75a258b0-5ff4-4b85-9d42-8587d8b3c762.jsonl`.
   Read it, regenerate each file, commit each slice immediately with
   explicit-path staging, push as soon as a green local quickcheck passes.
   Do not let `>30 min` accumulate between an edit and its commit.

2. **Pre-flight check at session start.** Before any edit on a branch
   known to be rebased out-of-band, check:
   - `git status` for `rebase in progress`
   - `ls .git/rebase-merge .git/rebase-apply` (works for submodules; the
     real path is `<superproject>/.git/modules/<submodule>/rebase-merge`)
   - `git fetch && git status -sb` for divergence
   If any of those signal in-flight work, halt and report before touching
   files.

3. **Trust on-disk state over compaction summaries on this branch.** The
   compaction summary asserted files were intact; the disk said otherwise.
   On a high-rebase-cadence branch, always re-check disk state at resume.

## Verification of session-close state

- `git status` clean (after parallel session resolved their rebase
  conflict and finished the pick chain).
- HEAD at `eb199f7b feat(ai): C.6 — agent registry + /ai/agent-chat route`.
- Divergence from `origin/feat/atlas-permaculture`: `5 ahead, 2 behind`
  (the local 5 are commits from the parallel session that arrived via
  the rebase but haven't been pushed yet; the remote 2 are commits
  pushed during the rebase by yet another path).
- No archive/delete files anywhere in the tree or history.

## Lesson saved to memory

[[feedback_commit_immediately_on_rebased_branches]] — on
`feat/atlas-permaculture`, commit (and ideally push) immediately after
each cohesive slice. Do not batch work behind a session-close commit.
The branch's out-of-band rebase cadence will eat anything sitting
uncommitted in the working tree.
