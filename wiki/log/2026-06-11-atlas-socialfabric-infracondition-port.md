# 2026-06-11 — Port SocialFabric + InfraCondition captures to main

**Session objective:** Port SocialFabricCapture (ev-s2-social-fabric) and
InfraConditionCapture (ev-s3-infra-condition) from the phase-3d line onto main.

## Correction of record — source branch

The operator's brief said "port from `claude/phase-3d`". The interactive-recipe
versions are NOT on `claude/phase-3d` — they live on
**`claude/phase-3d-amanah-ports`** (merge-base with main `335f7b5e`):

- `ad7f0168` — SocialFabricCapture (6 modes, `sf-` namespace)
- `97ad011d` — SF test fix (tally-strip assertion scoping; its test-file version used)
- `d5bf8d36` — InfraConditionCapture (5 modes, `ic-` namespace)

## What landed (4 commits on main, unpushed)

1. `0739bbd1` — SocialFabricCapture port. Component/CSS/test copied verbatim;
   6 shared wiring sites hand-wired against main's ExitSuccession/
   AdaptiveManagement template (NOT a cherry-pick — the branch hunks anchor to
   FoodSystem arms absent on main). ActTierShell TIER_ZERO_OBJECTIVE_IDS got
   BOTH ids here (one selective-stage dance; the file is foreign-dirty WIP).
2. `cbcb5bef` — InfraConditionCapture port. Same recipe; the IC hunks anchor
   to the just-ported SF arms so they applied nearly verbatim.
3. `0e7dc155` — rider: 5 missing `es-*` MODE_LABELS in DecisionList
   (ExitSuccession badges were rendering raw keys like "es-exitProcess" via
   the `?? rawMode` fallback). Found during orientation, surfaced in the
   approved plan.
4. (this docs commit)

## Wiring recipe (per capture)

ActTierShell TIER_ZERO_OBJECTIVE_IDS / ActTierZeroWorkbench buildDecisionTarget
flag + return / DecisionList MODE_LABELS / DecisionWorkingPanel (import,
DecisionPanelTarget flag, mode resolver, validity arm, summary arm, body arm) /
workbenchAffordances MAP entry (namespaced modeFor) / ComponentsDebugPage
gallery Sections — plus additive describe blocks in ActTierZeroWorkbench.test
and workbenchAffordances.test. SF's negative detection test was adapted to use
ev-s1-provision-balance-c1 (the branch's used FoodSystem, which is not on main).

## Status / semantics

- Both captures are **gallery-only**: ev-s2/ev-s3 do not resolve in the active
  Homestead+Silvopasture slice; they mount via ComponentsDebugPage + tests.
- Pure-advisory FormValue components: no projectId, no store writes; seeded
  from verbatim mockup defaults (decode-SEEDS pattern, correct for build-ahead
  ev-* objectives). Genuine record gates: SF `priorattempts`, IC `reuse` only.
- Amanah review PASS: no sale/contribution surface. SF's Muslim-faith cohesion
  seed copy and IC's friable-asbestos OH&S note kept verbatim.

## Explicitly NOT ported

- `4b224060` WasteCycling, `796b5e8b` s4-zones — not requested
- `c0a6c1d0`/`b58fb5f8` s1-vision badges — DROPPED (main's `91f52d3f` wins)
- `1c7dfa84` FoodSystem Amanah-strip — FoodSystem isn't on main
- `0bc65d62`/`13880b22` narrative-recipe versions — superseded, never port

## Verification

- Web `tsc --noEmit` clean after each port phase.
- Bounded vitest (`--pool=forks`): SocialFabricCapture, InfraConditionCapture
  (31), workbenchAffordances, DecisionList suites fully green;
  ActTierZeroWorkbench 41/42.
- **Known pre-existing red** (NOT the port): ActTierZeroWorkbench's stale
  no-mode-badge assertion (`queryByTestId(/^mode-badge-/)` expects null) now
  matches main's own `vs-*` s1-vision badges from `91f52d3f`. Proven to
  reproduce at HEAD with all port wiring reverted to HEAD copies. Left as-is —
  the surrounding suite is foreign live-WIP territory this session.
- Foreign WIP verified byte-identical after each commit (ActTierShell's
  `keepAbovePrefix` hunk intact, unstaged). Foreign WIP grew live during the
  session (projectStore, ActTierObjectiveRail, ActTierSpine, ObjectiveDetailPanel,
  5 catalogue files, plan/tier-shell/ untracked dir) — none touched.
