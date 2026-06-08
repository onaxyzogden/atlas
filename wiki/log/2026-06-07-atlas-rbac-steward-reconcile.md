# 2026-06-07 -- RBAC track sub-project 1: steward invite reconciliation (local FormValue -> canonical metadata.team.queuedInvites)

- **Branch:** `feat/structured-capture-forms` (clean explicit-path commits `f02e24b0` [RW1] -> `60ff0555` [RW2] -> `8b0cf739` [RW3] -> `f4a6391d` [RW4]; docs this entry; **not pushed**).
- **Plan:** `check-every-single-objective-prancy-dahl.md` (RBAC track, sub-project 1, tasks RW1-RW5).
- **Decision:** [[decisions/2026-06-07-atlas-rbac-steward-reconcile]]
- **Entity:** [[entities/act-tier-shell]]

## What and why

The first slice of the deferred RBAC track. The Stewards surface (shipped earlier
this session, [[decisions/2026-06-07-atlas-tier0-stewards]]) deliberately persisted
queued invites ONLY in the local `actEvidenceStore` FormValue, leaving a documented
gap to the canonical `project.schema.ts` `metadata.team.queuedInvites[]`. This
sub-project closes that gap LOCALLY: recording the `s1-vision-steward` decision now
also mirrors the invites into `metadata.team.queuedInvites[]` on the local
`projectStore` (IndexedDB).

Scope was confirmed with the operator: **reconciliation write only** (delivery /
acceptance / enforcement are RBAC sub-projects 2 and 3); **extend the schema with an
optional `name`** (additive, backward-compatible); **local store only** -- because
exploration found `syncService.syncProjectUpdate` NEVER sends `project.metadata`, so
ALL metadata is already local-only; matching that avoids a premature, broader
sync change.

## Architecture / key decisions

(Full rationale + alternatives in the ADR [[decisions/2026-06-07-atlas-rbac-steward-reconcile]].)

- **RW1 shared schema.** Extracted the inline `queuedInvites` element into an
  exported `QueuedTeamInvite` Zod object + type, adding optional `name`
  (`<=200`). Referenced as `queuedInvites: z.array(QueuedTeamInvite).max(50)
  .optional()`. Re-exported via the existing `export *` in `index.ts` (no index
  edit). Additive + backward-compatible.
- **RW2 pure mapper.** `stewardInvitesToQueued(model, nowIso)` in
  `StewardCapture.tsx`: filters blank-email rows (canonical schema requires a real
  email), maps `{ name, email, role }`, stamps the INJECTED `nowIso` as `queuedAt`.
  Pure / testable; reuses the existing `decodeSteward` zip + invalid-role drop.
- **RW3 store action.** `reconcileStewardInvites(projectId, queuedInvites)` on
  `projectStore`: no-op if the project is absent; spreads existing `metadata` +
  `metadata.team` to PRESERVE `primarySteward` / `coStewards`; REPLACES
  `queuedInvites` wholesale; routes through the existing `updateProject` (which
  already allows `metadata` on builtin samples, so `mtc` works). No persist-version
  bump (metadata is already in the persisted `LocalProject`).
- **RW4 shell wiring.** In `ActTierShell.handleFormDataSave`, when `formId ===
  's1-vision-steward'`, decode the saved value, map it, and call
  `reconcileStewardInvites(id, queued)`. tsc-only for the shell (BT7 / SW
  precedent).

## Commits (SDD: implementer per task, two-stage review + explicit-path commit)

- **RW1 `f02e24b0`** -- `feat(shared)`: name `QueuedTeamInvite` schema + optional
  `name` field (+ 5 schema tests).
- **RW2 `60ff0555`** -- `feat(act-tier0)`: pure `stewardInvitesToQueued` mapper (+ 4
  mapper cases; 25/25 in StewardCapture).
- **RW3 `8b0cf739`** -- `feat(project-store)`: `reconcileStewardInvites` merges the
  team queue (local) (+ 5 store tests).
- **RW4 `f4a6391d`** -- `feat(act-tier0)`: reconcile steward invites into project
  metadata on Record (shell hook; tsc-only).

## Verification

- **Shared `tsc --noEmit`** EXIT 0. **Web `tsc --noEmit`** (8GB heap) -- no new
  errors outside the pre-existing FOREIGN `designElementsStore.ts` WIP (two
  "Duplicate identifier 'widthM'" at 96,3 / 135,3; not mine -- the established
  baseline this session).
- **Bounded vitest** (`--pool=forks --testTimeout=20000`,
  [[feedback-vitest-bounded-runs]]): RW1 schema (5), RW2 mapper (4; StewardCapture
  25/25), RW3 store (5) all green.
- **Two-stage SDD review** (spec then code-quality) PASSED per task.
- **Final whole-implementation review (RW5): READY TO MERGE.** A background
  code-reviewer confirmed all 6 review criteria: mapper purity (injected timestamp)
  + blank-email drop; store merge preserves `primarySteward`/`coStewards` + replaces
  `queuedInvites` + no-ops unknown id; schema additive/backward-compatible + exported;
  no `syncService` change / no persist bump / no migration; ASCII-only; shell hook
  correctly id-gated on the in-scope project `id`. No Critical/Important. One Minor
  (latent serverId-vs-id no-op: `ActTierShell` resolves the active project by `p.id
  === id || p.serverId === id`, but `reconcileStewardInvites` matches strictly on
  `p.id`; harmless for the `mtc` slice where `id` is the local id; logged as a
  follow-up candidate) + Nits (blank name stored as `''` rather than omitted).
- **Live preview smoke (RW5): PASSED.** web (port 5200) + api (3001) already up;
  driven against project `mtc` on `s1-vision` via `window.__TSR_ROUTER__.navigate`.
  Confirmed (DOM + store assertions via `preview_eval`): non-map 3-pane workbench
  (0 canvases / 0 mapbox); the steward item routes to `StewardCapture` (primary card,
  three role cards Co-steward/Contractor/Landowner, defer button "Add team members
  later in settings"). **BEFORE Record:** `mtc` `metadata.team` undefined.
  **After Record** (with the SW4-smoke invite "Amina Yusuf" rehydrated from the local
  FormValue): `metadata.team.queuedInvites` === `[{ name: "Amina Yusuf", email:
  "amina@example.com", role: "team_member", queuedAt: <ISO> }]` -- the canonical
  shape, proving the full FormValue -> `decodeSteward` -> `stewardInvitesToQueued`
  -> `reconcileStewardInvites` -> `updateProject` path. **Replace semantics:**
  removing the invite + re-recording set `metadata.team.queuedInvites` to `[]`
  (wholesale replace, not merge). **Screenshot:** the `preview_screenshot` tool hung
  twice (30s timeout each) -- a transient tool hang ([[project-screenshot-hang]]),
  NOT an app defect: a follow-up `preview_eval` confirmed the page renders fully
  (workbench + cards + Record + defer label, body 3171 chars, 0 canvases). Per the
  no-screenshot-no-claim rule, the live DOM + store assertions stand as the
  map-free visual proof in lieu of the hung screenshot tool.

## Hygiene and Amanah

Explicit-pathspec `git commit -F` per task (no-BOM UTF-8 message files, first bytes
verified non-BOM); `git diff --cached --name-only` / `git show --stat` confirmed
after each commit; `git fetch` + divergence check before each (branch was 4 ahead /
0 behind at RW4; one foreign docs commit `c9db768a` arrived via the external rebase
mid-track -- additive, my staged files survived). Partial-commit form `git commit -F
<msg> -- <paths>` because foreign WIP is staged in the index. **Foreign WIP NEVER
staged or touched** (`designElementsStore.ts`, the auth pages, `wiki/log.md`, etc.;
[[project-branch-rebase]], [[feedback-commit-immediately-on-rebased-branches]],
[[feedback-no-deletion]]); not pushed; ASCII-only (no em-dashes; apostrophes via
double-quoted JS strings). **`wiki/log.md` left untouched** -- foreign-staged from
the external rebase; this standalone log file + the ADR + `wiki/index.md` carry the
record.
**RW4 hazard note:** during an earlier multi-minute web-tsc run, an external
watcher / format-on-save reverted the working-tree ActTierShell edits; mitigation
was to re-apply and commit FAST before any long tsc window. Worked.
**Amanah:** team / role data capture for land stewardship -- no sale,
advance-purchase, financing, or CSRA/salam framing
([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). Clean.

## Deferred (named follow-on sub-projects)

- RBAC sub-project 2 -- invite delivery / acceptance (notification emails /
  acceptance tokens).
- RBAC sub-project 3 -- membership grant + data-layer enforcement (`project_members`,
  `POST /:id/members`, `rbac.ts`).
- Server metadata push (the `syncService` change syncing ALL metadata) -- its own
  sub-project.
- Editing the primary steward (account-level, display-only).
