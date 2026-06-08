# ADR: RBAC track sub-project 1 -- steward invite reconciliation (local FormValue -> canonical metadata.team.queuedInvites)

- **Date:** 2026-06-07
- **Status:** Accepted
- **Branch:** `feat/structured-capture-forms` (commits `f02e24b0` [RW1 shared schema] -> `60ff0555` [RW2 mapper] -> `8b0cf739` [RW3 store action] -> `f4a6391d` [RW4 shell wiring]; docs this entry; local-only, **not pushed**).
- **Entity:** [[entities/act-tier-shell]]
- **Relates to:** [[decisions/2026-06-07-atlas-tier0-stewards]] (the Stewards surface that recorded the deferred two-sources-of-truth gap this sub-project closes), [[decisions/2026-06-06-atlas-tier0-boundaries]] (the controlled-over-`FormValue` capture pattern + pure decode helper reused here).
- **Log:** [[log/2026-06-07-atlas-rbac-steward-reconcile]]

## Context

The Stewards surface ([[decisions/2026-06-07-atlas-tier0-stewards]]) persists queued
invites ONLY in the local `actEvidenceStore` `visionFormData['s1-vision-steward']`
slice (three parallel arrays), by deliberate operator decision. That left a
documented divergence from the canonical home `project.schema.ts`
`metadata.team.queuedInvites[]`. The full RBAC track is three separable
subsystems: (1) **reconciliation write** [this sub-project], (2) real invite
delivery / acceptance, (3) membership + data-layer enforcement. This is the
leanest, highest-value, lowest-risk slice.

**Operator decisions (2026-06-07):**

- **Scope = reconciliation write only.** Delivery / acceptance / enforcement are
  later sub-projects.
- **Name handling = extend the schema with an optional `name`** (additive,
  backward-compatible) so the operator-entered display name survives end to end.
- **Persistence reach = LOCAL store only.** Exploration found the web sync layer
  (`apps/web/src/store/syncService.ts` `syncProjectUpdate`) NEVER sends
  `project.metadata` -- so ALL metadata (`projectTypeRecord`, `visionProfile`,
  `team`) is already local-only today. This sub-project matches that: it writes to
  the local `projectStore` metadata (IndexedDB) only, with NO `syncService`
  change. Pushing metadata to the server is its own follow-on sub-project (it
  would turn on sync for ALL metadata at once).

## Decision

When the `s1-vision-steward` decision is recorded, map the locally-captured
invites into the canonical `metadata.team.queuedInvites[]` on the local
`projectStore`. Four additive changes; no new endpoint, no network, no
`syncService` change, no persist-version bump / migration.

### 1. Named `QueuedTeamInvite` schema with an optional `name` (RW1)

`project.schema.ts` extracts the previously-inline `queuedInvites` element into an
exported `QueuedTeamInvite = z.object({ name?: string(<=200), email: email(<=200),
role: enum['team_member','contractor','landowner','reviewer'], queuedAt: datetime
})` and references it as `queuedInvites: z.array(QueuedTeamInvite).max(50)
.optional()`. The change is additive + backward-compatible (`name` is optional; the
rest of the shape is unchanged). `index.ts` re-exports it via the existing
`export * from './schemas/project.schema.js'` (no index edit needed). **Rationale:**
a named, exported element type is needed by the web store action and mapper; adding
`name` preserves the operator-entered display name (the steward `StewardRole` enum
is a strict subset of the four-value queued-invite enum, so the role maps directly,
no coercion).

### 2. Pure `stewardInvitesToQueued(model, nowIso)` mapper (RW2)

In `StewardCapture.tsx`, a pure exported mapper turns a decoded `StewardModel` into
`QueuedTeamInvite[]`: filters out blank-email rows (the canonical schema requires a
real email), maps `{ name, email, role }` and stamps the injected `nowIso` as
`queuedAt`. `nowIso` is a parameter (not `new Date()` inside) to keep the function
pure and unit-testable. Roles are already constrained by the existing
`decodeSteward` (which drops invalid-role rows), so the mapper does not re-validate
them. **Rationale:** reuse the existing `decodeSteward` parallel-array zip; keep the
FormValue -> canonical translation a single pure, tested function.

### 3. `reconcileStewardInvites` projectStore action (RW3)

`reconcileStewardInvites(projectId, queuedInvites)` finds the project (no-op if
absent), spreads the existing `metadata` and `metadata.team` to PRESERVE
`primarySteward` / `coStewards`, REPLACES `queuedInvites` wholesale (the steward
FormValue is the source of truth for the queue), and calls the existing
`updateProject(projectId, { metadata })`. `updateProject` already allows `metadata`
on builtin samples (allowlist), so this works on the `mtc` demo project. Metadata
is part of the already-persisted `LocalProject` -- **no persist version bump /
migration**. **Rationale:** mirror the established `setPrimaryType` write template;
replace-not-merge is correct because the captured queue is authoritative; spreading
`existingTeam` guards the sibling fields.

### 4. One-line hook in `ActTierShell.handleFormDataSave` (RW4)

When `formId === 's1-vision-steward'`, after `saveVisionFormData`, decode the saved
value, map it, and call `useProjectStore.getState().reconcileStewardInvites(id,
queued)`. tsc-only verification for the shell (BT7 / SW precedent: a no-prop
multi-store integration component; the logic is unit-covered in RW2 / RW3).

## Consequences

- Recording the steward decision now writes the invite queue to BOTH the local
  `actEvidenceStore` FormValue (unchanged) AND the canonical local
  `metadata.team.queuedInvites[]`, closing the documented divergence -- locally.
  The canonical copy is now the place the later RBAC sub-projects (delivery,
  enforcement) read from.
- Still local-only: nothing reaches the server, consistent with today's behaviour
  for ALL `metadata`. No regression to existing validation (the schema change is
  additive/optional).
- The Stewards surface, its tests, and every other Tier-0 capture are unchanged
  (the hook is additive and id-gated).

## Amanah

Team / role data capture for land stewardship. No sale, advance-purchase,
financing instrument, or CSRA/salam framing; no riba/gharar surface
([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). Clean.

## Verification

- Shared `tsc --noEmit` EXIT 0; web `tsc --noEmit` (8GB heap) -- no new errors
  outside the pre-existing foreign `designElementsStore.ts` WIP (two "Duplicate
  identifier 'widthM'" errors, not mine).
- Bounded vitest (`--pool=forks --testTimeout=20000`,
  [[feedback-vitest-bounded-runs]]): `QueuedTeamInvite` / `ProjectMetadata` (RW1, 5
  tests), `stewardInvitesToQueued` (RW2, 4 cases, now 25/25 in StewardCapture),
  `reconcileStewardInvites` (RW3, 5 tests) all green.
- Two-stage SDD review (spec then code-quality) per task.
- Final whole-implementation review + live preview smoke: see
  [[log/2026-06-07-atlas-rbac-steward-reconcile]].

## Named follow-on sub-projects (NOT this pass)

- **RBAC sub-project 2 -- invite delivery / acceptance:** real notification emails
  / acceptance tokens (`sendInvitationEmail` does not exist yet).
- **RBAC sub-project 3 -- membership + enforcement:** `project_members`, `POST
  /:id/members`, `rbac.ts` data-layer enforcement wiring.
- **Server metadata push:** the `syncService` change that would sync ALL `metadata`
  (not just team) to the server -- its own sub-project.
- Editing the primary steward (account-level, display-only).

## Alternatives considered

- **Write to the server now via the project-update API:** rejected -- `syncService`
  drops ALL metadata today; turning that on is a separate, broader sub-project.
- **Merge (not replace) the queue:** rejected -- the captured FormValue is the
  authoritative queue; merging would resurrect removed invites.
- **Stamp `queuedAt` inside the mapper with `new Date()`:** rejected -- impure /
  untestable; `nowIso` is injected at the call site.
- **A new persisted store slice / version bump:** rejected -- `metadata` is already
  in the persisted `LocalProject`; no migration needed.
