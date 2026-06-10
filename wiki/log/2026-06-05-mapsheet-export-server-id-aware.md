# 2026-06-05 — MapSheetExportControl made server-id-aware (fix mtc UUID export error)

**Closed.** Operator: "address the `mtc` export-UUID limitation (seed a server
record, or make `MapSheetExportControl` server-id-aware and disable/annotate the
picker for unsynced projects)." Chose **option 2** (server-id-aware +
disable/annotate); rejected "seed a server record" because `mtc` is `isBuiltin`
and builtins are intentionally never synced (`syncProjectNow()` no-ops on
`isBuiltin`, `syncService.ts:496-514`).

## Root cause (deeper than mtc)

`MapSheetExportControl` received one `projectId: string` prop and used it for
**two different id-spaces**:

- **Store filtering** — `useZoneStore/usePolycultureStore/useCropStore` are keyed
  by the **local** project id. Correct, unchanged.
- **The exports API** — `api.exports.generate(projectId, ...)` POSTs to
  `/api/v1/projects/{projectId}/exports`, whose RBAC preHandler queries
  `projects WHERE id = ${projectId}` against a `uuid` PK
  (`apps/api/src/plugins/rbac.ts:50-65`). This needs the **server** UUID
  (`serverId`), set only after sync (`syncService.ts:539`).

Plan mounts the control as `projectId={project.id}` (`DesignPage.tsx:257`), i.e.
the **local id**. For a real synced project the local `id` != `serverId`, so the
call 404s; for `mtc` the local id is the non-UUID slug `'mtc'`, which the uuid PK
rejected loudly as `invalid input syntax for type uuid: "mtc"`. So **Plan-stage
export was already broken for every synced project** — `mtc` merely made the
latent bug visible. This was not an Act-only or mtc-only quirk.

## Change (one file, additive, no signature change)

EDIT `apps/web/src/v3/plan/MapSheetExportControl.tsx` (commit `09b92fea`,
`merge/atlas-permaculture-to-main-2026-06-05`, **not pushed**) — ~20 additive
lines:

- Import `useProjectStore`; resolve the backing project by the local id
  (`s.projects.find((p) => p.id === projectId || p.serverId === projectId)`),
  consistent with how `ActTierShell` resolves it. Derive
  `serverId = project?.serverId ?? null`, `isBuiltin = project?.isBuiltin ?? false`,
  `canExport = serverId !== null`.
- `handleExport` early-returns when `serverId === null`, and now calls
  `api.exports.generate(serverId, { exportType, payload })` — the **server** id.
  `serverId` enters the `useCallback` deps (was `projectId`).
- The "Export sheet" button gains `disabled={busy || !canExport}` +
  `aria-disabled`, with the existing `cursor:not-allowed`/`opacity` disabled
  styling extended to the `!canExport` case.
- A muted annotation renders beneath the button when `!canExport`:
  `"PDF export isn't available for the demo project."` (builtin) or
  `"Save this project to the server to enable PDF export."` (regular unsynced).

Store filtering for zones/guilds/crops still uses the local `projectId`. Both
mount sites (`DesignPage.tsx`, `ActTierShell.tsx`) are **unchanged** — they keep
passing `projectId` and the component resolves `serverId` internally. No change
to `captureMapImage`, `MapControlPopover`, the payload builders, the backend
exports route, the sync service, or the `mtc` seed. No server record created.

This fixes **both** the `mtc` error (clear disabled affordance instead of a
confusing backend error) **and** the latent Plan-stage export bug (synced
projects now export against the correct id).

## Verification

- `tsc --noEmit` (apps/web) — my one file produces **0** errors (only untracked
  foreign-WIP files error; left untouched). Exit 0.
- Bounded vitest (`--pool=forks --testTimeout=20000`, no `maxForks`) —
  `MapSheetExportControl` payload-builder suite **10/10** green (logic there is
  unchanged; regression guard).
- **Live DOM proof deferred (environmental blocker):** the preview renderer was
  wedged by a Vite "Re-optimizing dependencies because lockfile has changed"
  cycle — an **external** lockfile change from the active out-of-band
  rebase/merge tooling, which prevented the app from mounting at all (`#root`
  empty even on the home route, no console errors). Confirmed **not** caused by
  this change (global mount failure + clean tsc + no runtime errors). DOM proof
  (disabled+annotated on `mtc`; enabled + serverId round-trip on a synced
  project) is pending the environment settling. `preview_screenshot` also hangs
  on the WebGL map, [[project-screenshot-hang]].

## Branch note

The working tree had been switched **out-of-band** by external tooling from
`feat/atlas-permaculture` (HEAD `48270161`) to
`merge/atlas-permaculture-to-main-2026-06-05` (HEAD `e70769b8`, ahead 2). The
standing rule is "commit on `feat/atlas-permaculture`," but a checkout there was
blocked by a foreign-WIP local modification to `infrastructure/Dockerfile.api`
(committed content differs between the two branches), which must not be
disturbed. Prior commit `a5c7da3f` is an ancestor of **both** branches. Per
operator decision (AskUserQuestion), committed on the **current merge branch**;
the fix rides into the merge-to-main and is reachable from history. Staged by
explicit path only; `git diff --cached --name-only` confirmed a single file;
BOM-free UTF-8 message; **not pushed**. Foreign WIP + prior uncommitted wiki
edits left untouched.

Entity: [[entities/act-tier-shell]] ("Floating PDF-export toolbar restored"
section, "Known limitation, now fixed" paragraph). Plan: server-id-aware
approach (option 2 of the operator's two options).
