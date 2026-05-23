# 2026-05-23 — Data-derived Observe progress + soft Observe→Plan gate

**Branch.** `feat/atlas-permaculture`. Commit `d33d6e15` (9 files, +817/−59).

The Observe progress segments (bottom `ObserveModuleBar` + header
`LevelNavigator` carousel) were **decorative** — both read `pillarTasks` from
`LevelNavigator` context, hardcoded in `V3LevelNavBridge.tsx` as 5 placeholder
"Phase B" tasks per module, all permanently `observe_to_do`. The steward wants
progress wired to **real activation events** to guide users through the Observe
essentials before Plan. (Plan→Act gating is a deliberate follow-up; this round
is Observe only.)

**Four locked decisions (AskUserQuestion):** (1) **soft gate + override** — Plan
shows a dismissible "N objectives left" overlay with **"Continue anyway"**;
navigation never hard-blocked; (2) **data-derived only** — each objective is a
pure predicate over persisted store data, no manual toggles; (3) **required
subset** — each module flags 1+ required objectives, Observe "complete" when all
required done, optional raise % but don't gate; (4) **Observe only**.

**Key insight that shrank the work:** the rendering hooks already existed.
`LevelNavigator` colors each sub-segment via `taskColorFn`/`columnId` (green on
`*_done`) and already accepted a `gateIndicators` diamond — it was just never
given data. `ObserveModuleBar` renders straight from `ctx.pillarTasks`. So once
real `PillarTask[]` flow in, both surfaces light up with **zero rendering
changes** (`LevelNavigator`, `LevelNavigatorContext`, `LevelNavigatorSegments`,
`ObserveModuleBar` all untouched).

**Six new + three edited files:**
- **NEW pure engine** `v3/observe/progress/objectives.ts` —
  `ObserveProgressInput` data bag, `EMPTY_OBSERVE_INPUT`,
  `OBSERVE_OBJECTIVES: Record<ObserveModule, ObserveObjective[]>`,
  `evaluateModule`/`evaluateObserve`. No React/store imports. Each `PillarTask`
  gets `columnId: done ? 'observe_done' : 'observe_to_do'`;
  `complete = requiredTotal>0 ? requiredDone===requiredTotal : true`.
- **NEW** `v3/observe/progress/__tests__/objectives.test.ts` — **8/8**
  (empty→0%/gate closed, required-met→complete, optional-alone→not complete,
  hazard-OR-sector, all-required→gate opens + `remainingRequired` empty, optional
  raises % but missing required keeps gate closed, everything→100%).
- **NEW** `v3/observe/progress/useObserveProgress.ts` — the only React/store
  layer; subscribes to **raw** fields of `projectStore`, `homesteadStore`,
  `builtEnvironmentStoreV2`, `externalForcesStore`, `topographyStore`,
  `waterSystemsStore`, `soilSampleStore`, `ecologyStore`, `zoneStore`,
  `vegetationStore`, `swotStore`, assembles the input bag in a single `useMemo`,
  calls `evaluateObserve` (selector-stability rule
  [[2026-04-26-zustand-selector-stability]] — raw subscriptions + one memo, no
  freshly-allocated arrays from selectors).
- **NEW** `store/stageGateOverrideStore.ts` — persisted
  (`ogden-atlas-stage-gate-override`, v1), per-project
  `Record<StageGate, boolean>`, `isOverridden`/`setOverride`.
- **NEW** `v3/plan/StageGateOverlay.tsx` + `.module.css` — reads
  `useObserveProgress` + override; returns null if
  `requiredComplete || overridden || !projectId`; else a scrim card listing
  `remainingRequired` labels with **Go to Observe** + **Continue anyway**.
- **EDIT** `v3/V3LevelNavBridge.tsx` — removed the placeholder tasks; calls
  `useObserveProgress(projectId)` **before** the early return (hooks rule);
  builds `pillarTasks` from `progress.byModule[mod].tasks` + a `gateIndicators`
  diamond after `swot-synthesis` (`complete`/`in-progress`/`pending`).
- **EDIT** `v3/plan/PlanLayout.tsx` — mounts `<StageGateOverlay>` inside the
  `position:relative` canvas wrapper.
- **EDIT** `v3/observe/components/ObserveReadyCue.tsx` — now ticks from
  `useObserveProgress`; enables "Ready to Plan →" exactly when `requiredComplete`.

One required objective per module (human-context boundary; built-environment
feature; macroclimate-hazards hazard-or-sector; topography contour-or-marker;
earth-water-ecology any observation; sectors-zones zone-or-patch; swot-synthesis
entry) + 1–3 optional each. The manual `observeHowChecksStore` / `MODULE_GUIDANCE`
How-checks stay **guidance only** (they never drove progress).

**Verification:** `tsc --noEmit` (the apps/web lint gate) **PASS exit 0**
(re-run with `--max-old-space-size=8192` to rule out an earlier OOM ambiguity);
`objectives.test.ts` **8/8**; no selector-loop ("Maximum update depth") errors
during boot/hydration (the documented infinite-render risk did not manifest).
**Live visual preview BLOCKED, stated not claimed** — `/v3` routes are
auth-gated and the API server (`:3001` + Postgres) is `ECONNREFUSED` in this
environment, so the app redirects to `/login`; no client-side dev auth bypass
exists (`authStore` verifies JWT via `/auth/me`). Could not capture a screenshot
of the lit-up segments/gate; per CLAUDE.md no visual is claimed.

Staged only the 9 files by explicit path (fetch+divergence checked first — `0/0`
not diverged); the large concurrent-session foreign WIP (`EconomicsPanel*`,
`CapitalPartnerSummaryExport`, `capitalPartner*`, `ZoneSomSidebar*`,
`MapCoordinateReadout*`, human-context dashboards/derivations, `memberStore`,
`visionStore`, schemas, `launch.json`, …) left untouched per [[feedback-no-deletion]];
committed immediately per [[feedback-commit-immediately-on-rebased-branches]].
Covenant clean; 3-item Observe/Plan/Act IA unchanged. ADR:
[[decisions/2026-05-23-atlas-observe-data-derived-progress-gate]]. Plan:
`~/.claude/plans/current-ui-has-segments-deep-widget.md`.
