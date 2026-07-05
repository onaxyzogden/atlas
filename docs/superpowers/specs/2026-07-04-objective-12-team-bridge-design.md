# Objective 1.2 — bridge the wizard team into the Canonical Team Object

**Date:** 2026-07-04
**Area:** OLOS / atlas — Act Tier-Zero (Stratum-1 Declaration) workbench, objective `s1-steward` (display "1.2")
**Status:** Design approved (pending written-spec review)

---

## Problem

Opening objective **1.2 "Canonical Team Object — Constitute the steward team"** shows a
`TeamRegistryPanel` reference block with everything empty: **Team Registry "0 of 0
constituted"**, **Labour Availability "0 hr/wk declared"**, and **"Intent Object not yet
declared."** The operator's read: *nothing upstream captured the information this objective
needs.*

Investigation (read-only) found the upstream capture point **does exist** but is not wired to
the panel:

| Panel row | Captured today | Reaches the panel? |
|---|---|---|
| **Intent Object** | Objective **1.1** (`s1-vision`) → `visionStore.sharedVision` | Yes once 1.1 is done — but no provenance/prompt when empty |
| **Team Registry** (roster) | Creation **wizard Step 3** "Who else works on this land?" writes `primarySteward` + `coStewards` + `queuedInvites` to `project.metadata.team` (`WizardStep3Team.tsx:157`); objective 1.2 `c1` writes account-backed members to `memberStore` + `visionStore.stewardProfiles` | **No** — `selectTeamRoster` reads only `memberStore`/`stewardProfiles`; the wizard's people live in `metadata.team` and never join |
| **Labour Availability** | Objective 1.2 `c5` only (`LabourInventoryCapture`) | Yes (in-place) — genuinely first captured here; no upstream home exists or is warranted |

The real defect is a **data-drop between the creation wizard and objective 1.2**: the primary
steward (and queued invites) named at setup are saved to `metadata.team`, but 1.2's roster
cannot see them, so it shows "0 of 0" even though people were named. `metadata.team` is already
the canonical home for this data — `reconcileStewardInvites` (`projectStore.ts:881`) *writes*
into `metadata.team.queuedInvites`; nothing merely *reads* it back into the roster view.

## Goals

1. Objective 1.2 opens **pre-seeded** with the people named at project setup, shown as
   provisional "Awaiting role" rows, so the count reads e.g. **"0 of 3 constituted"** instead of
   "0 of 0" — cueing the exact next action (assign operational roles in `c2`).
2. Every empty state is **self-describing with a live jump** to where its data is recorded
   (objective 1.1 for intent; items `c1`/`c2`/`c5` below for roster/roles/labour).

## Non-goals

- **No new objective or upstream "constitute the team" step.** Stratum 1 is the first stratum;
  team constitution is foundational Stratum-1 work and has no natural earlier home. (Rejected
  approach B.)
- **No store writes / no materialization / no migration.** The bridge is a pure display-merge;
  the account-backed capture (`c1`/`c2`) stays the single source of truth for real members.
- **No change to labour or intent capture location** — only their empty-state presentation.
- Sending queued invites (Phase 6) is untouched.

---

## Design

### 1. Data bridge — provisional rows in the pure adapter

`selectTeamRoster` (`apps/web/src/v3/act/tier-shell/selectTeamRoster.ts`) stays a pure,
React-free, fixture-testable adapter. Extend it to accept the project's `metadata.team` as an
additional input and synthesize **provisional** `TeamMemberRow`s from it.

**Input shape** (existing `metadata.team`, per `WizardStep3Team.tsx` + `reconcileStewardInvites`
+ the homestead sample at `projectStore.ts:1442`):

```ts
team?: {
  primarySteward?: { name?: string; email?: string };
  coStewards?: Array<{ name?: string; email?: string }>;
  queuedInvites?: Array<{ name?: string; email: string; role: string; queuedAt: string }>;
}
```

**Synthesis rules:**
- Build provisional entries in order: `primarySteward` (if a name or email is present), then each
  `coSteward`, then each `queuedInvite`.
- Each provisional row: `provisional: true`, synthetic `userId` `provisional:<normalizedEmail>`
  (or `provisional:name:<normalizedName>` when there is no email), `name` from the entry's name
  else the email local-part else `"Steward"`, `initials` derived as today, `roleLabel:
  "Awaiting role"`, `complete: false`, `operationalRoleLabels: []`.
- **De-dupe by normalized email** (lowercased, trimmed):
  - Drop any provisional whose email matches an **account-backed** member's email (the real member
    wins — so once someone is captured in `c1`/`c2`, their provisional twin disappears).
  - Drop provisional-vs-provisional duplicates (same email appearing in both `coStewards` and
    `queuedInvites`).
  - Entries with no email never de-dupe against account members (acceptable edge — they always show).
- **Counts:** `rosterSize` includes provisional rows; `constitutedCount` excludes them (they carry
  no operational role, so `complete` is `false` — the existing constitution rule already handles
  this). Result: "0 of 3 constituted".
- **Labour and intent are unaffected** — provisional people pledge no hours (no labour bar) and do
  not touch `sharedVision`.

**Signature.** Add the team meta as a new optional parameter defaulting to `undefined`, so every
existing plain-fixture test stays byte-identical:

```ts
selectTeamRoster(entries, sharedVision, roleLabelMap = {}, teamMeta?)
```

**Type change:** `TeamMemberRow` gains `provisional?: boolean` (absent/false for account-backed
rows — no change to existing consumers).

### 2. Panel — muted provisional rows + self-describing empty states

`TeamRegistryPanel.tsx` reads `project.metadata.team` (via `useProjectStore`) and passes it to
`selectTeamRoster`. Presentation:

- **Provisional rows** render muted/dashed with an **"Awaiting role"** label, visually distinct
  from constituted members. (User-chosen style: muted + "Awaiting role", *not* the invite app-role
  — to avoid confusing an app role with an operational role.)
- **Empty-state copy with live jumps** (replacing bare zeros):
  - **Intent Object** empty → "Declared in Objective 1.1 · Vision & Intent" as a **live link** →
    navigates to `s1-vision`. (Present → unchanged.)
  - **Team Registry** genuinely empty (no members, no `metadata.team`) → "No team named yet — add
    stewards below" → jumps to item `s1-steward-c1`.
  - **Team Registry** with provisional rows → "Named at setup · assign roles to constitute" →
    jumps to item `s1-steward-c2`.
  - **Labour** empty → "No labour pledged yet — record weekly hours below" → jumps to
    `s1-steward-c5`.

### 3. Live-jump wiring

`TeamRegistryPanel` gains two callback props:
- `onNavigateObjective(objectiveId: string)` — wired in `ActTierZeroWorkbench` to the existing
  `onSelectObjective` prop (the same seam the Reception path uses at `ActTierZeroWorkbench.tsx:765`)
  plus closing the current popup (`setSelectedItemId(null)`). Used for "complete 1.1".
- `onSelectItem(itemId: string)` — wired to the local `setSelectedItemId`, which swaps the
  `DecisionWorkingPanel` below to the target capture within the same popup. Used for the `c1`/`c2`/`c5`
  jumps.

Plan-time verification: confirm `onSelectObjective` is actually passed to `ActTierZeroWorkbench`
in the Declaration mount (it is a component prop; used today only from the Reception return). If it
is not wired for Declaration, wire it or degrade the intent link to a static label for that mount.

---

## Components & files touched

- `apps/web/src/v3/act/tier-shell/selectTeamRoster.ts` — provisional synthesis + `TeamMemberRow.provisional` (pure; **TDD RED first**).
- `apps/web/src/v3/act/tier-shell/TeamRegistryPanel.tsx` — read `metadata.team`, render provisional rows + empty-state copy + jump affordances; new callback props.
- `apps/web/src/v3/act/tier-shell/TeamRegistryPanel.module.css` — muted provisional-row style.
- `apps/web/src/v3/act/tier-shell/ActTierZeroWorkbench.tsx` — pass the two navigation callbacks to `TeamRegistryPanel` (verify `onSelectObjective` availability in Declaration mount).
- Tests: `selectTeamRoster.test.ts` (provisional synthesis, email de-dupe vs account members and vs siblings, counts, no-teamMeta byte-identical), `TeamRegistryPanel.test.tsx` (provisional rows render muted; empty-state copy + jump callbacks fire with the right ids).

## Testing (TDD, rigid)

Write each test RED first, watch it fail for the right reason, then minimal GREEN:
1. `selectTeamRoster`: with no `teamMeta` → identical to today (regression guard).
2. `teamMeta` with primary + 2 co-stewards, none account-backed → 3 provisional rows, `rosterSize 3`, `constitutedCount 0`, all `provisional`, `roleLabel "Awaiting role"`.
3. De-dupe: a provisional email matching an account member → provisional dropped, account row kept.
4. De-dupe: same email in `coStewards` and `queuedInvites` → one row.
5. No-email primary steward (name only) → shows, keyed by name.
6. Panel: provisional rows carry the muted style; each empty-state affordance invokes `onNavigateObjective('s1-vision')` / `onSelectItem('s1-steward-c1'|'c2'|'c5')`.

Verification: web `tsc` clean; bounded web vitest (`--pool=forks` + timeout) for the two suites plus any consumer touched.

## Amanah

Display-only bridge of the operator's own recorded team/vision data with neutral labels. No
financial instrument, no advance-sale / CSA / yield-share framing. `selectTeamRoster` already
carries this constraint (its header AMANAH note); the provisional rows add only names/emails the
operator entered themselves. Passes the Amanah Gate.

## Risks

| Risk | L | I | Mitigation |
|---|---|---|---|
| `onSelectObjective` not wired in Declaration mount | M | Low | Verify at plan time; degrade intent link to static label if absent |
| Provisional row persists after real capture (stale twin) | M | Med | Email de-dupe drops it once the account member exists; covered by test #3 |
| No-email entries can't de-dupe → duplicate display | L | Low | Rare (wizard collects emails for invites); acceptable, documented |
| New `teamMeta` param breaks existing callers | Low | Low | Optional param defaulting `undefined`; regression test #1 |

## Definition of Done

Objective 1.2 opens showing the people named in the creation wizard as muted "Awaiting role"
rows with a truthful "N of M constituted" count; every empty state names its source and jumps
live to it (objective 1.1 for intent; `c1`/`c2`/`c5` below for roster/roles/labour);
`selectTeamRoster` stays pure and byte-identical when no `teamMeta` is supplied; `tsc` clean;
bounded web vitest green. No store writes, no migration.
