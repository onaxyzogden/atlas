# 2026-06-10 -- ConflictFramework Act Tier-0 workbench (ev-s1-conflict-framework) landed on main

**Objective:** Make the Act workbench for the ecovillage objective "A sound conflict resolution & community agreement framework" adopt the operator's `olos_governance_decision_dispute.html` mockup, replacing the generic form/textarea fallback with a bespoke 7-decision governance workbench routed through the Tier-0 inline shell.

## What landed (commit `3fd0e235`, 7 files, +2297)

**`ConflictFrameworkCapture.tsx`** (+1275) -- one controlled multi-mode capture (flat `FormValue`, lucide-only icons, ASCII, defensive decode that never fabricates seed data), mirroring the `ProvisionBalanceCapture` / `ForageCapture` contract. Maps c1..c7 to 7 modes: `decisionProcess` / `disputePathway` / `communityAgreements` / `exitProcess` / `dissolution` / `reviewCadence` / `signOff` (mapper `conflictFrameworkModeFor`). Each c-item is self-contained (no `siblingValues`). Exports decode/encode, `isConflictFrameworkValid`, `summariseConflictFramework`.

- **c3 communityAgreements** preserves the verbatim Islamic provision: "Halal food standards observed in communal kitchen -- applies to all communal food preparation" ([[feedback-csa-in-catalogues]] same no-silent-omit discipline).
- **c7 signOff is a hard gate**: the mockup's **4 static founding households** (Sarah Mitchell / Marcus Delacroix / Aroha & James Ngai / Elif Yildiz & family) must each be "Signed" OR "Signed with reservations" before land work unlocks. Reservations are recorded but non-blocking (operator decision 2026-06-09). `cfSignatures` serialized as `householdId::status`.

**`.module.css`** (+471) -- app tokens, not mockup hex (amber->`--color-stage-act`, green->`--color-success`, info->`--color-info`, warn->`--color-warning`/`--color-error`); `color-mix` tints.

**Wiring** (5 edits): `ActTierShell` TIER_ZERO_OBJECTIVE_IDS; `ActTierZeroWorkbench` `isConflictFramework` flag; `workbenchAffordances` MAP entry (`showGroups:true` + `modeFor`); `DecisionList` 7 MODE_LABELS badges. Test file +518 (32 cases, all green).

## Rebase reconciliation note

The `DecisionWorkingPanel.tsx` body-router arm (import + resolved mode + validity/gate/summary/body arms, 24 conflict refs) was authored this work but **folded into the foreign labour commit `23a2e8c2`** ("refactor(labour): eliminate hours/seasonal ambiguity") by an out-of-band rebase ([[project-branch-rebase]], [[feedback-commit-immediately-on-rebased-branches]]) -- it was already committed by the time the rest was staged, so it is NOT in `3fd0e235`. The remaining 7 files were staged by explicit path; foreign WIP (`ActTierObjectiveRail.tsx`, `universal.ts`, `.claude/launch.json`, untracked wiki log) left untouched ([[feedback-no-deletion]]).

## Verification

- `apps/web` tsc clean; `packages/shared` tsc clean.
- Bounded vitest (`--pool=forks --no-file-parallelism --testTimeout=20000`): 81/81 green -- ConflictFrameworkCapture (32) + DecisionList (23) + workbenchAffordances (9) + actToolCoverage (17).
- **Live preview** (port 5200, ecovillage project "kawartha lakes" `0d5dd16c`, dev strata unlock): 3-pane Tier-0 workbench (not map canvas); center list shows 3 group headers + all 7 mode badges + "0/7 decisions made" + completion gate; c1 body on load; c3 verbatim halal string present; c7 -- "Record this decision" **disabled at 0/4 signed**, **flips enabled** with `pass`-tone gate box ("4/4 households signed ... Land work may now begin.") once all 4 sign. Screenshot tool hung (known transient, no console errors); fell back to structured DOM-probe proof per project CLAUDE.md ([[project-screenshot-hang]]).

**Amanah:** community-governance / conflict-resolution / member-exit / dissolution framework -- halal. No sale/advance-purchase/financing/CSRA/salam surface. The one Islamic provision (halal communal kitchen) preserved verbatim.

## Deferred (not this session)

Bind c7 sign-off to the project's **real member roster**, replacing the 4 static mockup households. (Prototype-faithful static roster shipped per operator decision.)

Entity [[entities/act-tier-shell]].
