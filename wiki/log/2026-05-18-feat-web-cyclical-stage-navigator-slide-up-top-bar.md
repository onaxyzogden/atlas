# 2026-05-18 — feat(web): cyclical stage navigator + slide-up top bar


Two stage-navigation IA changes. (1) Header stage navigator made a
**cyclical 3-stage carousel**: `LevelNavigatorContext` `goPrev`/`goNext`
and the context `prev`/`next` values switched from linear
`levels[activeIdx ± 1]` (bail-out at array ends) to modulo wrap
`(activeIdx ± 1 + n) % n` with an `n === 0` guard — both header side
controls are now always present/active, no dead-ends. (2) `report`
removed from `V3LevelNavBridge` `LEVELS` so the cycle is exactly
`[observe, plan, act]`; `/report` route + `parseV3Route` /
`handleLevelChange` report branches untouched (Report absorption into a
module/sidebar is separate future work). Confirmed with user via
AskUserQuestion: true cyclical wrap (prev(observe)=act), 3-stage scope.
(3) ACT + OBSERVE slide-up sheets now render the module bar pinned at top
(`topBar` slot) like PLAN; OBSERVE's bespoke `ModuleSlideUp` got the prop
+ `.topBar` CSS added manually. New test
`LevelNavigatorCyclical.test.tsx` (3 cases) — pass. Verified: `npm run
typecheck` clean for changed files (only 2 pre-existing unrelated
`Paddock` errors in `useFlowEndpointOptions.test.ts` remain); runtime
preview (server web-a1, project run6) — `/act`→`PLAN|Act|OBSERVE`,
`/observe`→`ACT|Observe|PLAN`, `/plan`→`OBSERVE|Plan|ACT`, no "Report",
console clean of new errors. Pre-existing `validateDOMNesting`
button-in-button in `ObserveModuleBar` now doubled (bar mounts as
bottomTray + topBar) — flagged as separate out-of-scope cleanup task.
