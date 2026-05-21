# 2026-05-21 — Archive / Delete projects: replay after rebase loss

**Branch.** `feat/atlas-permaculture`. Replays the seven-slice Archive + Delete
feature that the 2026-05-20 session ([[log/2026-05-20-session-close-archive-delete-lost-to-rebase]])
shipped end-to-end and then lost when a parallel session's out-of-band rebase
wiped every uncommitted file between verify and session-close commit. Source-of-truth
for exact diff wording was the prior session's transcript at
`C:\Users\MY OWN AXIS\.claude\projects\C--Users-MY-OWN-AXIS-Documents-MAQASID-OS---V2-1-atlas\75a258b0-5ff4-4b85-9d42-8587d8b3c762.jsonl`.
Per [[feedback_commit_immediately_on_rebased_branches]], every cohesive slice
was committed (and pushed every 1–3) before moving to the next — no verify-then-commit-later.

## Cadence — commit per slice, push every 1–3

1. `7d4cfd5a` — `feat(api): POST /projects/:id/archive + /unarchive + GET ?status=`
2. `9978385c` — `feat(projectStore): archive/unarchive + async deleteProject`
   (pushed after slice 2 — divergence `+3 −2`, rebased cleanly, fast-forward `47126a05..9978385c`)
3. `ea37dc57` — `feat(ui): ConfirmDestructiveDialog (warn / danger tones)`
4. `c6f1a1c6` — `feat(projects): kebab w/ Archive/Delete on /v3/project landing`
   (pushed after slice 4)
5. `835e2db6` — `feat(mobile): Archive/Delete overflow menu in MobileProjectShell`
6. `fa0b7b2a` — `feat(projects): /archive page + restore + delete-forever`
   (pushed after slice 6)

## What shipped

- **Slice 1 — backend** ([apps/api/src/routes/projects/index.ts](../../apps/api/src/routes/projects/index.ts)).
  Parameterized `GET /projects` with `?status=active|archived|all` (default `active`),
  replacing the literal `AND p.status != 'archived'` with a branch on the parsed
  query param via `db\`p.status = 'archived'\`` fragments. Added `POST /:id/archive`
  and `POST /:id/unarchive` after the PATCH at L285 — owner-only via
  `requireRole('owner')`, `refuseIfBuiltin` guard, `RETURNING` column list matched
  to the PATCH so `ProjectSummary.parse(toCamelCase(updated))` succeeds.
- **Slice 2 — projectStore** ([apps/web/src/store/projectStore.ts](../../apps/web/src/store/projectStore.ts)).
  New `archiveProject(id)` + `unarchiveProject(id)` actions call
  `api.projects.archive/unarchive` on `serverId`, then mutate `LocalProject.status`.
  Existing local-only `deleteProject` (L271–280) became async — calls
  `api.projects.delete(serverId)` first, then `cascadeDeleteProject(id)`. All three
  fail-open to the local mutation on network error; builtin no-op preserved.
- **Slice 3 — danger dialog** ([apps/web/src/components/ui/ConfirmDestructiveDialog.tsx](../../apps/web/src/components/ui/ConfirmDestructiveDialog.tsx), new).
  Thin wrapper over the existing `Modal.tsx`. Props:
  `{ open, onCancel, onConfirm, title, body, confirmLabel, tone: 'warn'|'danger', typedConfirmation? }`.
  `danger` tone requires the user to type `typedConfirmation` exactly before the
  confirm button enables; `warn` is plain confirm. `busy` state disables both
  buttons during the async confirm.
- **Slice 4 — `/v3/project` kebab** ([apps/web/src/v3/pages/ProjectsLandingPage.tsx](../../apps/web/src/v3/pages/ProjectsLandingPage.tsx) +
  [.module.css](../../apps/web/src/v3/pages/ProjectsLandingPage.module.css)).
  `MoreVertical` kebab pinned top-left of each non-builtin real `CandidateCard`
  (absolute, dark glass, `.kebab`). Popover `.kebabMenu` with Archive + Delete
  items (`.kebabItemDanger` for delete). `LOCAL_CANDIDATE_PREFIX` stripped from
  `c.id` via a `projectById` Map; `activeProjects` filters out
  `status === 'archived'`; builtins skipped (`canManage = project && !project.isBuiltin`).
  Each item opens the appropriate `ConfirmDestructiveDialog`.
- **Slice 5 — mobile overflow** ([apps/web/src/pages/MobileProjectShell.tsx](../../apps/web/src/pages/MobileProjectShell.tsx) +
  [apps/web/src/pages/ProjectPage.tsx](../../apps/web/src/pages/ProjectPage.tsx)).
  New `onArchive?: () => void` prop. `MoreVertical` in the top app bar, hidden
  for builtins via `showOverflow = !project.isBuiltin && (Boolean(onArchive) || Boolean(onDelete))`.
  Popover menu with Archive + Delete items, each opening `ConfirmDestructiveDialog`.
  Parent `ProjectPage` `handleArchive` / `handleDelete` are async and navigate
  back to `/v3/project` on success.
- **Slice 6 — `/archive` page + route** ([apps/web/src/pages/ArchivePage.tsx](../../apps/web/src/pages/ArchivePage.tsx), new;
  [routes/index.tsx](../../apps/web/src/routes/index.tsx); [features/navigation/taxonomy.ts](../../apps/web/src/features/navigation/taxonomy.ts)).
  Lists archived projects from `useProjectStore`. Per-row **Restore**
  (`unarchiveProject`) + **Delete forever** (`ConfirmDestructiveDialog` `danger`
  with `typedConfirmation = project.name`). `useEffect` calls
  `api.projects.list({ status: 'archived' })` as a silent hydration nudge —
  network failure surfaces a muted "Showing locally cached archive" note but
  never blocks render. Empty state with a Back-to-projects link.
  `archiveRoute = createRoute({ getParentRoute: () => appShellRoute, path: '/archive', ... })`
  registered alongside `homeRoute`. `NavItem` gained optional `href?: string`;
  the existing taxonomy archive entry at L690 updated with `href: '/archive'`.

## Reused, not built

- `api.projects.archive` / `unarchive` / `list({ status })` stubs at
  [apiClient.ts:165 / :229 / :232](../../apps/web/src/lib/apiClient.ts) — already
  ported by the parallel session that landed before this replay. No edit; just
  consumed.
- [Modal.tsx](../../apps/web/src/components/ui/Modal.tsx) — `ConfirmDestructiveDialog`
  wraps it; no new dialog shell.
- [cascadeDeleteProject](../../apps/web/src/store/cascadeDelete.ts) — client-side
  dependent-store cleanup, unchanged.
- `LOCAL_CANDIDATE_PREFIX` from [v3/data/projectToCandidate.ts](../../apps/web/src/v3/data/projectToCandidate.ts) —
  stripping the `local:` namespace when mapping `Candidate` back to `LocalProject`
  on the v3 landing.
- `projects.status = 'archived'` enum value + `ON DELETE CASCADE` FKs already
  in the schema — no migration. Soft delete is a status flip.

## Verified end-to-end

1. `/v3/project` shows **2 kebabs** matching the 2 non-builtin active projects;
   **0** on builtins.
2. Archive on `/v3/project` → confirm → row vanishes; `localStorage.ogden-projects`
   entry flips `status: 'archived'`.
3. `/archive` renders `h1` + **1 row** + Restore + Delete-forever buttons.
4. Restore → archived project reappears on `/v3/project`.
5. Delete-forever → danger dialog with the typed-name gate; "Delete forever"
   stays disabled until exact match, then confirm removes the project and
   cascades dependent-store entries.
6. Mobile overflow on `/project/$projectId`: kebab visible only for non-builtins;
   archive → navigate back to `/v3/project` → archived state confirmed.

`preview_screenshot` timed out (>30 s, no console errors); per the project
CLAUDE.md rule "If the screenshot tool is unresponsive, say so rather than
assuming success," verification was done via `preview_snapshot` + `preview_eval`
on the DOM and `useProjectStore.getState()` instead. Stated explicitly here.

## Why this replay didn't get re-eaten

Per [[feedback_commit_immediately_on_rebased_branches]] and the loss record at
[[log/2026-05-20-session-close-archive-delete-lost-to-rebase]]: on
`feat/atlas-permaculture` the out-of-band rebase cadence wipes uncommitted
work between verify and commit. This replay committed each cohesive slice
immediately on completing the file edits and pushed every 1–3 commits, so the
worst-case loss window stayed under one slice. No verify-then-commit-later
delays.

## Out of scope

- `HomePage.tsx` (legacy `/home`) — not the live project list; per
  [[feedback_no_deletion]] the legacy surface stays as-is, the v3 surface
  carries the new affordances.
- Refresh-token / re-auth on session expiry mid-flow — handled by the global
  session-expired banner from the 2026-05-20 gap-6 close.
- Multi-select bulk archive — single-row only.

ADR: none new. Feature add covered by the prior session's design intent; this
log entry is the record.
