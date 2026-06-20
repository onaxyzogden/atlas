# 2026-06-19 -- Threshold 3 switcher row made clickable (operator reversal)

**Objective:** In the Plan-stage rail-header stratum switcher (`ActTierStratumSwitcher`), make the **Threshold 3 -- Act Mandate** row a clickable button like T1/T2 instead of a decorative `role="separator"`. Operator request: "this should be a button that functions like the other two thresholds."

**ADR:** [[decisions/2026-06-19-atlas-threshold3-act-mandate]] (amended -- the rejected "make T3 clickable" alternative is now adopted).
**Entity:** [[entities/plan-tier-shell]] -- [[entities/act-tier-shell]] byte-identical.

## What changed

Same-day reversal of Stage-4's DECOUPLE decision ([[log/2026-06-19-atlas-threshold3-act-mandate]]). That stage deliberately kept T3 decorative by *excluding* it from `REACHABLE_THRESHOLD_IDS` (the switcher-clickable set) while *including* it in `ROUTABLE_THRESHOLD_IDS` (the route-guard reach set) -- so the surface was reachable by deep-link + the s7 `ActMandateEntryCue` CTA, but the switcher row stayed an idle divider. The operator chose to make it clickable (AskUserQuestion -> "Make it clickable (navigate)"), having confirmed clicking only **navigates** to the surface and does **not** arm the project-wide `planReadOnly` lock.

The mechanism is a single-constant edit -- everything downstream already existed:
- **`declarationModel.ts`** -- added `threshold-3` to `REACHABLE_THRESHOLD_IDS` (now `['threshold-1','threshold-2','threshold-3']`). `PlanTierShell` passes `clickableThresholdIds={[...REACHABLE_THRESHOLD_IDS]}`, so the shared switcher renders T3 as a button with no shell change. Decoupling comment rewritten: the two sets are now **coextensive but kept distinct** (switcher clickability vs route-guard reach); clickability != arming.
- **`ROUTABLE_THRESHOLD_IDS` / `isThresholdReachable` unchanged.** `PlanTierShell` already routes `threshold-3`, already passes `onSelectThreshold` (-> `navigate` to `plan/threshold/threshold-3`) + `thresholdActiveId`, and `thresholdActive = !!params.thresholdId` already lights the collapsed header + active button on the T3 route.
- **Comment-only refreshes** (no behavior change) in `ActMandateEntryCue.tsx`, `actMandateModel.ts`, `PlanTierShell.tsx` -- stale "T3 divider stays decorative / not spine-clickable" prose replaced with "one of several navigate-only entry paths; the one-way crossing is entered via the surface's own Begin-Act CTA."
- **Tests** flipped: `declarationModel.test.ts` (now asserts `REACHABLE` *contains* `threshold-3`); `ActTierStratumSwitcher.test.tsx` (T3 row now a BUTTON, clicking it calls `onSelectThreshold('threshold-3')`). The Act-usage case (threshold props omitted -> no T3 row) left unchanged.

**Act unaffected** -- it omits the threshold props entirely, so no checkpoint rows render either way.

## Verification

- `@ogden/web`: tsc 6-err foreign baseline (`syncServiceWorkItemsFallback:119`, `WorkConflictSection:119/120/134`, `useDimensionDrawTool.commit.test:116/118`), **0 new**.
- Bounded vitest 52/52 across 5 suites (declarationModel, ActTierStratumSwitcher, ActMandateEntryCue, ActMandateSurface, ActTierSpine).
- No visual pass (preview hangs on v3 map mounts -- [[project-screenshot-hang]]); DOM/unit is the signal.

## Amanah

Navigation/display chrome only -- the clickable row navigates, it does not arm the lock; the Begin-Act `planReadOnly` crossing stays gated behind the surface's own CTA, untouched. **Clear.** No CSA/CSRA/salam surface ([[fiqh-csra-erased-2026-05-04]]).

## Commit

**`8f82dc0a`** on `main` (6 files, +70/-59), NOT pushed (operator-authorized push only), atop the unpushed T3 build backlog.
