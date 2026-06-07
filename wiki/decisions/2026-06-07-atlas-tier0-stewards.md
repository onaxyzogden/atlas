# ADR: Tier-0 Stewards surface (Phase C Part 3, sub-project 3 of 3: team/RBAC capture on the optional steward item)

- **Date:** 2026-06-07
- **Status:** Accepted
- **Branch:** `feat/structured-capture-forms` (commits `cab1efcc` [SW1] -> `2ca098ca` [SW2] -> `625242cc` [SW3] -> `256c851d` [SW1 tsc follow-up]; local-only, not pushed)
- **Entity:** [[entities/act-tier-shell]]
- **Relates to:** [[decisions/2026-06-06-atlas-tier0-stakeholders]] (Phase C Part 3 sub-project 2) and [[decisions/2026-06-06-atlas-tier0-boundaries]] (sub-project 1 -- the bespoke self-routing controlled-over-`FormValue` capture this mirrors), [[decisions/2026-06-06-atlas-tier0-workbench]] (Phase B -- the Tier-0 workbench + `isTierZeroObjective` predicate), [[decisions/2026-06-05-atlas-structured-capture-forms]] (Phase A -- the `FormValue` contract). Schema reference: `packages/shared/src/schemas/collaboration.schema.ts` (`ProjectRole`), `packages/shared/src/schemas/project.schema.ts` (`metadata.team`).
- **Log:** [[log/2026-06-07-atlas-tier0-stewards]]

## Context

`s1-vision-steward` is an OPTIONAL checklist item that already exists inside the
`s1-vision` objective (`packages/shared/src/constants/plan/catalogues/universal.ts`):
label "Confirm the primary steward and any co-stewards for this project", feeds
"Act: Task assignment & notifications". Because `s1-vision` is already a Tier-0
objective, the item already renders in the workbench -- but with no bespoke body,
so it falls through to the generic `hasFields`/textarea fallback. The operator
supplied `olos_stewards_decision_surface.html`: a read-only primary-steward card
(the current account user), three role-explanation cards, a project-team list,
and a queued-invite form.

This is the **final** and **leanest** of the three Phase C Part 3 surfaces. Unlike
Boundaries and Stakeholders -- which were whole objectives requiring predicate
widening -- Stewards is a single optional item inside an already-Tier-0 objective.
That removes three categories of change the prior two needed.

## Decision

Give `s1-vision-steward` a bespoke right-panel `StewardCapture`, mirroring
`BoundaryCapture` (controlled-over-`FormValue` with pure decode/validate/summarise
helpers). New code is additive; **no deletion** ([[feedback-no-deletion]]).

### 1. Mirror BoundaryCapture (controlled-over-FormValue) -- NOT a store-direct capture

Unlike Stakeholders (Option A store-direct, because its state was a project-level
shared register), a single optional item's invites fit per-item `FormValue`.
Contract `StewardCapture({ itemId, value, onChange, resolveOptions })` is
byte-identical to `BoundaryCapture`; `resolveOptions` is accepted for parity but
UNUSED (role metadata is the component-local `STEWARD_ROLES` constant, not flat
option strings). `emit = (next) => onChange(encodeSteward(next))` on every
interaction. **Rationale:** the per-item-FormValue contract is the simplest thing
that works here; reaching for a store (the Stakeholders departure) would be
unjustified for one item's invite list.

### 2. Parallel-array encoding; real ProjectRole values; invalid-role drop on decode

Queued invites persist in `actEvidenceStore.visionFormData['s1-vision-steward']`
as three parallel arrays `inviteNames: string[]` / `inviteEmails: string[]` /
`inviteRoles: string[]`, via the EXISTING `saveVisionFormData` + `setItemComplete`
path (same as Boundaries). `role: StewardRole = 'team_member' | 'contractor' |
'landowner'` -- the real `ProjectRole` spec values from `collaboration.schema.ts`
(mockup Co-steward -> `team_member`, Contractor -> `contractor`, Landowner /
external reviewer -> `landowner`), so the value persisted now already matches
future RBAC enforcement. Pure, auth-free, unit-tested helpers:

- `decodeSteward(value)` zips the three arrays to `Math.min` of their lengths and
  **drops any row whose role is not in the enum** -- a security-safe failure that
  never silently coerces a contractor into a co-steward; tolerates blank
  name/email positionally; missing keys -> `{ invites: [] }`.
- `isStewardValid(model)` is **always `true`** (item optional; the primary steward
  always exists; zero invites is valid; Record always enabled).
- `summariseSteward(model)`: zero -> "Primary steward confirmed"; populated ->
  "Primary steward + N invited (X co-steward, Y contractor, Z reviewer)" using
  HUMAN labels, omitting zero-count clauses.
- private `encodeSteward(model)` is the exact inverse (round-trip identity for
  valid models).

**Rationale:** parallel arrays are the existing `FormValue`-friendly encoding
(values are `string | string[]`); dropping invalid-role rows on decode keeps a
corrupt/forged persisted blob from ever presenting as a privileged role.

### 3. Primary steward card = display-only, from a stable auth selector

The primary-steward card is derived from `useAuthStore((s) => s.user)` via a
STABLE single-ref selector (returning the raw `user` ref, NOT a freshly
constructed object -- the Zustand v5 snapshot trap that bit the Stakeholders
build). Initials from `displayName`; null user -> neutral placeholder, no throw.
It is **display-only and NOT part of the persisted `FormValue`**; the auth read is
confined to the card subcomponent and the pure helpers never read auth (keeping
them unit-testable without an auth fixture). Editing the primary steward is out of
scope (set at account level).

### 4. Transient invite-form state; queue gate

The in-progress invite fields (name / email / role before "Queue invite") are
transient `useState`, NOT in the `FormValue` (mirrors StakeholderCapture's
add-form local state) -- only a *queued* invite appends to the three arrays. The
Queue button is disabled until `name.trim() !== '' && email.includes('@')`. The
`STEWARD_ROLES` local constant (`{ value, label, description, accessChips,
colorClass, hint }` per role) is the single source for BOTH the three explanation
cards AND the invite-form role selector.

### 5. Panel wiring; two-state defer label (no regression to other items)

`DecisionWorkingPanel` gains `isSteward?: boolean` and `deferLabel?: string` on
`DecisionPanelTarget`; `stewardModel = decision.isSteward ? decodeSteward(draft) :
null`; steward arms come FIRST in the body-router / validity / summary chains
(before `hasFields`/textarea); `<StewardCapture>` is keyed on `decision.itemId`.
The footer keeps the steward item **deferrable**, but when `decision.deferLabel`
is set the defer button shows it at rest ("Add team members later in settings")
and a neutral "Will add later" when toggled, via a gated `deferLabelFor(isDeferred)`
-- every OTHER item keeps both "...needs observation" strings byte-for-byte
(regression-tested). The `deferrable === false` logic (stakeholder c3) is
untouched.

### 6. Detection; no predicate / store / fieldOptions change

`ActTierZeroWorkbench.buildDecisionTarget`: `isSteward = item.id ===
's1-vision-steward'` (exact, single item); `deferLabel = 'Add team members later
in settings'` for that id; `deferrable` left undefined (steward IS deferrable;
only `s1-stakeholders-c3` is `false`). **No change** to `DecisionList.tsx`
(s1-vision passes no `modeFor`; steward needs no mode badge), `ActTierShell.tsx`
(s1-vision already in `TIER_ZERO_OBJECTIVE_IDS`), or `fieldOptions.ts`.

## Consequences

- A steward opening Tier-0 `s1-vision` and selecting "Confirm the primary
  steward..." sees a read-only primary-steward card (themselves, "You", locked),
  three role-explanation cards, a project-team list (starting at 1), and a
  queued-invite form. Queue is disabled until a name + an "@"-bearing email; a
  queued invite appends a row and grows the team count. Record is always enabled;
  recording ticks the item, advances the decision count, and persists the
  parallel-array `FormValue`; reopening rehydrates the queued invites. The defer
  button reads "Add team members later in settings".
- `s1-vision`'s other items (classify / labour / success-criteria), and
  `s1-boundaries` / `s1-stakeholders` / spatial objectives, render exactly as the
  prior phases left them.
- With Stewards shipped, all THREE Phase C Part 3 sub-projects are built on
  `feat/structured-capture-forms`.

## Deferred -- two sources of truth (deliberate, with a named reconciliation task)

The canonical home for team invites is `project.schema.ts`
`metadata.team.queuedInvites[]`, which EXISTS but requires the project-update API
to write -- the deferred RBAC/notification track. **This pass persists invites in
local `FormValue` ONLY**, by operator decision. That creates a deliberate, ADR-
recorded divergence between the local capture and `metadata.team`. **Named future
task:** reconcile local steward `FormValue` -> `metadata.team.queuedInvites[]` via
the project-update API, alongside real invite delivery/notifications and
data-layer role enforcement. The Feeds-block copy ("Role boundaries are enforced
at the data layer -- not just the interface") is aspirational display text for that
future track, flagged here so it is not read as a current guarantee. Also deferred:
editing the primary steward (account-level, display-only here); prefilling existing
`metadata.team.coStewards` into the team list (RS4: NO this pass -- local FormValue
only, primary steward from auth).

## Amanah

Team / role data capture for land stewardship. No sale, advance-purchase,
financing instrument, or CSRA/salam framing; no riba/gharar surface
([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). Clean.

## Verification

- Web `tsc --noEmit` EXIT 0 (8GB heap) after `256c851d`.
- Bounded `vitest --pool=forks --testTimeout=20000`
  ([[feedback-vitest-bounded-runs]]): **105/105** across `StewardCapture` (21),
  `DecisionWorkingPanel` (47), `ActTierZeroWorkbench` (37).
- Two-stage SDD review (spec then code-quality) PASSED per task.
- Final whole-implementation review (SW4): **READY TO MERGE** -- a background
  code-reviewer confirmed all 9 design decisions, found NO Critical/Important
  issues (one Minor: CSS accent tokens resolve to literal hex fallbacks, a
  pre-existing convention shared verbatim by the sibling
  `StakeholderCapture`/`BoundaryCapture` CSS, not a regression; plus Nits).
- Live preview smoke (SW4): **PASSED** (API brought up from down to unblock the
  SPA bootstrap; driven against project `mtc` on `s1-vision`; screenshot
  captured). Full results in the log entry ([[log/2026-06-07-atlas-tier0-stewards]]).

## Alternatives considered

- **Store-direct capture (the Stakeholders Option-A pattern):** rejected -- a
  single optional item's invite list fits per-item `FormValue`; a dedicated store
  would be unjustified ceremony.
- **Writing invites to `metadata.team.queuedInvites[]` now:** rejected this pass --
  needs the project-update API (the deferred RBAC track); operator chose local-only
  with a named reconciliation task.
- **A fresh-object auth selector (`(s) => ({ user: s.user })`):** rejected -- trips
  the Zustand v5 stable-snapshot trap; the raw single-ref selector is mandatory.
- **Tolerating unknown roles on decode (coerce to a default):** rejected -- silently
  upgrading/downgrading a role is RBAC-shaped risk; `decodeSteward` DROPS the row.
- **A `fieldType: 'steward'` driven generic renderer / fieldOptions sets:** rejected
  -- the role cards are rich UI (descriptions + access chips), not flat option
  strings; a component-local `STEWARD_ROLES` constant is the honest source.
