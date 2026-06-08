# 2026-06-07 -- Tier-0 Stewards surface (Phase C Part 3, sub-project 3 of 3: team/RBAC capture on the optional steward item)

- **Branch:** `feat/structured-capture-forms` (clean explicit-path commits `cab1efcc` [SW1] -> `2ca098ca` [SW2] -> `625242cc` [SW3] -> `256c851d` [SW1 tsc follow-up]; docs this entry; **not pushed**).
- **Plan:** `check-every-single-objective-prancy-dahl.md` (Phase C Part 3, tasks SW1-SW4).
- **Decision:** [[decisions/2026-06-07-atlas-tier0-stewards]]
- **Entity:** [[entities/act-tier-shell]]

## What and why

Phase C Part 3 sub-project 3 -- the **final** of the three sequenced surfaces
(Boundaries [shipped] -> Stakeholders [shipped] -> Stewards) -- gives the
**single optional checklist item `s1-vision-steward`** a bespoke right-panel
capture, built from the operator mockup `olos_stewards_decision_surface.html`.
The item already exists in
`packages/shared/src/constants/plan/catalogues/universal.ts` (inside the
already-Tier-0 `s1-vision` objective, `optional: true`, label "Confirm the
primary steward and any co-stewards for this project", feeds "Act: Task
assignment & notifications"). Today it falls through to the generic
`hasFields`/textarea fallback; this pass routes it to a `StewardCapture`: a
read-only primary-steward card (the current account user), three role-explanation
cards, a project-team list, and a queued-invite form.

This is the **leanest** of the three surfaces -- and unlike Boundaries /
Stakeholders it needed **no predicate change** (s1-vision already swaps to the
workbench), **no shared store** (a single item's invites fit per-item
`FormValue`), and **no `fieldOptions.ts` change** (the role cards are rich UI, not
flat option strings, so they live in a component-local constant). The pattern
mirrored is `BoundaryCapture.tsx` -- controlled-over-`FormValue` with pure
decode/validate/summarise helpers and a private encode.

## Architecture / key decisions

(Full rationale + alternatives in the ADR [[decisions/2026-06-07-atlas-tier0-stewards]].)

- **Mirror BoundaryCapture (controlled-over-FormValue).** Contract
  `StewardCapture({ itemId, value, onChange, resolveOptions })` is byte-identical
  to `BoundaryCapture`; `resolveOptions` is accepted for parity but UNUSED (role
  metadata is the local `STEWARD_ROLES` constant). `emit = (next) =>
  onChange(encodeSteward(next))` on every interaction.
- **Parallel-array encoding.** Queued invites persist as three arrays
  `inviteNames: string[]` / `inviteEmails: string[]` / `inviteRoles: string[]` in
  the existing `actEvidenceStore.visionFormData['s1-vision-steward']` slice via
  the EXISTING `saveVisionFormData` + `setItemComplete` path (same as Boundaries).
  `role: StewardRole = 'team_member' | 'contractor' | 'landowner'` -- the real
  `ProjectRole` spec values from `collaboration.schema.ts`, so the value persisted
  now matches future RBAC enforcement.
- **Pure, auth-free helpers (unit-tested).**
  `decodeSteward(value)` zips the three arrays to `Math.min` of their lengths and
  **drops any row whose role is not in the enum** (security-safe -- never coerces a
  contractor into a co-steward); missing keys -> `{ invites: [] }`.
  `isStewardValid(model)` is **always `true`** (item optional; zero invites valid;
  Record always enabled). `summariseSteward(model)`: zero -> "Primary steward
  confirmed"; populated -> "Primary steward + N invited (X co-steward, Y
  contractor, Z reviewer)" using human labels, omitting zero-count clauses.
  Private `encodeSteward` is the exact inverse (round-trip identity for valid
  models).
- **Primary steward card = display-only**, derived from `useAuthStore((s) =>
  s.user)` via a STABLE single-ref selector (not a fresh object -- the Zustand v5
  trap); null user -> neutral placeholder, no throw. NOT part of the persisted
  `FormValue`; auth read is confined to the card subcomponent; the pure helpers
  never read auth.
- **Transient invite-form fields** (name/email/role before "Queue invite") are
  local `useState`, NOT `FormValue`; only a queued invite appends to the arrays.
  Queue is disabled until `name.trim() !== '' && email.includes('@')`.
- **`STEWARD_ROLES` local constant** drives BOTH the three explanation cards AND
  the invite-form role selector (single source of truth): per role `{ value,
  label, description, accessChips, colorClass, hint }`.
- **Panel wiring** (`DecisionWorkingPanel.tsx`): added `isSteward?: boolean` and
  `deferLabel?: string` to `DecisionPanelTarget`; steward arms come FIRST in the
  body-router / validity / summary chains (before `hasFields`/textarea);
  `<StewardCapture>` keyed on `decision.itemId`. Footer: when `decision.deferLabel`
  is set, the defer button shows it at rest and a neutral "Will add later" when
  toggled, via a gated `deferLabelFor(isDeferred)` -- every OTHER item keeps both
  "...needs observation" strings byte-for-byte. The `deferrable === false` logic
  (stakeholder c3) is untouched.
- **Detection** (`ActTierZeroWorkbench.tsx` `buildDecisionTarget`): `isSteward =
  item.id === 's1-vision-steward'`; `deferLabel = 'Add team members later in
  settings'` for that id; `deferrable` left undefined (steward IS deferrable; only
  `s1-stakeholders-c3` is `false`).
- **No change** to `DecisionList.tsx`, `ActTierShell.tsx`, or `fieldOptions.ts`.

## Commits (SDD: implementer per task, two-stage review + explicit-path commit)

- **SW1 `cab1efcc`** -- `feat(act-tier0)`: `StewardCapture` component +
  `STEWARD_ROLES` + pure helpers (`decodeSteward`/`isStewardValid`/
  `summariseSteward`, private `encodeSteward`) + `.module.css` + 21 tests.
- **SW2 `2ca098ca`** -- `feat(act-tier0)`: wire the steward arm + two-state defer
  label into `DecisionWorkingPanel` (47 tests).
- **SW3 `625242cc`** -- `feat(act-tier0)`: detect the steward item in
  `buildDecisionTarget` (`isSteward` + `deferLabel`) (37 workbench tests).
- **SW1 follow-up `256c851d`** -- `fix(act-tier0)`: satisfy
  `noUncheckedIndexedAccess` in `StewardCapture` (CSS-module class lookups are
  `string | undefined`; relaxed `STEWARD_ROLES.colorClass` +
  `ROLE_AVATAR_CLASS`/`ROLE_BADGE_CLASS` record value types, optional-chained
  `selectedMeta?.hint`). Behaviour unchanged. (The SW1 implementer had
  misreported web tsc as clean; caught at the SW4 typecheck gate.)

## Verification

- **Web `tsc --noEmit`** EXIT 0 (8GB heap) -- zero steward-related errors after
  `256c851d`.
- **Bounded vitest** (`--pool=forks --testTimeout=20000`,
  [[feedback-vitest-bounded-runs]]) green: **105/105** across `StewardCapture` (21),
  `DecisionWorkingPanel` (47), `ActTierZeroWorkbench` (37).
- **Two-stage SDD review** (spec then code-quality) PASSED per task.
- **Final whole-implementation review (SW4): READY TO MERGE.** A background
  code-reviewer confirmed all 9 design decisions correctly implemented, found NO
  Critical/Important issues (one Minor: the CSS references accent tokens
  `--color-teal`/`-gold`/`-warning-dim`/`-success-dim`/`-danger` that resolve to
  their literal hex fallbacks -- a pre-existing convention shared verbatim by the
  sibling `StakeholderCapture`/`BoundaryCapture` CSS, not a regression; plus Nits).
  Verified: contract parity with BoundaryCapture; `decodeSteward` drops
  invalid-role rows (security-correct, tested with an injected bad role); the
  stable single-ref auth selector (no Zustand v5 trap); the two-state defer label
  does not regress other items' observation strings; ASCII-clean.
- **Live preview smoke (SW4): PASSED.** API was down on first load (`ECONNREFUSED`
  at :3001 blocked the SPA bootstrap -- a harder failure than the stakeholders
  smoke's 503; [[project-screenshot-hang]]); brought the API up via
  `preview_start name=api` (PostgreSQL connected, `/health` 200) and reloaded.
  Driven against project `mtc` (Moontrance Creek) on the **`s1-vision`** objective.
  Screenshot captured (no-screenshot-no-claim satisfied). Confirmed: non-map
  3-pane workbench (0 canvases / 0 mapbox); selecting "Confirm the primary
  steward..." routes to `StewardCapture`; PRIMARY STEWARD card renders ("You",
  Primary badge, "Full access -- all Plan, Act, and Observe data", current-user
  email shown, placeholder initials when displayName absent -- no throw); three
  role cards verbatim from the mockup (Co-steward / team member with Plan+Act+
  Observe+Notifications chips; Contractor with "Assigned tasks only"; Landowner /
  external reviewer with "Progress view" + "Observe highlights"); PROJECT TEAM
  starts at 1 member; **Queue invite DISABLED** until a name + an "@"-bearing email
  are entered, then ENABLED; queuing "Amina Yusuf" (Co-steward) appended the row
  ("invite queued", delete affordance) and PROJECT TEAM became **2 members**;
  **Record this decision ENABLED with zero invites** (always-valid) and after the
  queue; Record ticked the item (**4 / 9 -> 5 / 9 decisions made**) and persisted
  the parallel-array `FormValue` (`inviteNames` incl. "Amina") into
  `ogden-act-evidence`; the defer button reads **"Add team members later in
  settings"**; switching to Labour and back **rehydrated** the queued invite
  (still 2 members, Amina present) -- proving decode-from-persisted. The Feeds
  block renders "Team roles feed Act: Task assignment & notifications. Role
  boundaries are enforced at the data layer..." (aspirational copy, flagged in the
  ADR). The smoke ran on the SAME workbench + `DecisionWorkingPanel` that passed a
  full live smoke at stakeholders ST8 (`41ddc7da`); the steward change is purely
  additive.

## Hygiene and Amanah

Explicit-pathspec `git commit -F` per task (no-BOM UTF-8 message files, first
bytes verified non-BOM `102,105,120`); `git diff --cached --name-only` /
`git show --stat` confirmed after each commit; `git fetch` + divergence check
before each (an external rebase added a foreign commit `67d184c9` mid-SW1 --
assessed additive, my staged files survived); the SW1-followup commit used the
partial-commit form `git commit -F <msg> -- <path>` because foreign WIP is staged
in the index (commit-by-pathspec ignores the other staged foreign paths). Foreign
WIP NEVER staged or touched ([[project-branch-rebase]],
[[feedback-commit-immediately-on-rebased-branches]], [[feedback-no-deletion]]);
not pushed; ASCII-only (no em-dashes; apostrophes via double-quoted JS strings).
**`wiki/log.md` left untouched:** it is currently in an unmerged conflict state
(UU) from the external rebase colliding on my own stakeholders index entry; per
the no-foreign-touch rule and because the branch is force-pushed out-of-band, the
top-level index pointer for this entry is deferred to the rebase resolution. This
standalone log file + the ADR + `wiki/index.md` carry the record.
**Amanah:** team/role data capture for land stewardship -- no sale,
advance-purchase, financing, or CSRA/salam framing
([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). Clean.

## Deferred (the known RBAC track -- NOT this pass)

- Real invite delivery / notifications; data-layer role enforcement; writing to
  `project.schema.ts` `metadata.team.queuedInvites[]` via the project-update API.
  This pass is queued-invite UI + local `FormValue` persistence only. The ADR
  records a named future task to reconcile local capture -> `metadata.team`.
- Editing the primary steward (set at account level -- display-only, locked).
- Prefilling existing `metadata.team.coStewards` into the team list (RS4: NO this
  pass -- local FormValue only, primary steward from auth).

## Phase C Part 3 complete

With Stewards shipped, all THREE Phase C Part 3 sub-projects (Boundaries,
Stakeholders, Stewards) are built on `feat/structured-capture-forms` and READY TO
MERGE (local-only, not pushed).
