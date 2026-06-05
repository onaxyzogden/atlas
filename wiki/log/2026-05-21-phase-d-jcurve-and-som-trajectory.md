# 2026-05-21 — Phase D: J-curve + SOM trajectory + covenant rename

**Branch:** `feat/atlas-permaculture`
**Phase:** Apricot Lane Validation Protocol — Phase D
**ADR:** [[2026-05-21-atlas-phase-d-jcurve-and-som-trajectory]]

## Commits

- `31938a4c` — `feat(plan): D.1 — transitionBudget engine + scenarioStore fields + tests`
- `b5f69dd9` — `feat(plan): D.2 — 031_som_trajectory_yearly migration`
- `13ee28e0` — `feat(plan): D.3 — projectSomTrajectory + /api/v1/soil-regeneration route + tests`
- `c77b96e5` — `feat(plan): D.4 — JCurveChart (pure SVG) + scenarioStore producers + dual mount`
- `e1364402` — `feat(plan): D.5 — scenarioComparison reference profiles + covenant rename`
- `52d09091` — covenant rename in `capitalPartnerSummary.ts` + `CapitalPartnerSummaryExport.tsx` (foreign-absorbed during a web-lint window; verified strings in HEAD via grep)
- `78627307` — `feat(plan): D.7 — J-curve embed in Capital Partner Summary`

## Summary

Closes the Apricot Lane Phase 3 (Feasibility / J-curve) gap end-to-end:

- D.1 lands a pure aggregation `computeTransitionBudget(cashflow)` +
  `jCurveTrough()` over the existing `computeCashflow` output. No
  engine change required.
- D.2 + D.3 add migration `031_som_trajectory_yearly` (mirrors
  `succession_milestones`) and a project-scoped soil-regeneration route
  pair (`GET` any role, `POST recompute` owner|designer). v1 emits
  whole-project rows only; per-zone series deferred.
- D.4 ships the pure-SVG `<JCurveChart>` consumer and mounts it on
  both the live `EconomicsPanel` and each captured scenario card.
  ScenarioPanel.handleCreate becomes async, populates
  `transitionBudgetMid` synchronously, and best-effort fetches the SOM
  trajectory for `naturalCapitalAppreciationByYear`. Recharts
  deliberately rejected — pure SVG matches house style and simplifies
  the PDF embed.
- D.5 adds an "External Reference Profiles" section to
  `scenarioComparison.ts` (Farmland LP + SLM Partners as informational
  public-disclosure benchmarks) and absorbs the first covenant rename.
- D.6 finishes the rename pass on the Capital Partner surfaces (foreign
  commit absorbed our staged strings during a lint window — exactly
  the failure mode [[feedback-commit-immediately-on-rebased-branches]]
  warns about).
- D.7 extends `FinancialPayload` with optional `jCurve { transitionYears,
  naturalCapitalAppreciationByYear?, troughYear, troughValue,
  breakevenYear, chartSvg? }`, wires the web producer in
  `CapitalPartnerSummaryExport.handleGenerate`, and renders the chart
  as a 480×220 inline SVG in the PDF template via a new
  `renderJCurveSvg` helper. The PDF gets a new "Regeneration Trajectory
  (J-curve)" section between cashflow and mission with a 3-card summary.

## Verification gates (all green)

- `pnpm --filter @ogden/api run lint` clean.
- `pnpm --filter @ogden/api run test` 669 passed / 3 skipped (672).
- `pnpm --filter @ogden/web run lint` only pre-existing
  `StepBoundary.tsx(365,7)` foreign WIP error remains; D files clean.
- `pnpm --filter @ogden/web run test` 1648 passed (160 files).
- Covenant grep: no user-facing ROI/Yield/Return text in PDF templates
  (only internal field identifiers + the §D.5 comment header).

## Follow-ups (out of D scope)

- Spawned task chip: rename residual `'10-Year ROI'` label in
  `apps/web/src/features/scenarios/ScenarioPanel.tsx:637`.
- Per-zone SOM trajectory (v1 emits whole-project only).
- Configurable USD/tC price source (D.7 hard-codes
  `USD_PER_TC_DEFAULT = 50`, mid-range social-cost-of-carbon proxy).

## Push

Push deferred to D-phase boundary per restart-plan cadence. Branch
state at commit time: ahead 19, behind 15 against
`origin/feat/atlas-permaculture` — external rebase has happened during
the phase. Will `git fetch && git status` immediately before push.
