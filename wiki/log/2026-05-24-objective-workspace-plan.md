# 2026-05-24 — Objective workspace format (unify into one card; Plan + Observe)

**Branch.** `feat/atlas-permaculture`. Fetched before push; local 2 ahead / 0 behind (clean fast-forward), pushed `e60d5198..7e839141`.

## Why

The steward saw the Observe `ObjectiveExecutionAside` workspace (progress bar + "X% ready" + status pill + checklist + summary note) and wanted that *format* applied to all objectives — including the **Water** module in **Plan**. The catch: Plan and Observe use two unrelated objective models (Plan = Compass "how"-step checklist via `planHowChecksStore`; Observe = rich `FieldObjective` model). Plan has no evidence/execution-aside/`?objective=` routing.

**Steward decision (AskUserQuestion, prior plan-mode session):** integration model = **"Unify into one card"** (not a new aside + routing), applied to **Plan + Observe**. Completion = **checklist + summary note** (no photo evidence — Plan/Observe guidance is design-stage, not fieldwork). Build **stage-generic** so Act adopts later via adapter only.

This **supersedes** the earlier "focused-view / new `ObjectiveWorkspaceAside` / `?objective=` routing" design written in the plan; that design is documented as superseded in `~/.claude/plans/light-mode-of-the-splendid-crayon.md` (Part 3 REVISED APPROACH note).

## What shipped (2 explicit-path slices)

**Slice 1 — shared card + stores (`92555cf0`).** The card the steward pointed at *is* the shared `v3/_shared/components/GuidanceCard` (consumed by Observe / Plan / Act / `PlanProjectTypeCard`). Rather than fork it, we folded the workspace format in behind **two optional props**:
- `apps/web/src/v3/_shared/objectiveWorkspace/objectiveStatus.ts` (NEW) — pure helpers: `statusFromPct(pct)` → `'not-started' | 'in-progress' | 'complete'` (>=100 complete, <=0 not-started, else in-progress); `progressFromChecks(checked, total)` → `{verified,total,pct}` (filters in-range integer indices via a Set, rounds pct, never exceeds 100); `OBJECTIVE_STATUS_LABEL`. `+ __tests__/objectiveStatus.test.ts` (10 tests — negatives, out-of-range, duplicates, non-integers, total=0).
- `apps/web/src/store/objectiveSummaryStore.ts` (NEW) — stage-generic persisted note, `byStage → byProject → byModule → string`; actions `getSummary` / `setSummary` / `reset`; persist `{name:'ogden-atlas-objective-summaries', version:1, migrate}`. `+ __tests__/objectiveSummaryStore.test.ts` (7 tests — default, round-trip, stage/project/module isolation, overwrite, reset module- and project-scoped).
- `GuidanceCard.tsx` (+ `.module.css`) — optional `progress?: ObjectiveProgress` and `summary?: GuidanceCardSummary`; when `progress` present, renders a progressbar (role + aria, fill `${pct}%`, status pill, meta `${pct}% ready · ${verified}/${total} steps`); when `summary` present, a token-based "Summary" textarea (stopPropagation so typing doesn't toggle the card). **Consumers that pass neither (Act, `PlanProjectTypeCard`, BE category cards) are byte-identical.** All new CSS token-based → light + dark safe.

**Slice 2 — Plan + Observe wiring (`7e839141`).**
- `v3/plan/PlanChecklistAside.tsx` — `PlanGuidanceCard` reads `summaryText` from the store (stage `'plan'`), computes `progress = progressFromChecks(checkedList, PLAN_MODULE_GUIDANCE[module].how.length)`, passes `progress` + `summary` (`onChange` → `setSummary('plan', projectId, module, text)`, `disabled: !projectId`). BE category cards pass neither → stay plain guidance.
- `v3/observe/components/ObserveChecklistAside.tsx` — same treatment, stage `'observe'`, `MODULE_GUIDANCE[module]`.

Because the checklist binds to the existing `*HowChecksStore`, checking items in the card moves the progress bar **and** the compass — single source of truth, uniformly across all Plan/Observe modules (Water included).

## Verification

Per project rules, `preview_screenshot` times out in this env (known WebGL/MapLibre issue — stated, not claimed). Fell back to: **focused foreground vitest** — `objectiveStatus.test.ts` (10) + `objectiveSummaryStore.test.ts` (7) + `compassGating.test.ts` (20, the existing progress source) = **37 passed, exit 0**. `tsc --noEmit` (8 GB heap) clean for all touched files; the only 3 errors in the tree are pre-existing in untouched files (`StepBoundary.tsx`, two `HostUnion*` tests). No existing test renders the modified components, and the new props are additive/optional, so non-passing consumers are provably unchanged.

## Discipline notes

No schema/model/migration — covenant clean (the new store is UI summary text, not domain data). Two slices staged by **explicit path** per [[feedback-commit-immediately-on-rebased-branches]]; large foreign WIP in the tree (`EconomicsPanel*`, `CapitalPartnerSummary*`/`capitalPartner*`, `MapCanvas`, the `*Map.tsx` trio, `ZoneSomSidebar*`, `MapCoordinateReadout*`, `topographyStore.ts`, `seedObjectives.ts`, observe `AnnotationRegistry`/`draw`/`layers`/`measure`/`tools` WIP, `launch.json`, `_sweep_out.txt`, `.superpowers/`) left untouched per [[feedback-no-deletion]]. Fetched + confirmed 0-behind before push.

## Deferred

**Act adoption** — `ActChecklistAside` passing the same two props (stage `'act'`, `progressFromChecks` against the Act module's `how` length) reuses the shared card + store verbatim; no new files. Observe's richer evidence variant (`ObjectiveExecutionAside`) is intentionally left untouched (zero regression). Plan: `~/.claude/plans/light-mode-of-the-splendid-crayon.md` (Part 3).
