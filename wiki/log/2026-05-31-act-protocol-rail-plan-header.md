# 2026-05-31 -- Act left-rail Objectives/Protocols toggle + Plan header project-type label

**Branch:** `feat/atlas-permaculture`
**Commits:** `2f665b74` (Phase 1 — Plan header) · `15d797c1` (Phase 2 — Act rail)
**Status:** Shipped; not pushed (branch 28+ ahead of origin).

---

## What was built

Two surface follow-ons requested while the steward had `PlanStratumShell`
selected in the live OLOS spine.

### Phase 1 — Plan header project-type label (commit `2f665b74`)

Three files: new pure helper `planHeaderLabel.ts`, edit to
`PlanStratumShell.tsx`, new unit test `planHeaderLabel.test.ts`.

`planHeaderProjectTypeLabel(primaryTypeId, secondaryCount)` maps the type id
to a human label via `findProjectType()?.label` and appends ` · +N` when
secondaries exist. Renders as a small secondary-text eyebrow in the
`PlanStratumShell` left-rail header, after the existing blurb, only when a
type is set. `data-testid="plan-header-project-type"`.

Logic was extracted into a pure helper (not inlined in the component) so it
could be unit-tested without a full router+store harness.

4/4 tests pass. web tsc exit 0.

**Verification caveat:** no live project has `metadata.projectTypeRecord`
populated (all carry only the legacy flat `projectType`). The
absent-when-null branch was confirmed live; the populated-render is
unit-proven only. Dev-data limitation, not a code defect.

### Phase 2 — Act left-rail Objectives/Protocols toggle + attention badge (commit `15d797c1`)

Six files: new `ActRailModeToggle.tsx`, edited `ActTierObjectiveRail.tsx`,
`ActTierShell.module.css`, `ActTierShell.tsx`, and two new test files.

`ActRailModeToggle` is a two-segment radiogroup ("Objectives" / "Protocols")
styled with the Act shell's `--color-*` palette. When `attentionCount > 0`
an amber pill badge shows on the Protocols segment. Props:
`{ mode, onChange, attentionCount }`.

`ActTierObjectiveRail` renders the toggle at the top of `.railPanel`. In
`mode === 'protocols'` it mounts `ProtocolLayerPanel` (from `plan/strata/`,
reused not forked) in a `flex:1; min-height:0` wrapper. In
`mode === 'objectives'` the existing header + objective list are unchanged.

`ActTierShell` adds `useState<RailMode>('objectives')`, derives
`primaryTypeId`/`secondaryTypeIds` from `project.metadata?.projectTypeRecord`
(same pattern as Plan), and passes all new props to `<ActTierObjectiveRail>`.
`triggeredCount` (from `useTriggeredProtocols(id).length`) feeds the badge.

New CSS: `.railModeBar`, `.railToggle`, `.railToggleBtn`, `.railToggleBadge`,
`.railProtocolBody`.

5/5 ActRailModeToggle tests + 2/2 ActTierObjectiveRail tests pass.
31/31 tier-shell tests total. web tsc exit 0.

---

## Verification

- **Act DOM (live):** `/v3/project/mtc/act/tier-shell` — toggle renders,
  Objectives active by default, no badge (no triggered protocols); clicking
  Protocols mounts `ProtocolLayerPanel` (empty state, correct for MTC);
  clicking Objectives restores objective cards. Round-trip confirmed.
- **Plan DOM:** absent-when-null confirmed live.
- `preview_screenshot` unavailable (hangs); verified via DOM exercise.
- Foreign WIP excluded from both commits (`git status` checked before each).
- Branch 0 behind `origin/feat/atlas-permaculture` before each commit.

---

## Deferred

- Cycle number in Plan header (steward deferred explicitly).
- Per-objective-card protocol indicator (requires `objectiveId` linkage on
  protocol records/templates).
- Persisting Act rail mode to URL/store.

---

CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only copy.
ADR: [[decisions/2026-05-31-atlas-act-protocol-rail-plan-header]].
Entity: [[entities/act-tier-shell]].
