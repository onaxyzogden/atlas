# 2026-06-11 — Item-level completion-path audit + ratchet (in-app completability)

**Status:** Accepted · Implemented · Committed `fa920b6c` (Phase 1) + `d7df22cc` (Phase 2) on `main`, not pushed.
**Plan:** `C:\Users\MY OWN AXIS\.claude\plans\every-stratum-has-a-sleepy-bentley.md` (approved).

## Context

The operator is building an **ecovillage (intentional community) with orchards, food-forest guilds, silvopasture, and a nursery** and wants OLOS sufficient end-to-end — every stratum objective and checklist item completable *in-app*, without external tools. Exploration showed the objective catalogues ([[entities/shared-package]]) resolve ~33 objectives to zero Act tools, and far more items have *item-level* gaps: only `form`-arm tools tie to specific checklist items (`formId === item.id`); `map`/`log`/`flow` arms are objective-level instruments under which items remain manual ticks.

Operator decision (AskUserQuestion): **audit + ratchet first** — pin the exact gap set machine-checkably so it can only shrink; close gaps in priority order in later sessions. Also confirmed: ecovillage = "intentional community" — the existing `ecovillage` type covers it, **no new project type** (an earlier exploration claim that ecovillage was unauthored was wrong).

## Decision

1. **Shared classifier** — `packages/shared/src/relationships/objectiveCompletionPaths.ts` (subpath barrel export). Shared cannot import the app-layer tool catalog (lucide), so the classifier takes an injected `ActToolArmIndex` (`Record<toolId, {kind, formId?}>`) — the same dependency-injection pattern as `actToolCoverage.test.ts`. Per-item classification, priority order: `auto-answer` (answerSpec) → `auto-formula` (satisfiesWhenComputed) → `form-capture` (form-arm tool with `formId === item.id`) → `objective-map` / `objective-log` / `objective-flow` (objective has instruments; item is a manual tick) → `no-path` (bare manual tick). Only `auto-*` and `form-capture` are per-item evidence-backed. Patch-injected items are out of scope this phase (documented in the header).
2. **Ratchet test (app layer)** — `apps/web/src/v3/act/tier-shell/__tests__/completionPathAudit.ratchet.test.ts` + baseline `completionPathGaps.baseline.json`. Four tests: no NEW `no-path` items beyond baseline; no stale baseline entries (closing a gap forces shrinking the baseline — the ratchet); the same pair for `objectiveSpatialOnly`; every unmatched form-arm `formId` is on a pinned intentional list (known legacy: `s1-vision-labour`).
3. **Report emitter** — `scripts/audit-checklist-completion-paths.ts` → `scripts/audit-out/checklist-completion-paths.{md,json}`; `--write-baseline` regenerates the test fixture so baseline and report can never disagree.
4. **Operator-composition pin (Phase 2)** — `projectTypes.ts` ecovillage label → `Ecovillage (Intentional Community)` (pending operator confirmation at review); spineGate conformance gained the combo `ecovillage` primary + `orchard_food_forest` + `silvopasture` + `nursery` secondaries.

## The pinned numbers (2026-06-11 baseline)

**2029 checklist items across 355 standalone catalogue objectives.** Evidence-backed: 232 (`form-capture` 215, `auto-formula` 13, `auto-answer` 4). Objective-level-instrument-only: 1187. **`no-path`: 610 (30.1%)** — the gap backlog. Worst strata: s7-phasing-resourcing (225 no-path), s4-foundation-decisions (208), s6-integration-design (132) — decisions, financial planning, protocols, adaptive management. Gap-closure priority (operator composition): **universal → `ev-` → `orch-` → `silv-` → `nur-` → `hms-` → others.**

## Consequences

- Any catalogue or tool-catalog edit that creates a new gap fails the ratchet; closing a gap forces a baseline shrink — drift is impossible in both directions.
- Closure itself (new capture types: decision forms, Amanah-clean financial worksheets, schedule/protocol captures) is follow-up sessions, working the priority list.
- The 610-item figure is honest, not alarming: most no-path items are S4/S6/S7 *decision* items, which the Plan workbench records as decisions — the gap is per-item *evidence*, not usability.
