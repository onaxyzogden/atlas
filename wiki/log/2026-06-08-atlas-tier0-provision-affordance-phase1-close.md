# 2026-06-08 -- Tier-0 capture adoption: ProvisionBalance (Group 3) + Phase-1 close + Phase-2 affordance descriptor

**Branch.** `main` (the `feat/structured-capture-forms` feature line was merged into
`main` out-of-band -- merge `763415ee`, render fix `9b92fa3a`; `main` is now
canonical, the feature branch is an ancestor). Continued Phase 3-prep work here;
**nothing pushed** ([[project-structured-capture-on-main]], [[project-branch-rebase]]).

Three threads in this session, all in the OLOS-UI mockup-adoption plan
(third-column `DecisionWorkingPanel` captures):

## 1. EvProvisionBalanceCapture -- SP1 Group 3 (`ev-s1-provision-balance`, 6 modes)

Built the bespoke 6-mode communal/private provision capture from the canonical
mockup `olos_communal_private_provision.html`, cloning the
`EvLegalGovernanceCapture` multi-mode pattern: one `provisionBalanceModeFor(itemId)`
mapper + one self-routing component rendering one mode body (c1 `matrix` /
c2 `food` / c3 `financial` / c4 `entitlement` / c5 `tension` / c6 `ratify`); one
`isProvisionBalance` flag + one `DecisionWorkingPanel` arm. Per-mode JSON-in-FormValue
encoding; `decode` TOTAL/defensive (per-entry try/catch, never fabricates seeds);
`encode` lossless inverse, exported; stable member ids via `makeMemberId()` in event
handlers only. Two deliberate per-item simplifications (a per-item capture cannot
read siblings): c5 tension = FIXED verbatim scaffold whose resolutions persist (the
mockup auto-derives from c1/c2/c3); c6 ratify = starts EMPTY with "Add founding
member" (the mockup seeds demo members). `ev-s1-provision-balance` added to
`TIER_ZERO_OBJECTIVE_IDS`. **Amanah:** the c3 financial mode renders the verbatim
2026-05-29-authorised scope-note ("...communal cost-sharing models among members who
collectively own the asset -- not advance sale of future yield...") -- musharaka-like
co-ownership, no riba / no `bay' ma laysa 'indak` / CSRA / salam
([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). Commits `181f7396`
-> `e7eed111` -> `53243580` (drop dead mode param) -> `ad6dce78` (MOCKUP_REGISTRY
triage). ADR [[decisions/2026-06-08-atlas-ev-provision-balance-capture]].

## 2. Phase-1 close -- existing-capture fidelity fixes + final holistic review

Closed the remaining S1 fidelity gaps before the Phase-1 capstone: VisionClassify
fidelity vs source mockup (`6d38f883`; renamed the suggestions header to "Add from
suggestions"), LabourInventory per-season direction arrow + thin season bar
(`084a41d9`), Steward collapsible invite-form accordion (`951c5cb0`),
BoundaryCaptureLegacy mapEntry-vs-map contrast assertion (`bc982bc9`),
SuccessCriteria row placeholder + opts-divider fidelity (`30328fce`), PurposeCapture
dropped-clause restore (`2451000b`). Caught + fixed a regression the per-capture runs
missed -- the VisionClassify re-skin had broken TWO stale `DecisionWorkingPanel`
assertions ("Suggested vision elements" at lines 469 + 954); both updated to "Add
from suggestions" (`b5a82ffa`); 55/55 in-file, full 591/591 suite green after.
**MOCKUP_REGISTRY triage resolved** (`ad6dce78`): `olos_communal_private_provision.html`
= canonical S1 source; `olos_communal_provision.html` = superseded variant;
`olos_financial_contribution_model.html` = Tier-6 `ev-s4-financial-model`, deferred to
Phase 3f (Amanah screen at kickoff); counts updated (Phase 1 = 15, Phase 3+ = 26).
**Final Phase-1 holistic review: APPROVED.**

## 3. Phase 2 -- data-driven workbench affordance descriptor (`0e7b2d37`)

New `workbenchAffordances.ts` lifts the three hard-coded `is<X>Objective` checks in
`ActTierZeroWorkbench` into a static descriptor table
(`WorkbenchObjectiveAffordances` = mapStrips / registerStrip / showGroups / modeFor;
`workbenchAffordancesFor(objectiveId)`; frozen `EMPTY_AFFORDANCES` for any id without
an entry -> generic 2-pane workbench, never throws). Strings transcribed verbatim ->
**byte-identical DOM** for the 3 existing objectives. Operator scope decision
("Mechanism only, ids in Phase 3"): keep the live routed set at the 5 S1 ids, prove
S2-routability with a test fixture, each Phase-3 sub-phase adds its id alongside its
capture. New `workbenchAffordances.test.ts` (9 unit, happy-dom) + an
`ActTierZeroWorkbench` render test for an arbitrary S2 objective
(`s2-fake-carrying-capacity`) mounting strips-free; existing strip tests unchanged.
web `tsc` EXIT 0; bounded vitest green. ADR
[[decisions/2026-06-08-atlas-workbench-affordance-descriptor]].

## Next

Phase 3a (Land reading / S2): `TerrainCapture` (`s2-terrain` -- confirmed real,
5 items c1..c5 / 3 decision groups in `universal.ts`), then climate / ecology /
landscape-context. Each via subagent-driven-development, adding one
`workbenchAffordancesFor` entry + capture + arm + `buildDecisionTarget` flag + the
objective id. Remaining sub-phases 3b-3f per MOCKUP_REGISTRY (26 captures total);
3f finance (`ev-s4-financial-model`) Amanah-screened at kickoff.

ASCII-only; bounded `--pool=forks` runs ([[feedback-vitest-bounded-runs]]); not
pushed. ADRs [[decisions/2026-06-08-atlas-ev-provision-balance-capture]] +
[[decisions/2026-06-08-atlas-workbench-affordance-descriptor]]; entity
[[entities/act-tier-shell]].
