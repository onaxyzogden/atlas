# ADR: Data-driven workbench affordance descriptor (Phase 2 -- S2-S7 routing mechanism)

**Date:** 2026-06-08
**Status:** accepted

**Context:**
The OLOS-UI mockup-adoption plan (Phase 1 = the ~17 S1 captures, now closed) calls
for S2-S7 objectives to mount the same Tier-0 2-pane workbench in later phases.
The blocker was that `ActTierZeroWorkbench.tsx` hard-coded three
`is<X>Objective` id checks (`isBoundaryObjective` / `isStakeholderObjective` /
`isLegalGovernanceObjective`) that drove everything rendered above/around the left
`DecisionList`: map-activation strips, the live stakeholder register strip, the
decision-group dividers (`showGroups`), and the center-list `modeFor` badge
mapper. Adding any new objective meant editing the component body. Phase 2's job
is to make routing **generic** so Phase 3 only builds captures.

**Operator scope decision (AskUserQuestion -- "Mechanism only, ids in Phase 3"):**
build the generalisation mechanism now, but keep the live routed set at the
current 5 S1 ids -- do NOT pre-register any S2-S7 id. Prove S2-routability with a
test fixture instead. Each Phase-3 sub-phase then adds its objective id alongside
its capture, so no objective ever regresses to an empty/broken panel.

**Decision:**
1. **New descriptor module `workbenchAffordances.ts`.** Exports
   `WorkbenchObjectiveAffordances { mapStrips: MapStripSpec[]; registerStrip:
   RegisterStripSpec | null; showGroups: boolean; modeFor: ((itemId) => string |
   null) | null }`, the specs (`MapStripSpec`, `RegisterStripSpec` with a
   `registerKind: 'stakeholder'` discriminant for the live-count source), a
   module-private `MAP` of the 3 existing entries, and
   `workbenchAffordancesFor(objectiveId)`.
2. **Strings transcribed VERBATIM from the prior inline JSX** so the rendered DOM
   is **byte-identical** for `s1-boundaries` / `s1-stakeholders` /
   `ev-s1-legal-governance`. Each `modeFor` keeps its prefix guard (e.g.
   `itemId.startsWith('s1-boundaries-') ? boundaryModeFor(itemId) : null`),
   importing the existing mappers from `BoundaryCaptureLegacy` /
   `StakeholderCapture` / `EvLegalGovernanceCapture`.
3. **"Any id routes safely" guarantee.** Any objective id WITHOUT a `MAP` entry
   returns a single frozen `EMPTY_AFFORDANCES = Object.freeze({mapStrips:[],
   registerStrip:null, showGroups:false, modeFor:null})` -- a stable shared
   reference, so an arbitrary S2-S7 objective mounts the generic 2-pane workbench
   with zero special-casing and never throws.
4. **Component consumes the descriptor.** `ActTierZeroWorkbench` deletes the 3
   booleans and reads `const affordances = workbenchAffordancesFor(activeObjective.id)`;
   strips render via `affordances.mapStrips.map(...)` + `affordances.registerStrip
   ? (...) : null`; `registerCount = affordances.registerStrip?.registerKind ===
   'stakeholder' ? stakeholderCount : 0`; `DecisionList` gets
   `showGroups={affordances.showGroups}` + `modeFor={affordances.modeFor ??
   undefined}`. The unconditional `useStakeholderRegisterStore` hook +
   `stakeholderCount` useMemo (above the early return -- load-bearing per the
   Zustand v5 stable-snapshot rule) are UNTOUCHED.

**Scope held (deliberately NOT done this phase):**
- The live routed set stays the 5 S1 ids; no S2-S7 id pre-registered.
- The concept rename `TIER_ZERO_OBJECTIVE_IDS` -> "workbench-routed" is deferred as
  cosmetic.

**Verified:** web `tsc` EXIT 0 (8GB heap); bounded `--pool=forks --testTimeout=15000`
([[feedback-vitest-bounded-runs]]) green -- new `workbenchAffordances.test.ts` (9
pure-unit tests; `@vitest-environment happy-dom` because the mapper imports
transitively load the stakeholder persist store) + a new `ActTierZeroWorkbench`
render test proving an arbitrary S2 objective (`s2-fake-carrying-capacity`,
2-item checklist) mounts the 2-pane workbench with NO strips/badges; existing
strip-assertion tests pass unchanged (byte-identical DOM). Reviewed at controller
level as a byte-identical DOM transformation (~100-line mechanical refactor).
Single commit `0e7b2d37` ("refactor(act-tier0): data-driven workbench affordance
descriptor (Phase 2.1)") on `main`; not pushed.

**Branch note:** the entire Phase 1 + Phase 2 delta was **merged into `main`
out-of-band** (merge `763415ee`, render fix `9b92fa3a`); `main` is now the
canonical working line and `feat/structured-capture-forms` is an ancestor of it.
Phase 3 continues on `main`; push nothing without an explicit ask
([[project-structured-capture-on-main]], [[project-branch-rebase]]).

**Consequences:**
- Phase 3 (S2-S7 capture ports, sub-phases 3a-3f) is now purely additive per
  objective: one `workbenchAffordancesFor` entry + one capture + one
  `DecisionWorkingPanel` arm + one `buildDecisionTarget` flag + the objective id in
  `TIER_ZERO_OBJECTIVE_IDS`.
- 3a (Land reading / S2) is buildable: `s2-terrain` confirmed real in
  `universal.ts` (5 checklist items c1..c5, 3 decision groups).

**Amanah:** routing/affordance mechanism only -- no sale/advance-purchase/financing
instrument, no CSRA/salam framing ([[fiqh-csra-erased-2026-05-04]]).

Log: [[log/2026-06-08-atlas-tier0-provision-affordance-phase1-close]]; entity
[[entities/act-tier-shell]].
