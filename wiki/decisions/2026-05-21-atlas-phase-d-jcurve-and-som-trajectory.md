# 2026-05-21 — Atlas Phase D: J-curve + SOM trajectory + covenant rename

**Status:** Accepted
**Branch:** `feat/atlas-permaculture`
**Phase:** Apricot Lane Validation Protocol — Phase D (Feasibility /
J-Curve + longitudinal SOM + residual covenant rename in Capital Partner
+ Scenario Comparison surfaces).
**Commits:** `31938a4c` (D.1) · `b5f69dd9` (D.2) · `13ee28e0` (D.3) ·
`c77b96e5` (D.4) · `e1364402` (D.5) · `52d09091` (D.6, foreign-absorbed)
· `78627307` (D.7).

## Context

Phase C closed the rotation→revenue pipeline but `cashflowEngine`
treated every year as steady-state once a stream's `rampSchedule`
saturated. The protocol's Phase 3 needs a **J-curve**: early-years dip
from regeneration spend (cover crops, fencing, water infrastructure,
mob-density build-up, compost imports) followed by maturation as SOM,
ecosystem services, and livestock AU-days compound. SOM also needed to
move from a point estimate to a yearly time-series so the "natural
capital appreciation" line on the Capital Partner Summary has a
defensible numeric series behind it.

Three cross-cutting decisions folded into D's scope:

- Plot the J-curve in **pure SVG** (in-app `<JCurveChart>` and inline
  SVG in the PDF template). Recharts was deliberately rejected —
  every existing in-app chart is pure SVG, and inline SVG ports
  trivially into the PDF pipeline.
- Track SOM in a **new `som_trajectory_yearly` table** (migration
  `031`, bumped from the originally-planned `029` because the Three
  Streams Farm seed had taken `029`+`030`). v1 emits whole-project rows
  only (`zone_id IS NULL`); per-zone series is deferred.
- **Covenant rename pass** across Capital Partner + Scenario Comparison
  PDF surfaces — `"10-Year ROI"` / `"10-Year Project Yield"` /
  `"Highest Financial Return"` → `"10-Year Operating Estimate"` /
  `"Operating Estimate at Maturity, Year 10"` / `"Strongest Operating
  Estimate"`. Preserves [[fiqh-csra-erased-2026-05-04]] — these are
  operating views of a stewardship project, not investor-yield returns.

Per [[plan-apricot-lane-restart-2026-05-20]] each sub-phase landed as
an independent commit; push deferred to the D-phase boundary.

## Decisions

### D.1 — `transitionBudget` engine + scenarioStore fields

New `apps/web/src/features/financial/engine/transitionBudget.ts`
aggregates `YearlyCashflow[]` into `TransitionYear[]` with a 3-band
phase label (`establishment` 0–2 / `build-up` 3–5 / `maturation` 6+),
plus `jCurveTrough()` returning `{ troughYear, troughValue,
breakevenYear }`. Pure decoupled aggregation over the existing
`computeCashflow` output — no engine change required.
`Scenario.transitionBudgetMid?` and
`Scenario.naturalCapitalAppreciationByYear?` added as additive optional
fields on `scenarioStore.Scenario` (no setters in D.1; producers wire
in D.4).

### D.2 — `031_som_trajectory_yearly` migration

Mirrors `succession_milestones` shape — `project_id` + nullable
`zone_id` + `year` + `som_stock_tc` + `sequestration_tcyr` +
`j_curve_stage` CHECK (`'establishment' | 'build-up' | 'maturation'`,
aligned with D.1's `TransitionPhase` vocabulary).

### D.3 — `projectSomTrajectory` + soil-regeneration route

Extends `soilRegeneration.ts` with `somPctToStockTcha` (SOM% → tC/ha
via Van Bemmelen × bulk-density × depth) and `projectSomTrajectory`
(3-band scalar 0.25 / 0.6 / 1.0 applied to caller-supplied mature
seqRate, year-by-year accumulation capped at target stock). New
project-scoped route `/api/v1/soil-regeneration/project/:projectId/som-trajectory`
(`GET` any role, `POST recompute` owner|designer) using
DELETE-then-INSERT inside a transaction to side-step the NULL `zone_id`
UNIQUE quirk.

### D.4 — `JCurveChart` (pure SVG) + dual mount

Pure-SVG `<JCurveChart>` consumer mounted on (a) the live
`EconomicsPanel` (TanStack Query SOM fetch) and (b) each captured
scenario card in `ScenarioPanel`. The D.1 scenarioStore producers go
live here: `ScenarioPanel.handleCreate` becomes async, populates
`transitionBudgetMid` synchronously and best-effort fetches the SOM
trajectory to derive `naturalCapitalAppreciationByYear`. Recharts
deliberately rejected — pure SVG matches the four existing in-app
charts (`OperatingRunwayCard`, `SimpleBarChart`, `TrajectoryChart`,
`MonthlyClimateChart`) and simplifies the D.7 PDF embed.

### D.5 — Scenario comparison reference profiles + first rename pass

`scenarioComparison.ts` gains a new "External Reference Profiles"
section showing Farmland LP and SLM Partners published break-even
windows + operating estimates alongside the project's strongest
scenario — framed as informational benchmarks only ("External
benchmarks shown for context; not a forecast and not a solicitation.").
Same commit absorbs the first half of the covenant rename pass
(`scenarioComparison.ts:93,141`).

### D.6 — Covenant rename (Capital Partner surfaces)

Renames in `capitalPartnerSummary.ts:117` and
`CapitalPartnerSummaryExport.tsx:202`. The commit landed in a foreign
WIP (`52d09091 Module 5 WasteVectorTool`) during a web-lint window —
the staged D.6 strings were absorbed cleanly; verified via grep that
HEAD contains the new strings. Field identifiers (`tenYearROI`,
`bestROI`) remain unchanged — they're internal data shape and never
appear in rendered output.

### D.7 — J-curve embed in Capital Partner Summary

`FinancialPayload.jCurve?` field added to the shared export schema.
Web producer (`CapitalPartnerSummaryExport.handleGenerate`) derives the
payload via `computeTransitionBudget` + `jCurveTrough` + best-effort
SOM trajectory fetch. Server template gains a `renderJCurveSvg`
helper producing a 480×220 inline SVG that mirrors `<JCurveChart>` —
phase bands, dual y-axis labels, zero-line, trough + breakeven dashed
markers, optional secondary dashed natural-capital line, primary path
with dot markers. Diverged from the plan's PNG-base64 sketch in
favour of inline SVG to match D.4's pure-SVG house-style decision;
schema retains optional `chartSvg` passthrough for future
client-rendered variants. New "Regeneration Trajectory (J-curve)"
section renders between cashflow and mission when `jCurve` data is
present, with a 3-card summary (Trough / Operating Breakeven /
Nat-Cap Appreciation @ Yr N).

## Alternatives considered

- **Recharts** — rejected (no other in-app chart uses a library;
  ~80 kB bundle cost; would have required a separate serialisation path
  for the PDF).
- **PNG base64 chart embed** — considered (plan's sketch). Rejected
  because the PDF template renders HTML→PDF and inline SVG works
  without a headless-render step.
- **Append SOM to migration 015 event log** — rejected. SOM is a
  yearly time-series with a CHECK-constrained `j_curve_stage`; the
  event-log shape was wrong for the analytical query patterns the chart
  needs.

## Consequences

- Scenarios captured before D.4 lack `transitionBudgetMid`. The chart
  renders gracefully — older scenarios simply skip the embed.
- v1 `som_trajectory_yearly` rows are whole-project (`zone_id IS NULL`).
  Per-zone series is a later slice.
- USD/tC for natural-capital appreciation is a module-level constant
  (`USD_PER_TC_DEFAULT = 50`, mid-range social-cost-of-carbon proxy).
  D.7 wired through without exposing a configurable price source —
  follow-up slice.
- One residual `'10-Year ROI'` label in
  `apps/web/src/features/scenarios/ScenarioPanel.tsx:637` is in-app
  comparison-table text, not user-facing PDF copy. Out of D.6 scope —
  flagged as a follow-up chip.

## Verification

- `pnpm --filter @ogden/api run lint` — clean.
- `pnpm --filter @ogden/api run test` — 669 passed / 3 skipped (672).
- `pnpm --filter @ogden/web run lint` — only the pre-existing
  `StepBoundary.tsx(365,7)` foreign WIP error remains; D files clean.
- `pnpm --filter @ogden/web run test` — 1648 passed (160 files).
- Covenant grep across `apps/api/src/services/pdf/templates/` for
  `ROI|Yield|Return` — only internal field identifiers + the §D.5
  rename-note header comment remain in source; no user-facing PDF text
  exposes investor-yield language.

## Links

- Plan file: `C:\Users\MY OWN AXIS\.claude\plans\c-users-my-own-axis-downloads-validatio-quiet-simon.md`
- Phase C ADR: [[2026-05-20-atlas-phase-c-agent-workforce-rotation-engine]] (predecessor)
- Covenant root: [[fiqh-csra-erased-2026-05-04]]
- Behavioral memory: [[feedback-no-deletion]] (older scenarios + the
  un-renamed `tenYearROI` field name preserved); [[feedback-commit-immediately-on-rebased-branches]] (D.6 absorbed by external commit during a lint window — exactly the failure mode this guidance addresses).
